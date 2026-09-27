'use client';

import { useEffect, useState } from 'react';

// Hedefe Kalan Zaman — 2027 YKS TYT oturumuna (tahmini resmî tarih:
// 19 Haziran 2027 10:15 TSİ, Türkiye yıl boyunca UTC+3) gerçek zamanlı geri sayım.
// SSR uyuşmazlığını önlemek için ilk render '—' gösterir (QuotaCountdown deseni).

const EXAM_DATE = new Date('2027-06-19T10:15:00+03:00').getTime();

const pad = (n: number) => String(n).padStart(2, '0');

export function ExamCountdown() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = now === null ? null : Math.max(0, EXAM_DATE - now);
  const boxes = [
    { label: 'Gün', value: remaining === null ? '—' : String(Math.floor(remaining / 86_400_000)) },
    { label: 'Saat', value: remaining === null ? '—' : pad(Math.floor((remaining % 86_400_000) / 3_600_000)) },
    { label: 'Dakika', value: remaining === null ? '—' : pad(Math.floor((remaining % 3_600_000) / 60_000)) },
  ];

  return (
    <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl shadow-sm p-6 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <h3 className="font-semibold text-white">Hedefe Kalan Zaman ⏳</h3>
        <span className="text-xs font-medium text-purple-200">TYT · 19 Haziran 2027</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {boxes.map((b) => (
          <div key={b.label} className="bg-white/15 rounded-xl py-4 text-center">
            <p className="text-3xl font-black text-white tabular-nums">{b.value}</p>
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
