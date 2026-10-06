// ===================================
// ALGORA V2 — Üst Beyin (Özel Hoca) Endpoint'i
// ===================================
// Öğrenci ipuçlarıyla çözemediği soruda 1 kredi harcayarak yapay zeka
// özel hocadan ADIM ADIM derin anlatım ister.
//
// Kredi akışı (generate route'unun kanıtlanmış deseni):
//   rollover (günlük reset) → kredi kontrolü → deduct (Gemini ÖNCESİ,
//   atomik) → Gemini → hata olursa refund.
//
// ÖNBELLEK (Faz 1b): anlatım (question_id, user_id) başına ai_solutions'a
// yazılır. Tekrar istekler 402 KONTROLÜNDEN ÖNCE yakalanır — kredisi
// bitmiş öğrenci bile daha önce aldığı anlatımı ücretsiz izleyebilir
// (V2 kararı: ödediği şeyi kaybetmez). Önbellek yazımı sadece service-role
// (RLS yazma politikası yok); okuma hatası/miss normal Gemini akışına düşer.

import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../../../lib/supabase';
import { rateLimit } from '../../../../lib/rate-limit';
import { cleanMathText, GeminiUpstreamError } from '../../../../lib/question-generation';
import { PLAN_LIMITS } from '../../../../lib/subscription-config';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Şıklara harf etiketi (A-E) — prompt ve "öğrencinin cevabı" satırında kullanılır
const HARFLER = ['A', 'B', 'C', 'D', 'E'];

