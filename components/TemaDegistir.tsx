'use client';

// ===================================
// TemaDegistir — koyu/açık tema anahtarı (next-themes)
// variant 'icon': yuvarlak Sun/Moon düğmesi (header'lar)
// variant 'row': tam genişlik "Görünüm" satırı (avatar menüsü, mobil menü, ayarlar)
// mounted-guard: SSR/ilk boyamada tema belli değil — boş düğme basılır, hidrasyon uyumu bozulmaz
// ===================================

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

interface TemaDegistirProps {
  variant?: 'icon' | 'row';
}

export function TemaDegistir({ variant = 'icon' }: TemaDegistirProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const koyu = resolvedTheme === 'dark';
  const sonrakiEtiket = koyu ? 'Açık temaya geç' : 'Koyu temaya geç';

  if (variant === 'row') {
    return (
      <button
        onClick={() => setTheme(koyu ? 'light' : 'dark')}
        aria-label={sonrakiEtiket}
        className="w-full flex items-center justify-between px-4 py-2 text-sm font-normal text-gray-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors"
      >
        <span className="flex items-center gap-2">
          {mounted && koyu ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
          Görünüm
        </span>
        <span className="text-gray-500 dark:text-slate-400 font-medium">
          {mounted ? (koyu ? 'Koyu' : 'Açık') : '—'}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(koyu ? 'light' : 'dark')}
      aria-label={sonrakiEtiket}
      title={sonrakiEtiket}
      className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
    >
      {mounted && koyu ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  );
}
