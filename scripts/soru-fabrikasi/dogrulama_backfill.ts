// ===================================
// Çift-AI Doğrulama Backfill + Kalibrasyon
// ===================================
// Mevcut havuzdaki doğrulanmamış soruları (status='active' AND
// verification_status IS NULL AND clone_of IS NULL AND intended_for IS NULL —
// ~41 MEB Din + ~16 Gemini fallback satırı) ikinci AI'la n=5 kör çözümle
// doğrular, bantlarını yazar ve KALİBRASYON raporunu üretir.
//
// KRİTİK BAĞLAM (kalibrasyonun temeli): havuzdaki Din sorularının kayıtlı
// doğru cevabı MEB resmî anahtarından DEĞİL, din_donustur.mjs'in Gemini
// çözümünden gelir ("Gemini soruyu ÇÖZER — doğru cevap MEB PDF'inde yok!").
// Dolayısıyla buradaki U oranı "doğrulayıcı konsensüsü vs Gemini iddiası"dır;
// resmî gerçeğe kalibrasyon için CSV'deki resmi_dogru_cevap kolonu
// PDF'teki (s.33) anahtarla doldurulmalıdır (boş bırakıldı — kullanıcı
// doldurur; istenirse pdf-parse ile otomatik çıkarım sonraki adım olabilir).
//
// VARSAYILAN DRY-RUN: doğrulama ÇALIŞIR (Gemini çağrılır, ~n×5 kısa flash),
// DB'ye YAZMAZ, durum + kalibrasyon CSV'si üretilir. --yaz ile PATCH.
// Dayanıklılık: 429'da 60 sn bekle-tekrar (soruya bağlı), istek arası 1 sn,
// resume (cikti/dogrulama_backfill_durum.json — hatalar sonraki çalışmada tekrar denenir).
//
// Kullanım:
//   npx tsx scripts/soru-fabrikasi/dogrulama_backfill.ts           → dry-run
//   npx tsx scripts/soru-fabrikasi/dogrulama_backfill.ts --yaz     → DB PATCH
//
// OLLAMA MODU (yerel denetleyici — Gemini kotası yok, DB'ye hâlâ yalnız --yaz ile):
//   npx tsx scripts/soru-fabrikasi/dogrulama_backfill.ts \
//     --provider=ollama --model=gemma3:4b[,qwen2.5:7b] [--meb] [--limit=3] [--yaz]
//   Modeller SIRALI çalışır (6GB VRAM — aynı anda ikisi yüklenmez); her model
//   kendi durum (resume) dosyasını ve cikti/dogrulama_kalibrasyon_<model>.csv
//   dosyasını üretir. --meb yalnız MEB etiketli (iz'li) adaylara iner.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import {
  soruyuDogrula,
  OLLAMA_TABAN,
  type DogrulamaKaydi,
  type DogrulamaBanti,
} from '../../lib/question-verification';
import { GeminiUpstreamError } from '../../lib/question-generation';

const SUPABASE_URL = 'https://nfdjxwmhvalwokzyyvre.supabase.co';
const DURUM_DOSYASI = 'scripts/soru-fabrikasi/cikti/dogrulama_backfill_durum.json';
const CSV_DOSYASI = 'scripts/soru-fabrikasi/cikti/dogrulama_kalibrasyon.csv';
const GERCEK_YAZIM = process.argv.includes('--yaz');

