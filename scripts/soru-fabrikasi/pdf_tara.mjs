// Soru Fabrikası Adım 1 — PDF metin katmanı keşfi (pdf-parse v2 API).
// Salt-okuma, DB'ye dokunmaz.
import { PDFParse } from 'pdf-parse';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const PDF_YOLU = process.argv[2] ?? 'database/HAVUZ İÇİN SORULAR/HAVUZ İÇİN DİN SORULARI SON 8 YIL.pdf';

async function main() {
  const buf = readFileSync(PDF_YOLU);
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const sonuc = await parser.getText();

  const sayfaSayisi = sonuc.pages?.length ?? '?';
  const toplamMetin = (sonuc.pages ?? []).map((p) => p.text ?? '').join('\n\n=== SAYFA SONU ===\n\n');
  console.log(`Sayfa sayısı: ${sayfaSayisi}`);
  console.log(`Toplam metin: ${toplamMetin.length} karakter\n`);

  mkdirSync('scripts/soru-fabrikasi/cikti', { recursive: true });
  writeFileSync('scripts/soru-fabrikasi/cikti/din_sayfalar.txt', toplamMetin, 'utf8');

  console.log('=== İLK 2 SAYFA ===');
  console.log((sonuc.pages ?? []).slice(0, 2).map((p) => p.text).join('\n---\n').slice(0, 1800));

  await parser.destroy();
}

main().catch((e) => { console.error('HATA:', e.message); process.exit(1); });
