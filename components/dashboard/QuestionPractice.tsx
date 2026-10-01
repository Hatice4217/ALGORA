import { useEffect, useState } from 'react';
import { getSubjectColor } from '../../lib/utils';
import { getSubjects } from '../../lib/constants/syllabus';
import type { RecentAnswer } from '../../types/question';

interface Question {
  question: string;
  choices: string[];
  correctAnswer: number;
  explanation: string;
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

interface QuestionPracticeProps {
  // Sınav türü state'i dashboard'ta yaşar (üretim isteğine gider)
  examType: string;
  setExamType: (tur: 'TYT' | 'AYT' | 'YDT') => void;
  DERSLER: string[];
  ZORLUKLER: Difficulty[];
  KONULAR: string[];
  seciliDers: string;
  seciliZorluk: string;
  seciliKonu: string;
  soruUretiliyor: boolean;
  mevcutSoru: Question | null;
  cevapGoster: boolean;
  seciliCevap: number | null;
  setSeciliDers: (ders: string) => void;
  setSeciliZorluk: (zorluk: string) => void;
  setSeciliKonu: (konu: string) => void;
  soruUret: () => void;
  cevapSec: (index: number) => void;
  sonCozulenler: RecentAnswer[];
  kayitIncele: (kayit: RecentAnswer) => void;
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

const SINAV_TURLERI: Array<'TYT' | 'AYT' | 'YDT'> = ['TYT', 'AYT', 'YDT'];

// 1. adım kartları: sınav adı + açıklama (ders sayısı getSubjects'tan dinamik)
const SINAV_KARTLARI: Record<'TYT' | 'AYT' | 'YDT', { ikon: string; aciklama: string }> = {
  TYT: { ikon: '📘', aciklama: 'Temel Yeterlilik Testi' },
  AYT: { ikon: '📙', aciklama: 'Alan Yeterlilik Testi' },
  YDT: { ikon: '🌐', aciklama: 'Yabancı Dil Testi' },
};

export function QuestionPractice({
  examType,
  setExamType,
  DERSLER,
  ZORLUKLER,
  KONULAR,
  seciliDers,
  seciliZorluk,
  seciliKonu,
  soruUretiliyor,
  mevcutSoru,
  cevapGoster,
  seciliCevap,
  setSeciliDers,
  setSeciliZorluk,
  setSeciliKonu,
  soruUret,
  cevapSec,
  sonCozulenler,
  kayitIncele,
  ipuclar,
  acilanIpucu,
  ipucuAc,
  ustBeyinMetni,
  ustBeyinIstiyor,
  ustBeyinIste,
  bildirimDurumu,
  bildiriliyor,
  soruBildir,
  modalKapat,
}: QuestionPracticeProps) {
  // 3 adımlı akış: 1 = sınav türü, 2 = ders, 3 = konu + zorluk + üretim.
  // YDT'de tek ders (İngilizce) olduğu için 2. adım otomatik atlanır.
  const [step, setStep] = useState<1 | 2 | 3>(1);
  // Üretim beklenirken geçen süre (saniye) — kullanıcının bekleyiş hissini yönetir
  const [beklemeSaniye, setBeklemeSaniye] = useState(0);

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

  // Adım 2'de ders kartına basınca ders seçilir ve akış 3. adıma ilerler
  const dersSec = (ders: string) => {
    setSeciliDers(ders); // parent konuyu sıfırlar
    setStep(3);
  };

  // Sınav türü seçimi parent'ta ders + konu sıfırlamasını tetikler;
  // YDT tek ders olduğundan ders adımı atlanıp doğrudan konu adımına gidilir
  const sinavTuruDegistir = (tur: 'TYT' | 'AYT' | 'YDT') => {
    setExamType(tur);
    setStep(tur === 'YDT' ? 3 : 2);
  };

  return (
    <div className="h-full w-full">
      {/* Masaüstünde sayfa kaydırması yok: tek satır ekranı doldurur, taşma kolon içinde kayar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start lg:grid-rows-[minmax(0,1fr)] lg:items-stretch">
        {/* Sol Kolon - Soru Üretimi (2 birim) */}
        <div className="lg:col-span-8 lg:min-h-0">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm h-full lg:min-h-0">
            <div className="p-8 h-full flex flex-col lg:min-h-0 lg:overflow-y-auto thin-scrollbar">
              {step === 1 ? (
                <>
                  {/* ══════════ ADIM 1: Sınav Türü ══════════ */}
                  <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">
                    Soru Çözmeye Başla
                  </h2>
                  <p className="text-slate-500 mb-8 text-sm">
                    1. Adım: Hangi sınav için çalışmak istersin?
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {SINAV_TURLERI.map((tur) => (
                      <button
                        key={tur}
                        onClick={() => sinavTuruDegistir(tur)}
                        className={`
                          p-5 rounded-xl border-2 text-left transition-all duration-200 flex flex-col gap-1
                          ${examType === tur
                            ? 'border-purple-500 bg-purple-50 shadow-md shadow-purple-100'
                            : 'border-slate-200 bg-slate-50 hover:border-purple-300 hover:-translate-y-0.5'
                          }
                        `}
                      >
                        <span className="text-2xl">{SINAV_KARTLARI[tur].ikon}</span>
                        <span className="text-lg font-bold text-slate-800">{tur}</span>
                        <span className="text-xs text-slate-500">{SINAV_KARTLARI[tur].aciklama}</span>
                        <span className="text-xs font-medium text-purple-600 mt-1">
                          {tur === 'YDT' ? 'İngilizce' : `${getSubjects(tur).length} ders`}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : step === 2 ? (
                <>
                  {/* ══════════ ADIM 2: Ders Seçimi ══════════ */}
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Geri
                    </button>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">
                    {examType} Dersleri
                  </h2>
                  <p className="text-slate-500 mb-8 text-sm">
                    2. Adım: {examType} için çalışmak istediğin dersi seç
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {DERSLER.map((ders) => (
                      <button
                        key={ders}
                        onClick={() => dersSec(ders)}
                        className={`
                          px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200
                          flex items-center justify-center gap-2
                          ${seciliDers === ders
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-2 border-slate-200 hover:border-purple-300 hover:-translate-y-0.5'
                          }
                        `}
                      >
                        <span className="text-lg">{dersIkonlari[ders] || '📚'}</span>
                        <span>{ders}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* ══════════ ADIM 3: Konu + Zorluk + Üretim ══════════ */}
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      onClick={() => setStep(examType === 'YDT' ? 1 : 2)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Geri
                    </button>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">
                    {examType} - {seciliDers}
                  </h2>
                  <p className="text-slate-500 mb-8 text-sm">
                    3. Adım: Konu ve zorluk seviyesini seç, teste başla
                  </p>

                  <div className="space-y-8 flex-1">
                    {/* Konu Seçimi - Dropdown (seçim zorunlu) */}
                    <div>
                      <label htmlFor="konu-secimi" className="block text-sm font-semibold text-slate-700 mb-4">
                        Konu Seçimi
                      </label>
                      <select
                        id="konu-secimi"
                        value={seciliKonu}
                        onChange={(e) => setSeciliKonu(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-700 font-medium text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all cursor-pointer"
                      >
                        <option value="" disabled>
                          Konu seçin
                        </option>
                        {KONULAR.map((konu) => (
                          <option key={konu} value={konu}>
                            {konu}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Zorluk Seviyesi - Segmented Control */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-4">
                        Zorluk Seviyesi
                      </label>
                      <div className="bg-slate-100 p-1.5 rounded-xl inline-flex w-full">
                        {ZORLUKLER.map((zorluk) => (
                          <button
                            key={zorluk.deger}
                            onClick={() => setSeciliZorluk(zorluk.deger)}
                            className={`
                              flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200
                              ${seciliZorluk === zorluk.deger
                                ? 'bg-white text-purple-700 shadow-sm'
                                : 'text-slate-600 hover:text-slate-800'
                              }
                            `}
                          >
                            {zorluk.etiket}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Testi Başlat — havuzdan anında gelir; havuz boşsa yapay zeka üretir */}
                    <button
                      onClick={soruUret}
                      disabled={soruUretiliyor || !seciliKonu}
                      className="w-full py-4 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 hover:from-purple-700 hover:via-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-purple-600 disabled:hover:via-purple-500 disabled:hover:to-pink-500 shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 transform hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
                    >
                      <span className="flex items-center justify-center gap-3">
                        {soruUretiliyor ? (
                          <>
                            {/* Spinner Animation */}
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>
                              Soru hazırlanıyor... ({beklemeSaniye} sn)
                              {beklemeSaniye >= 30 && ' — kaliteli sorular biraz zaman alır'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-xl">✨</span>
                            <span>{seciliKonu ? 'Testi Başlat' : 'Önce konu seçin'}</span>
                          </>
                        )}
                      </span>
                    </button>
                    <p className="text-xs text-slate-400 text-center -mt-4">
                      Sorular havuzdan anında gelir; havuz boşsa yapay zeka yeni soru üretir. Soru çözmek sınırsız ve ücretsizdir.
                    </p>
                  </div>
                </>
              )}
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

      {/* Soru Modal Overlay */}
      {mevcutSoru && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
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
                    (seciliZorluk === 'baslangic' ? 'Başlangıç' : seciliZorluk === 'orta' ? 'Orta' : 'İleri')}
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
              {/* Soru gövdesi — yeni soru üretilirken eski soruyla etkileşim fiziksel olarak kesilir */}
              <div className="relative">
                <div className={`space-y-6 ${soruUretiliyor ? 'opacity-50 pointer-events-none select-none' : ''}`}>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-800 mb-6">
                      {mevcutSoru.question}
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
                            <span className="flex-1 text-base text-slate-700">{secenek}</span>
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

              <button
                onClick={soruUret}
                disabled={soruUretiliyor || !seciliKonu}
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
