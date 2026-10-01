import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../../../lib/supabase';
import { PLAN_LIMITS } from '../../../../lib/subscription-config';
import { rateLimit } from '../../../../lib/rate-limit';
import { getSubjects, isSpecificTopic } from '../../../../lib/constants/syllabus';

// Yapay zekaya gönderilecek katı sistem promptu
const SYSTEM_PROMPT = `Sen Türkiye'deki üniversite sınavlarına (TYT, AYT) hazırlık yapan öğrenciler için soru üreten bir yapay zeka asistanısın.

Aşağıdaki JSON formatında VE SADECE bu formatta yanıt vermelisin:
{
  "soruMetni": "soru metni buraya...",
  "secenekler": ["A şıkkı metni", "B şıkkı metni", "C şıkkı metni", "D şıkkı metni", "E şıkkı metni"],
  "dogruCevapIndex": 0,
  "aciklama": "detaylı açıklama metni..."
}

KURALLAR:
- dogruCevapIndex 0-4 arasında olmalı (0=A, 1=B, 2=C, 3=D, 4=E)
- Her soru TAM 5 şık içermelidir (A, B, C, D, E) — ÖSYM sınav formatı
- Sorular TYT/AYT müfredatına uygun olmalı
- Zorluk seviyesine uygun sorular üretmelisin
- Açıklama öğrencinin konuyu anlamasına yardımcı olacak detaylı olmalı
- JSON formatından KESİNLİKLE çıkmamalısın
- Yanıtı SADECE JSON olarak ver, markdown kullanma, code block kullanma
- JSON dışında hiçbir açıklama veya metin ekleme
- TÜRKÇE YAZIM KURALLARI (ÇOK ÖNEMLİ): Tüm metinleri kusursuz Türkçe yaz; ç, ğ, ı, İ, ö, ş, ü karakterlerini eksiksiz kullan
- Türkçe karaktersiz ASCII yazım YASAK: "degeri" değil "değeri", "kactir" değil "kaçtır", "Gercel" değil "Gerçel", "kumesinde" değil "kümesinde", "esit" değil "eşit"
- Matematik terminolojisi doğru olsun: "Gerçel sayılar kümesinde tanımlı f(x)", "yerel maksimum değeri", "yerel minimum değeri", "kaçtır?"
- MATEMATİKSEL SEMBOLLER İÇİN: $, \\, LaTeX KODLARI KULLANMA
- Üsleri ^ ile yaz (x^2, x^3), √ yerine "karekök" yaz
- Tüm matematiksel ifadeleri DÜZ METİN olarak yaz
- ≤ yerine "küçük eşit" veya "<=", ≥ yerine "büyük eşit" veya ">=" yaz
- fraction, \\frac gibi LaTeX komutları KULLANMA`;

