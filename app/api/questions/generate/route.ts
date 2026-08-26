import { NextResponse } from 'next/server';

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
  try {
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

    // Gemini REST API endpoint - lite versiyon (daha hızlı)
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent';

    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    } catch (parseError) {
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

    // 10. Başarılı cevabı gönder
    return NextResponse.json({ success: true, data: questionData });

  } catch (error: unknown) {
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