// ——— Ollama modu bayrakları (yalnız yerel çalıştırma) ———
const bayrakDegeri = (ad: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${ad}=`))?.split('=').slice(1).join('=');
const OLLAMA_MODU = bayrakDegeri('provider') === 'ollama';
const MODELLER = (bayrakDegeri('model') ?? process.env.OLLAMA_VERIFIER_MODEL ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const LIMIT = Math.max(1, Number.parseInt(bayrakDegeri('limit') ?? '', 10) || Number.MAX_SAFE_INTEGER);
const SADECE_MEB = process.argv.includes('--meb');
// Dosya adlarında ':' Windows'ta yasak → gemma3:4b → gemma3-4b
const dosyaGuvende = (model: string): string => model.replace(/[^a-zA-Z0-9._-]/g, '-');

const ISTEK_ARASI_BEKLEME_MS = 75_000; // soru başına 5 paralel çağrı → ~4 istek/dk ort., 5'li burst (gemini-flash-latest ücretsiz katman RPM dar: 10/dk — 30sn'de 429'a düşüyordu)
const BEKLE_429_MS = 60_000;
const MAX_429_DENEME = 5;
// Art arda bu kadar soru TÜMÜ-429'la dönerse kota dolu demektir: 90 soru ×
// 5 deneme × 60 sn bekleme yerine çalışmayı kibarca durdur (resume sonraki
// günde kalanları tekrar dener).
const KOTA_DOLU_ESIK = 3;

// Durum dosyası: id → doğrulama sonucu (yazildi=false → --yaz çalışması yazar)
interface DurumGirdisi {
  iz: string;
  ders: string;
  konu: string;
  kayitliCevap: string;
  bant?: DogrulamaBanti;
  kayit?: DogrulamaKaydi;
  yazildi?: boolean;
  hata?: string;
  tarih?: string;
}
type DurumHaritasi = Record<string, DurumGirdisi>;

const bekla = (ms: number) => new Promise((r) => setTimeout(r, ms));

// MEB iz etiketi (örn. MEB-DIN-2022-5); yoksa boş (Gemini fallback soruları)
function izBul(tags: string[] | null): string {
  return (tags ?? []).find((t) => /^MEB-[A-Z]+-\d{4}-\d+$/.test(t)) ?? '';
}

function csvAlan(deger: string | number): string {
  const s = String(deger);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Kör çözümleri harf dizgesine çevir (-1 = görsel/çözülemedi)
// ayrac: Gemini CSV ';' | Ollama CSV '|' (spec)
function cozumHarfleri(cozumler: number[], ayrac = ';'): string {
  const harfler = ['A', 'B', 'C', 'D', 'E'];
  return cozumler.map((i) => (i >= 0 && i <= 4 ? harfler[i] : '-')).join(ayrac);
}

// ——— OLLAMA MODU: sıralı model akışı (üretim/Gemini yolu main() içinde değişmeden durur) ———

interface AdaySoru {
  id: string;
  tags: string[] | null;
  subject: string;
  topic: string;
  correct_answer: number;
  question_text: string;
  choices: string[];
}

function sureYaz(ms: number): string {
  const sn = ms / 1000;
  return sn >= 60 ? `${Math.floor(sn / 60)}dk ${Math.round(sn % 60)}sn` : `${sn.toFixed(1)}sn`;
}

async function modeliCalistir(model: string, adaylar: AdaySoru[], okumaHeaders: HeadersInit): Promise<void> {
  const guvenliAd = dosyaGuvende(model);
  const durumDosyasi = `scripts/soru-fabrikasi/cikti/dogrulama_backfill_durum_ollama_${guvenliAd}.json`;
  const csvDosyasi = `scripts/soru-fabrikasi/cikti/dogrulama_kalibrasyon_${guvenliAd}.csv`;

  const durum: DurumHaritasi = existsSync(durumDosyasi)
    ? JSON.parse(readFileSync(durumDosyasi, 'utf8'))
    : {};

  const modelBaslangic = Date.now();
  let islenen = 0;
  for (const q of adaylar) {
    islenen++;
    const iz = izBul(q.tags);
    const etiket = iz || q.id.slice(0, 8);

    const onceki = durum[q.id];
    if (onceki?.bant) {
      console.log(`[${islenen}/${adaylar.length}] ${etiket} durum dosyasında mevcut — atlandı`);
      continue;
    }

    process.stdout.write(`[${islenen}/${adaylar.length}] ${etiket} (${model}) doğrulanıyor... `);
    const soruBaslangic = Date.now();
    try {
      const sonuc = await soruyuDogrula({
        question: q.question_text,
        choices: q.choices,
        correctAnswer: q.correct_answer,
        uretimTur: 0,
        provider: 'ollama',
        ollamaModel: model,
      });
      console.log(
        `${sureYaz(Date.now() - soruBaslangic)} — bant=${sonuc.bant} k=${sonuc.kayit.k}/${sonuc.kayit.n_eff} ` +
        `U=${sonuc.kayit.u} gecersiz_ornek=${sonuc.kayit.gecersiz_ornek ?? 0} ` +
        `cozumler=${cozumHarfleri(sonuc.kayit.cozumler, '|')}`
      );
      durum[q.id] = {
        iz,
        ders: q.subject,
        konu: q.topic,
        kayitliCevap: 'ABCDE'[q.correct_answer] ?? '?',
        bant: sonuc.bant,
        kayit: sonuc.kayit,
        yazildi: false,
        tarih: new Date().toISOString(),
      };
    } catch (e) {
      const mesaj = e instanceof Error ? e.message : String(e);
      console.log(`✗ ${sureYaz(Date.now() - soruBaslangic)} — arıza: ${mesaj}`);
      durum[q.id] = {
        ...(onceki ?? {}),
        iz,
        ders: q.subject,
        konu: q.topic,
        kayitliCevap: 'ABCDE'[q.correct_answer] ?? '?',
        hata: mesaj,
        tarih: new Date().toISOString(),
      };
    }
    writeFileSync(durumDosyasi, JSON.stringify(durum, null, 2));

    // --yaz: Gemini yoluyla AYNI DB sözleşmesi (uyumsuz → rejected); dry-run'da dokunulmaz
    const girdi = durum[q.id];
    if (GERCEK_YAZIM && girdi?.bant && girdi.kayit && !girdi.yazildi) {
      const patch = girdi.bant === 'uyumsuz'
        ? { verification_status: girdi.bant, verification: girdi.kayit, status: 'rejected' }
        : { verification_status: girdi.bant, verification: girdi.kayit };
      const p = await fetch(`${SUPABASE_URL}/rest/v1/questions?id=eq.${q.id}`, {
        method: 'PATCH',
        headers: { ...okumaHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(patch),
      });
      if (!p.ok) {
        console.error(`  ❌ PATCH başarısız: HTTP ${p.status} — ${(await p.text()).slice(0, 200)}`);
      } else {
        girdi.yazildi = true;
      }
      writeFileSync(durumDosyasi, JSON.stringify(durum, null, 2));
    }
  }

  // Spec CSV: resmi_dogru_cevap + resmi_fark BOŞ — kullanıcı PDF (s.33) anahtarından doldurur
  const dogrulanmis = Object.entries(durum).filter(([, d]) => d.bant && d.kayit) as Array<
    [string, DurumGirdisi & { bant: DogrulamaBanti; kayit: DogrulamaKaydi }]
  >;
  dogrulanmis.sort((a, b) => a[1].kayit.u - b[1].kayit.u || a[0].localeCompare(b[0]));
  const basliklar = [
    'soru_id', 'uretici_anahtari', 'denetleyici_cevaplari', 'k', 'n_gecerli', 'U', 'bant',
    'resmi_dogru_cevap', 'resmi_fark',
  ];
  const satirlar = dogrulanmis.map(([id, d]) => [
    csvAlan(id),
    d.kayitliCevap,
    csvAlan(cozumHarfleri(d.kayit.cozumler, '|')),
    d.kayit.k,
    d.kayit.n_eff,
    d.kayit.u.toFixed(2),
    d.bant,
    '', // resmi_dogru_cevap
    '', // resmi_fark
  ].join(','));
  writeFileSync(csvDosyasi, `${basliklar.join(',')}\n${satirlar.join('\n')}\n`);

  const bantSayaci: Record<string, number> = {};
  for (const [, d] of dogrulanmis) bantSayaci[d.bant] = (bantSayaci[d.bant] ?? 0) + 1;
  const hataSayisi = Object.values(durum).filter((d) => d.hata).length;
  console.log(
    `\n📊 [${model}] kalibrasyon CSV: ${csvDosyasi} (${dogrulanmis.length} satır, U artan) — model süresi: ${sureYaz(Date.now() - modelBaslangic)}`
  );
  console.log(
    `   Bantlar: ${JSON.stringify(bantSayaci)} | arızalı: ${hataSayisi}${hataSayisi ? ' (resume ile yeniden denenir)' : ''}`
  );
}

async function ollamaModu(): Promise<void> {
  if (MODELLER.length === 0) {
    throw new Error('--model=gemma3:4b[,qwen2.5:7b] gerekli (veya OLLAMA_VERIFIER_MODEL env)');
  }
  // Nabız + kurulu model doğrulaması — sıralı akış ORTASINDA değil başta keşfedilsin
  const nabiz = await fetch(`${OLLAMA_TABAN}/api/tags`).catch(() => null);
  if (!nabiz?.ok) throw new Error(`Ollama erişilemiyor (${OLLAMA_TABAN}) — 'ollama serve' açık mı?`);
  const kurulu = new Set(
    ((await nabiz.json()) as { models?: Array<{ name: string }> }).models?.map((m) => m.name) ?? []
  );
  for (const m of MODELLER) {
    if (!kurulu.has(m)) {
      throw new Error(`Model kurulu değil: ${m} — kurulu olanlar: ${[...kurulu].join(', ')}`);
    }
  }

  const env = readFileSync('.env.local', 'utf8');
  const key = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)?.[1]?.trim();
  if (!key) throw new Error('Service key bulunamadı');
  const okumaHeaders = { apikey: key, Authorization: `Bearer ${key}` };

  const adayUrl =
    `${SUPABASE_URL}/rest/v1/questions?select=id,tags,subject,topic,correct_answer,question_text,choices` +
    `&status=eq.active&verification_status=is.null&clone_of=is.null&intended_for=is.null` +
    `&order=created_at.asc`;
  const adaylarR = await fetch(adayUrl, { headers: okumaHeaders });
  if (!adaylarR.ok) throw new Error(`Aday sorgusu başarısız: HTTP ${adaylarR.status}`);
  let adaylar = (await adaylarR.json()) as AdaySoru[];
  if (SADECE_MEB) adaylar = adaylar.filter((q) => izBul(q.tags) !== '');
  adaylar = adaylar.slice(0, LIMIT);

  console.log(
    `${GERCEK_YAZIM ? '🔴 GERÇEK YAZIM (--yaz)' : '🔵 DRY-RUN (DB yazılmaz)'} — ollama modu ` +
    `[${MODELLER.join(' → ')} sıralı] — ${adaylar.length} aday${SADECE_MEB ? ' (yalnız MEB)' : ''}\n`
  );

  const genelBaslangic = Date.now();
  for (const model of MODELLER) {
    await modeliCalistir(model, adaylar, okumaHeaders);
  }
  console.log(`\n⏱ GENEL TOPLAM: ${sureYaz(Date.now() - genelBaslangic)} (${MODELLER.length} model sıralı)`);
}

async function soruDogrulaDayanikli(params: {
  question: string;
  choices: string[];
  correctAnswer: number;
}): Promise<{ bant: DogrulamaBanti; kayit: DogrulamaKaydi }> {
  for (let deneme = 1; deneme <= MAX_429_DENEME; deneme++) {
    try {
      const sonuc = await soruyuDogrula({ ...params, uretimTur: 0 });
      return sonuc;
    } catch (e) {
      // 429 (kota) ve 503 (model aşırı yükü — "high demand") GEÇİCİ: bekle-tekrar.
      const gecici =
        e instanceof GeminiUpstreamError && (e.status === 429 || e.status === 503);
      if (!gecici || deneme === MAX_429_DENEME) throw e;
      console.warn(
        `  ⏳ HTTP ${e.status} — ${BEKLE_429_MS / 1000} sn beklenip yeniden deneniyor (${deneme}/${MAX_429_DENEME})`
      );
      await bekla(BEKLE_429_MS);
    }
  }
  throw new Error('ulaşılmaz'); // TypeScript akış analizi için
}

async function main() {
  if (OLLAMA_MODU) return ollamaModu();
  const env = readFileSync('.env.local', 'utf8');
  const key = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)?.[1]?.trim();
  if (!key) throw new Error('Service key bulunamadı');
  const okumaHeaders = { apikey: key, Authorization: `Bearer ${key}` };

  const geminiKey = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
  if (!geminiKey) throw new Error('GEMINI_API_KEY .env.localde yok — doğrulama yapılamaz');
  process.env.GEMINI_API_KEY ??= geminiKey;

  // 1. Adaylar: aktif, doğrulanmamış, kök, genel havuz
  const adayUrl =
    `${SUPABASE_URL}/rest/v1/questions?select=id,tags,subject,topic,correct_answer,question_text,choices` +
    `&status=eq.active&verification_status=is.null&clone_of=is.null&intended_for=is.null` +
    `&order=created_at.asc`;
  const adaylarR = await fetch(adayUrl, { headers: okumaHeaders });
  if (!adaylarR.ok) throw new Error(`Aday sorgusu başarısız: HTTP ${adaylarR.status}`);
  const adaylar = (await adaylarR.json()) as Array<{
    id: string;
    tags: string[] | null;
    subject: string;
    topic: string;
    correct_answer: number;
    question_text: string;
    choices: string[];
  }>;
  console.log(`${GERCEK_YAZIM ? '🔴 GERÇEK YAZIM (--yaz)' : '🔵 DRY-RUN (DB yazılmaz)'} — ${adaylar.length} aday soru\n`);

  // 2. Resume: önceki durum dosyası
  const durum: DurumHaritasi = existsSync(DURUM_DOSYASI)
    ? JSON.parse(readFileSync(DURUM_DOSYASI, 'utf8'))
    : {};

  let islenen = 0;
  let ustUste429 = 0;
  let kotaDolu = false;
  for (const q of adaylar) {
    islenen++;
    const iz = izBul(q.tags);
    const etiket = iz || q.id.slice(0, 8);

    const onceki = durum[q.id];
    if (onceki?.bant && onceki.yazildi) {
      console.log(`[${islenen}/${adaylar.length}] ${etiket} zaten doğrulanmış ve yazılmış — atlandı`);
      continue;
    }
    if (onceki?.bant && !GERCEK_YAZIM) {
      console.log(`[${islenen}/${adaylar.length}] ${etiket} durum dosyasında mevcut (dry-run) — atlandı`);
      continue;
    }

    // 3. Doğrula (n=5 kör çözüm) — 429'da bekle-tekrar
    process.stdout.write(`[${islenen}/${adaylar.length}] ${etiket} doğrulanıyor... `);
    let sonuc: { bant: DogrulamaBanti; kayit: DogrulamaKaydi };
    try {
      sonuc = await soruDogrulaDayanikli({
        question: q.question_text,
        choices: q.choices,
        correctAnswer: q.correct_answer,
      });
      ustUste429 = 0;
    } catch (e) {
      const mesaj = e instanceof Error ? e.message : String(e);
      console.log(`✗ arıza: ${mesaj}`);

      // TÜMÜ-geçici-hata (429 kota / 503 yüksek talep) art arda KOTA_DOLU_ESIK
      // soruyu aşarsa sağlayıcı tarafı darboğaz: dur, resume ile sonra devam
      if (e instanceof GeminiUpstreamError && (e.status === 429 || e.status === 503)) {
        ustUste429++;
        if (ustUste429 >= KOTA_DOLU_ESIK) {
          console.log(`\n⛔ ${KOTA_DOLU_ESIK} soru üst üste kullanım limitine çarptı — doğrulayıcı kotası dolu görünüyor.`);
          console.log('   Çalışma durduruldu; kota resetlenince yeniden çalıştırın (resume kalanları tekrar dener).');
          kotaDolu = true;
          break;
        }
      } else {
        ustUste429 = 0;
      }
      durum[q.id] = {
        ...(onceki ?? {}),
        iz,
        ders: q.subject,
        konu: q.topic,
        kayitliCevap: 'ABCDE'[q.correct_answer] ?? '?',
        hata: mesaj,
        tarih: new Date().toISOString(),
      };
      writeFileSync(DURUM_DOSYASI, JSON.stringify(durum, null, 2));
      await bekla(ISTEK_ARASI_BEKLEME_MS);
      continue;
    }

    durum[q.id] = {
      iz,
      ders: q.subject,
      konu: q.topic,
      kayitliCevap: 'ABCDE'[q.correct_answer] ?? '?',
      bant: sonuc.bant,
      kayit: sonuc.kayit,
      yazildi: false,
      tarih: new Date().toISOString(),
    };
    console.log(`bant=${sonuc.bant} k=${sonuc.kayit.k}/${sonuc.kayit.n_eff} U=${sonuc.kayit.u} cozumler=${cozumHarfleri(sonuc.kayit.cozumler)}`);

    // 4. --yaz: PATCH — uyumsuz → status='rejected' (CHECK bütünlüğü zorunlu kılar)
    if (GERCEK_YAZIM) {
      const patch = sonuc.bant === 'uyumsuz'
        ? { verification_status: sonuc.bant, verification: sonuc.kayit, status: 'rejected' }
        : { verification_status: sonuc.bant, verification: sonuc.kayit };
      const p = await fetch(`${SUPABASE_URL}/rest/v1/questions?id=eq.${q.id}`, {
        method: 'PATCH',
        headers: { ...okumaHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(patch),
      });
      if (!p.ok) {
        console.error(`  ❌ PATCH başarısız: HTTP ${p.status} — ${(await p.text()).slice(0, 200)}`);
      } else {
        durum[q.id].yazildi = true;
      }
    }

    writeFileSync(DURUM_DOSYASI, JSON.stringify(durum, null, 2));
    await bekla(ISTEK_ARASI_BEKLEME_MS);
  }

  // 5. KALİBRASYON CSV — U'ya göre ARTAN sıralı (en şüpheli en üstte).
  //    RESMI_DOGRU_CEVAAP + RESMI_FARK kolonları BOŞ: kullanıcı PDF (s.33)
  //    resmî anahtarından doldurur → kayıtlı (Gemini) cevapla karşılaştırma.
  const dogrulanmis = Object.entries(durum).filter(([, d]) => d.bant && d.kayit) as Array<
    [string, DurumGirdisi & { bant: DogrulamaBanti; kayit: DogrulamaKaydi }]
  >;
  dogrulanmis.sort((a, b) => a[1].kayit.u - b[1].kayit.u || a[0].localeCompare(b[0]));

  const basliklar = [
    'id', 'iz', 'ders', 'konu', 'kayitli_dogru_cevap', 'resmi_dogru_cevap', 'resmi_fark',
    'k', 'n_eff', 'u', 'bant', 'cozumler', 'neden', 'yazildi',
  ];
  const satirlar = dogrulanmis.map(([id, d]) => [
    csvAlan(id),
    csvAlan(d.iz),
    csvAlan(d.ders),
    csvAlan(d.konu),
    d.kayitliCevap,
    '', // resmi_dogru_cevap — PDF s.33 resmî anahtarından doldurulacak
    '', // resmi_fark — resmi doldurulunca kayıtlı (Gemini) cevapla farkı işaretlenir
    d.kayit.k,
    d.kayit.n_eff,
    d.kayit.u,
    d.bant,
    csvAlan(cozumHarfleri(d.kayit.cozumler)),
    d.kayit.neden ?? '',
    d.yazildi ? 'evet' : 'hayir',
  ].join(','));

  writeFileSync(CSV_DOSYASI, `${basliklar.join(',')}\n${satirlar.join('\n')}\n`);
  const bantSayaci: Record<string, number> = {};
  for (const [, d] of dogrulanmis) bantSayaci[d.bant] = (bantSayaci[d.bant] ?? 0) + 1;
  const hataSayisi = Object.values(durum).filter((d) => d.hata).length;

  console.log(`\n📊 Kalibrasyon CSV: ${CSV_DOSYASI} (${dogrulanmis.length} satır, U artan sıralı)`);
  console.log(`   Bant dağılımı: ${JSON.stringify(bantSayaci)} | arızalı: ${hataSayisi} (sonraki çalışmada yeniden denenir)`);
  if (kotaDolu) console.log('   ⛔ Çalışma KOTA DOLU nedeniyle erken durduruldu — kalan sorular resume ile sonra denenir.');
  if (!GERCEK_YAZIM) console.log("   🔵 DRY-RUN — DB'ye yazılmadı; --yaz ile bantlar PATCH edilir.");
}

main().catch((e) => { console.error('HATA:', e.message); process.exit(1); });
