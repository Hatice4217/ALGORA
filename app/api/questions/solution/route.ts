// ===================================
// ALGORA V2 — Üst Beyin (Özel Hoca) Endpoint'i
// ===================================
// Öğrenci ipuçlarıyla çözemediği soruda 1 kredi harcayarak yapay zeka
// özel hocadan ADIM ADIM derin anlatım ister.
//
// Kredi akışı (generate route'unun kanıtlanmış deseni):
//   rollover (günlük reset) → kredi kontrolü → deduct (Gemini ÖNCESİ,
//   atomik) → Gemini → hata olursa refund.
// (Faz 1b: ai_solutions önbellek tablosu eklenerek tekrar istekler bedava
//  dönecek — şu an her istek taze Gemini çağrısıdır.)

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
    const burst = rateLimit(`solution:${user.id}`, 10, 60_000);
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

    if (subscription.credits_remaining <= 0) {
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

    // 4. Atomik kredi düş (Gemini ÖNCESİ — yarış penceresi kapanır)
    const { data: deducted, error: deductError } = await adminClient.rpc('deduct_credit', {
      p_user_id: user.id,
    });
    if (deductError) {
      console.error('solution: deduct_credit hatası:', deductError.message);
      return NextResponse.json({ error: 'Kredi işlemi başarısız oldu' }, { status: 500 });
    }
    if (deducted === null) {
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
    creditDeducted = deducted as number;

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

    return NextResponse.json({
      success: true,
      data: {
        solution: cleanMathText(anlatim.trim()),
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
