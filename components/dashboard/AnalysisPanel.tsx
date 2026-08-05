import { getSubjectColor } from '../../lib/utils';

interface SubjectStat {
  ders: string;
  toplam: number;
  dogru: number;
  basari: number;
}

interface Statistics {
  gucluAlanlar: string[];
  gelisimGerekenler: string[];
  dersler: SubjectStat[];
}

interface AnalysisPanelProps {
  istatistikler: Statistics;
}

export function AnalysisPanel({ istatistikler }: AnalysisPanelProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Güçlü Olduğun Alanlar */}
      {istatistikler.gucluAlanlar.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-lg">💪</span>
            </div>
            <h2 className="font-semibold text-gray-900">Güçlü Olduğun Alanlar</h2>
          </div>
          <div className="space-y-3">
            {istatistikler.gucluAlanlar.map((alan) => (
              <div key={alan} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${getSubjectColor(alan)}`}></div>
                <span className="text-gray-700 font-medium">{alan}</span>
                <span className="ml-auto text-green-600 text-sm font-medium">İyi</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-slate-400 mb-3">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="font-semibold text-gray-900 mb-2">Güçlü alanların belirlenmedi</h2>
          <p className="text-gray-600 text-sm">
            Soru çözmeye başladığında güçlü olduğunu alanların burada görünecek
          </p>
        </div>
      )}

      {/* Gelişim Gereken Alanlar */}
      {istatistikler.gelisimGerekenler.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-lg">📈</span>
            </div>
            <h2 className="font-semibold text-gray-900">Gelişim Gereken Alanlar</h2>
          </div>
          <div className="space-y-3">
            {istatistikler.gelisimGerekenler.map((alan) => (
              <div key={alan} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${getSubjectColor(alan)}`}></div>
                <span className="text-gray-700 font-medium">{alan}</span>
                <span className="ml-auto text-orange-600 text-sm font-medium">Çalışma gerekli</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-slate-400 mb-3">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h2 className="font-semibold text-gray-900 mb-2">Gelişim alanların belirlenmedi</h2>
          <p className="text-gray-600 text-sm">
            Soru çözmeye başladığında gelişim gerektiren alanların burada görünecek
          </p>
        </div>
      )}

      {/* Ders Bazlı Detaylı İstatistikler */}
      {istatistikler.dersler.length > 0 ? (
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Ders Bazlı Performans</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {istatistikler.dersler.map((ders) => (
              <div key={ders.ders} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{ders.ders}</span>
                  <span className={`text-sm font-medium ${
                    ders.basari >= 80 ? 'text-green-600' :
                    ders.basari >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    %{ders.basari}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{ders.dogru}/{ders.toplam} doğru</span>
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      ders.basari >= 80 ? 'bg-green-500' :
                      ders.basari >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${ders.basari}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-slate-400 mb-3">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="font-semibold text-gray-900 mb-2">Henüz ders verisi yok</h2>
          <p className="text-gray-600 text-sm">
            Soru çözmeye başladığında ders bazlı performansın burada görünecek
          </p>
        </div>
      )}
    </div>
  );
}