export async function POST(request: Request) {
  // refund koruması: kredi düştükten sonra her hata çıkışında iade
  let creditDeducted: number | null = null;
  let adminClientRef: SupabaseClient | null = null;
  let userId: string | null = null;

  try {
    // 0. AUTH
    if (!supabase) {
      return NextResponse.json({ error: 'Veritabanı bağlantısı kurulamadı' }, { status: 500 });
    }
    const token = request.headers.get('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 0.1 BURST LİMİTİ — kredi freni olsa da Gemini maliyetini sınırlar
    const burst = await rateLimit(`solution:${user.id}`, 10, 60_000);
    if (!burst.ok) {
      return NextResponse.json(
        { error: 'Çok fazla istek gönderildi. Lütfen bir dakika sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(burst.retryAfterSec) } }
      );
    }

    // 0.5 Service-role client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Sunucu yapılandırması eksik' }, { status: 500 });
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    adminClientRef = adminClient;
    userId = user.id;

    // 1. İstek gövdesi
    const body = await request.json().catch(() => ({}));
    const { question_id, selected_answer } = body as {
      question_id?: unknown;
      selected_answer?: unknown;
    };

    if (typeof question_id !== 'string' || !UUID_RE.test(question_id)) {
      return NextResponse.json({ error: 'Geçersiz soru kimliği.' }, { status: 400 });
    }
    if (
      selected_answer !== undefined &&
      selected_answer !== null &&
      (typeof selected_answer !== 'number' || !Number.isInteger(selected_answer) || selected_answer < 0 || selected_answer > 4)
    ) {
      return NextResponse.json({ error: 'Geçersiz cevap indeksi.' }, { status: 400 });
    }

    // 2. Soruyu yükle (anlatımın ham maddesi)
    const { data: question, error: questionError } = await adminClient
      .from('questions')
      .select('question_text, choices, correct_answer, explanation, hints, subject, topic, difficulty, exam_type')
      .eq('id', question_id)
      .maybeSingle();
    if (questionError || !question) {
      return NextResponse.json({ error: 'Soru bulunamadı.' }, { status: 404 });
    }

    // 3. KOTA — lazy rollover (günlük reset) sonra kontrol
    const { error: rolloverError } = await adminClient.rpc('rollover_subscription', {
      p_user_id: user.id,
    });
    if (rolloverError) {
      console.error('solution: rollover hatası:', rolloverError.message);
    }

    let subscription = (
      await adminClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
    ).data;

    if (!subscription) {
      // Beklenmedik boşluk (trigger atlanmış) — free seed ile devam
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 1);
      const { data: seeded, error: seedError } = await adminClient
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          plan: 'free',
          status: 'active',
          credits_remaining: PLAN_LIMITS.free,
          credits_limit: PLAN_LIMITS.free,
          period_start: now.toISOString(),
          period_end: periodEnd.toISOString(),
        })
        .select()
        .single();
      if (seedError) {
        console.error('solution: subscription seed hatası:', seedError.message);
        return NextResponse.json({ error: 'Abonelik bilgisi alınamadı' }, { status: 500 });
      }
      subscription = seeded;
    }

    // 3.1 ARAŞTIRMA MODU (BAP deneyi): deney grubu üyesi Üst Beyin'i KREDİSİZ
    // ve sınırsız kullanır — deney/kontrol ayrımı ödeme durumundan bağımsız
    // olmak zorundadır (yoksa pedagojik etki ile satın alma gücü karışır).
    // Kolon yoksa/hata olursa arastirmaDeney=false kalır → HERKES normal
    // kredi akışına döner (fail-closed: ayrıcalık yalnız açık atamayla verilir).
    // Kontrol grubuna ('kontrol') ve katılımcı olmayanlara dokunulmaz.
    let arastirmaDeney = false;
    try {
      const { data: profileRow } = await adminClient
        .from('user_profiles')
        .select('research_group')
        .eq('user_id', user.id)
        .maybeSingle();
      arastirmaDeney = profileRow?.research_group === 'deney';
    } catch (researchException) {
      console.error('solution: research_group okunamadı (normal kredi akışı):', researchException);
    }

    // 3.5 ÖNBELEK OKUMA — 402 kontrolünden ÖNCE: bu öğrenci bu sorunun
    // anlatımını daha önce aldıysa BEDAVA döner (deduct YOK, Gemini YOK).
    // Tablo henüz yoksa (migration öncesi deploy) hata loglanıp normal
    // akış devam eder — önbellek silinmez, eskisi gibi çalışır.
    try {
      const { data: cachedSolution, error: cacheError } = await adminClient
        .from('ai_solutions')
        .select('solution')
        .eq('question_id', question_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cacheError && cachedSolution?.solution) {
        console.log('solution: önbellek İSABET — kredisiz teslim (question:', question_id + ')');
        return NextResponse.json({
          success: true,
          data: {
            solution: cachedSolution.solution,
            credits_remaining: subscription.credits_remaining,
            cached: true,
          },
        });
      }
      if (cacheError) {
        console.error('solution: önbellek okuma hatası (normal akışa devam):', cacheError.message);
      }
    } catch (cacheException) {
      console.error('solution: önbellek okuma istisnası (normal akışa devam):', cacheException);
    }

    if (!arastirmaDeney && subscription.credits_remaining <= 0) {
      return NextResponse.json(
        {
          error: 'AI Üst Beyin krediniz tükendi. Yarın yenilenir veya paketinizi yükseltebilirsiniz.',
          code: 'CREDIT_EXHAUSTED',
          data: {
            plan: subscription.plan,
            credits_remaining: subscription.credits_remaining,
            period_end: subscription.period_end,
          },
        },
        { status: 402 }
      );
    }

    // 4. Atomik kredi düş (Gemini ÖNCESİ — yarış penceresi kapanır).
    // Araştırma Modu: deney üyesinde deduct ÇAĞRILMAZ → creditDeducted null
    // kalır → refund yolları otomatik no-op, istemci sayacı güncellemez.
    let deducted: number | null = null;
    let deductError: { message: string } | null = null;
    if (arastirmaDeney) {
      console.log('solution: Araştırma Modu — deney grubu üyesi, kredi düşülmedi (user:', user.id + ')');
    } else {
      const deductResult = await adminClient.rpc('deduct_credit', {
        p_user_id: user.id,
      });
      deducted = (deductResult.data as number | null) ?? null;
      deductError = deductResult.error;
    }
    if (deductError) {
      console.error('solution: deduct_credit hatası:', deductError.message);
      return NextResponse.json({ error: 'Kredi işlemi başarısız oldu' }, { status: 500 });
    }
    // (deney üyesinde deducted bilinçli olarak null'dur — 402 bloğu atlanır)
    if (!arastirmaDeney && deducted === null) {
      return NextResponse.json(
        {
          error: 'AI Üst Beyin krediniz tükendi. Yarın yenilenir veya paketinizi yükseltebilirsiniz.',
          code: 'CREDIT_EXHAUSTED',
          data: {
            plan: subscription.plan,
            credits_remaining: 0,
            period_end: subscription.period_end,
          },
        },
        { status: 402 }
      );
    }
    // Deney üyesinde deducted null → creditDeducted null kalır (refund no-op,
    // istemci 'credits_remaining' alanını sayı değil sayıp atlar)
    creditDeducted = deducted;

    // Gemini başarısız olursa düşülen krediyi iade et (+1, reason 'refund')
    const refundCredit = async () => {
      if (creditDeducted === null || !adminClientRef || !userId) return;
      creditDeducted = null;
      const { error: refundError } = await adminClientRef.rpc('refund_credit', {
        p_user_id: userId,
      });
      if (refundError) {
        console.error('solution: refund_credit hatası:', refundError.message);
      }
    };

    // 5. Gemini — düz metin anlatım (1 deneme; JSON şeması yok, bozuk çıkma riski düşük)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      await refundCredit();
      return NextResponse.json({ error: 'Sunucu yapılandırması eksik' }, { status: 500 });
    }

    const secenekler = Array.isArray(question.choices) ? question.choices : [];
    const ipuclar = Array.isArray(question.hints) ? question.hints : [];
    const dogruHarf = HARFLER[question.correct_answer] ?? '?';
    const difficultyText =
      question.difficulty === 'beginner'
        ? 'Başlangıç'
        : question.difficulty === 'intermediate'
          ? 'Orta'
          : 'İleri';

    const ogrenciCevabi =
      typeof selected_answer === 'number'
        ? dogruHarf === HARFLER[selected_answer]
          ? `\nÖĞRENCİNİN CEVABI: ${HARFLER[selected_answer]} şıkkı (DOĞRU) — nasıl ulaştığını pekiştir, alternatif kısa yolları da göster.`
          : `\nÖĞRENCİNİN CEVABI: ${HARFLER[selected_answer]} şıkkı (YANLIŞ) — bu şıkka düşmesinin muhtemel sebebini ve klasik tuzağı da özellikle açıkla.`
        : '\nÖğrenci henüz cevap vermedi — çözüm yolunu baştan sona öğret.';

    const prompt = `Sen "ALGORA Üst Beyin" adlı yapay zeka özel hocasın. Öğrenci bu derin anlatım için 1 kredi harcadı; ona gerçek bir öğretmenin tahtada anlatır gibi, adım adım çözüm öğret.

SORU (${question.exam_type} - ${question.subject} - ${question.topic}, ${difficultyText}):
${question.question_text}

SEÇENEKLER:
${secenekler.map((secenek: string, i: number) => `${HARFLER[i]}) ${secenek}`).join('\n')}

DOĞRU CEVAP: ${dogruHarf}

SORUNUN KAYNAK AÇIKLAMASI (bu bilgiyi kullan, aynen kopyalama — zenginleştir):
${question.explanation}
${ipuclar.length > 0 ? `\nÖĞRENCİNİN DAHA ÖNCE ALDIĞI İPUÇLARI:\n${ipuclar.map((ipucu: string, i: number) => `${i + 1}. ${ipucu}`).join('\n')}` : ''}${ogrenciCevabi}

ANLATIM KURALLARI:
- İLK CÜMLE DOĞRUDAN SORUNUN ANALİZİYLE BAŞLAR: "Merhaba", "Selam", kendini tanıtma veya sohbet açılışı KESİNLİKLE YASAK. Örnek ilk cümle: "Bu soru bize ... soruyor."
- Türkçe yaz; ç, ğ, ı, İ, ö, ş, ü karakterlerini kusursuz kullan.
- Önce sorunun NE İSTEDİĞİNİ bir cümleyle netleştir; sonra hangi kavram/kural gerektiğini hatırlat; sonra çözümü ADIM ADIM yürüt; sonda 1-2 cümlelik özet ver.
- Adımları "1)", "2)", "3)" numaralarıyla sırala; markdown başlık, yıldız, code block KULLANMA.
- Öğrencinin yanıldığı yer varsa klasik tuzakları açıkça adlandır.
- Matematiksel ifadeleri DÜZ METİN yaz: $, \\, LaTeX kodları KULLANMA. Üsleri x² biçiminde yaz, karekökü "karekök" olarak yaz.
- Yanıt SADECE anlatım metni olsun; sonda iyi dilekler/imza ekleme.`;

    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent';
    const startedAt = Date.now();
    const geminiTimeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || 90_000);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // API key URL query param yerine header ile gönderilir (log/proxy kayıtlarında görünmez)
        'x-goog-api-key': apiKey,
      },
      signal: AbortSignal.timeout(geminiTimeoutMs),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4, // anlatım tutarlılığı: üretimden farklı olarak düşük sıcaklık
          maxOutputTokens: 3000,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('solution: Gemini upstream hatası:', response.status, JSON.stringify(errorData).slice(0, 500));
      await refundCredit();
      if (response.status === 401 || response.status === 403) {
        throw new GeminiUpstreamError('Gemini API anahtarı geçersiz', 401);
      }
      if (response.status === 429) {
        throw new GeminiUpstreamError('API kullanım limiti aşıldı', 429);
      }
      throw new GeminiUpstreamError('Üst Beyin anlatımı şu anda kullanılamıyor', 502);
    }

    const data = await response.json();
    console.log(
      `solution: anlatım tamam ${Math.round((Date.now() - startedAt) / 1000)}s, kredi kalan ${creditDeducted}, usage:`,
      JSON.stringify(data.usageMetadata ?? {})
    );

    const candidate = data.candidates?.[0];
    const anlatim: string | undefined = candidate?.content?.parts?.[0]?.text;
    if (!anlatim || anlatim.trim().length === 0) {
      console.error(
        'solution: Gemini yanıtı boş — finishReason:',
        candidate?.finishReason,
        'usage:',
        JSON.stringify(data.usageMetadata ?? {})
      );
      await refundCredit();
      throw new GeminiUpstreamError('Üst Beyin anlatımı şu anda kullanılamıyor', 502);
    }

    const temizAnlatim = cleanMathText(anlatim.trim());

    // 6. ÖNBELEK YAZMA — anlatımı (question_id, user_id)'ye kaydet.
    // ignoreDuplicates: yarışta satır varsa dokunma (ilk anlatım kazanır).
    // Yazma hatası yanıtı BOZMAZ — öğrenci anlatımını alır, sadece log kalır.
    try {
      const { error: cacheWriteError } = await adminClient
        .from('ai_solutions')
        .upsert(
          {
            question_id,
            user_id: user.id,
            solution: temizAnlatim,
          },
          { onConflict: 'question_id,user_id', ignoreDuplicates: true }
        );
      if (cacheWriteError) {
        console.error('solution: önbellek yazma hatası (yanıt etkilenmez):', cacheWriteError.message);
      }
    } catch (cacheWriteException) {
      console.error('solution: önbellek yazma istisnası (yanıt etkilenmez):', cacheWriteException);
    }

    return NextResponse.json({
      success: true,
      data: {
        solution: temizAnlatim,
        credits_remaining: creditDeducted,
      },
    });
  } catch (error: unknown) {
    // İade: kredi düşmüşse her hata yolunda geri ver (generate deseninin aynısı)
    if (creditDeducted !== null && adminClientRef && userId) {
      const { error: refundError } = await adminClientRef.rpc('refund_credit', {
        p_user_id: userId,
      });
      if (refundError) {
        console.error('solution: catch-iade refund_credit hatası:', refundError.message);
      }
    }

    if (error instanceof GeminiUpstreamError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Üst Beyin anlatımı zaman aşımına uğradı. Krediniz iade edildi.' }, { status: 504 });
    }

    console.error('❌ /api/questions/solution hatası:', error);
    return NextResponse.json(
      { error: 'Üst Beyin anlatımı alınırken bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
