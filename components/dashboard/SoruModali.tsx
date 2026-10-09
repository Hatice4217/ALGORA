'use client';

// Soru Modalı — SEKMEDEN BAĞIMSIZ global katman. Eskiden QuestionPractice
// (Dinamik Soru Bankası) içinde render edildiğinden, Hata Sepeti'nden "Çöz"
// denince arka plan zorla Soru Bankası'na atlıyordu. Artık page.tsx bu
// bileşeni currentQuestion varken hangi sekme açıksa onun ÜZERİNE basıyor:
// sepetten çözünce öğrenci sepette kalır, telafi listesi gözünün önünde
// güncellenir. Tüm state page.tsx'te; bileşen saf görünümdür.

import { useEffect, useRef, useState } from 'react';
import { getSubjectColor } from '../../lib/utils';
import type { Question } from './QuestionPractice';

// DB difficulty değerleri → Türkçe etiketler (Soru Bankası listesi de kullanır)
export const difficultyEtiketleri: Record<string, string> = {
  beginner: 'Başlangıç',
  intermediate: 'Orta',
  advanced: 'İleri',
};

// Gemini dil bilgisi sorularında "altı çizili sözcüğü" <u>sözcük</u> biçiminde
// işaretler (üretim prompt'undaki TEK izinli işaretleme). Bu yardımcı <u>'yu
// gerçek altı çizgiye çevirir; başka hiçbir etiket render edilmez — kalan tüm
// etiketler soyulur (dangerouslySetInnerHTML bilinçli olarak ASLA kullanılmaz).
export function altiCiziliMetniCevir(metin: string) {
  return metin.split(/<u>(.*?)<\/u>/gi).map((parca, i) => {
    const temiz = parca.replace(/<[^>]*>/g, '');
    return i % 2 === 1 ? <span key={i} className="underline">{temiz}</span> : temiz;
  });
}

// Soru Fabrikası kaynak izinden MEB yılını çıkarır (örn. "MEB-DIN-2022-5" →
// "2022"). İz yoksa ya da biçim tanıdık değilse null → yıl rozeti basılmaz.
export function mebYiliBul(tags?: string[] | null): string | null {
  if (!Array.isArray(tags)) return null;
  for (const etiket of tags) {
    const eslesme = /^MEB-[^-]+-(\d{4})-\d+$/.exec(etiket);
    if (eslesme) return eslesme[1];
  }
  return null;
}

// Üst Beyin anlatımını taranabilir bloklara ayırır: kısa giriş paragrafı,
// "1) 2) 3)" satır başı numaralı adımlar ve "ÖZET:" kapanışı. Numaralı adım
// hiç yoksa (eski/kuraldışı biçim) bileşen metni eski düz haliyle basar.
interface UstBeyinBlok {
  giris: string[];
  adimlar: { no: string; metin: string }[];
  ozet: string | null;
}

export function ustBeyinBloklariniAyir(metin: string): UstBeyinBlok {
  const sonuc: UstBeyinBlok = { giris: [], adimlar: [], ozet: null };
  let bolum: 'giris' | 'adim' | 'ozet' = 'giris';
  let suAnkiAdim: { no: string; metin: string } | null = null;

  for (const satir of metin.replace(/\r/g, '').split('\n')) {
    const duz = satir.trim();
    if (!duz) continue;

    const ozetEsmesi = /^ÖZET\s*:\s*(.*)$/i.exec(duz);
    if (ozetEsmesi) {
      bolum = 'ozet';
      sonuc.ozet = ozetEsmesi[1].trim();
      continue;
    }
    const adimEsmesi = /^(\d{1,2})\)\s*(.*)$/.exec(duz);
    if (adimEsmesi) {
      suAnkiAdim = { no: adimEsmesi[1], metin: adimEsmesi[2] };
      sonuc.adimlar.push(suAnkiAdim);
      bolum = 'adim';
      continue;
    }
    if (bolum === 'giris') {
      sonuc.giris.push(duz);
    } else if (bolum === 'ozet') {
      sonuc.ozet = sonuc.ozet ? `${sonuc.ozet} ${duz}` : duz;
    } else if (suAnkiAdim) {
      // Adım satırı alt satıra taşmışsa aynı adıma ekle
      suAnkiAdim.metin += ` ${duz}`;
    } else {
      sonuc.giris.push(duz);
    }
  }
  return sonuc;
}

