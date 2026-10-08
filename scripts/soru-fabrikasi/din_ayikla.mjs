// Soru Fabrikası Adım 2 — DİN PDF ham metninden soru bloklarını ayıklar.
// Girdi: cikti/din_sayfalar.txt (pdf_tara.mjs çıktısı)
// Çıktı: cikti/din_sorular.json — [{no, sayfa, yil, oturum, govde, siklar[5]}]
// Salt-okuma, DB'ye dokunmaz.
//
// Yapı (keşifte kanıtlandı): her soru "N." ile başlar, "YYYY-TYT" etiketiyle
// kapanır. İçindekiler tablosu da "36. Ayet ve ..." gibi soru-başlangıcı
// taklidi satırlar içerir → İLK yıl etiketinden geriye doğru gerçek 1'in
// başlangıcı bulunur, öncesi tamamen atlanır.
import { readFileSync, writeFileSync } from 'node:fs';

const GIRDI = 'scripts/soru-fabrikasi/cikti/din_sayfalar.txt';
const CIKTI = 'scripts/soru-fabrikasi/cikti/din_sorular.json';

const SORU_BASLANGI = /^(\d{1,3})\.\s*(.*)$/;
const YIL_ETIKETI = /^(20\d{2})-(TYT|AYT|YDT)$/;

// Dekoratif gürültü: dikey "T E S T İ" harfleri, koşan başlıklar, alt bilgi
const GURULTU = /^(?:[A-ZÇĞİÖŞÜ]{1,3}|TYT|AYT|YDT|DİN KÜLTÜRÜ VE AHLAK BİLGİSİ|Din Kültürü ve Ahlak Bilgisi|mebi\.eba\.gov\.tr)$/;

function main() {
  const ham = readFileSync(GIRDI, 'utf8');

  // Aynı satırda birden fazla "SAYFA SONU" olmaz; satır indekslerini koruyarak tara
  const tumSatirlar = ham.split('\n');

  // --- Geçiş 1: gerçek soru bölgesinin başlangıcı ---
  // İlk yıl etiketini bul, oradan geriye doğru en yakın soru başlangıcı satırı = 1. soru
  let ilkEtiketIdx = -1;
  for (let i = 0; i < tumSatirlar.length; i++) {
    if (YIL_ETIKETI.test(tumSatirlar[i].trim())) { ilkEtiketIdx = i; break; }
  }
  if (ilkEtiketIdx < 0) throw new Error('Hiç yıl etiketi bulunamadı — PDF yapısı farklı olabilir');

  let baslangicIdx = -1;
  for (let i = ilkEtiketIdx; i >= 0; i--) {
    const m = tumSatirlar[i].trim().match(SORU_BASLANGI);
    if (m && Number(m[1]) === 1) { baslangicIdx = i; break; }
  }
  if (baslangicIdx < 0) throw new Error('1. sorunun başlangıcı bulunamadı');

  // --- Geçiş 2: soru bloklarını topla ---
  const sorular = [];
  let aktif = null;
  let sayfa = 1;
  let sayfaBasi = 1;

  for (let i = baslangicIdx; i < tumSatirlar.length; i++) {
    const satirHam = tumSatirlar[i];
    if (satirHam.includes('=== SAYFA SONU ===')) { sayfa++; continue; }
    const satir = satirHam.trim();
    if (!satir || GURULTU.test(satir)) continue;

    const etiket = satir.match(YIL_ETIKETI);
    if (etiket && aktif) {
      aktif.yil = Number(etiket[1]);
      aktif.oturum = etiket[2];
      sorular.push(aktif);
      aktif = null;
      continue;
    }

    const baslangic = satir.match(SORU_BASLANGI);
    // Yeni soru yalnızca aktif blok yokken başlar; beklenen numara = son + 1
    // (tolerans: atlanan soru olursa sıradaki daha büyük numara da kabul, uyarı loglanır)
    if (baslangic && !aktif) {
      const no = Number(baslangic[1]);
      const sonNo = sorular.length ? sorular[sorular.length - 1].no : 0;
      if (no === sonNo + 1 || no > sonNo + 1) {
        if (no > sonNo + 1) console.log(`⚠ ${sonNo + 1}. soru bulunamadı — ${no}'e atlanıyor`);
        aktif = { no, sayfaBasi: sayfa, yil: null, oturum: null, govde: [], siklar: [] };
        if (baslangic[2]) aktif.govde.push(baslangic[2]);
        continue;
      }
      // sonNo+1'den küçük numara (tekrar/sahte) → yok say, gövdeye de ekleme
      continue;
    }

    if (!aktif) continue;

    // Şık satırı: tek satırda 1..5 şık olabilir ("A) x \tB) y \tC) z")
    if (/^[A-E]\)/.test(satir)) {
      const parcalar = satir.split(/(?=[A-E]\))/).map((p) => p.trim()).filter(Boolean);
      let eslesti = false;
      for (const parca of parcalar) {
        const m = parca.match(/^([A-E])\)\s*(.*)$/);
        if (m) { aktif.siklar[m[1].charCodeAt(0) - 65] = m[2]; eslesti = true; }
      }
      if (eslesti) continue;
    }

    aktif.govde.push(satir);
  }

  // Doğrulama + temizlik
  const temiz = [];
  const sorunlar = [];
  for (const s of sorular) {
    const eksik = [0, 1, 2, 3, 4].filter((i) => !s.siklar[i] || !s.siklar[i].trim());
    if (eksik.length) { sorunlar.push(`Soru ${s.no} (s.${s.sayfaBasi}): eksik şık ${eksik.map((i) => 'ABCDE'[i]).join(',')}`); continue; }
    if (!s.yil || !s.oturum) { sorunlar.push(`Soru ${s.no} (s.${s.sayfaBasi}): yıl/oturum etiketi yok`); continue; }
    temiz.push({ no: s.no, sayfa: s.sayfaBasi, yil: s.yil, oturum: s.oturum, govde: s.govde.join('\n').trim(), siklar: s.siklar });
  }

  writeFileSync(CIKTI, JSON.stringify(temiz, null, 2), 'utf8');
  console.log(`Ayıklanan soru: ${temiz.length} → ${CIKTI}`);
  console.log(`Yıl dağılımı: ${JSON.stringify(temiz.reduce((a, s) => { a[s.yil] = (a[s.yil] ?? 0) + 1; return a; }, {}))}`);
  if (sorunlar.length) {
    console.log(`\n⚠ ATLANAN (${sorunlar.length}):`);
    sorunlar.forEach((x) => console.log('  ' + x));
  }
  const numaralar = temiz.map((s) => s.no);
  const bosluklar = [];
  for (let i = 1; i < numaralar.length; i++) if (numaralar[i] !== numaralar[i - 1] + 1) bosluklar.push(`${numaralar[i - 1]}→${numaralar[i]}`);
  if (bosluklar.length) console.log('⚠ Numara boşlukları:', bosluklar.join(', '));
}

main();
