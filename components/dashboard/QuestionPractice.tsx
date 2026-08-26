import { getSubjectColor } from '../../lib/utils';

interface Question {
  question: string;
  choices: string[];
  correctAnswer: number;
  explanation: string;
}

interface Difficulty {
  deger: string;
  etiket: string;
}

interface QuestionPracticeProps {
  DERSLER: string[];
  ZORLUKLER: Difficulty[];
  seciliDers: string;
  seciliZorluk: string;
  soruUretiliyor: boolean;
  mevcutSoru: Question | null;
  cevapGoster: boolean;
  seciliCevap: number | null;
  setSeciliDers: (ders: string) => void;
  setSeciliZorluk: (zorluk: string) => void;
  soruUret: () => void;
  cevapSec: (index: number) => void;
  modalKapat: () => void;
}

export function QuestionPractice({
  DERSLER,
  ZORLUKLER,
  seciliDers,
  seciliZorluk,
  soruUretiliyor,
  mevcutSoru,
  cevapGoster,
  seciliCevap,
  setSeciliDers,
  setSeciliZorluk,
  soruUret,
  cevapSec,
  modalKapat,
}: QuestionPracticeProps) {
  // Mock veri - Son çözülen sorular
  const sonCozulenler = [
    { id: 1, ders: 'Matematik', konu: 'Türev', zorluk: 'Orta', tarih: '2 saat önce' },
    { id: 2, ders: 'Tarih', konu: 'Kurtuluş Savaşı', zorluk: 'Zor', tarih: '5 saat önce' },
    { id: 3, ders: 'Fizik', konu: 'Kuvvet ve Hareket', zorluk: 'Başlangıç', tarih: '1 gün önce' },
    { id: 4, ders: 'Kimya', konu: 'Periyodik Sistem', zorluk: 'Orta', tarih: '2 gün önce' },
    { id: 5, ders: 'Türkçe', konu: 'Paragraf Bilgisi', zorluk: 'İleri', tarih: '3 gün önce' },
  ];

  // Ders ikonları
  const dersIkonlari: Record<string, string> = {
    'Matematik': '🧮',
    'Türkçe': '📚',
    'Fizik': '⚡',
    'Kimya': '🧪',
    'Biyoloji': '🧬',
    'Tarih': '🏛️',
    'Coğrafya': '🌍',
    'Felsefe': '🤔',
    'Din Kültürü': '✨',
  };

  return (
    <div className="h-full w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
        {/* Sol Kolon - Soru Üretimi (2 birim) */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm h-full">
            <div className="p-8 h-full flex flex-col">
              <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">
                Soru Çözmeye Başla
              </h2>
              <p className="text-slate-500 mb-8 text-sm">
                Çalışmak istediğin ders ve zorluk seviyesini seç
              </p>

              <div className="space-y-8 flex-1">
                {/* AI Butonu - Gradient with Spinner */}
                <button
                  onClick={soruUret}
                  disabled={soruUretiliyor}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 hover:from-purple-700 hover:via-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 transform hover:-translate-y-0.5"
                >
                  <span className="flex items-center justify-center gap-3">
                    {soruUretiliyor ? (
                      <>
                        {/* Spinner Animation */}
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Yapay Zeka Soru Üretiliyor...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">✨</span>
                        <span>Yapay Zeka ile Soru Üret</span>
                      </>
                    )}
                  </span>
                </button>
                {/* Ders Seçimi - Chips */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-4">
                    Ders Seç
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {DERSLER.map((ders) => (
                      <button
                        key={ders}
                        onClick={() => setSeciliDers(ders)}
                        className={`
                          px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200
                          flex items-center justify-center gap-2
                          ${seciliDers === ders
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 transform scale-105'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-2 border-slate-200 hover:border-purple-300'
                          }
                        `}
                      >
                        <span className="text-lg">{dersIkonlari[ders] || '📚'}</span>
                        <span>{ders}</span>
                      </button>
                    ))}
                  </div>
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
              </div>
            </div>
          </div>
        </div>

        {/* Sağ Kolon - Son Çözülenler (1 birim) */}
        <div className="lg:col-span-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm h-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Son Çözülenler
              </h3>
              <p className="text-xs text-slate-500 mb-4">Geçmiş çalışma kayıtların</p>

              <div className="space-y-3">
                {sonCozulenler.map((kayit) => (
                  <div
                    key={kayit.id}
                    className="group border border-slate-200 rounded-lg p-3 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSubjectColor(kayit.ders)} text-white`}>
                            {kayit.ders}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                            {kayit.zorluk}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-700 mb-1">{kayit.konu}</p>
                        <p className="text-xs text-slate-500">{kayit.tarih}</p>
                      </div>
                      <button className="ml-2 p-1.5 rounded-lg hover:bg-purple-50 opacity-0 group-hover:opacity-100 transition-all">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
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
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getSubjectColor(seciliDers)} text-white`}>
                  {seciliDers}
                </span>
                <span className="px-3 py-1 rounded-lg text-sm font-medium bg-slate-100 text-slate-600">
                  {seciliZorluk === 'baslangic' ? 'Başlangıç' : seciliZorluk === 'orta' ? 'Orta' : 'İleri'}
                </span>
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
                      disabled={cevapGoster}
                      className={`w-full p-4 text-left border rounded-xl transition-all ${butonSinifi}`}
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

              <button
                onClick={soruUret}
                disabled={soruUretiliyor}
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-purple-200"
              >
                {soruUretiliyor ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Sıradaki Soru Üretiliyor...</span>
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
