'use client';

import { useState } from 'react';
import { getSubjectColor } from '../../lib/utils';
import { useGoals, todayStr, type Goal } from './GoalsProvider';

// 'YYYY-MM-DD' → "27 Eylül" (farklı yılsa yıl eklenir)
const formatGun = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const base = new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  return y !== new Date().getFullYear() ? `${base} ${y}` : base;
};

// Tarihi delta gün kaydırır (yerel, UTC kayması olmadan)
const shiftDate = (dateStr: string, delta: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

// Arşiv satırı: tamamlananlar yeşil tikli + üstü çizili, tamamlanmayanlar normal
function ArsivSatir({ goal }: { goal: Goal }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
      {goal.isCompleted ? (
        <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      ) : (
        <span className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" aria-hidden="true"></span>
      )}
      <span className={`flex-1 text-sm break-words ${goal.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
        {goal.text}
      </span>
      {goal.isCompleted && <span className="text-xs font-medium text-green-600 flex-shrink-0">Tamamlandı</span>}
    </li>
  );
}

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
  const { goals, hydrated } = useGoals();
  // Arşivde gezinilen gün ('YYYY-MM-DD'); ileri ok bugün sınırında kilitli
  const [seciliTarih, setSeciliTarih] = useState(todayStr());
  const bugun = todayStr();
  const gununHedefleri = goals.filter((g) => g.date === seciliTarih);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Hedef Arşivi — tarih gezinmeli kalıcı kayıt */}
      <div className="md:col-span-2 bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="font-semibold text-gray-900">Hedef Arşivi 📚</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSeciliTarih(shiftDate(seciliTarih, -1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-colors"
              aria-label="Önceki gün"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">
              {formatGun(seciliTarih)}
              {seciliTarih === bugun && <span className="text-purple-600"> (Bugün)</span>}
            </span>
            <button
              onClick={() => setSeciliTarih(shiftDate(seciliTarih, 1))}
              disabled={seciliTarih >= bugun}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500"
              aria-label="Sonraki gün"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {!hydrated ? null : gununHedefleri.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            Bu tarihte kayıtlı hedef yok.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {gununHedefleri.map((g) => (
              <ArsivSatir key={g.id} goal={g} />
            ))}
          </ul>
        )}
      </div>

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
