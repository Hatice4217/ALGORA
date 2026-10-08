// Soru Fabrikası Adım 4 — dönüştürülmüş soruları canlı havuza yükler.
// Girdi: cikti/din_algora.json (din_donustur.mjs çıktısı)
//
// VARSAYILAN DRY-RUN (yalnız listeler, yazmaz). --yaz ile gerçek yazım.
// Tekrar çalıştırılabilir: questions.tags içine konan benzersiz iz bırakılır
// (örn. "MEB-DIN-2018-1") ve izi havuzda bulanan soru atlanır.
// Yazım service-role ile; resimGerekli sorular ve tekrar denenen hatalar atlanır.
//
// Kullanım:
//   node scripts/soru-fabrikasi/havuza_yukle.mjs            → dry-run
//   node scripts/soru-fabrikasi/havuza_yukle.mjs --yaz      → gerçek yükleme
import { readFileSync } from 'node:fs';

const SUPABASE_URL = 'https://nfdjxwmhvalwokzyyvre.supabase.co';
const GIRDI = 'scripts/soru-fabrikasi/cikti/din_algora.json';
const GERCEK_YAZIM = process.argv.includes('--yaz');

const DERS = 'Din Kültürü';
const KAYNAK_ADI = 'MEB TYT Çıkmış Sorular — Din Kültürü ve Ahlak Bilgisi 2018-2026';

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

  const sorular = JSON.parse(readFileSync(GIRDI, 'utf8'));

  // Havuzda zaten var olan izleri çek (idempotency + İYİLEŞTİRME modu):
  //   aktif satır  → atla (klasik davranış)
  //   askıda satır → converter düzeltilmiş içerikle GÜNCELLE ve aktifleştir
  //                  (2026-10-08 kırılımı: 18 soru şık-parçası-sızmıştı, askıya
  //                   alınıp din_ayikla düzeltmesiyle yeniden üretildi)
  const izDurumu = new Map(); // iz → { id, status }
  for (const s of sorular) {
    const iz = `MEB-DIN-${s.yil}-${s.no}`;
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/questions?select=id,status&tags=cs.{${iz}}`,
      { headers: { ...headers, Prefer: '' } }
    );
    if (r.ok) {
      const satirlar = await r.json();
      if (satirlar.length > 0) izDurumu.set(iz, satirlar[0]);
    }
  }

  let yuklenecek = 0, atlandi = 0;
  console.log(`${GERCEK_YAZIM ? '🔴 GERÇEK YAZIM' : '🔵 DRY-RUN'} — ${sorular.length} soru işlenecek\n`);

  let iyilestirilen = 0;
  for (const s of sorular) {
    const iz = `MEB-DIN-${s.yil}-${s.no}`;
    const mevcutSatir = izDurumu.get(iz);

    // İyileştirme: aynı iz ASKIDA satırdaysa yeni içerikle güncelle
    // (dry-run'da yalnız [iyileştirilir] listelenir)
    if (mevcutSatir?.status === 'suspended') {
      if (s.resimGerekli) { console.log(`⏭ soru ${s.no} (${s.yil}): askıda ama resim gerekli — dokunulmadı`); atlandi++; continue; }
      const guncelPayload = {
        topic: s.konu,
        question_text: s.question_text,
        choices: s.choices,
        correct_answer: s.dogruIndex,
        explanation: s.aciklama,
        hints: s.ipuclari,
        status: 'active',
      };
      if (!GERCEK_YAZIM) {
        console.log(`[iyileştirilir] soru ${s.no} (${s.yil}) → askıda satır ${mevcutSatir.id} aktifleşir | doğru: ${'ABCDE'[s.dogruIndex]}`);
        yuklenecek++;
        continue;
      }
      const p = await fetch(`${SUPABASE_URL}/rest/v1/questions?id=eq.${mevcutSatir.id}`, {
        method: 'PATCH', headers, body: JSON.stringify(guncelPayload),
      });
      if (!p.ok) { console.error(`❌ soru ${s.no} iyileştirme: HTTP ${p.status} — ${(await p.text()).slice(0, 200)}`); continue; }
      console.log(`♻ soru ${s.no} (${s.yil}) iyileştirildi ve aktifleşti: ${mevcutSatir.id}`);
      yuklenecek++; iyilestirilen++;
      continue;
    }

    if (mevcutSatir) { atlandi++; continue; }
    if (s.resimGerekli) { console.log(`⏭ soru ${s.no} (${s.yil}): resim gerekli — atlandı`); atlandi++; continue; }

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
      tags: ['MEB-çıkmış', `MEB-DIN-${s.yil}-${s.no}`],
      status: 'active',
      created_by: null,
    };

    if (!GERCEK_YAZIM) {
      yuklenecek++;
      console.log(`[yazılacak] soru ${s.no} (${s.yil}) → ${s.konu} | doğru: ${'ABCDE'[s.dogruIndex]} | ${s.zorluk}`);
      continue;
    }

    const r = await fetch(`${SUPABASE_URL}/rest/v1/questions`, {
      method: 'POST', headers, body: JSON.stringify(payload),
    });
    if (!r.ok) { console.error(`❌ soru ${s.no}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`); continue; }
    const eklenen = await r.json();
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

    console.log(`✓ soru ${s.no} (${s.yil}) havuzda: ${soruId}`);
    yuklenecek++;
  }

  console.log(`\nÖzet: ${yuklenecek} ${GERCEK_YAZIM ? 'işlendi' : 'işlenecek'} (${iyilestirilen} iyileştirme), ${atlandi} atlandı.`);
}

main().catch((e) => { console.error('HATA:', e.message); process.exit(1); });
