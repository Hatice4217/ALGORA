// Soru Fabrikası Adım 4 — dönüştürülmüş soruları canlı havuza yükler.
// Girdi: cikti/din_algora.json (din_donustur.mjs çıktısı)
//
// ÇİFT-AI DOĞRULAMA (lib/question-verification): her kayıt insert öncesinde
// ikinci AI'ca n=5 KÖR çözülür (doğru cevap görülmeden). Bant semantiği:
//   tam_uyum   → havuza yazılır (servise girer)
//   kismi_uyum → havuza yazılır AMA servise girmez (inceleme kuyruğu) + ⚠ uyarı
//   uyumsuz    → YAZILMAZ + rapora düşer (cikti/havuza_yukleme_raporu.json —
//                MEB resmî anahtarla karşılaştırma malzemesi)
// Çekirdek değişmez: DOĞRULANMAMIŞ SORU HAVUZA GİRMEZ.
//
// VARSAYILAN DRY-RUN (doğrulama çalışır + listeler, YAZMAZ). --yaz ile gerçek yazım.
// Tekrar çalıştırılabilir: questions.tags içine konan benzersiz iz bırakılır
// (örn. "MEB-DIN-2018-1") ve izi havuzda bulunan soru atlanır.
// Yazım service-role ile; resimGerekli sorular ve tekrar denenen hatalar atlanır.
//
// Kullanım (.mjs → .ts çevrildi: doğrulayıcı kopyalanmaz, import edilir):
//   npx tsx scripts/soru-fabrikasi/havuza_yukle.ts            → dry-run
//   npx tsx scripts/soru-fabrikasi/havuza_yukle.ts --yaz      → gerçek yükleme
import { readFileSync, writeFileSync } from 'node:fs';
import { soruyuDogrula, type DogrulamaKaydi } from '../../lib/question-verification';
import { GeminiUpstreamError } from '../../lib/question-generation';

const SUPABASE_URL = 'https://nfdjxwmhvalwokzyyvre.supabase.co';
const GIRDI = 'scripts/soru-fabrikasi/cikti/din_algora.json';
const RAPOR = 'scripts/soru-fabrikasi/cikti/havuza_yukleme_raporu.json';
const GERCEK_YAZIM = process.argv.includes('--yaz');

const DERS = 'Din Kültürü';
const KAYNAK_ADI = 'MEB TYT Çıkmış Sorular — Din Kültürü ve Ahlak Bilgisi 2018-2026';

// din_algora.json kayıt şeması
interface FabrikaSorusu {
  yil: number;
  no: number;
  oturum: string;
  konu: string;
  zorluk: string;
  question_text: string;
  choices: string[];
  dogruIndex: number;
  aciklama: string;
  ipuclari: string[];
  resimGerekli: boolean;
}

// Rapor satırı (uyumsuz/kismi malzemesi — resmî anahtarla karşılaştırma)
interface RaporSatiri {
  iz: string;
  yil: number;
  no: number;
  konu: string;
  kayitliCevap: string;
  k: number;
  n_eff: number;
  u: number;
  cozumler: number[];
  dagilim: Record<string, number>;
  soruMetni: string;
}

function raporSatiri(s: FabrikaSorusu, iz: string, kayit: DogrulamaKaydi): RaporSatiri {
  return {
    iz,
    yil: s.yil,
    no: s.no,
    konu: s.konu,
    kayitliCevap: 'ABCDE'[s.dogruIndex] ?? '?',
    k: kayit.k,
    n_eff: kayit.n_eff,
    u: kayit.u,
    cozumler: kayit.cozumler,
    dagilim: kayit.dagilim ?? {},
    soruMetni: s.question_text.slice(0, 300),
  };
}

