// ===================================
// ALGORA V2 — Gemini Soru Üretim Çekirdeği
// ===================================
// Havuz modelinin (pool-first) Gemini fallback üretim mantığı.
// KREDİ MANTIĞI İÇERMEZ: çağıran route karar verir.
//   • /api/questions/next fallback'i ÜCRETSİZDİR (havuz-ilk model; soru
//     üretimi artık öğrenci kredisi harcamaz)
//   • (1b'de) Üst Beyin endpoint'i deduct/refund ile çağıracak
//
// Pedagojik altın kural (BAP danışman kararı, 30 Eylül 2026):
// 3 ipucu ASLA çözüm adımı vermeyecek / doğru cevabı ifşa etmeyecek —
// öğretmenin yönlendirici tavsiyeleri (Sokratik nudges) gibi yazılacak.

import { isSpecificTopic } from './constants/syllabus';

// Zorluk seviyelerini prompt için Türkçe'ye çevirme
export const difficultyMap: Record<string, string> = {
  'baslangic': 'Başlangıç',
  'orta': 'Orta',
  'ileri': 'İleri'
};

// Zorluk seviyelerini DB değerine çevirme (questions.difficulty CHECK)
export const difficultyToDb: Record<string, string> = {
  'baslangic': 'beginner',
  'orta': 'intermediate',
  'ileri': 'advanced',
};

// Yapay zekaya gönderilecek katı sistem promptu
const SYSTEM_PROMPT = `Sen Türkiye'deki üniversite sınavlarına (TYT, AYT) hazırlık yapan öğrenciler için soru üreten bir yapay zeka asistanısın.

Aşağıdaki JSON formatında VE SADECE bu formatta yanıt vermelisin:
{
  "soruMetni": "soru metni buraya...",
  "secenekler": ["A şıkkı metni", "B şıkkı metni", "C şıkkı metni", "D şıkkı metni", "E şıkkı metni"],
  "dogruCevapIndex": 0,
  "aciklama": "detaylı açıklama metni...",
  "ipuclari": ["1. yönlendirici ipucu", "2. yönlendirici ipucu", "3. yönlendirici ipucu"]
}

KURALLAR:
- dogruCevapIndex 0-4 arasında olmalı (0=A, 1=B, 2=C, 3=D, 4=E)
- Her soru TAM 5 şık içermelidir (A, B, C, D, E) — ÖSYM sınav formatı
- "ipuclari" TAM 3 öğe içermelidir
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
- fraction, \\frac gibi LaTeX komutları KULLANMA

İPUCU KURALLARI (PEDAGOJİK ALTIN KURAL — ÇOK ÖNEMLİ):
- İpuçları (ipuclari) ASLA doğrudan çözüm adımı vermeyecek veya doğru cevabı ifşa etmeyecek.
- Gerçek bir öğretmenin takılan öğrenciye verdiği YÖNLENDİRİCİ tavsiyeler (Sokratik ipucu) gibi yazılacak.
- Kademeli ilerle: 1. ipucu hafif bir bakış açısı sunar; 2. ipucu ilgili kavramı/kuralı hatırlatır; 3. ipucu öğrenciyi çözümün hemen eşiğine getirir AMA cevabı ASLA söylemez.
- KÖTÜ İPUCU ÖRNEĞİ (YASAK): "Pisagor teoremini kullanıp 3'ün karesi ile 4'ün karesini toplayıp 5 bulmalısın."
- İYİ İPUCU ÖRNEĞİ (İSTENEN): "Burada bir dik üçgen oluştuğunu fark ettin mi? Kenar uzunlukları arasındaki ilişkiyi kurmak için eski bir Yunan matematikçisinin ünlü teoremi işine yarayabilir, bir dene!"`;

