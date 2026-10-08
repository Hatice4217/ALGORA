import { useEffect, useRef, useState } from 'react';
import { getSubjectColor } from '../../lib/utils';
import { getTopics } from '../../lib/constants/syllabus';
import type { RecentAnswer, PendingClone } from '../../types/question';

interface Question {
  question: string;
  choices: string[];
  correctAnswer: number;
  explanation: string;
  // Soru kimliği — gövde key'i olarak kullanılır (her yeni soruda remount →
  // giriş animasyonu yeniden oynar)
  id?: string;
  // "Son Çözülenler" kaydından incelenirken dolar (rozetler doğru dersi/zorluğu/türü göstersin)
  subject?: string;
  difficulty?: string;
  topic?: string;
  exam_type?: string; // TYT | AYT | YDT (paylaşılan Question tipiyle aynı alan adı)
  // V2 havuz akışı: 3'lü Sokratik ipucu (eski havuz sorularında yok) + kaynak rozeti
  hints?: string[];
  source?: 'pool' | 'generated';
}

interface Difficulty {
  deger: string;
  etiket: string;
}

// Gemini dil bilgisi sorularında "altı çizili sözcüğü" <u>sözcük</u> biçiminde
// işaretler (üretim prompt'undaki TEK izinli işaretleme). Bu yardımcı <u>'yu
// gerçek altı çizgiye çevirir; başka hiçbir etiket render edilmez — kalan tüm
// etiketler soyulur (dangerouslySetInnerHTML bilinçli olarak ASLA kullanılmaz).
function altiCiziliMetniCevir(metin: string) {
  return metin.split(/<u>(.*?)<\/u>/gi).map((parca, i) => {
    const temiz = parca.replace(/<[^>]*>/g, '');
    return i % 2 === 1 ? <span key={i} className="underline">{temiz}</span> : temiz;
  });
}

// Branş-öncelikli kart: ders adı + okutulduğu sınav türleri (dashboard'ta
// MEB_SYLLABUS'tan türetilir — hardcoded liste asla)
interface DersKarti {
  ders: string;
  turler: Array<'TYT' | 'AYT' | 'YDT'>;
}

interface QuestionPracticeProps {
  // Görüntü fallback'i (soru modalı rozetleri); türlen seçim artık kart akışından
  examType: string;
  DERS_KARTLARI: DersKarti[];
  ZORLUKLER: Difficulty[];
  seciliDers: string;
  seciliZorluk: string;
  soruUretiliyor: boolean;
  mevcutSoru: Question | null;
  cevapGoster: boolean;
  seciliCevap: number | null;
  // Hızlı başlatma: kart tıklaması → (gerekirse tür seçimi) → soru anında açılır.
  // ozellikler'siz çağrı Tutarlı Reset kuralıyla konu '' + zorluk 'otomatik' uygular.
  dersBaslat: (
    ders: string,
    tur: 'TYT' | 'AYT' | 'YDT',
    ozellikler?: { konu?: string; zorluk?: string }
  ) => void;
  soruUret: () => void;
  cevapSec: (index: number) => void;
  sonCozulenler: RecentAnswer[];
  kayitIncele: (kayit: RecentAnswer) => void;
  // V2 Faz 1b: bekleyen kişisel klonlar ("Eksiklerini Kapat" kartı —
  // boşken hiç render edilmez) + klonu çözülmek üzere açan handler
  bekleyenKlonlar: PendingClone[];
  klonAc: (klon: PendingClone) => void;
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
  // T2-UX1 onarımı: alert() yerine inline hata banner'ı (bağlantı hatası vb.)
  hataMesaji: string | null;
  hataKapat: () => void;
  modalKapat: () => void;
}

// DB difficulty değerleri → Türkçe etiketler
const difficultyEtiketleri: Record<string, string> = {
  beginner: 'Başlangıç',
  intermediate: 'Orta',
  advanced: 'İleri',
};

// "2 saat önce" biçiminde görece zaman etiketi
function gecmisZamaniEtiketi(isoTarih: string): string {
  const dakika = Math.floor((Date.now() - new Date(isoTarih).getTime()) / 60_000);
  if (dakika < 1) return 'az önce';
  if (dakika < 60) return `${dakika} dakika önce`;
  const saat = Math.floor(dakika / 60);
  if (saat < 24) return `${saat} saat önce`;
  const gun = Math.floor(saat / 24);
  if (gun < 7) return `${gun} gün önce`;
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(
    new Date(isoTarih)
  );
}

