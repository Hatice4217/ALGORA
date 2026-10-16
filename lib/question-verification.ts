// ===================================
// ALGORA V2 — Çift-AI Soru Doğrulama (U = k/n)
// ===================================
// Havuza giren her soruyu İKİNCİ bir AI (doğrulayıcı) doğru cevabı GÖRMEDEN
// n kez kör çözer. k = üreticinin iddia ettiği cevaba uyan çözüm sayısı,
// U = k/n_eff. Bantlar:
//   'tam_uyum'   (U ≥ tam eşik) → servis edilir
//   'kismi_uyum' (şüpheli)      → elenmez, etiketle saklanır → insan inceleme
//   'uyumsuz'                   → status='rejected' + nedeni verification jsonb'de
//
// Çekirdek değişmez (invariant): DOĞRULANMAMIŞ SORU HAVUZA GİRMEZ.
// Tüm üretim yolları (/next fallback, legacy /generate, Soru Fabrikası
// yükleyicisi, backfill) bu modülün soruyuDogrula() çağrısını geçmek ZORUNDADIR.
//
// SAĞLAYICI NOTU: üretim doğrulayıcısının istek formatı Gemini generateContent
// şemasına özgüdür. soruyuDogrula İSTEğE BAĞLI provider parametresi kabul eder:
// 'ollama' dalı YALNIZCA yerel script'ler içindir (backfill --provider=ollama —
// kalibrasyon, Gemini kotası olmadan). Üretim çağrıları provider GEÇMEZ ve
// Vercel'de VERIFIER_PROVIDER env yoktur → varsayılan 'gemini' dalı, davranış
// birebir aynı. (openai_uyumlu bağdaştırıcı hâlâ sonra.)
//
// Adil puanlama bağlantısı: bantlar DB'de questions.verification_status'ta
// yaşar; performans istatistikleri yalnız status='active' soruları sayar
// (cift_ai_dogrulama.sql Bölüm 6 — w ağırlığı ileride oraya işlenecek).

import { extractJson, GeminiUpstreamError } from './question-generation';

// Bant etiketleri — TAM OLARAK bu değerler (CHECK kısıtıyla birebir)
export type DogrulamaBanti = 'tam_uyum' | 'kismi_uyum' | 'uyumsuz';

// questions.verification jsonb şeması (kayıt sayısal ve denetlenebilir)
export interface DogrulamaKaydi {
  /** Yapılandırılan kör çözüm sayısı (VERIFIER_N) */
  n: number;
  /** Geçerli (0-4 indeks üreten) çözüm sayısı — -1/arıza sayılmaz */
  n_eff: number;
  /** İddia edilen doğru cevaba uyan geçerli çözüm sayısı */
  k: number;
  /** Uyuşma oranı: k / n_eff (0-1, 2 hane) */
  u: number;
  /** Ham kör çözümler (-1 = doğrulayıcıya göre görsel eksik, çözülemedi) */
  cozumler: number[];
  dogrulayici: { model: string; modelVersion: string; endpoint_base: string };
  esikler: { tam: number; kismi: number };
  temperature: number;
  tarih: string;
  /** 0 = havuz/MEB yüklemesi, 1+ = Gemini fallback yeniden üretim turu */
  uretim_tur: number;
  /** 'dogrulama_eksik' (n_eff<3) | 'esik_alti' (şüpheli bant) */
  neden?: string;
  /** Geçerli çözümlerin harf dağılımı — uyumsuzluk teşhisi için */
  dagilim?: Record<string, number>;
  /** Yalnız ollama dalı: 'CEVAP: X' kalıbı okunamayıp n_eff'ten düşen örnek sayısı */
  gecersiz_ornek?: number;
  /** Admin inceleme kararı (inceleme route'u yazar) */
  insan_onayi?: { karar: string; onceki_bant: string; tarih: string };
}

export interface DogrulamaSonucu {
  bant: DogrulamaBanti;
  kayit: DogrulamaKaydi;
}

export interface VerifierConfig {
  model: string;
  apiKey: string;
  endpointBase: string;
  n: number;
  temperature: number;
  timeoutMs: number;
  tamEsik: number;
  kismiEsik: number;
}

// env → sayı: eksik/geçersiz değer default'a düşer (NaN falsy olduğundan || yeterli)
function sayiEnv(ad: string, varsayilan: number): number {
  const ham = process.env[ad];
  if (ham === undefined || ham.trim() === '') return varsayilan;
  const sayi = Number(ham);
  return Number.isFinite(sayi) ? sayi : varsayilan;
}