async function main() {
  const env = readFileSync('.env.local', 'utf8');
  const key = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)?.[1]?.trim();
  if (!key) throw new Error('Service key bulunamadı');
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  // Doğrulayıcı anahtarı: verifierConfigOku process.env'den okur (fail-closed)
  const geminiKey = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
  if (!geminiKey) throw new Error('GEMINI_API_KEY .env.localde yok — doğrulama yapılamaz');
  process.env.GEMINI_API_KEY ??= geminiKey;

  const sorular: FabrikaSorusu[] = JSON.parse(readFileSync(GIRDI, 'utf8'));

  // Havuzda zaten var olan izleri çek (idempotency + İYİLEŞTİRME modu):
  //   aktif satır  → atla (klasik davranış)
  //   askıda satır → doğrulamadan geçen içerikle GÜNCELLE ve aktifleştir
  const izDurumu = new Map<string, { id: string; status: string }>();
  for (const s of sorular) {
    const iz = `MEB-DIN-${s.yil}-${s.no}`;
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/questions?select=id,status&tags=cs.{${iz}}`,
      { headers: { ...headers, Prefer: '' } }
    );
    if (r.ok) {
      const satirlar = (await r.json()) as Array<{ id: string; status: string }>;
      if (satirlar.length > 0) izDurumu.set(iz, satirlar[0]);
    }
  }

  console.log(`${GERCEK_YAZIM ? '🔴 GERÇEK YAZIM' : '🔵 DRY-RUN (doğrulama çalışır, yazmaz)'} — ${sorular.length} soru işlenecek\n`);

  let yuklenecek = 0, atlandi = 0, uyumsuzAdet = 0, kismiAdet = 0, hataAdet = 0, iyilestirilen = 0;
  const uyumsuzRapor: RaporSatiri[] = [];
  const kismiRapor: RaporSatiri[] = [];

  for (const s of sorular) {
    const iz = `MEB-DIN-${s.yil}-${s.no}`;
    const mevcutSatir = izDurumu.get(iz);

    // İyileştirme: aynı iz ASKIDA satırdaysa doğrulanmış yeni içerikle güncelle
    if (mevcutSatir?.status === 'suspended') {
      if (s.resimGerekli) { console.log(`⏭ soru ${s.no} (${s.yil}): askıda ama resim gerekli — dokunulmadı`); atlandi++; continue; }

      // ÇİFT-AI: iyileştirilen içerik de doğrulamadan geçmeden aktifleşmez
      let dogrulama: Awaited<ReturnType<typeof soruyuDogrula>>;
      try {
        dogrulama = await soruyuDogrula({
          question: s.question_text,
          choices: s.choices,
          correctAnswer: s.dogruIndex,
          uretimTur: 0,
        });
      } catch (e) {
        console.error(`❌ soru ${s.no} (${s.yil}) doğrulama arızası: ${(e as Error).message} — satır askıda bırakıldı`);
        hataAdet++;
        continue;
      }

      if (dogrulama.bant === 'uyumsuz') {
        // Yazılmaz: askıda kalan satır dokunulmaz, malzeme rapora düşer
        console.warn(`✗ soru ${s.no} (${s.yil}) UYUMSUZ (U=${dogrulama.kayit.u}) — iyileştirme yazılmadı, rapora düştü`);
        uyumsuzRapor.push(raporSatiri(s, iz, dogrulama.kayit));
        uyumsuzAdet++;
        continue;
      }

      const guncelPayload = {
        topic: s.konu,
        question_text: s.question_text,
        choices: s.choices,
        correct_answer: s.dogruIndex,
        explanation: s.aciklama,
        hints: s.ipuclari,
        status: 'active',
        verification_status: dogrulama.bant,
        verification: dogrulama.kayit,
      };
      if (!GERCEK_YAZIM) {
        console.log(`[iyileştirilir] soru ${s.no} (${s.yil}) → bant=${dogrulama.bant} U=${dogrulama.kayit.u} | doğru: ${'ABCDE'[s.dogruIndex]}${dogrulama.bant === 'kismi_uyum' ? ' ⚠ inceleme kuyruğuna düşer' : ''}`);
        yuklenecek++;
        if (dogrulama.bant === 'kismi_uyum') { kismiRapor.push(raporSatiri(s, iz, dogrulama.kayit)); kismiAdet++; }
        continue;
      }
      const p = await fetch(`${SUPABASE_URL}/rest/v1/questions?id=eq.${mevcutSatir.id}`, {
        method: 'PATCH', headers, body: JSON.stringify(guncelPayload),
      });
      if (!p.ok) { console.error(`❌ soru ${s.no} iyileştirme: HTTP ${p.status} — ${(await p.text()).slice(0, 200)}`); continue; }
      console.log(`♻ soru ${s.no} (${s.yil}) iyileştirildi (bant=${dogrulama.bant}) ve aktifleşti: ${mevcutSatir.id}`);
      yuklenecek++; iyilestirilen++;
      if (dogrulama.bant === 'kismi_uyum') { kismiRapor.push(raporSatiri(s, iz, dogrulama.kayit)); kismiAdet++; }
      continue;
    }

    if (mevcutSatir) { atlandi++; continue; }
    if (s.resimGerekli) { console.log(`⏭ soru ${s.no} (${s.yil}): resim gerekli — atlandı`); atlandi++; continue; }

    // ÇİFT-AI: havuza girmeden n=5 kör çözüm
    let dogrulama: Awaited<ReturnType<typeof soruyuDogrula>>;
    try {
      dogrulama = await soruyuDogrula({
        question: s.question_text,
        choices: s.choices,
        correctAnswer: s.dogruIndex,
        uretimTur: 0,
      });
    } catch (e) {
      if (e instanceof GeminiUpstreamError && e.status === 429) {
        console.error(`⏳ soru ${s.no} (${s.yil}): doğrulayıcı 429 — soru bu turda yazılmadı, yeniden çalıştırın`);
      } else {
        console.error(`❌ soru ${s.no} (${s.yil}) doğrulama arızası: ${(e as Error).message}`);
      }
      hataAdet++;
      continue;
    }

    // uyumsuz → YAZILMAZ (MEB resmî anahtarla karşılaştırma malzemesi)
    if (dogrulama.bant === 'uyumsuz') {
      console.warn(`✗ soru ${s.no} (${s.yil}) UYUMSUZ (U=${dogrulama.kayit.u}, iddia: ${'ABCDE'[s.dogruIndex]}, dağılım: ${JSON.stringify(dogrulama.kayit.dagilim)}) — yazılmadı, rapora düştü`);
      uyumsuzRapor.push(raporSatiri(s, iz, dogrulama.kayit));
      uyumsuzAdet++;
      continue;
    }

    const payload = {
      subject: DERS,
      topic: s.konu,
      difficulty: s.zorluk,
      exam_type: s.oturum, // 'TYT'
      question_text: s.question_text,
      choices: s.choices,
      correct_answer: s.dogruIndex,
      explanation: s.aciklama,
      hints: s.ipuclari,
      tags: ['MEB-çıkmış', iz],
      status: 'active',
      verification_status: dogrulama.bant,
      verification: dogrulama.kayit,
      created_by: null,
    };

    if (!GERCEK_YAZIM) {
      yuklenecek++;
      const kismiUyari = dogrulama.bant === 'kismi_uyum' ? ' ⚠ ŞÜPHELİ — inceleme kuyruğuna düşer (servise girmez)' : '';
      console.log(`[yazılacak] soru ${s.no} (${s.yil}) → ${s.konu} | doğru: ${'ABCDE'[s.dogruIndex]} | bant=${dogrulama.bant} U=${dogrulama.kayit.u}${kismiUyari}`);
      if (dogrulama.bant === 'kismi_uyum') { kismiRapor.push(raporSatiri(s, iz, dogrulama.kayit)); kismiAdet++; }
      continue;
    }

    const r = await fetch(`${SUPABASE_URL}/rest/v1/questions`, {
      method: 'POST', headers, body: JSON.stringify(payload),
    });
    if (!r.ok) { console.error(`❌ soru ${s.no}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`); continue; }
    const eklenen = (await r.json()) as Array<{ id: string }>;
    const soruId = eklenen[0]?.id;
    if (!soruId) { console.error(`❌ soru ${s.no}: id alınamadı`); continue; }

    // Kaynak izlenebilirliği (question_sources tablosu — SQL çalıştırılmış olmalı)
    const kaynakR = await fetch(`${SUPABASE_URL}/rest/v1/question_sources`, {
      method: 'POST', headers,
      body: JSON.stringify({
        question_id: soruId,
        source_type: 'MEB çıkmış',
        source_name: KAYNAK_ADI,
        year: s.yil,
        exam_session: s.oturum,
        original_question_no: s.no,
      }),
    });
    if (!kaynakR.ok) {
      console.error(`⚠ soru ${s.no}: question_sources yazılamadı — HTTP ${kaynakR.status} ${(await kaynakR.text()).slice(0, 150)}`);
    }

    const kismiUyari = dogrulama.bant === 'kismi_uyum' ? ' ⚠ ŞÜPHELİ — inceleme kuyruğunda (servise girmez)' : '';
    console.log(`✓ soru ${s.no} (${s.yil}) havuzda: ${soruId} | bant=${dogrulama.bant} U=${dogrulama.kayit.u}${kismiUyari}`);
    yuklenecek++;
    if (dogrulama.bant === 'kismi_uyum') { kismiRapor.push(raporSatiri(s, iz, dogrulama.kayit)); kismiAdet++; }
  }

  // Rapor: uyumsuz (+şüpheli) malzemesi — MEB resmî anahtarla (PDF s.33)
  // karşılaştırmanın girdisi. Uyumsuzlar havuza YAZILMADI.
  if (uyumsuzRapor.length > 0 || kismiRapor.length > 0) {
    writeFileSync(RAPOR, JSON.stringify({ tarih: new Date().toISOString(), uyumsuz: uyumsuzRapor, kismi: kismiRapor }, null, 2));
    console.log(`\n📄 Rapor yazıldı: ${RAPOR}`);
  }

  console.log(`\nÖzet: ${yuklenecek} ${GERCEK_YAZIM ? 'işlendi' : 'işlenecek'} (${iyilestirilen} iyileştirme), ${atlandi} atlandı, ${uyumsuzAdet} UYUMSUZ (yazılmadı), ${kismiAdet} ŞÜPHELİ (kuyruk), ${hataAdet} doğrulama arızası.`);
}

main().catch((e) => { console.error('HATA:', e.message); process.exit(1); });