// Matematiksel sembolleri düzeltme fonksiyonu
export function cleanMathText(text: string): string {
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

// Gemini'nin döndürebileceği (Türkçe/İngilizce alan adlı) ham soru şeması
interface GeminiSoru {
  soruMetni?: string;
  secenekler?: string[];
  dogruCevapIndex?: number;
  aciklama?: string;
  ipuclari?: string[];
  question?: string;
  choices?: string[];
  correctAnswer?: number;
  explanation?: string;
  hints?: string[];
}

export interface GeneratedQuestion {
  question: string;
  choices: string[];
  correctAnswer: number;
  explanation: string;
  /** 3'lü Sokratik ipucu; Gemini üretmezse boş dizi (havuz yine beslenir) */
  hints: string[];
}

// Prompt'u kurar: müfredat cümlesi + konu odağı + tekrar yasağı
function buildPrompt(params: {
  subject: string;
  topic: string;
  difficultyText: string;
  examType: string;
  bannedQuestions: string[];
}): string {
  const { subject, topic, difficultyText, examType, bannedQuestions } = params;

  // Konu odağı: yalnızca somut bir konu seçildiyse eklenir ('Genel'/boş → eklenmez)
  const topicFocusBlock = isSpecificTopic(topic)
    ? `\n\nKONU ODAĞI: Soru YALNIZCA "${topic}" konusuyla ilgili olmalı. Soru, bu konunun bilgisini/uygulamasını test etmeli; başka konulardan bağımsız soru üretme.`
    : '';

  const antiRepeatBlock = bannedQuestions.length > 0
    ? `\n\nÇOK ÖNEMLİ — TEKRAR YASAĞI: Bu öğrenciye bu derste daha önce şu sorular soruldu:\n${bannedQuestions
        .map((q, i) => `${i + 1}) "${q}"`)
        .join('\n')}\nBu sorularla aynı veya benzer bir soru KESİNLİKLE üretme. Farklı sayılar, farklı bağlam/kurgu ve mümkünse farklı bir alt konu kullanarak tamamen YENİ bir soru üret.`
    : `\n\nÇEŞİTLİLİK: Yaygın bilinen örnek soruları değil, özgün bir soru üret. Sayı değerlerini ve kurguyu çeşitlendir.`;

  return `${SYSTEM_PROMPT}

Öğrenciye MEB müfredatına uygun, ${examType} sınavı ${subject} dersinin '${topic || 'Genel'}' kazanımından, ${difficultyText} zorluk seviyesinde bir YKS sorusu üret.${topicFocusBlock}${antiRepeatBlock}

ÖNEMLİ: Matematiksel ifadeleri DÜZ METİN olarak yaz, $, \\, LaTeX kodları KULLANMA.
Örnek: "x kare 2 artı x" yerine "x² + 2x", "karekök 16" yerine "4", "x küçük eşit 5" yerine "x <= 5" gibi.

Yanıtı KESİNLİKLE JSON formatında ver.`;
}

// Ham Gemini yanıtını esnek yöntemlerle JSON'a çevirir (doğrudan → markdown bloğu → süslü parantez)
function extractJson(aiResponse: string): GeminiSoru | null {
  try {
    return JSON.parse(aiResponse);
  } catch {
    // Markdown code block içindeki JSON'ı bulmaya çalış
    const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // aşağıya düş
      }
    }
    // Hala yoksa, süslü parantez içindeki JSON'ı bul
    const braceMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try {
        return JSON.parse(braceMatch[0]);
      } catch {
        // null döner
      }
    }
  }
  return null;
}

// İpucu dizisini normalize et: string olmayanları/boşları at, ilk 3'ü al.
// 3 sağlam ipucu çıkaramadıysa BOŞ dizi (yumuşak başarısızlık): geçerli bir soruyu
// ipuçları yüzünden çöpe atmayız — havuza ipucusuz girer (eski sorularda da null).
function normalizeHints(ham: unknown): string[] {
  if (!Array.isArray(ham)) return [];
  const temiz = ham
    .filter((h): h is string => typeof h === 'string' && h.trim().length > 0)
    .map((h) => cleanMathText(h.trim().slice(0, 500)));
  const ilkUc = temiz.slice(0, 3);
  if (ilkUc.length !== 3) {
    console.warn(`question-generation: ipuclari eksik/bozuk (${temiz.length}/3) — soru ipucusuz havuza girer`);
    return [];
  }
  return ilkUc;
}

/**
 * Gemini'den YKS sorusu üretir (1 deneme + 1 otomatik yeniden deneme).
 * Şema dışı/bozuk üretim öğrenciye gösterilmeden elenir; her deneme yeni seed alır.
 * HTTP seviyesindeki Gemini hataları (401/403/429) yeniden denenmez.
 * Başarı: GeneratedQuestion. Tüm denemeler başarısız: throw.
 */