/**
 * Doğrulayıcı yapılandırması — hepsi default'lu, Vercel env girişi zorunlu değil.
 * Tek zorunlu değer anahtar: VERIFIER_API_KEY yoksa GEMINI_API_KEY'e düşer;
 * o da yoksa throw (fail-closed — doğrulama sessizce atlanamaz).
 */
export function verifierConfigOku(): VerifierConfig {
  const apiKey = process.env.VERIFIER_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VERIFIER_API_KEY / GEMINI_API_KEY tanımlı değil — doğrulama yapılamaz (fail-closed)');
  }
  return {
    model: process.env.VERIFIER_MODEL || 'gemini-flash-latest',
    apiKey,
    endpointBase: process.env.VERIFIER_ENDPOINT_BASE || 'https://generativelanguage.googleapis.com/v1beta',
    n: Math.min(10, Math.max(1, Math.round(sayiEnv('VERIFIER_N', 5)))),
    temperature: sayiEnv('VERIFIER_TEMPERATURE', 0.5),
    timeoutMs: sayiEnv('VERIFIER_TIMEOUT_MS', 60_000),
    // Eşikler SIKI başlar (patent örneğiyle uyumlu): tam uyum 5/5 (τ₁ = 1.0),
    // 2/5 ve altı uyumsuz (τ₂ = 0.6). Gerçek değerler 41 MEB Din sorusuyla
    // kalibrasyondan sonra belirlenecek (scripts/soru-fabrikasi/dogrulama_backfill.ts).
    tamEsik: sayiEnv('VERIFIER_TAM_ESIK', 1.0),
    kismiEsik: sayiEnv('VERIFIER_KISMI_ESIK', 0.6),
  };
}

/**
 * Kör çözüm prompt'u: soru metni + A-E şıkları. Doğru cevap, açıklama ve
 * ipuçları ASLA verilmez — doğrulayıcı soruyu bir öğrenci gibi çözer.
 * Görsel sorularda çıkış yolu: dogruCevapIndex = -1 (başarısız çözüm;
 * n_eff'ten düşer, soru yanlış cezalandırılmaz).
 */
function korCozumPromptYaz(soruMetni: string, choices: string[]): string {
  const harfler = ['A', 'B', 'C', 'D', 'E'];
  const siklar = choices
    .slice(0, 5)
    .map((s, i) => `${harfler[i]}) ${s}`)
    .join('\n');
  return `Sen YKS (TYT/AYT/YDT) sınavına hazırlıkta uzman bir soru çözücüsün. Aşağıdaki çoktan seçmeli soruyu çöz.

KURALLAR:
- Yalnızca aşağıdaki soru metnine ve şıklarına güven.
- Soru, metinde BULUNMAYAN bir görsel/şekil/tablo/haritaya gönderme yapıyorsa çözülemeyen görsel sorudur: {"dogruCevapIndex": -1} ver.
- Yanıtı SADECE şu JSON şemasında ver, başka hiçbir metin ekleme: {"dogruCevapIndex": 0-4 arası tam sayı} (0=A, 1=B, 2=C, 3=D, 4=E)

SORU:
${soruMetni}

ŞIKLAR:
${siklar}`;
}

interface TekCozumSonucu {
  index: number;
  modelVersion?: string;
}

