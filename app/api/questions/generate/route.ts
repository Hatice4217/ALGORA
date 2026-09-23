import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../../../lib/supabase';
import { PLAN_LIMITS } from '../../../../lib/subscription-config';

// Yapay zekaya gönderilecek katı sistem promptu
const SYSTEM_PROMPT = `Sen Türkiye'deki üniversite sınavlarına (TYT, AYT) hazırlık yapan öğrenciler için soru üreten bir yapay zeka asistanısın.

Aşağıdaki JSON formatında VE SADECE bu formatta yanıt vermelisin:
{
  "soruMetni": "soru metni buraya...",
  "secenekler": ["A şıkkı metni", "B şıkkı metni", "C şıkkı metni", "D şıkkı metni"],
  "dogruCevapIndex": 0,
  "aciklama": "detaylı açıklama metni..."
}

KURALLAR:
- dogruCevapIndex 0-3 arasında olmalı (0=A, 1=B, 2=C, 3=D)
- Sorular TYT/AYT müfredatına uygun olmalı
- Zorluk seviyesine uygun sorular üretmelisin
- Açıklama öğrencinin konuyu anlamasına yardımcı olacak detaylı olmalı
- JSON formatından KESİNLİKLE çıkmamalısın
- Yanıtı SADECE JSON olarak ver, markdown kullanma, code block kullanma
- JSON dışında hiçbir açıklama veya metin ekleme
- MATEMATİKSEL SEMBOLLER İÇİN: $, \\, LaTeX KODLARI KULLANMA
- x² yerine x^2, √ yerine "karekök" veya "kok" yaz
- Tüm matematiksel ifadeleri DÜZ METİN olarak yaz
- ≤ yerine "kucuk esit" veya "<=", ≥ yerine "buyuk esit" veya ">=" yaz
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
      // Beklenmedik boşluk (backfill/onboarding atlanmış) — free seed ile devam
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
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
          error: 'Aylık soru üretim krediniz tükendi. Paketinizi yükselterek devam edebilirsiniz.',
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
    const { subject, topic, difficulty, exam_type } = await request.json();

    // 2. Gerekli parametreleri kontrol et
    if (!subject || !difficulty) {
      return NextResponse.json(
        { error: 'Eksik parametreler: subject ve difficulty gereklidir.' },
        { status: 400 }
      );
    }

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
    const prompt = `${SYSTEM_PROMPT}

Lütfen ${subject} dersinde, ${topic || 'genel'} konusu için ${difficultyText} (${exam_type || 'TYT'}) seviyesinde bir çoktan seçmeli soru üret.

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
          error: 'Aylık soru üretim krediniz tükendi. Paketinizi yükselterek devam edebilirsiniz.',
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

    // API key URL query param yerine header ile gönderilir
    // (key, loglarda/proxy kayıtlarında URL içinde görünmez)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
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

      return NextResponse.json(
        { error: 'Gemini API hatası: ' + (errorData.error?.message || 'Bilinmeyen hata') },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Gemini API Response:', JSON.stringify(data, null, 2));

    // 6. API yanıtını al
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponse) {
      console.error('Gemini Response:', data);
      throw new Error('Gemini boş yanıt döndürdü');
    }

    console.log('AI Response Text:', aiResponse);

    // 7. JSON parse et - esnek extraction
    let parsedQuestion;
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

      // Hala bulunamazsa hata fırlat
      if (!parsedQuestion) {
        console.error('Ham yanıt (ilk 300 karakter):', aiResponse.substring(0, 300));
        throw new Error('Yapay zekadan geçersiz JSON yanıtı alındı');
      }
    }

    // 8. Yanıt formatını kontrol et ve standart forma çevir
    const questionData = {
      id: `gemini_${Date.now()}`, // Benzersiz ID
      question: cleanMathText(parsedQuestion.soruMetni || parsedQuestion.question || 'Soru metni bulunamadı'),
      choices: (parsedQuestion.secenekler || parsedQuestion.choices || []).map((choice: string) => cleanMathText(choice)),
      correctAnswer: parsedQuestion.dogruCevapIndex ?? parsedQuestion.correctAnswer ?? 0,
      explanation: cleanMathText(parsedQuestion.aciklama || parsedQuestion.explanation || 'Açıklama bulunamadı')
    };

    // 9. Veri validasyonu
    if (!questionData.question || questionData.choices.length !== 4) {
      console.error('Geçersiz soru formatı:', questionData);
      throw new Error('Yapay zekadan geçersiz soru formatı alındı');
    }

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

    // Genel hata
    return NextResponse.json(
      {
        error: 'Yapay zeka ile soru üretilirken bir hata oluştu.',
        details: (error as Error)?.message || 'Bilinmeyen hata'
      },
      { status: 500 }
    );
  }
}
