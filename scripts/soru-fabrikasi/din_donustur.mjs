// Soru Fabrikası Adım 3 — ayıklanmış MEB sorularını ALGORA formatına dönüştürür.
// Girdi: cikti/din_sorular.json (din_ayikla.mjs çıktısı)
// Çıktı: cikti/din_algora.json — Gemini soruyu ÇÖZER (doğru cevap MEB PDF'inde yok!),
//        tam açıklama + 3 Sokratik ipucu üretir, konuyu syllabus listesinden seçer.
// Şık metinleri DEĞİŞTİRİLMEZ — orijinal MEB metni korunur.
// DB'ye dokunmaz. Yeniden çalıştırılabilir: tamamlanmış sorular atlanır.
//
// Kullanım: node scripts/soru-fabrikasi/din_donustur.mjs [adet]
//   adet: ilk N soru (pilot için); verilmezse hepsi.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const GIRDI = 'scripts/soru-fabrikasi/cikti/din_sorular.json';
const CIKTI = 'scripts/soru-fabrikasi/cikti/din_algora.json';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent';

// lib/constants/syllabus.ts — Din Kültürü konuları (havuz eşleşmesi birebir ister)
const DIN_KONULARI = [
  'Bilgi ve İnanç', 'Din ve İslam', 'İslam ve İbadet', 'Gençlik ve Değerler',
  'Allah İnancı', "İslam'da İbadetler", "Hz. Muhammed'in Hayatı", 'Vahiy ve Akıl',
];

function promptYaz(soru) {
  const siklar = soru.siklar.map((s, i) => `${'ABCDE'[i]}) ${s}`).join('\n');
  return `Aşağıda MEB TYT Din Kültürü ve Ahlak Bilgisi ${soru.yil} çıkmış sorusu vardır (orijinal metin ve şıklarıyla).

GÖREVLERİN:
1. Soruyu ÇÖZ. Doğru şıkkın indeksini "dogruIndex" olarak ver (A=0, B=1, C=2, D=3, E=4).
2. "aciklama": adım adım TAM çözüm yaz (neden doğru şık doğru, diğer çeldiriciler neden elenir).
3. "ipuclari": tam olarak 3 Sokratik ipucu. ALTIN KURAL: ipuçları doğru cevabı ASLA İFŞA ETMEZ ve hangi şıka işaret ettiği anlaşılmaz; sadece yönlendirici soru/tavsiye verilir. 1. ipucu en genel, 3. ipucu en somut olsun.
4. "konu": SADECE şu listeden en uygun olanı seç (birebir yaz): ${DIN_KONULARI.join(' | ')}
5. "zorluk": "beginner", "intermediate" veya "advanced" (TYT DKAB sorularının genel zorluğuna göre).
6. "resimGerekli": Soru bir harita/şekil/resim REFERANS EDİYORSA ve metin alone başına çözülemiyorsa true; metinden çözülebiliyorsa false.

Yalnızca şu JSON şemasında yanıt ver:
{"dogruIndex": 0-4 arası tam sayı, "aciklama": "...", "ipuclari": ["...","...","..."], "konu": "...", "zorluk": "...", "resimGerekli": false}

SORU (${soru.yil}-${soru.oturum}):
${soru.govde}

ŞIKLAR:
${siklar}`;
}

function dogrula(yanit, soru) {
  const hatalar = [];
  if (!Number.isInteger(yanit.dogruIndex) || yanit.dogruIndex < 0 || yanit.dogruIndex > 4) hatalar.push('dogruIndex geçersiz');
  if (typeof yanit.aciklama !== 'string' || yanit.aciklama.trim().length < 30) hatalar.push('aciklama çok kısa');
  if (!Array.isArray(yanit.ipuclari) || yanit.ipuclari.length !== 3 || yanit.ipuclari.some((h) => typeof h !== 'string' || h.trim().length < 10)) hatalar.push('ipuclari 3 adet ve dolu olmalı');
  if (!DIN_KONULARI.includes(yanit.konu)) hatalar.push(`konu listede değil: ${yanit.konu}`);
  if (!['beginner', 'intermediate', 'advanced'].includes(yanit.zorluk)) hatalar.push('zorluk geçersiz');
  return hatalar;
}

async function main() {
  const adet = process.argv[2] ? Number(process.argv[2]) : Infinity;
  const sorular = JSON.parse(readFileSync(GIRDI, 'utf8')).slice(0, adet);

  const env = readFileSync('.env.local', 'utf8');
  const apiKey = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY .env.localde yok');

  const mevcut = existsSync(CIKTI) ? JSON.parse(readFileSync(CIKTI, 'utf8')) : [];
  const tamamlanan = new Set(mevcut.map((m) => m.no));

  for (const soru of sorular) {
    if (tamamlanan.has(soru.no)) { console.log(`soru ${soru.no}: zaten tamam, atlanıyor`); continue; }

    let yanit = null;
    for (let deneme = 1; deneme <= 2 && !yanit; deneme++) {
      try {
        const r = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          signal: AbortSignal.timeout(60_000),
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: promptYaz(soru) }] }],
            generationConfig: {
              temperature: 0.3, // çözüm doğruluğu öncelikli — çeşitlilik değil
              maxOutputTokens: 2000,
              responseMimeType: 'application/json',
            },
          }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
        const data = await r.json();
        const metin = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
        yanit = JSON.parse(metin);
      } catch (e) {
        console.error(`soru ${soru.no} deneme ${deneme} HATA: ${e.message}`);
        await new Promise((ok) => setTimeout(ok, 2000));
      }
    }

    if (!yanit) { console.error(`soru ${soru.no}: BAŞARISIZ — sonra tekrar dene`); continue; }

    const hatalar = dogrula(yanit, soru);
    if (hatalar.length) {
      console.error(`soru ${soru.no}: DOĞRULAMA HATASI — ${hatalar.join('; ')}`);
      continue;
    }

    mevcut.push({
      no: soru.no,
      yil: soru.yil,
      oturum: soru.oturum,
      sayfa: soru.sayfa,
      konu: yanit.konu,
      zorluk: yanit.zorluk,
      dogruIndex: yanit.dogruIndex,
      resimGerekli: !!yanit.resimGerekli,
      aciklama: yanit.aciklama.trim(),
      ipuclari: yanit.ipuclari.map((h) => h.trim()),
      // Orijinal MEB metni — şıklar ASLA yeniden yazılmaz
      question_text: soru.govde,
      choices: soru.siklar,
    });
    // Her soruda kaydet — yarıda kesilirse kayıp yok
    writeFileSync(CIKTI, JSON.stringify(mevcut, null, 2), 'utf8');
    console.log(`soru ${soru.no} ✓ ${yanit.konu} | doğru: ${'ABCDE'[yanit.dogruIndex]} | ${yanit.zorluk}${yanit.resimGerekli ? ' | ⚠ resim gerekli' : ''}`);
  }

  console.log(`\nToplam dönüştürülen: ${mevcut.length}/${sorular.length} → ${CIKTI}`);
}

main().catch((e) => { console.error('HATA:', e.message); process.exit(1); });
