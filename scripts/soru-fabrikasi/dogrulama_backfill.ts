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
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import {
  soruyuDogrula,
  type DogrulamaKaydi,
  type DogrulamaBanti,
} from '../../lib/question-verification';
import { GeminiUpstreamError } from '../../lib/question-generation';

const SUPABASE_URL = 'https://nfdjxwmhvalwokzyyvre.supabase.co';
const DURUM_DOSYASI = 'scripts/soru-fabrikasi/cikti/dogrulama_backfill_durum.json';
const CSV_DOSYASI = 'scripts/soru-fabrikasi/cikti/dogrulama_kalibrasyon.csv';
const GERCEK_YAZIM = process.argv.includes('--yaz');

const ISTEK_ARASI_BEKLEME_MS = 30_000; // soru başına 5 paralel çağrı → ~10 istek/dk (ücretsiz katman RPM nezaketi)
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
function cozumHarfleri(cozumler: number[]): string {
  const harfler = ['A', 'B', 'C', 'D', 'E'];
  return cozumler.map((i) => (i >= 0 && i <= 4 ? harfler[i] : '-')).join(';');
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
      const digerHata = !(e instanceof GeminiUpstreamError) || e.status !== 429;
      if (digerHata || deneme === MAX_429_DENEME) throw e;
      console.warn(`  ⏳ 429 — ${BEKLE_429_MS / 1000} sn beklenip yeniden deneniyor (${deneme}/${MAX_429_DENEME})`);
      await bekla(BEKLE_429_MS);
    }
  }
  throw new Error('ulaşılmaz'); // TypeScript akış analizi için
}

async function main() {
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

      // TÜMÜ-429 art arda KOTA_DOLU_ESIK soruyu aşarsa kota dolu: dur
      if (e instanceof GeminiUpstreamError && e.status === 429) {
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