export function QuestionPractice({
  examType,
  DERS_KARTLARI,
  ZORLUKLER,
  seciliDers,
  seciliZorluk,
  soruUretiliyor,
  mevcutSoru,
  cevapGoster,
  seciliCevap,
  dersBaslat,
  soruUret,
  cevapSec,
  sonCozulenler,
  kayitIncele,
  bekleyenKlonlar,
  klonAc,
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
}: QuestionPracticeProps) {
  // İki türlü dersin kartına basılınca açılan "TYT mi, AYT mi?" chooser'ı
  const [chooserKarti, setChooserKarti] = useState<DersKarti | null>(null);
  // ⚙️ Detaylı Seçim penceresi state'i (tür + konu + zorluk)
  const [detayKarti, setDetayKarti] = useState<DersKarti | null>(null);
  const [detayTur, setDetayTur] = useState<'TYT' | 'AYT' | 'YDT'>('TYT');
  const [detayKonu, setDetayKonu] = useState('');
  const [detayZorluk, setDetayZorluk] = useState('otomatik');
  // Üretim beklenirken geçen süre (saniye) — kullanıcının bekleyiş hissini yönetir
  const [beklemeSaniye, setBeklemeSaniye] = useState(0);
  // Soru modalının kayan gövdesi — yeni soru gelince en üste kaydırılır
  // (önceki soruda açıklama/ipuclarında aşağı inmiş olabilir; öğrenci yeni
  // sorunun BAŞINI görerek başlasın, elle kaydırmasın)
  const modalGovdeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    modalGovdeRef.current?.scrollTo({ top: 0 });
  }, [mevcutSoru?.id]);

  // 🧺 Hata Sepeti (madde 5): oturumda görülen en yüksek bekleyen klon sayısı
  // telafi ilerlemesinin tabanıdır — cevaplanan klonlar listeden düştükçe
  // çubuk dolar, hepsi bitince kutlama kartı gelir (kapatılana dek durur)
  const [sepetZirvesi, setSepetZirvesi] = useState(0);
  const [kutlamaKapandi, setKutlamaKapandi] = useState(false);

  useEffect(() => {
    setSepetZirvesi((onceki) => Math.max(onceki, bekleyenKlonlar.length));
  }, [bekleyenKlonlar.length]);

  const telafiEdilen = sepetZirvesi - bekleyenKlonlar.length;
  const telafiYuzdesi = sepetZirvesi > 0 ? Math.round((telafiEdilen / sepetZirvesi) * 100) : 0;
  const sepetBosaltildi = sepetZirvesi > 0 && bekleyenKlonlar.length === 0;

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

  // Ders ikonları
  const dersIkonlari: Record<string, string> = {
    'Matematik': '🧮',
    'Türkçe': '📚',
    'Türk Dili ve Edebiyatı': '📖',
    'Fizik': '⚡',
    'Kimya': '🧪',
    'Biyoloji': '🧬',
    'Tarih': '🏛️',
    'Coğrafya': '🌍',
    'Felsefe': '🤔',
    'Din Kültürü': '✨',
    'İngilizce': '🌐',
  };

  // Kart tıklaması: tek türlü derste anında başlar; iki türlü derste
  // ("TYT mi, AYT mi?" sormak anlamlı olan tek senaryo) chooser açılır
  const dersKartinaBas = (kart: DersKarti) => {
    if (soruUretiliyor) return;
    if (kart.turler.length === 1) {
      dersBaslat(kart.ders, kart.turler[0]);
    } else {
      setChooserKarti(kart);
    }
  };

  // ⚙️ penceresi: güncel examType kartın türlerindense o, değilse kartın ilk türü;
  // konu/zorluk her açılışta standarttan (Tümü + Otomatik) başlar
  const detayiAc = (kart: DersKarti) => {
    if (soruUretiliyor) return;
    setDetayKarti(kart);
    setDetayTur(
      kart.turler.includes(examType as 'TYT' | 'AYT' | 'YDT')
        ? (examType as 'TYT' | 'AYT' | 'YDT')
        : kart.turler[0]
    );
    setDetayKonu('');
    setDetayZorluk('otomatik');
  };

  // ⚙️ penceresinden başlatma: seçilen konu/zorluk ozellikler ile gider
  const detayiBaslat = () => {
    if (!detayKarti) return;
    dersBaslat(detayKarti.ders, detayTur, { konu: detayKonu, zorluk: detayZorluk });
    setDetayKarti(null);
  };

  return (
    <div className="h-full w-full">
      {/* Masaüstünde sayfa kaydırması yok: tek satır ekranı doldurur, taşma kolon içinde kayar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start lg:grid-rows-[minmax(0,1fr)] lg:items-stretch">
        {/* Sol Kolon - Branş-Öncelikli Ders Kartları (2 birim) */}
        <div className="lg:col-span-8 lg:min-h-0">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm h-full lg:min-h-0">
            <div className="p-6 md:p-8 h-full flex flex-col lg:min-h-0 lg:overflow-y-auto thin-scrollbar">
              <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">
                Soru Çözmeye Başla
              </h2>
              <p className="text-slate-500 mb-6 text-sm">
                Ders kartına dokun — soru havuzdan anında açılır (varsayılan: tüm konular, otomatik
                zorluk — AI uyarlar). İstersen ⚙️ ile konu ve zorluk seçebilirsin.
              </p>

              {/* Hata banner'ı (T2-UX1): soru modalı KAPALIYKEN üretim hatası
                  burada görünür (modal açıkken modal içinde gösterilir) */}
              {hataMesaji && !mevcutSoru && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
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

              {/* Hızlı yolda üretim geri bildiriminin tek yeri: inline bekleme banner'ı */}
              {soruUretiliyor && (
                <div className="mb-4 rounded-xl bg-purple-50 border border-purple-200 px-4 py-3 flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-purple-600 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-medium text-purple-700">
                    Soru hazırlanıyor... ({beklemeSaniye} sn)
                  </span>
                </div>
              )}

              {/* V2 Faz 1b: "Eksiklerini Kapat" — gece vardiyasının yanlış
                  cevaplardan ürettiği bekleyen kişisel klonlar. Liste boşken
                  kart HİÇ render edilmez. Klon tıklanınca sıradan soru gibi
                  akar (modal kilit pattern'i aynen geçerli). */}
              {/* Madde 5 — Hata Sepeti (Duolingo görünümü): bekleyen gece
                  klonları sepet metaforuyla oyunlaştırılır — sayaç rozeti,
                  telafi ilerleme çubuğu, sepeti boşaltınca kutlama. Veri
                  yalnız bekleyenKlonlar; ilerleme oturumda görülen en yüksek
                  sayıya göre hesaplanır (yenilemede taban sıfırdan başlar). */}
              {bekleyenKlonlar.length > 0 && (
                <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                    <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                      <span className="relative inline-flex text-base leading-none">
                        🧺
                        <span className="absolute -top-1.5 -right-3.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
                          {bekleyenKlonlar.length}
                        </span>
                      </span>
                      Hata Sepeti
                    </h3>
                    <span className="text-xs font-semibold text-amber-700">
                      {telafiEdilen}/{sepetZirvesi} telafi edildi
                    </span>
                  </div>
                  {/* Telafi ilerleme çubuğu */}
                  <div
                    className="h-3 rounded-full bg-amber-100 overflow-hidden mb-2"
                    role="progressbar"
                    aria-valuenow={telafiYuzdesi}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Hata sepeti telafi ilerlemesi"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                      style={{ width: `${telafiYuzdesi}%` }}
                    />
                  </div>
                  <p className="text-xs text-amber-700 mb-3">
                    Dün yanlış yaptığın soruların türevleri sepete eklendi — telafi ettikçe boşalır.
                  </p>
                  <ul className="space-y-2">
                    {bekleyenKlonlar.map((klon) => (
                      <li
                        key={klon.id}
                        className="flex items-center justify-between gap-3 bg-white/70 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSubjectColor(klon.subject)} text-white`}>
                            {klon.subject}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                            {klon.exam_type}
                          </span>
                          <span className="text-xs text-slate-600 truncate">{klon.topic}</span>
                        </div>
                        <button
                          onClick={() => klonAc(klon)}
                          disabled={soruUretiliyor}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                          Çöz
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 🎉 Sepet boşaltıldı — kutlama kartı (kapatılana dek görünür;
                  yeni klonlar gelirse sepet kartı geri döner) */}
              {sepetBosaltildi && !kutlamaKapandi && (
                <div className="mb-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 px-4 py-3 flex items-start justify-between gap-3 animate-toast-in">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                      <span className="text-base">🎉</span>
                      Hata sepetini boşalttın!
                    </h3>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      {sepetZirvesi} yanlışın tamamını telafi ettin — eksiklerin kapanıyor, böyle devam!
                    </p>
                  </div>
                  <button
                    onClick={() => setKutlamaKapandi(true)}
                    aria-label="Kutlamayı kapat"
                    className="p-1 rounded-lg text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 transition-colors shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Ders kartları — üretim sırasında grid kilitlenir.
                  min-[480px]: Windows %125-150 ölçeklemede sm eşikleri ölü olabilir */}
              <div
                className={`grid grid-cols-2 min-[480px]:grid-cols-3 lg:grid-cols-4 gap-3 transition-opacity ${
                  soruUretiliyor ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {DERS_KARTLARI.map((kart) => (
                  <div key={kart.ders} className="relative">
                    {/* Ana buton: dokun → soru (nested-button tuzağına karşı
                        ⚙️ KARDEŞ butondur, içine gömülü değil) */}
                    <button
                      onClick={() => dersKartinaBas(kart)}
                      className="w-full h-full px-4 py-4 pt-5 rounded-xl border-2 border-slate-200 bg-slate-50 hover:border-purple-300 hover:-translate-y-0.5 transition-all duration-200 flex flex-col items-start gap-2 text-left"
                    >
                      <span
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${getSubjectColor(kart.ders)}`}
                      >
                        {dersIkonlari[kart.ders] || '📚'}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 leading-tight">
                        {kart.ders}
                      </span>
                      <span className="flex gap-1 flex-wrap">
                        {kart.turler.map((tur) => (
                          <span
                            key={tur}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700"
                          >
                            {tur}
                          </span>
                        ))}
                      </span>
                    </button>
                    {/* ⚙️ Detaylı Seçim — konu/zorluk seçmek isteyenler için */}
                    <button
                      onClick={() => detayiAc(kart)}
                      aria-label={`${kart.ders} için detaylı seçim`}
                      title="Konu ve zorluk seç"
                      className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-400 text-center mt-6">
                Sorular havuzdan anında gelir; havuz boşsa yapay zeka yeni soru üretir. Soru çözmek
                sınırsız ve ücretsizdir.
              </p>
            </div>
          </div>
        </div>

        {/* Sağ Kolon - Son Çözülenler (1 birim) — liste kendi içinde kayar, sayfa uzamaz */}
        <div className="lg:col-span-4 lg:min-h-0">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm h-full lg:min-h-0">
            <div className="p-6 lg:h-full lg:min-h-0 lg:flex lg:flex-col">
              <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2 lg:shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Son Çözülenler
              </h3>
              <p className="text-xs text-slate-500 mb-4 lg:shrink-0">Geçmiş çalışma kayıtların</p>

              <div className="space-y-3 lg:flex-1 lg:min-h-0 lg:overflow-y-auto thin-scrollbar lg:pr-1">
                {sonCozulenler.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                    <p className="text-sm text-slate-500">Henüz çözülmüş soru yok.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Soru çözdükçe kayıtların burada birikir.
                    </p>
                  </div>
                ) : (
                  sonCozulenler.map((kayit) => (
                    <div
                      key={kayit.id}
                      className="group border border-slate-200 rounded-lg p-3 hover:border-purple-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700">
                              {kayit.question.exam_type}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSubjectColor(kayit.question.subject)} text-white`}>
                              {kayit.question.subject}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                              {difficultyEtiketleri[kayit.question.difficulty] ?? kayit.question.difficulty}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-700 mb-1">{kayit.question.topic}</p>
                          <p className="text-xs text-slate-500">{gecmisZamaniEtiketi(kayit.answered_at)}</p>
                        </div>
                        <button
                          onClick={() => kayitIncele(kayit)}
                          className="ml-2 p-1.5 rounded-lg hover:bg-purple-50 opacity-0 group-hover:opacity-100 transition-all"
                          aria-label="Soruyu tekrar görüntüle"
                          title="Soruyu tekrar görüntüle"
                        >
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ Mini-Chooser Overlay: "TYT mi, AYT mi?" ══════════
          Ortalanmış overlay (z-40): mobilde taşma yok, soru modalı (z-50) üstte kalır */}
      {chooserKarti && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-1 text-center">
              {chooserKarti.ders}
            </h3>
            <p className="text-sm text-slate-500 mb-5 text-center">
              Hangi sınav için çalışmak istersin?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {chooserKarti.turler.map((tur) => (
                <button
                  key={tur}
                  onClick={() => {
                    const kart = chooserKarti;
                    setChooserKarti(null);
                    dersBaslat(kart.ders, tur);
                  }}
                  className="py-8 rounded-xl border-2 border-slate-200 bg-slate-50 hover:border-purple-400 hover:bg-purple-50 hover:-translate-y-0.5 transition-all duration-200 flex flex-col items-center gap-2"
                >
                  <span className="text-2xl font-bold text-slate-800">{tur}</span>
                  <span className="text-xs text-slate-500">
                    {tur === 'TYT' ? 'Temel Yeterlilik' : 'Alan Yeterlilik'}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setChooserKarti(null)}
              className="mt-4 w-full py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* ══════════ ⚙️ Detaylı Seçim penceresi (z-40) ══════════
          Konu artık opsiyonel: "Tümü (Karışık)" geçerli bir seçimdir */}
      {detayKarti && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Detaylı Seçim</h3>
            <p className="text-sm text-slate-500 mb-6">{detayKarti.ders}</p>

            <div className="space-y-6">
              {/* Sınav Türü — yalnız paylaşılan derslerde görünür (tek türlüde sormak anlamsız) */}
              {detayKarti.turler.length > 1 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Sınav Türü
                  </label>
                  <div className="bg-slate-100 p-1.5 rounded-xl flex">
                    {detayKarti.turler.map((tur) => (
                      <button
                        key={tur}
                        onClick={() => {
                          // Konular türe bağlı: tür değişince konu sıfırlanır
                          if (detayTur !== tur) {
                            setDetayTur(tur);
                            setDetayKonu('');
                          }
                        }}
                        className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                          detayTur === tur
                            ? 'bg-white text-purple-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                      >
                        {tur}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Konu — "Tümü (Karışık)" boş değer olarak GEÇERLİ */}
              <div>
                <label htmlFor="detay-konu" className="block text-sm font-semibold text-slate-700 mb-3">
                  Konu
                </label>
                <select
                  id="detay-konu"
                  value={detayKonu}
                  onChange={(e) => setDetayKonu(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-700 font-medium text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all cursor-pointer"
                >
                  <option value="">Tümü (Karışık)</option>
                  {getTopics(detayTur, detayKarti.ders).map((konu) => (
                    <option key={konu} value={konu}>
                      {konu}
                    </option>
                  ))}
                </select>
              </div>

              {/* Zorluk — 4 seçenek (Otomatik dahil): dar ekranda 2x2 ızgara */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Zorluk Seviyesi
                </label>
                <div className="bg-slate-100 p-1.5 rounded-xl grid grid-cols-2 gap-1">
                  {ZORLUKLER.map((zorluk) => (
                    <button
                      key={zorluk.deger}
                      onClick={() => setDetayZorluk(zorluk.deger)}
                      title={
                        zorluk.deger === 'otomatik'
                          ? 'Yapay zeka son cevaplarına göre zorluğu uyarlar'
                          : undefined
                      }
                      className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                        detayZorluk === zorluk.deger
                          ? 'bg-white text-purple-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      {zorluk.etiket}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Otomatik: yapay zeka son cevaplarına göre zorluğu uyarlar.
                </p>
              </div>

              {/* Başlat — konu opsiyonel olduğundan koşulsuz aktif */}
              <button
                onClick={detayiBaslat}
                disabled={soruUretiliyor}
                className="w-full py-4 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 hover:from-purple-700 hover:via-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-200"
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="text-xl">✨</span>
                  <span>Başlat</span>
                </span>
              </button>
              <button
                onClick={() => setDetayKarti(null)}
                className="w-full py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Soru Modal Overlay */}
      {mevcutSoru && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            ref={modalGovdeRef}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-lg text-sm font-bold bg-purple-100 text-purple-700">
                  {mevcutSoru.exam_type || examType}
                </span>
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getSubjectColor(mevcutSoru.subject || seciliDers)} text-white`}>
                  {mevcutSoru.subject || seciliDers}
                </span>
                {mevcutSoru.topic && mevcutSoru.topic !== 'Genel' && (
                  <span className="px-3 py-1 rounded-lg text-sm font-medium bg-slate-100 text-slate-700">
                    {mevcutSoru.topic}
                  </span>
                )}
                <span className="px-3 py-1 rounded-lg text-sm font-medium bg-slate-100 text-slate-600">
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
                  <span className="px-3 py-1 rounded-lg text-sm font-medium bg-emerald-100 text-emerald-700">
                    📚 Havuz
                  </span>
                )}
                {mevcutSoru.source === 'generated' && (
                  <span className="px-3 py-1 rounded-lg text-sm font-medium bg-amber-100 text-amber-700">
                    ✨ Yeni üretildi
                  </span>
                )}
              </div>
              <button
                onClick={modalKapat}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Hata banner'ı (T2-UX1): modal açıkken işlem hatası (bağlantı
                  kopması, API hatası) alert yerine burada tatlıca görünür */}
              {hataMesaji && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
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
                    <h3 className="text-xl font-semibold text-slate-800 mb-6">
                      {altiCiziliMetniCevir(mevcutSoru.question)}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {mevcutSoru.choices.map((secenek: string, index: number) => {
                      let butonSinifi = 'border-slate-200 hover:border-purple-300 bg-white';

                      if (cevapGoster) {
                        if (index === mevcutSoru.correctAnswer) {
                          butonSinifi = 'border-emerald-500 bg-emerald-50';
                        } else if (index === seciliCevap && index !== mevcutSoru.correctAnswer) {
                          butonSinifi = 'border-red-400 bg-red-50';
                        }
                      } else if (seciliCevap === index) {
                        butonSinifi = 'border-purple-500 bg-purple-50';
                      }

                      return (
                        <button
                          key={index}
                          onClick={() => cevapSec(index)}
                          disabled={cevapGoster || soruUretiliyor}
                          className={`w-full p-4 text-left border rounded-xl transition-all disabled:cursor-not-allowed ${butonSinifi}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              cevapGoster && index === mevcutSoru.correctAnswer
                                ? 'bg-emerald-500 text-white'
                                : cevapGoster && index === seciliCevap && index !== mevcutSoru.correctAnswer
                                ? 'bg-red-400 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}>
                              {String.fromCharCode(65 + index)}
                            </div>
                            <span className="flex-1 text-base text-slate-700">{altiCiziliMetniCevir(secenek)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* V2: Takıldın mı? — Sokratik ipuçları (ücretsiz, kademeli açılır).
                      İpuçları çözümü ifşa etmez; sorunun ipucusu yoksa (eski havuz
                      kayıtları) kart hiç render edilmez. */}
                  {!cevapGoster && ipuclar.length > 0 && (
                    <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                          <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          Takıldın mı?
                        </h4>
                        <span className="text-xs text-slate-500">Ücretsizdir — çözümü ifşa etmez, yön gösterir.</span>
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
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Açıklama
                      </h4>
                      <p className="text-slate-600">{mevcutSoru.explanation}</p>
                    </div>
                  )}

                  {/* V2: Üst Beyin (Özel Hoca) — 1 kredi karşılığı adım adım derin anlatım.
                      Buton HER ZAMAN açıktır (kullanıcı kararı); ipucu kullanımına bağlı değildir. */}
                  <div className="border border-purple-200 rounded-xl p-4 bg-white">
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
                        <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                          <span className="text-lg">🧠</span>
                          Üst Beyin Anlatımı
                        </h4>
                        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{ustBeyinMetni}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Üretim sürerken kilitli gövdenin üstünde spinner örtüsü */}
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

              {/* V2: Hatalı soru bildirimi — kitle kaynaklı kalite kontrolü.
                  2. FARKLI kullanıcının bildirimiyle soru havuzdan otomatik askıya alınır. */}
              <div className="flex items-center justify-between gap-3 flex-wrap -mt-2">
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
                  onClick inline ok: soruUret parametresiz — MouseEvent sızmasın */}
              <button
                onClick={() => soruUret()}
                disabled={soruUretiliyor}
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-200"
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
                  'Sıradaki Soru'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