// Tek kör çözüm çağrısı: fetch + x-goog-api-key header (key URL'de görünmez)
// + AbortSignal.timeout + rastgele seed (question-generation deseni ile aynı).
// Şema dışı yanıt/HTTP hatası throw eder → allSettled'da rejected sayılır.
async function tekKorCozum(config: VerifierConfig, prompt: string): Promise<TekCozumSonucu> {
  const apiUrl = `${config.endpointBase}/models/${config.model}:generateContent`;
  const baslangic = Date.now();

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': config.apiKey,
    },
    signal: AbortSignal.timeout(config.timeoutMs),
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: config.temperature,
        // Her çözümde farklı seed → kör çözümler bağımsız örneklemler olur
        seed: Math.floor(Math.random() * 2147483647),
        // Beklenen çıktı yalnız {"dogruCevapIndex": x} (~20 token) olsa da
        // gemini-flash-latest bir THINKING modeli: düşünme token'ları da bu
        // bütçeden sayılır. 200'de zor sorularda düşünme bütçeyi yiyip yanıt
        // {"dogruCev... diye YARIM dönüyordu → şema dışı yanıt arızası.
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(
      'question-verification: doğrulayıcı upstream hatası:',
      response.status,
      JSON.stringify(errorData).slice(0, 300)
    );
    if (response.status === 401 || response.status === 403) {
      throw new GeminiUpstreamError('Doğrulayıcı API anahtarı geçersiz', 401);
    }
    if (response.status === 429) {
      throw new GeminiUpstreamError('Doğrulayıcı kullanım limiti aşıldı', 429);
    }
    throw new GeminiUpstreamError('Doğrulama çağrısı başarısız', 502);
  }

  const data = (await response.json()) as {
    modelVersion?: string;
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!aiResponse) {
    throw new Error('question-verification: doğrulayıcı boş yanıt döndürdü');
  }

  // Aynı ayrıştırıcı (extractJson): kopya yok, prompt drift yok
  const parsed = extractJson(aiResponse);
  const index: unknown = parsed?.dogruCevapIndex ?? parsed?.correctAnswer;
  if (
    typeof index !== 'number' ||
    !Number.isInteger(index) ||
    index < -1 ||
    index > 4
  ) {
    throw new Error(
      `question-verification: şema dışı çözüm yanıtı: ${aiResponse.substring(0, 120)}`
    );
  }

  console.log(`question-verification: kör çözüm ${Date.now() - baslangic}ms → ${index}`);
  return { index, modelVersion: data.modelVersion };
}

// ===================================
// OLLAMA DALI — YALNIZ YEREL SCRIPT (backfill --provider=ollama)
// ===================================
// Üretim değildir (localhost:11434 Vercel'de yok). Amaç Gemini kotası olmadan
// KALİBRASYON: yerel modeller aynı kör-çözüm protokolüyle ölçülür. Anahtar
// yine ASLA gösterilmez; cevap yalnız metindeki SON 'CEVAP: X' kalıbından okunur.

export const OLLAMA_TABAN = 'http://localhost:11434';

// Spec istemi: çözüm serbest metin, son satırda tek harf. Görsel sorusu için
// ayrı çıkış yolu yok — okunamayan örnek geçersiz sayılır (n_gecerli düşer).
function ollamaCozumPromptYaz(soruMetni: string, choices: string[]): string {
  const harfler = ['A', 'B', 'C', 'D', 'E'];
  const siklar = choices
    .slice(0, 5)
    .map((s, i) => `${harfler[i]}) ${s}`)
    .join('\n');
  return `Bu soruyu adım adım kısaca çöz. Son satıra sadece şunu yaz: CEVAP: X (X yerine A, B, C, D veya E).

Soru: ${soruMetni}

ŞIKLAR:
${siklar}`;
}

