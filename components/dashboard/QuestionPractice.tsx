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
}: QuestionPracticeProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        {!mevcutSoru ? (
          <div className="p-8">
            <h2 className="text-xl font-light text-slate-800 mb-2 tracking-wide">
              Soru Çözmeye Başla
            </h2>
            <p className="text-slate-500 mb-6 text-sm">
              Çalışmak istediğin ders ve zorluk seviyesini seç
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2 tracking-wide uppercase">
                  Ders Seç
                </label>
                <select
                  value={seciliDers}
                  onChange={(e) => setSeciliDers(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-0 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                >
                  {DERSLER.map((ders) => (
                    <option key={ders} value={ders}>
                      {ders}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2 tracking-wide uppercase">
                  Zorluk Seviyesi
                </label>
                <select
                  value={seciliZorluk}
                  onChange={(e) => setSeciliZorluk(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-0 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                >
                  {ZORLUKLER.map((zorluk) => (
                    <option key={zorluk.deger} value={zorluk.deger}>
                      {zorluk.etiket}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={soruUret}
                disabled={soruUretiliyor}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-all focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {soruUretiliyor ? 'Üretiliyor...' : 'Soru Üret'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getSubjectColor(seciliDers)} text-white`}>
                  {seciliDers}
                </span>
                <span className="px-3 py-1 rounded-lg text-sm font-medium bg-slate-100 text-slate-600">
                  {seciliZorluk === 'baslangic' ? 'Başlangıç' : seciliZorluk === 'orta' ? 'Orta' : 'İleri'}
                </span>
              </div>
              <h3 className="text-lg font-light text-slate-800 mb-4">
                {mevcutSoru.question}
              </h3>
            </div>

            <div className="space-y-2">
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
                    className={`w-full p-3 text-left border rounded-lg transition-all ${butonSinifi}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-medium text-xs ${
                        cevapGoster && index === mevcutSoru.correctAnswer
                          ? 'bg-emerald-500 text-white'
                          : cevapGoster && index === seciliCevap && index !== mevcutSoru.correctAnswer
                          ? 'bg-red-400 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="flex-1 text-sm text-slate-700">{secenek}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {cevapGoster && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <h4 className="font-medium text-slate-800 mb-1 text-sm">Açıklama</h4>
                <p className="text-slate-600 text-sm">{mevcutSoru.explanation}</p>
              </div>
            )}

            <button
              onClick={soruUret}
              disabled={soruUretiliyor}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-all focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {soruUretiliyor ? 'Üretiliyor...' : 'Sıradaki Soru'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