// Matematiksel sembolleri düzeltme fonksiyonu
function cleanMathText(text: string): string {
  return text
    // Dolar işaretlerini temizle
    .replace(/\$([^$]+)\$/g, '$1') // $...$ arasındaki metni koru
    .replace(/\$/g, '')
    // Basit LaTeX sembollerini değiştir
    .replace(/\\leq?/g, '≤')
    .replace(/\\geq?/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    // Kareköt ve üsler için düzeltme
    .replace(/\^2/g, '²')
    .replace(/\^3/g, '³')
    // Kesirler için basit düzeltme
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    // Kareköt
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
}

// Zorluk seviyelerini Türkçe'ye çevirme
const difficultyMap: Record<string, string> = {
  'baslangic': 'Başlangıç',
  'orta': 'Orta',
  'ileri': 'İleri'
};

// Sunucu tarafı girdi whitelist'i — MEB_SYLLABUS'taki tüm derslerden türetilir
// (TYT ∪ AYT ∪ YDT), böylece veri dosyasıyla asla ayrışmaz.
// Enum alanlar kapanık küme; serbest metin alanları (topic, previous_question)
// uzunluk sınırına zorlanır, aksi halde doğrudan prompt'a girebilir.
const VALID_SUBJECTS: readonly string[] = [
  ...new Set([...getSubjects('TYT'), ...getSubjects('AYT'), ...getSubjects('YDT')]),
];
const VALID_EXAM_TYPES: readonly string[] = ['TYT', 'AYT', 'YDT'];
const TOPIC_MAX_LENGTH = 100;
const PREVIOUS_QUESTION_MAX_LENGTH = 2000;

export async function POST(request: Request) {
  // Kredi düşüldükten sonra oluşabilecek hatalarda iade için — catch bloğu erişebilir
  let creditDeducted: number | null = null;
  let adminClientRef: SupabaseClient | null = null;
  let userId: string | null = null;

  try {
    // 0. AUTH KONTROLÜ - oturum açmamış kullanıcılar soru üretemez
    // (Gemini API kotanının kötüye kullanımını engeller)
    if (!supabase) {
      return NextResponse.json(
        { error: 'Veritabanı bağlantısı kurulamadı' },
        { status: 500 }
      );
    }

    const token = request.headers.get('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 0.1 BURST LİMİTİ — kullanıcı başına anlık istismarı sınırlar
    // (kredi sistemi günlük maliyeti zaten sınırlar; bu anlık fırtınayı keser)
    const burst = rateLimit(`generate:${user.id}`, 10, 60_000);
    if (!burst.ok) {
      return NextResponse.json(
        { error: 'Çok fazla istek gönderildi. Lütfen bir dakika sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(burst.retryAfterSec) } }
      );
    }

    // 0.5 KOTA ZORLAMASI — abonelik durumu (service-role: kredi yazımları kullanıcıya kapalı)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('generate: SUPABASE_SERVICE_ROLE_KEY tanımlı değil');
      return NextResponse.json({ error: 'Sunucu yapılandırması eksik' }, { status: 500 });
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    adminClientRef = adminClient;
    userId = user.id;

    // Lazy rollover: dönem bitmişse yeni dönem aç (kredi plan limitine resetlenir)
    const { error: rolloverError } = await adminClient.rpc('rollover_subscription', {
      p_user_id: user.id,
    });
    if (rolloverError) {
      console.error('generate: rollover hatası:', rolloverError.message);
    }

    let subscription = (
      await adminClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
    ).data;

    if (!subscription) {
      // Beklenmedik boşluk (backfill/trigger atlanmış) — free seed ile devam
      // free dönemi GÜNLÜKTÜR (PLAN_LIMITS.free — V2: günlük AI Üst Beyin kotası)
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
        console.error('generate: subscription seed hatası:', seedError.message);
        return NextResponse.json({ error: 'Abonelik bilgisi alınamadı' }, { status: 500 });
      }
      subscription = seeded;
    }

    if (subscription.credits_remaining <= 0) {
      return NextResponse.json(
        {
          error: 'Soru üretim krediniz tükendi. Paketinizi yükselterek devam edebilirsiniz.',
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

    // 1. İstekten gelen JSON verisini al
    // examType: yeni alan (UI toggle); exam_type: eski isteklerle geriye dönük uyum için yedek
    const { subject, topic, difficulty, exam_type, examType, previous_question } = await request.json();

    // 2. Gerekli parametreleri kontrol et
    if (!subject || !difficulty) {
      return NextResponse.json(
        { error: 'Eksik parametreler: subject ve difficulty gereklidir.' },
        { status: 400 }
      );
    }

    // 2.5 Girdi doğrulaması (Faz 0.8): tip + whitelist + uzunluk sınırları
    // NOT (F12 fix): `difficulty in difficultyMap` prototype chain'i taradığından
    // 'toString'/'constructor' vb. Object.prototype anahtarları whitelist'i geçiyordu
    // (canlıda kanıtlandı: 200 + kredi düşüşü). Object.hasOwn yalnızca KENDİ
    // anahtarlarına bakar (baslangic/orta/ileri).
    if (
      typeof subject !== 'string' ||
      typeof difficulty !== 'string' ||
      !VALID_SUBJECTS.includes(subject) ||
      !Object.hasOwn(difficultyMap, difficulty)
    ) {
      return NextResponse.json(
        { error: 'Geçersiz ders veya zorluk seviyesi.' },
        { status: 400 }
      );
    }
    const rawExamType = examType !== undefined ? examType : exam_type;
    if (
      rawExamType !== undefined &&
      (typeof rawExamType !== 'string' || !VALID_EXAM_TYPES.includes(rawExamType))
    ) {
      return NextResponse.json(
        { error: 'Geçersiz sınav türü. TYT veya AYT olmalıdır.' },
        { status: 400 }
      );
    }
    const effectiveExamType: string = typeof rawExamType === 'string' ? rawExamType : 'TYT';
    const safeTopic = typeof topic === 'string' ? topic.trim().slice(0, TOPIC_MAX_LENGTH) : '';
    const safePreviousQuestion =
      typeof previous_question === 'string'
        ? previous_question.trim().slice(0, PREVIOUS_QUESTION_MAX_LENGTH)
        : '';

    // 3. Gemini API anahtarı kontrolü
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY bulunamadı');
      return NextResponse.json(
        { error: 'Yapay zeka servisi yapılandırılmamış. Lütfen .env.local dosyasında GEMINI_API_KEY tanımlayın.' },
        { status: 500 }
      );
    }

    // 4. Zorluk seviyesini Türkçe'ye çevir
    const difficultyText = difficultyMap[difficulty] || difficulty;

    // 5. Gemini REST API ile direkt call
    // Tekrar önleme: aynı istek parametreleriyle Gemini hep aynı/benzer soru üretebiliyor.
    // İki katman: (a) istemcinin oturumluk gönderdiği son soru metni, (b) bu öğrencinin
    // bu derste daha önce üretilen son 5 sorusu (questions tablosundan service-role ile
    // okunur — oturumlar arası sunucu hafızası; sayfa yenilense de ilk üretimde devreye girer).
    const previousQuestionText = safePreviousQuestion || null;

    let recentQuestionTexts: string[] = [];
    try {
      const { data: recentQuestions, error: recentError } = await adminClient
        .from('questions')
        .select('question_text')
        .eq('subject', subject)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (recentError) {
        console.error('generate: son sorular okunamadı (tekrar yasağı zayıflar):', recentError.message);
      } else if (recentQuestions) {
        recentQuestionTexts = recentQuestions
          .map((q: { question_text: string | null }) => (q.question_text || '').slice(0, 300))
          .filter((t: string) => t.length > 0);
      }
    } catch (recentException) {
      // Non-fatal: geçmiş okunamasa da üretim devam eder (istemci previous_question'ı hâlâ korur)
      console.error('generate: son sorular sorgusu istisna:', recentException);
    }

    // Yasak listesi: sunucu geçmişi + istemciden gelen son soru (mükerrer metin tekilleştirilir)
    const bannedQuestions = Array.from(
      new Set([
        ...recentQuestionTexts,
        ...(previousQuestionText ? [previousQuestionText.slice(0, 300)] : []),
      ])
    );

    const antiRepeatBlock = bannedQuestions.length > 0
      ? `\n\nÇOK ÖNEMLİ — TEKRAR YASAĞI: Bu öğrenciye bu derste daha önce şu sorular soruldu:\n${bannedQuestions
          .map((q, i) => `${i + 1}) "${q}"`)
          .join('\n')}\nBu sorularla aynı veya benzer bir soru KESİNLİKLE üretme. Farklı sayılar, farklı bağlam/kurgu ve mümkünse farklı bir alt konu kullanarak tamamen YENİ bir soru üret.`
      : `\n\nÇEŞİTLİLİK: Yaygın bilinen örnek soruları değil, özgün bir soru üret. Sayı değerlerini ve kurguyu çeşitlendir.`;

    // Konu odağı: yalnızca somut bir konu seçildiyse eklenir ('Genel'/boş → eklenmez,
    // eski istekler ve varsayılan akış aynen çalışır — geriye dönük uyum)
    const topicFocusBlock = isSpecificTopic(safeTopic)
      ? `\n\nKONU ODAĞI: Soru YALNIZCA "${safeTopic}" konusuyla ilgili olmalı. Soru, bu konunun bilgisini/uygulamasını test etmeli; başka konulardan bağımsız soru üretme.`
      : '';

    const prompt = `${SYSTEM_PROMPT}

Öğrenciye MEB müfredatına uygun, ${effectiveExamType} sınavı ${subject} dersinin '${safeTopic || 'Genel'}' kazanımından, ${difficultyText} zorluk seviyesinde bir YKS sorusu üret.${topicFocusBlock}${antiRepeatBlock}

ÖNEMLİ: Matematiksel ifadeleri DÜZ METİN olarak yaz, $, \\, LaTeX kodları KULLANMA.
Örnek: "x kare 2 artı x" yerine "x² + 2x", "karekök 16" yerine "4", "x küçük eşit 5" yerine "x <= 5" gibi.

Yanıtı KESİNLİKLE JSON formatında ver.`;

    // KOTA: Gemini çağrısından ÖNCE atomik kredi düş (yarış penceresi kapanır).
    // Fonksiyon null döndürürse kredi yoktur — Gemini HİÇ çağrılmadan 402 döner.
    const { data: deducted, error: deductError } = await adminClient.rpc('deduct_credit', {
      p_user_id: user.id,
    });
    if (deductError) {
      console.error('generate: deduct_credit hatası:', deductError.message);
      return NextResponse.json({ error: 'Kredi işlemi başarısız oldu' }, { status: 500 });
    }
    if (deducted === null) {
      return NextResponse.json(
        {
          error: 'Soru üretim krediniz tükendi. Paketinizi yükselterek devam edebilirsiniz.',
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
      if (creditDeducted === null) return;
      creditDeducted = null;
      const { error: refundError } = await adminClient.rpc('refund_credit', {
        p_user_id: user.id,
      });
      if (refundError) {
        console.error('generate: refund_credit hatası:', refundError.message);
      }
    };

    // Gemini REST API endpoint - lite versiyon (daha hızlı)
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent';

    // Gemini'nin döndürebileceği (Türkçe/İngilizce) soru şeması
    interface GeminiSoru {
      soruMetni?: string;
      secenekler?: string[];
      dogruCevapIndex?: number;
      aciklama?: string;
      question?: string;
      choices?: string[];
      correctAnswer?: number;
      explanation?: string;
    }

    // 5-6. Gemini çağrısı + JSON şema doğrulaması (rapor 5.1 adım 6b):
    // şema dışı/bozuk üretim öğrenciye HİÇ gösterilmez; arka planda elenir, YENİ bir
    // seed ile otomatik yeniden denenir. Öğrenciden tek kredi düşülür (ikinci çağrının
    // maliyeti sisteme aittir); kredi iadesi yalnızca TÜM denemeler başarısız olursa
    // catch bloğunda yapılır. HTTP seviyesindeki hatalar (401/403/429/5xx) yeniden
    // denenmez — anında iade edilir.
    const MAX_ATTEMPTS = 2; // 1 deneme + 1 otomatik yeniden deneme
    let parsedQuestion: GeminiSoru | null = null;
    const generationStartedAt = Date.now(); // latency gözlemi (Vercel logları)

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const attemptStartedAt = Date.now();
      // Self-timeout (dayanıklılık Test 1 fix): Gemini asılı kalırsa platform
      // maxDuration kill'i fonksiyonu CATCH'SİZ öldürür ve düşülen kredi iadesiz
      // kalır (local SIGKILL simülasyonuyla kanıtlandı). Kendi limitimizi platform
      // limitinin ALTINDA tutarsak timeout AbortError'ı catch bloğuna düşer ve
      // refund_credit çalışır. 90 sn: gözlemlenen en yavaş canlı üretim 60.2 sn + pay;
      // 2 deneme × 90 sn = 180 sn < Fluid varsayılan limiti (300 sn).
      // Test/probe override: GEMINI_TIMEOUT_MS env.
      const geminiTimeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || 90_000);
      // API key URL query param yerine header ile gönderilir
      // (key, loglarda/proxy kayıtlarında URL içinde görünmez)
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        signal: AbortSignal.timeout(geminiTimeoutMs),
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 1.0,
            // Her denemede farklı seed → aynı bozuk çıktının tekrarı engellenir
            seed: Math.floor(Math.random() * 2147483647),
            maxOutputTokens: 2000,
            // NOT (26 Eylül): thinkingConfig.thinkingBudget:0 KALDIRILDI —
            // gemini-flash-lite-latest artık 3.x ailesine işaret ediyor ve o aile
            // bu parametreyi INVALID_ARGUMENT ile reddediyor (canlıda 502 sebebiydi).
            // 3.x ailesinde thinking zaten 0 token harcıyor (probe ile ölçüldü).
          }
        })
      });

      if (!response.ok) {
        await refundCredit();
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API Error:', errorData);

        if (response.status === 401 || response.status === 403) {
          return NextResponse.json(
            { error: 'Gemini API anahtarı geçersiz. Lütfen .env.local dosyasını kontrol edin.' },
            { status: 401 }
          );
        }

        if (response.status === 429) {
          return NextResponse.json(
            { error: 'API kullanım limiti aşıldı. Lütfen birkaç dakika bekleyin.' },
            { status: 429 }
          );
        }

        // Upstream hata detayı istemciye yansıtılmaz; sunucu loguna yeterli
        console.error('generate: Gemini upstream hatası:', response.status, JSON.stringify(errorData).slice(0, 500));
        return NextResponse.json(
          { error: 'Soru üretimi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.' },
          { status: 502 }
        );
      }

      const data = await response.json();
      console.log(`generate: deneme ${attempt}/${MAX_ATTEMPTS} ${Math.round((Date.now() - attemptStartedAt) / 1000)}s (toplam ${Math.round((Date.now() - generationStartedAt) / 1000)}s), model: gemini-flash-lite-latest, usage:`, JSON.stringify(data.usageMetadata ?? {}));
      console.log('Gemini API Response:', JSON.stringify(data, null, 2));

      // API yanıtını al
      const candidate = data.candidates?.[0];
      const aiResponse = candidate?.content?.parts?.[0]?.text;

      if (!aiResponse) {
        // Teşhis için finishReason + token kullanımı (MAX_TOKENS = bütçe yetersiz)
        console.error(
          `generate: Gemini yanıtı boş (deneme ${attempt}/${MAX_ATTEMPTS}) — finishReason:`,
          candidate?.finishReason,
          'usage:',
          JSON.stringify(data.usageMetadata ?? {})
        );
        continue; // boş yanıt → öğrenciye gösterilmeden elenir, yeniden denenir
      }

      console.log('AI Response Text:', aiResponse);

      // JSON parse - esnek extraction
      try {
        // Doğrudan JSON dene
        parsedQuestion = JSON.parse(aiResponse);
      } catch {
        console.error('JSON parse hatası, alternatif yöntemler deneniyor...');

        // Markdown code block içindeki JSON'ı bulmaya çalış
        const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            parsedQuestion = JSON.parse(jsonMatch[1]);
            console.log('JSON markdown block içinden başarıyla çıkarıldı');
          } catch (e) {
            console.error('Markdown JSON parse hatası:', e);
          }
        }

        // Hala yoksa, süslü parantez içindeki JSON'ı bul
        if (!parsedQuestion) {
          const braceMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (braceMatch) {
            try {
              parsedQuestion = JSON.parse(braceMatch[0]);
              console.log('JSON süslü parantez içinden başarıyla çıkarıldı');
            } catch (e) {
              console.error('Brace JSON parse hatası:', e);
            }
          }
        }
      }

      // Şema kontrolü: soru metni + tam 5 seçenek + geçerli doğru-cevap indeksi
      const secenekler = parsedQuestion?.secenekler || parsedQuestion?.choices || [];
      const metinVar = Boolean(parsedQuestion?.soruMetni || parsedQuestion?.question);
      // Doğru-cevap indeksi denetimi (dayanıklılık Test 4-B fix): tamsayı ve 0-4
      // aralığında OLMALI. Eski davranış Math.min/Math.max clamp'iydi → Gemini
      // index 9 gibi sınır-dışı değer üretirse sessizce 4'e kırpılıp bozuk soru
      // DB'ye yazılıyor ve öğrenciye dönüyordu. Artık aralık dışı / non-integer
      // (string, NaN dahil) → şema dışı sayılır ve retry tetiklenir. Alan TAMAMEN
      // eksikse eski davranış korunur (aşağıda varsayılan 0).
      const hamIndex: unknown = parsedQuestion?.dogruCevapIndex ?? parsedQuestion?.correctAnswer;
      const indexGecerli =
        hamIndex === undefined ||
        hamIndex === null ||
        (typeof hamIndex === 'number' && Number.isInteger(hamIndex) && hamIndex >= 0 && hamIndex <= 4);
      if (!parsedQuestion || !metinVar || secenekler.length !== 5 || !indexGecerli) {
        console.error(
          `generate: şema dışı üretim elendi (deneme ${attempt}/${MAX_ATTEMPTS}), ham yanıt (ilk 300 karakter):`,
          aiResponse.substring(0, 300)
        );
        parsedQuestion = null;
        continue; // rapor 5.1 adım 6b: 4. adıma dön, yeniden dene
      }
      break; // geçerli üretim → döngüden çık
    }

    if (!parsedQuestion) {
      // Tüm denemeler başarısız → kredi catch bloğunda iade edilir
      throw new Error('Yapay zekadan geçerli JSON yanıtı alınamadı (tüm denemeler başarısız)');
    }

    // 8. Yanıt formatını kontrol et ve standart forma çevir
    const difficultyToDb: Record<string, string> = {
      'baslangic': 'beginner',
      'orta': 'intermediate',
      'ileri': 'advanced',
    };
    const questionData = {
      id: `gemini_${Date.now()}`, // Aşağıda DB insert başarılıysa gerçek UUID ile değiştirilir
      question: cleanMathText(parsedQuestion.soruMetni || parsedQuestion.question || 'Soru metni bulunamadı'),
      choices: (parsedQuestion.secenekler || parsedQuestion.choices || []).map((choice: string) => cleanMathText(choice)),
      // Aralık/tip denetimi yukarıdaki şema kontrolünde yapıldı (0-4 tamsayı ya
      // da eksik → 0); clamp artık ölü koruma değil, yalnızca varsayılan
      correctAnswer: parsedQuestion.dogruCevapIndex ?? parsedQuestion.correctAnswer ?? 0,
      explanation: cleanMathText(parsedQuestion.aciklama || parsedQuestion.explanation || 'Açıklama bulunamadı'),
      // İstemcide rozet/başlık gösterimi için meta (DB'ye de aynı değerler yazılır)
      subject,
      topic: safeTopic || 'Genel',
      difficulty: difficultyToDb[difficulty] || difficulty,
      exam_type: effectiveExamType,
    };

    // 9. Veri validasyonu
    if (!questionData.question || questionData.choices.length !== 5) {
      console.error('Geçersiz soru formatı:', questionData);
      throw new Error('Yapay zekadan geçersiz soru formatı alındı');
    }

    // 9.5 Üretilen soruyu questions tablosuna kaydet.
    // answers.question_id sütunu questions(id)'e FK — soru kaydedilmeden cevap kaydedilemez,
    // istatistik view'ları da questions ile JOIN yapar.
    let questionId = crypto.randomUUID(); // insert başarısızsa yedek (cevap kaydı bu durumda düşer)
    const { data: insertedQuestion, error: insertError } = await adminClient
      .from('questions')
      .insert({
        subject,
        topic: safeTopic || 'Genel',
        difficulty: difficultyToDb[difficulty] || difficulty,
        exam_type: effectiveExamType,
        question_text: questionData.question,
        choices: questionData.choices,
        correct_answer: questionData.correctAnswer,
        explanation: questionData.explanation,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (insertError) {
      // Kredi harcandı, soruyu kullanıcıya vermeye devam et; sadece logla
      console.error('generate: questions insert hatası:', insertError.message);
    } else {
      questionId = insertedQuestion.id;
    }
    questionData.id = questionId;

    // 10. Başarılı cevabı gönder (credits_remaining: kredi sayacı güncellemesi için)
    return NextResponse.json({
      success: true,
      data: { ...questionData, credits_remaining: creditDeducted },
    });

  } catch (error: unknown) {
    // Gemini/parse hatası: düşülen krediyi iade et (best effort)
    if (creditDeducted !== null && adminClientRef && userId) {
      creditDeducted = null;
      try {
        await adminClientRef.rpc('refund_credit', { p_user_id: userId });
      } catch (refundErr) {
        console.error('generate: catch içinde refund hatası:', refundErr);
      }
    }

    // Hata yönetimi
    console.error('❌ Gemini AI Question Generation Error:', error);
    console.error('Error message:', (error as Error)?.message);
    console.error('Error stack:', (error as Error)?.stack);

    // Genel hata — internal detay istemciye sızdırılmaz (sunucu logunda)
    return NextResponse.json(
      { error: 'Yapay zeka ile soru üretilirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
