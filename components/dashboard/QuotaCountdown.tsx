'use client';

import { useEffect, useState } from 'react';

// Dönem sonuna kalan süreyi canlı sayan geri sayım bileşeni.
// SSR uyuşmazlığını önlemek için ilk render'da "—" gösterir, süre yalnızca
// istemci tarafında useEffect ile başlar.
function formatRemaining(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (days > 0) return `${days}g ${pad(hours)}sa ${pad(minutes)}dk`;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

interface QuotaCountdownProps {
  periodEnd: string; // ISO tarih
  className?: string;
}

export function QuotaCountdown({ periodEnd, className = '' }: QuotaCountdownProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const end = new Date(periodEnd).getTime();
  const remaining = now === null || Number.isNaN(end) ? null : Math.max(0, end - now);

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono tabular-nums ${className}`}>
      {remaining === null
        ? '—'
        : remaining === 0
        ? 'yenilenmeye hazır'
        : formatRemaining(remaining)}
    </span>
  );
}