// Bloklu anlatım görseli (Üst Beyin VE Açıklama ortak renderer'ı): giriş
// cümlesi + numara rozetli adım kartları + "Özet" kapanış kartı. Uzun gri
// paragraf denizi yerine taranabilir bloklar — kısa odak süresi bilinçli
// tasarım kısıtıdır.
function BlokluAnlatim({ metin }: { metin: string }) {
  const { giris, adimlar, ozet } = ustBeyinBloklariniAyir(metin);

  // Ayrıştırılamayan biçim (ör. düz cümlelik MEB açıklamaları, eski önbellek
  // kayıtları): adım kartı yok — sol kenarı mor vurgulu sade kart olarak basılır
  if (adimlar.length === 0) {
    return (
      <div className="bg-purple-50/40 border-l-4 border-purple-300 rounded-r-lg px-4 py-3">
        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{metin}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {giris.length > 0 && (
        <p className="text-slate-700 text-sm leading-relaxed">{giris.join(' ')}</p>
      )}
      <ol className="space-y-2.5">
        {adimlar.map((adim, i) => (
          <li
            key={adim.no}
            style={{ animationDelay: `${i * 70}ms` }}
            className="animate-adim-girisi flex items-start gap-3 bg-purple-50/60 border border-purple-100 rounded-lg px-3 py-2.5"
          >
            <span className="shrink-0 w-7 h-7 rounded-full bg-purple-600 text-white text-sm font-bold flex items-center justify-center">
              {adim.no}
            </span>
            <p className="text-slate-700 text-sm leading-relaxed pt-0.5">{adim.metin}</p>
          </li>
        ))}
      </ol>
      {ozet && (
        <div
          style={{ animationDelay: `${adimlar.length * 70}ms` }}
          className="animate-adim-girisi flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5"
        >
          <span className="shrink-0 text-base leading-none pt-0.5">🎯</span>
          <p className="text-emerald-900 text-sm leading-relaxed font-medium">{ozet}</p>
        </div>
      )}
    </div>
  );
}

interface SoruModaliProps {
  examType: string;
  seciliDers: string;
  seciliZorluk: string;
  mevcutSoru: Question;
  cevapGoster: boolean;
  seciliCevap: number | null;
  cevapSec: (index: number) => void;
  soruUret: () => void;
  soruUretiliyor: boolean;
  // Hata Sepeti telafi modu: etiket "Sıradaki Hatalı Soru" olur; bekleyen
  // başka klon kalmadıysa buton pasif (gri) tutulur — havuzdan soru çekilmez
  siradakiEtiket?: string;
  siradakiPasif?: boolean;
  // V2: Sokratik ipuçları (ücretsiz, kademeli) + Üst Beyin (-1 kredi) + bildirim
  ipuclar: string[];
  acilanIpucu: number;
  ipucuAc: () => void;
  ustBeyinMetni: string | null;
  ustBeyinIstiyor: boolean;
  ustBeyinIste: () => void;
  bildirimDurumu: null | 'gonderildi' | 'askida';
  bildiriliyor: boolean;
  soruBildir: () => void;
  // T2-UX1 onarımı: alert() yerine inline hata banner'ı
  hataMesaji: string | null;
  hataKapat: () => void;
  modalKapat: () => void;
}

export function SoruModali({
  examType,
  seciliDers,
  seciliZorluk,
  mevcutSoru,
  cevapGoster,
  seciliCevap,
  cevapSec,
  soruUret,
  soruUretiliyor,
  siradakiEtiket,
  siradakiPasif,
  ipuclar,
  acilanIpucu,
  ipucuAc,
  ustBeyinMetni,
  ustBeyinIstiyor,
  ustBeyinIste,
  bildirimDurumu,
  bildiriliyor,
  soruBildir,
  hataMesaji,
  hataKapat,
  modalKapat,
}: SoruModaliProps) {
  // Modalın kayan gövdesi — yeni soru gelince en üste kaydırılır (önceki
  // soruda açıklama/ipuclarında aşağı inmiş olabilir; öğrenci yeni sorunun
  // BAŞINI görerek başlasın). Split görünümde sol/sağ pencereler bağımsız
  // kayar → üçü de sıfırlanır.
  const modalGovdeRef = useRef<HTMLDivElement>(null);
  const solPanelRef = useRef<HTMLDivElement>(null);
  const sagPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    modalGovdeRef.current?.scrollTo({ top: 0 });
    solPanelRef.current?.scrollTo({ top: 0 });
    sagPanelRef.current?.scrollTo({ top: 0 });
  }, [mevcutSoru?.id]);

  // Tam ekran genişletme (⤢): modal overlay içinde kalır ama tüm alanı kaplar
  const [tamEkran, setTamEkran] = useState(false);

  // Köşeden serbest boyutlandırma (⤡ yerine ⇲): yalnız GERÇEK masaüstünde
  // (lg + fare). Öğrencinin çektiği boyut localStorage'da hatırlanır ve
  // sonraki açılışta geri yüklenir. Tam ekran modunda yok sayılır.
  const kartRef = useRef<HTMLDivElement>(null);
  const [kayitliBoyut, setKayitliBoyut] = useState<{ w: number; h: number } | null>(null);
  const masaustuMu = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches;

  useEffect(() => {
    if (!masaustuMu()) return;
    try {
      const kayitli = localStorage.getItem('algora_soru_modali_boyut');
      if (!kayitli) return;
      const { w, h } = JSON.parse(kayitli) as { w?: unknown; h?: unknown };
      if (typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0) {
        // Görüş alanından taşmasın (pencere küçülmüş olabilir)
        setKayitliBoyut({
          w: Math.min(w, window.innerWidth - 32),
          h: Math.min(h, window.innerHeight - 32),
        });
      }
    } catch {
      // bozuk kayıt — sessizce yoksay
    }
  }, []);

  useEffect(() => {
    const kart = kartRef.current;
    if (!kart || !masaustuMu()) return;
    const gozlemci = new ResizeObserver(() => {
      if (tamEkran) return;
      localStorage.setItem(
        'algora_soru_modali_boyut',
        JSON.stringify({ w: kart.offsetWidth, h: kart.offsetHeight })
      );
    });
    gozlemci.observe(kart);
    return () => gozlemci.disconnect();
  }, [tamEkran]);

  // Üretim beklenirken geçen süre (saniye) — kilitli butonda gösterilir
  const [beklemeSaniye, setBeklemeSaniye] = useState(0);

  // MEB çıkmış soru izi → yıl rozeti (örn. "📅 2022 MEB Çıkmış")
  const mebYili = mebYiliBul(mevcutSoru.tags);

  // "🎉 Doğru!" kutlama rozeti — doğru cevapta footer üstünde süzülüp solar;
  // yanlışta kırmızı vurgu + titreme zaten var, ekstra rozet gerekmez
  const [kutlamaGoster, setKutlamaGoster] = useState(false);
  useEffect(() => {
    if (!cevapGoster || seciliCevap === null) return;
    if (seciliCevap !== mevcutSoru.correctAnswer) return;
    setKutlamaGoster(true);
    const zamanlayici = setTimeout(() => setKutlamaGoster(false), 1_700);
    return () => clearTimeout(zamanlayici);
    // cevapGoster her soruda false'a döner → yeni soruda rozet yeniden oynar
  }, [cevapGoster, seciliCevap, mevcutSoru.correctAnswer, mevcutSoru.id]);

  useEffect(() => {
    if (!soruUretiliyor) {
      setBeklemeSaniye(0);
      return;
    }
    const baslangic = Date.now();
    const timer = setInterval(() => {
      setBeklemeSaniye(Math.floor((Date.now() - baslangic) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [soruUretiliyor]);

  // Açıklama görünürlüğü: YANLIŞ cevap → KESİNLİKLE açık (öğrenci hatasını
  // görmek zorunda); DOĞRU cevap → isteğe bağlı, kapalı başlar, öğrenci
  // isterse "Açıklamayı Gör" ile açar. Yeni soruda her durumda sıfırlanır.
  const [aciklamaAcik, setAciklamaAcik] = useState(false);
  useEffect(() => {
    setAciklamaAcik(cevapGoster && seciliCevap !== mevcutSoru.correctAnswer);
  }, [cevapGoster, seciliCevap, mevcutSoru.correctAnswer, mevcutSoru.id]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${
        tamEkran ? 'p-0' : 'p-4'
      }`}
    >
      <div
        ref={kartRef}
        style={
          !tamEkran && kayitliBoyut
            ? { width: kayitliBoyut.w, height: kayitliBoyut.h }
            : undefined
        }
        className={[
          'bg-white shadow-2xl w-full flex flex-col overflow-hidden',
          tamEkran
            ? 'h-full max-w-none max-h-none rounded-none'
            : 'max-w-3xl max-h-[90vh] rounded-2xl lg:max-w-5xl lg:h-[85vh]',
          // Köşeden serbest boyutlandırma yalnız masaüstünde (CSS resize ⇲);
          // mobilde anlamı yok. max-w/max-h sınırları yine geçerli.
          !tamEkran ? 'lg:[resize:both] lg:min-w-[640px] lg:min-h-[480px]' : '',
        ].join(' ')}
      >
        {/* Modal Header — kart artık flex-col olduğundan sabit kalır (sticky değil) */}
        <div className="shrink-0 bg-white px-3 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
            <span className="px-2.5 py-1 rounded-md text-xs sm:px-3 sm:py-1 sm:rounded-lg sm:text-sm font-bold bg-gradient-to-r from-purple-600 to-cyan-500 text-white">
              {mevcutSoru.exam_type || examType}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-xs sm:px-3 sm:py-1 sm:rounded-lg sm:text-sm font-medium ${getSubjectColor(mevcutSoru.subject || seciliDers)} text-white`}>
              {mevcutSoru.subject || seciliDers}
            </span>
            {mevcutSoru.topic && mevcutSoru.topic !== 'Genel' && (
              <span className="px-2 py-0.5 rounded-md text-xs sm:px-3 sm:py-1 sm:rounded-lg sm:text-sm font-medium bg-slate-100 text-slate-700">
                {mevcutSoru.topic}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md text-xs sm:px-3 sm:py-1 sm:rounded-lg sm:text-sm font-medium bg-slate-100 text-slate-600">
              {difficultyEtiketleri[mevcutSoru.difficulty ?? ''] ??
                (seciliZorluk === 'otomatik'
                  ? 'Otomatik'
                  : seciliZorluk === 'baslangic'
                  ? 'Başlangıç'
                  : seciliZorluk === 'orta'
                  ? 'Orta'
                  : 'İleri')}
            </span>
            {mevcutSoru.source === 'pool' && (
              <span className="px-2 py-0.5 rounded-md text-xs sm:px-3 sm:py-1 sm:rounded-lg sm:text-sm font-medium bg-emerald-100 text-emerald-700">
                📚 Havuz
              </span>
            )}
            {mebYili && (
              <span className="px-2 py-0.5 rounded-md text-xs sm:px-3 sm:py-1 sm:rounded-lg sm:text-sm font-medium bg-teal-100 text-teal-700">
                📅 {mebYili} MEB Çıkmış
              </span>
            )}
            {mevcutSoru.source === 'generated' && (
              <span className="px-2 py-0.5 rounded-md text-xs sm:px-3 sm:py-1 sm:rounded-lg sm:text-sm font-medium bg-amber-100 text-amber-700">
                ✨ Yeni üretildi
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Tam ekran genişletme (⤢): tek dokunuşla tüm ekran, tekrar basınca küçülür */}
            <button
              onClick={() => setTamEkran((v) => !v)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label={tamEkran ? 'Tam ekrandan çık' : 'Tam ekran yap'}
            >
              {tamEkran ? (
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M15 9h4.5M15 9V4.5M9 15v4.5M9 15H4.5m10.5 0h4.5m-4.5 0v4.5" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5M3.75 20.25v-4.5m0 4.5h4.5M20.25 3.75h-4.5m4.5 0v4.5m0 11.25v-4.5m0 4.5h-4.5" />
                </svg>
              )}
            </button>
            <button
              onClick={modalKapat}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Soruyu kapat"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Marka kimliği: header altında ince gradient çizgi (mor→fuşya→camgöbeği) */}
        <div className="shrink-0 h-[3px] bg-gradient-to-r from-purple-500 via-fuchsia-400 to-cyan-400" />

        {/* Gövde — mobilde/dar ekranda TEK kayan kolon (bugünkü akış korunur);
            lg ve üzerinde İKİYE BÖLÜNÜR: sol yarı soru + şıklar (asıl iş), sağ
            yarı yardım rayı (ipuçları → açıklama → Üst Beyin). Pencereler
            bağımsız kayar — öğrenci soruyu görürken yardımı okur, kaybolmaz. */}
        <div
          ref={modalGovdeRef}
          className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_340px]"
        >
          {/* === SOL PANEL: soru + şıklar === */}
          <div ref={solPanelRef} className="p-3 sm:p-5 lg:p-6 lg:h-full lg:overflow-y-auto bg-gradient-to-br from-purple-50/40 via-white to-cyan-50/30">
          {/* Hata banner'ı (T2-UX1): modal açıkken işlem hatası (bağlantı
              kopması, API hatası) alert yerine burada tatlıca görünür */}
          {hataMesaji && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
              <span className="text-base leading-none mt-0.5 shrink-0">⚠️</span>
              <p className="flex-1 text-sm text-red-700">{hataMesaji}</p>
              <button
                onClick={hataKapat}
                aria-label="Hatayı kapat"
                className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Soru gövdesi — yeni soru üretilirken eski soruyla etkileşim fiziksel olarak kesilir.
              key= soru id'si: soru değişince blok yeniden mount edilir → giriş animasyonu
              her yeni soruda yeniden oynar (değişim algılanabilsin diye) */}
          <div className="relative">
            <div
              key={mevcutSoru.id ?? 'soru'}
              className={`space-y-6 animate-soru-giris ${soruUretiliyor ? 'opacity-50 pointer-events-none select-none' : ''}`}
            >
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-slate-800 leading-snug mb-4 sm:mb-6">
                  {altiCiziliMetniCevir(mevcutSoru.question)}
                </h3>
              </div>


              <div className="space-y-3">
                {mevcutSoru.choices.map((secenek: string, index: number) => {
                  let butonSinifi = 'border-slate-200 hover:border-purple-300 bg-white';

                  if (cevapGoster) {
                    if (index === mevcutSoru.correctAnswer) {
                      // Doğru şık: yeşil vurgu + tek seferlik parlayıp büyüme mikro-animasyonu
                      butonSinifi = 'border-emerald-500 bg-emerald-50 animate-dogru-parla';
                    } else if (index === seciliCevap && index !== mevcutSoru.correctAnswer) {
                      // Yanlış seçim: kırmızı vurgu + titreme (klasik shake)
                      butonSinifi = 'border-red-400 bg-red-50 animate-shake';
                    }
                  } else if (seciliCevap === index) {
                    butonSinifi = 'border-purple-500 bg-purple-50';
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => cevapSec(index)}
                      disabled={cevapGoster || soruUretiliyor}
                      className={`w-full p-3 sm:p-4 text-left border rounded-xl transition-all disabled:cursor-not-allowed ${butonSinifi}`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                          cevapGoster && index === mevcutSoru.correctAnswer
                            ? 'bg-emerald-500 text-white'
                            : cevapGoster && index === seciliCevap && index !== mevcutSoru.correctAnswer
                            ? 'bg-red-400 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="flex-1 text-sm sm:text-base text-slate-700">{altiCiziliMetniCevir(secenek)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Üretim kilidi — sol panelin üstünde spinner örtüsü */}
            {soruUretiliyor && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/40 rounded-xl">
                <svg className="animate-spin h-8 w-8 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-medium text-purple-700">Yeni soru üretiliyor...</span>
              </div>
            )}
          </div>
          </div>{/* SOL PANEL sonu */}

          {/* === SAĞ PANEL: yardım rayı — ipuçları → açıklama → Üst Beyin === */}
          <div
            ref={sagPanelRef}
            className="p-3 sm:p-5 lg:p-6 space-y-5 lg:h-full lg:overflow-y-auto lg:border-l lg:border-slate-200 lg:bg-slate-50/60"
          >
              {/* V2: Takıldın mı? — Sokratik ipuçları (ücretsiz, kademeli açılır).
                  İpuçları çözümü ifşa etmez; sorunun ipucusu yoksa (eski havuz
                  kayıtları) kart hiç render edilmez. */}
              {!cevapGoster && ipuclar.length > 0 && (
                <div>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                      <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Takıldın mı?
                    </h4>
                    <span className="text-xs text-slate-400">Ücretsiz — cevabı ifşa etmez.</span>
                  </div>
                  {acilanIpucu > 0 && (
                    <ol className="mt-3 space-y-2 list-decimal list-inside">
                      {ipuclar.slice(0, acilanIpucu).map((ipucu, i) => (
                        <li key={i} className="text-sm text-slate-700">{ipucu}</li>
                      ))}
                    </ol>
                  )}
                  {acilanIpucu < ipuclar.length && (
                    <button
                      onClick={ipucuAc}
                      disabled={soruUretiliyor}
                      className="mt-3 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      💡 {acilanIpucu + 1}. İpucu Al (ücretsiz)
                    </button>
                  )}
                </div>
              )}

              {cevapGoster && (
                <div>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Açıklama
                    </h4>
                    {/* Aç/Kapat düğmesi her cevapta var: DOĞRUda kapalı başlar
                        (isteğe bağlı), YANLIŞTA açık başlar (kesin görülür) ama
                        okuduktan sonra öğrenci toplayabilir. */}
                    <button
                      onClick={() => setAciklamaAcik((v) => !v)}
                      className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors"
                    >
                      {aciklamaAcik ? 'Kapat' : 'Açıklamayı Gör →'}
                    </button>
                  </div>
                  {aciklamaAcik && (
                    <div className="mt-3 animate-adim-girisi">
                      <BlokluAnlatim metin={mevcutSoru.explanation} />
                    </div>
                  )}
                </div>
              )}

              {/* V2: Üst Beyin (Özel Hoca) — 1 kredi karşılığı adım adım derin anlatım.
                  Buton HER ZAMAN açıktır (kullanıcı kararı); ipucu kullanımına bağlı değildir. */}
              <div className="pt-1">
                {!ustBeyinMetni ? (
                  <>
                    <button
                      onClick={ustBeyinIste}
                      disabled={ustBeyinIstiyor || soruUretiliyor}
                      className="w-full py-3 px-4 rounded-xl bg-purple-50 border-2 border-purple-300 hover:bg-purple-100 hover:border-purple-400 text-purple-700 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="flex items-center justify-center gap-2">
                        {ustBeyinIstiyor ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Üst Beyin anlatımı hazırlanıyor...</span>
                          </>
                        ) : (
                          <>
                            <span className="text-lg">🧠</span>
                            <span>Üst Beyin Anlatımı İste</span>
                            <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-xs font-bold">
                              1 Kredi
                            </span>
                          </>
                        )}
                      </span>
                    </button>
                    <p className="text-xs text-slate-400 mt-2 text-center">
                      Yapay zeka özel hoca soruyu adım adım, konunun mantığıyla birlikte anlatır.
                    </p>
                  </>
                ) : (
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <span className="text-lg">🧠</span>
                      Üst Beyin Anlatımı
                    </h4>
                    <BlokluAnlatim metin={ustBeyinMetni} />
                  </div>
                )}
              </div>
          </div>{/* SAĞ PANEL sonu */}
        </div>{/* Gövde sonu */}

        {/* Footer: bildirim + Sıradaki butonu — kartın altına sabit, kaymaz;
            öğrenci uzun anlatım okurken bile sıradaki soru hep gözünün önünde */}
        <div className="relative shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4 space-y-3">
          {/* "🎉 Doğru!" kutlama rozeti — footer üstünden süzülüp solar (kutlamaGoster) */}
          {kutlamaGoster && (
            <div className="absolute left-1/2 -translate-x-1/2 -top-4 z-10 pointer-events-none">
              <span className="animate-kutlama-ucus inline-block px-4 py-1.5 rounded-full bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-200">
                🎉 Doğru!
              </span>
            </div>
          )}

          {/* V2: Hatalı soru bildirimi — kitle kaynaklı kalite kontrolü.
              2. FARKLI kullanıcının bildirimiyle soru havuzdan otomatik askıya alınır. */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {bildirimDurumu ? (
              <p className={`text-sm ${bildirimDurumu === 'askida' ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                {bildirimDurumu === 'askida'
                  ? '✓ Teşekkürler! Soru havuzdan askıya alındı, kimseye tekrar gösterilmeyecek.'
                  : '✓ Bildirimin alındı — teşekkürler!'}
              </p>
            ) : (
              <button
                onClick={soruBildir}
                disabled={bildiriliyor || soruUretiliyor}
                className="text-sm text-slate-400 hover:text-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bildiriliyor ? 'Gönderiliyor...' : '⚠️ Hatalı Soru Bildir'}
              </button>
            )}
          </div>

          {/* Konu artık opsiyonel: "Sıradaki Soru" seçili konu olmadan da çalışır.
              onClick inline ok: soruUret parametresiz — MouseEvent sızmasın.
              Telafi modunda etiket "Sıradaki Hatalı Soru" olur ve bekleyen klon
              kalmadıysa buton gri/pasif kalır (siradakiPasif). */}
          <button
            onClick={() => soruUret()}
            disabled={soruUretiliyor || siradakiPasif === true}
            className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white font-bold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-400 shadow-lg shadow-purple-200"
          >
            {soruUretiliyor ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Sıradaki soru hazırlanıyor... ({beklemeSaniye} sn)</span>
              </span>
            ) : (
              siradakiEtiket ?? 'Sıradaki Soru'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
