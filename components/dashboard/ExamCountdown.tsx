'use client';

import { useEffect, useState } from 'react';
import { useUserPreferences } from './UserPreferencesProvider';

// Hedefe Kalan Zaman — 2027 YKS'ye gerçek zamanlı geri sayım. Tarihler ürün kararıyla
// SABİT (ÖSYM'nin yıllık kalıp düzeni): TYT 1. gün 10:15, AYT/YDT 2. gün 15:00 TSİ
// (Türkiye yıl boyunca UTC+3). Ayarlar > Sınav Hedefleri'ndeki Sınav Tipi hangi güne
// sayılacağını belirler; resmî tarih açıklandığında sabitler güncellenir.
// SSR uyuşmazlığını önlemek için ilk render '—' gösterir (QuotaCountdown deseni).

const SINAV_TAKVIMI = {
  TYT: { ms: new Date('2027-06-19T10:15:00+03:00').getTime(), etiket: 'TYT · 19 Haziran 2027' },
  AYT: { ms: new Date('2027-06-20T15:00:00+03:00').getTime(), etiket: 'AYT · 20 Haziran 2027' },
  YDT: { ms: new Date('2027-06-20T15:00:00+03:00').getTime(), etiket: 'YDT · 20 Haziran 2027' },
} as const;

const pad = (n: number) => String(n).padStart(2, '0');

export function ExamCountdown() {
  const { preferences } = useUserPreferences();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const takvim = SINAV_TAKVIMI[preferences.examType];
  const remaining = now === null ? null : Math.max(0, takvim.ms - now);
  const boxes = [
    { label: 'Gün', value: remaining === null ? '—' : String(Math.floor(remaining / 86_400_000)) },
    { label: 'Saat', value: remaining === null ? '—' : pad(Math.floor((remaining % 86_400_000) / 3_600_000)) },
    { label: 'Dakika', value: remaining === null ? '—' : pad(Math.floor((remaining % 3_600_000) / 60_000)) },
    { label: 'Saniye', value: remaining === null ? '—' : pad(Math.floor((remaining % 60_000) / 1000)) },
  ];

  return (
    <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl shadow-sm p-6 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <h3 className="font-semibold text-white">Hedefe Kalan Zaman ⏳</h3>
        <span className="text-xs font-medium text-purple-200">{takvim.etiket}</span>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {boxes.map((b) => (
          <div key={b.label} className="bg-white/15 rounded-xl py-4 text-center">
            <p className="text-2xl sm:text-3xl font-black text-white tabular-nums">{b.value}</p>
            <p className="text-xs font-medium text-purple-200 mt-1">{b.label}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-purple-200 mt-4 text-center">
        Her gün bir fırsat — küçük adımlar büyük fark yaratır. 💪
      </p>
    </div>
  );
}
