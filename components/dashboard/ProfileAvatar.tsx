'use client';

// ===================================
// ProfileAvatar — sağ üst baş harfi avatarı + açılır profil menüsü
// (Yol Haritası madde 1 / Hasan Hoca #1: belirgin "Çıkış Yap" butonu yerine
// SaaS tarzı avatar; menüde ad, paket, kalan kredi; çıkış altta ince kırmızı link)
// ===================================

import { useEffect, useRef, useState } from 'react';
import { TemaDegistir } from '@/components/TemaDegistir';

interface ProfileAvatarProps {
  userName: string | null;
  planName: string | null;
  creditsRemaining: number | null;
  creditsLimit: number | null;
  onLogout: () => void;
}

// "Hatice Şarlak" → "HŞ" · tek isim → ilk iki harf · boş → "?"
function basHarfler(ad: string | null): string {
  const parcalar = (ad ?? '').trim().split(/\s+/).filter(Boolean);
  if (parcalar.length === 0) return '?';
  if (parcalar.length === 1) return parcalar[0].slice(0, 2).toLocaleUpperCase('tr-TR');
  return (parcalar[0][0] + parcalar[1][0]).toLocaleUpperCase('tr-TR');
}

export function ProfileAvatar({
  userName,
  planName,
  creditsRemaining,
  creditsLimit,
  onLogout,
}: ProfileAvatarProps) {
  const [acik, setAcik] = useState(false);
  const kokRef = useRef<HTMLDivElement>(null);

  // Dışına tıklanınca + ESC ile kapat
  useEffect(() => {
    if (!acik) return;
    const tikla = (e: MouseEvent) => {
      if (kokRef.current && !kokRef.current.contains(e.target as Node)) setAcik(false);
    };
    const klavye = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAcik(false);
    };
    document.addEventListener('mousedown', tikla);
    document.addEventListener('keydown', klavye);
    return () => {
      document.removeEventListener('mousedown', tikla);
      document.removeEventListener('keydown', klavye);
    };
  }, [acik]);

  return (
    <div ref={kokRef} className="relative">
      <button
        onClick={() => setAcik((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={acik}
        aria-label="Profil menüsü"
        className={`w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 text-white text-sm font-bold flex items-center justify-center shadow-sm transition-all ${
          acik ? 'ring-2 ring-purple-300' : 'hover:ring-2 hover:ring-purple-200'
        }`}
      >
        {basHarfler(userName)}
      </button>

      {acik && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50"
        >
          {/* Kimlik */}
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {userName || 'Öğrenci'}
            </p>
          </div>

          {/* Paket + kredi durumu */}
          <div className="px-4 py-2 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Paket</span>
              <span className="font-medium text-gray-800">{planName ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">AI Kredisi</span>
              <span className="font-semibold text-purple-700">
                {creditsRemaining ?? '—'} / {creditsLimit ?? '—'}
              </span>
            </div>
          </div>

          {/* Görünüm (koyu/açık tema) — kredi bloğu ile çıkış arasında */}
          <div className="px-2 mt-1">
            <TemaDegistir variant="row" />
          </div>

          {/* Çıkış — kibar, ince kırmızı link (belirgin buton DEĞİL) */}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              role="menuitem"
              onClick={onLogout}
              className="w-full text-left px-4 py-2 text-sm font-normal text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