// SON 'CEVAP: X' kalıbından harf → 0-4 indeks. Model 'D) 4' gibi uzun yazsa bile
// kalıptan sonraki harf alınır (metnin başındaki harflere bakılmaz).
function ollamaCevapOku(metin: string): number | null {
  const desen = /CEVAP\s*:\s*\**\s*\(?([A-E])\b/gi;
  let eslesme: RegExpExecArray | null;
  let son: RegExpExecArray | null = null;
  while ((eslesme = desen.exec(metin)) !== null) son = eslesme;
  return son ? 'ABCDE'.indexOf(son[1].toUpperCase()) : null;
}

// Tek örnek: kalıpsız yanıt → AYNI örnek en fazla 2 kez daha denenir (3 toplam),
// hâlâ yoksa null (geçersiz örnek). Taşıma/HTTP arızası throw edilir: arıza
// üretimle aynı sözleşmede (GeminiUpstreamError) fail-closed işaretlenir.
async function tekOllamaOrnek(model: string, prompt: string): Promise<number | null> {
  for (let deneme = 1; deneme <= 3; deneme++) {
    let response: Response;
    try {
      response = await fetch(`${OLLAMA_TABAN}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(240_000), // yerel GPU: model yüklenme + ~800 token üretim
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: { temperature: 0.7, num_ctx: 4096, num_predict: 800 },
        }),
      });
    } catch (e) {
      throw new GeminiUpstreamError(
        `Ollama'ya ulaşılamadı (${OLLAMA_TABAN}): ${(e as Error).message}`,
        502,
      );
    }
    if (!response.ok) {
      const govde = await response.text().catch(() => '');
      throw new GeminiUpstreamError(`Ollama HTTP ${response.status}: ${govde.slice(0, 150)}`, 502);
    }
    const data = (await response.json()) as { response?: string };
    const index = ollamaCevapOku(data.response ?? '');
    if (index !== null) return index;
    if (deneme < 3) {
      console.warn(`  ollama[${model}]: CEVAP kalıbı yok (deneme ${deneme}/3) — aynı örnek tekrar`);
    }
  }
  return null;
}

async function ollamaIleDogrula(
  params: { question: string; choices: string[]; correctAnswer: number; uretimTur: number },
  model: string,
): Promise<DogrulamaSonucu> {
  if (!model) {
    throw new Error('ollama sağlayıcısı için model gerekli (--model veya OLLAMA_VERIFIER_MODEL)');
  }
  // API anahtarı GEREKMEZ (verifierConfigOku çağrılmaz); n ve eşikler aynı env default'ları
  const n = Math.min(10, Math.max(1, Math.round(sayiEnv('VERIFIER_N', 5))));
  const tamEsik = sayiEnv('VERIFIER_TAM_ESIK', 1.0);
  const kismiEsik = sayiEnv('VERIFIER_KISMI_ESIK', 0.6);
  const prompt = ollamaCozumPromptYaz(params.question, params.choices);

  // SIRALI örnekler — 6GB VRAM: model zaten yüklü, paralel istek KV cache'i bölmez
  const cozumler: number[] = [];
  let gecersizOrnek = 0;
  for (let i = 0; i < n; i++) {
    const ornek = await tekOllamaOrnek(model, prompt);
    cozumler.push(ornek ?? -1);
    if (ornek === null) gecersizOrnek++;
  }

  const gecerli = cozumler.filter((i) => i >= 0 && i <= 4);
  const n_eff = gecerli.length;
  if (n_eff === 0) {
    // Tek okunabilir cevap yok — model/istem uyumsuzluğu: fail-closed (hata kaydı,
    // bant YAZILMAZ; küçük bir modelin tüm havuzu 'uyumsuz'la zehirlemesinin önü kesilir)
    throw new GeminiUpstreamError(
      `Ollama hiç geçerli CEVAP döndürmedi (n_gecerli=0, model=${model})`,
      502,
    );
  }

  const k = gecerli.filter((i) => i === params.correctAnswer).length;
  const u = Math.round((k / n_eff) * 100) / 100;

  // Bant eşikleri Gemini dalıyla AYNI (dokunulmaz): n_eff<3 → kismi+dogrulama_eksik
  let bant: DogrulamaBanti;
  let neden: string | undefined;
  if (n_eff < 3) {
    bant = 'kismi_uyum';
    neden = 'dogrulama_eksik';
  } else if (u >= tamEsik) {
    bant = 'tam_uyum';
  } else if (u >= kismiEsik) {
    bant = 'kismi_uyum';
    neden = 'esik_alti';
  } else {
    bant = 'uyumsuz';
  }

  const harfler = ['A', 'B', 'C', 'D', 'E'];
  const dagilim: Record<string, number> = {};
  for (const i of gecerli) {
    const harf = harfler[i] ?? String(i);
    dagilim[harf] = (dagilim[harf] ?? 0) + 1;
  }

  const kayit: DogrulamaKaydi = {
    n,
    n_eff,
    k,
    u,
    cozumler,
    dogrulayici: { model, modelVersion: model, endpoint_base: OLLAMA_TABAN },
    esikler: { tam: tamEsik, kismi: kismiEsik },
    temperature: 0.7,
    tarih: new Date().toISOString(),
    uretim_tur: params.uretimTur,
    ...(neden ? { neden } : {}),
    dagilim,
    ...(gecersizOrnek > 0 ? { gecersiz_ornek: gecersizOrnek } : {}),
  };

  console.log(
    `question-verification[ollama:${model}]: bant=${bant} k=${k}/${n_eff} (n=${n}, geçersiz=${gecersizOrnek}) U=${u}`
  );
  return { bant, kayit };
}

/**
 * Bir soruyu çift-AI doğrulamadan geçirir: n paralel kör çözüm → n_eff, k, U
 * hesapları + bant kararı + tam jsonb kayıt. Bant eşikleri env'den gelir ve
 * kayıtlara yazılır (sonradan kalibrasyonla değişirse geçmiş karşılaştırılabilir).
 *
 * n_eff = 0 → GeminiUpstreamError('Doğrulama yapılamadı', 502): altyapı arızası,
 * fail-closed — sorusuz/etiketsiz soru üretilmez.
 * n_eff < 3 → 'kismi_uyum' + neden 'dogrulama_eksik': ağ arızası soruyu
 * cezalandırmaz, insan inceleme kuyruğuna düşer.
 */
export async function soruyuDogrula(params: {
  question: string;
  choices: string[];
  correctAnswer: number;
  /** 0 = havuz/MEB yüklemesi, 1+ = fallback yeniden üretim turu */
  uretimTur: number;
  /** Varsayılan: env VERIFIER_PROVIDER==='ollama' ise ollama, değilse gemini.
   *  Üretim çağrıları parametre GEÇMEZ → 'gemini' dalı, davranış değişmez. */
  provider?: 'gemini' | 'ollama';
  /** provider='ollama' için model adı (yoksa OLLAMA_VERIFIER_MODEL env) */
  ollamaModel?: string;
}): Promise<DogrulamaSonucu> {
  if (
    (params.provider ?? (process.env.VERIFIER_PROVIDER === 'ollama' ? 'ollama' : 'gemini')) ===
    'ollama'
  ) {
    return ollamaIleDogrula(params, params.ollamaModel ?? process.env.OLLAMA_VERIFIER_MODEL ?? '');
  }
  const config = verifierConfigOku();
  const prompt = korCozumPromptYaz(params.question, params.choices);

  // n paralel kör çözüm; tekil arızalar sonucu bozmaz (allSettled)
  const denemeler = await Promise.allSettled(
    Array.from({ length: config.n }, () => tekKorCozum(config, prompt))
  );

  const cozumler: number[] = [];
  let modelVersion: string | undefined;
  for (const deneme of denemeler) {
    if (deneme.status === 'fulfilled') {
      cozumler.push(deneme.value.index);
      modelVersion ??= deneme.value.modelVersion;
    } else {
      console.error(
        'question-verification: tek kör çözüm başarısız:',
        deneme.reason instanceof Error ? deneme.reason.message : deneme.reason
      );
    }
  }

  // Geçerli çözüm: 0-4. (-1 = görsel eksik; ağ arızası gibi n_eff'ten düşer.)
  const gecerli = cozumler.filter((i) => i >= 0 && i <= 4);
  const n_eff = gecerli.length;

  if (n_eff === 0) {
    // Altyapı arızası — fail-closed. Ancak durum kodunu KORU: tüm çözümler
    // 429'a düştüyse 429 fırlat (backfill'in bekle-tekrar döngüsü kota
    // nabzına göre bekler; 502'ye sarılırsa bu şans kaybolur).
    const hepsi429 =
      denemeler.length > 0 &&
      denemeler.every(
        (d) =>
          d.status === 'rejected' &&
          d.reason instanceof GeminiUpstreamError &&
          d.reason.status === 429
      );
    throw new GeminiUpstreamError(
      hepsi429 ? 'Doğrulayıcı kullanım limiti aşıldı' : 'Doğrulama yapılamadı',
      hepsi429 ? 429 : 502
    );
  }

  const k = gecerli.filter((i) => i === params.correctAnswer).length;
  const u = Math.round((k / n_eff) * 100) / 100;

  let bant: DogrulamaBanti;
  let neden: string | undefined;
  if (n_eff < 3) {
    bant = 'kismi_uyum';
    neden = 'dogrulama_eksik';
  } else if (u >= config.tamEsik) {
    bant = 'tam_uyum';
  } else if (u >= config.kismiEsik) {
    bant = 'kismi_uyum';
    neden = 'esik_alti';
  } else {
    bant = 'uyumsuz';
  }

  // Harf dağılımı — uyumsuz satırlarda teşhis malzemesi
  const harfler = ['A', 'B', 'C', 'D', 'E'];
  const dagilim: Record<string, number> = {};
  for (const i of gecerli) {
    const harf = harfler[i] ?? String(i);
    dagilim[harf] = (dagilim[harf] ?? 0) + 1;
  }

  const kayit: DogrulamaKaydi = {
    n: config.n,
    n_eff,
    k,
    u,
    cozumler,
    dogrulayici: {
      model: config.model,
      modelVersion: modelVersion ?? config.model,
      endpoint_base: config.endpointBase,
    },
    esikler: { tam: config.tamEsik, kismi: config.kismiEsik },
    temperature: config.temperature,
    tarih: new Date().toISOString(),
    uretim_tur: params.uretimTur,
    ...(neden ? { neden } : {}),
    dagilim,
  };

  console.log(
    `question-verification: bant=${bant} k=${k}/${n_eff} (n=${config.n}) U=${u} ` +
    `tur=${params.uretimTur} — "${params.question.substring(0, 60)}..."`
  );

  return { bant, kayit };
}
