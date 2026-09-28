'use client';

import { useState } from 'react';
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
  examType: string; // TYT | AYT | YDT — aynı ders tür başına ayrı satır
  toplam: number;
  dogru: number;
  basari: number;
}

interface AnalysisPanelProps {
  istatistikler: {
    dersler: SubjectStat[];
  };
}

export function AnalysisPanel({ istatistikler }: AnalysisPanelProps) {
  const { goals, hydrated } = useGoals();
  // Arşivde gezinilen gün ('YYYY-MM-DD'); ileri ok bugün sınırında kilitli
  const [seciliTarih, setSeciliTarih] = useState(todayStr());
  const bugun = todayStr();
  const gununHedefleri = goals.filter((g) => g.date === seciliTarih);

  // Rozetler gerçek ders verisinden türetilir; tek derste yalnız 🏆 gösterilir
  const enBasarili = istatistikler.dersler.length > 0
    ? istatistikler.dersler.reduce((a, b) => (b.basari > a.basari ? b : a))
    : null;
  const odaklanilacak = istatistikler.dersler.length > 1
    ? istatistikler.dersler.reduce((a, b) => (b.basari < a.basari ? b : a))
    : null;

  return (
    // Masaüstünde sayfa kaydırması yok: 1. satır arşiv (auto), 2. satır performans kartı
    // kalan yüksekliği doldurur — taşan içerik kartların içinde kayar
    <div className="grid md:grid-cols-2 gap-6 lg:h-full lg:grid-rows-[auto_minmax(0,1fr)] lg:min-h-0">
      {/* Hedef Arşivi — tarih gezinmeli kalıcı kayıt; liste kendi içinde kayar, sayfa uzamaz */}
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
          <div className="max-h-64 overflow-y-auto thin-scrollbar pr-2">
            <ul className="flex flex-col gap-2">
              {gununHedefleri.map((g) => (
                <ArsivSatir key={g.id} goal={g} />
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Ders Performans Analizi — rozetler + progress bar ızgarası tek kartta */}
      {istatistikler.dersler.length > 0 ? (
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm p-6 lg:min-h-0 lg:flex lg:flex-col">
          {/* Header: başlık + dinamik özet rozetleri */}
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap lg:shrink-0">
            <h2 className="font-semibold text-gray-900">Ders Performans Analizi</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {enBasarili && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-sm font-medium text-green-700">
                  🏆 En Başarılı: {enBasarili.ders} ({enBasarili.examType})
                </span>
              )}
              {odaklanilacak && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-sm font-medium text-orange-700">
                  📈 Odaklanılmalı: {odaklanilacak.ders} ({odaklanilacak.examType})
                </span>
              )}
            </div>
          </div>

          {/* Body: ders kartları yan yana (xl'de 5 sütun); ders sayısı artarsa ızgara kendi içinde kayar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 max-h-[300px] overflow-y-auto thin-scrollbar pr-2 lg:flex-1 lg:min-h-0">
            {istatistikler.dersler.map((ders) => (
              <div key={`${ders.ders}-${ders.examType}`} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-medium text-gray-900">
                    {ders.ders} <span className="text-xs font-normal text-gray-500">({ders.examType})</span>
                  </span>
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