export async function generateQuestionViaGemini(params: {
  subject: string;
  topic: string;
  difficultyText: string;
  examType: string;
  bannedQuestions: string[];
}): Promise<GeneratedQuestion> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY tanımlı değil');
  }

  const prompt = buildPrompt(params);
  const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent';

  const MAX_ATTEMPTS = 2; // 1 deneme + 1 otomatik yeniden deneme
  const generationStartedAt = Date.now();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const attemptStartedAt = Date.now();
    // Self-timeout (dayanıklılık Test 1 fix): Gemini asılı kalırsa platform
    // maxDuration kill'i fonksiyonu CATCH'SİZ öldürür. Kendi limitimizi platform
    // limitinin ALTINDA tutarsak timeout AbortError'ı catch'e düşer.
    // 2 deneme × 90 sn = 180 sn < Fluid varsayılan limiti (300 sn).
    // Test/probe override: GEMINI_TIMEOUT_MS env.
    const geminiTimeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || 90_000);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // API key URL query param yerine header ile gönderilir
        // (key, loglarda/proxy kayıtlarında URL içinde görünmez)
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
          // İpucu şeması eklendiği için bütçe 2000 → 3000 (MAX_TOKENS kırpılması
          // boş yanıt → gereksiz retry demek; artı-başlık yorumuna bak)
          maxOutputTokens: 3000,
          // NOT (26 Eylül): thinkingConfig.thinkingBudget:0 KALDIRILDI —
          // gemini-flash-lite-latest artık 3.x ailesini gösteriyor ve o aile bu
          // parametreyi INVALID_ARGUMENT ile reddediyor (canlıda 502 sebebiydi).
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API Error:', errorData);

      if (response.status === 401 || response.status === 403) {
        throw new GeminiUpstreamError('Gemini API anahtarı geçersiz', 401);
      }
      if (response.status === 429) {
        throw new GeminiUpstreamError('API kullanım limiti aşıldı', 429);
      }
      // Upstream hata detayı istemciye yansıtılmaz; sunucu loguna yeterli
      console.error('question-generation: Gemini upstream hatası:', response.status, JSON.stringify(errorData).slice(0, 500));
      throw new GeminiUpstreamError('Soru üretimi şu anda kullanılamıyor', 502);
    }

    const data = await response.json();
    console.log(`question-generation: deneme ${attempt}/${MAX_ATTEMPTS} ${Math.round((Date.now() - attemptStartedAt) / 1000)}s (toplam ${Math.round((Date.now() - generationStartedAt) / 1000)}s), model: gemini-flash-lite-latest, usage:`, JSON.stringify(data.usageMetadata ?? {}));

    const candidate = data.candidates?.[0];
    const aiResponse: string | undefined = candidate?.content?.parts?.[0]?.text;

    if (!aiResponse) {
      // Teşhis için finishReason + token kullanımı (MAX_TOKENS = bütçe yetersiz)
      console.error(
        `question-generation: Gemini yanıtı boş (deneme ${attempt}/${MAX_ATTEMPTS}) — finishReason:`,
        candidate?.finishReason,
        'usage:',
        JSON.stringify(data.usageMetadata ?? {})
      );
      continue; // boş yanıt → yeniden denenir
    }

    const parsedQuestion = extractJson(aiResponse);

    // Şema kontrolü (ZORUNLU çekirdek): soru metni + tam 5 seçenek + geçerli indeks.
    // Doğru-cevap indeksi denetimi (dayanıklılık Test 4-B fix): tamsayı ve 0-4
    // aralığında OLMALI — clamp yok, aralık dışı şema dışı sayılır (retry tetiklenir).
    // Alan TAMAMEN eksikse eski davranış korunur (aşağıda varsayılan 0).
    const secenekler = parsedQuestion?.secenekler || parsedQuestion?.choices || [];
    const metinVar = Boolean(parsedQuestion?.soruMetni || parsedQuestion?.question);
    const hamIndex: unknown = parsedQuestion?.dogruCevapIndex ?? parsedQuestion?.correctAnswer;
    const indexGecerli =
      hamIndex === undefined ||
      hamIndex === null ||
      (typeof hamIndex === 'number' && Number.isInteger(hamIndex) && hamIndex >= 0 && hamIndex <= 4);
    if (!parsedQuestion || !metinVar || secenekler.length !== 5 || !indexGecerli) {
      console.error(
        `question-generation: şema dışı üretim elendi (deneme ${attempt}/${MAX_ATTEMPTS}), ham yanıt (ilk 300 karakter):`,
        aiResponse.substring(0, 300)
      );
      continue; // yeniden dene
    }

    // İpuçları YUMUŞAK alan: 3 sağlam ipucu gelmediyse soru yine kabul edilir
    // (normalizeHints boş dizi döndürür — havuza ipucusuz girer)
    const hints = normalizeHints(parsedQuestion.ipuclari ?? parsedQuestion.hints);

    return {
      question: cleanMathText(parsedQuestion.soruMetni || parsedQuestion.question || 'Soru metni bulunamadı'),
      choices: (parsedQuestion.secenekler || parsedQuestion.choices || []).map((choice: string) => cleanMathText(choice)),
      correctAnswer: parsedQuestion.dogruCevapIndex ?? parsedQuestion.correctAnswer ?? 0,
      explanation: cleanMathText(parsedQuestion.aciklama || parsedQuestion.explanation || 'Açıklama bulunamadı'),
      hints,
    };
  }

  throw new Error('Yapay zekadan geçerli JSON yanıtı alınamadı (tüm denemeler başarısız)');
}

// HTTP statüsü taşıyan upstream hatası — route, istemciye uygun statüyü çevirir
export class GeminiUpstreamError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'GeminiUpstreamError';
    this.status = status;
  }
}
