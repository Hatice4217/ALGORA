'use client';

import { useEffect } from 'react';

// Yasal sayfalardan ana sayfaya dönüşte kaydırma konumunu geri yükler.
// Footer'daki yasal link tıklanırken sessionStorage'a kaydedilen konum
// (algora_landing_scrollY) tek kullanımlıktır: geri yüklenir geri yüklenmez silinir,
// böylece dashboard gibi başka bir akıştan gelen ziyaretçi en üstte açılır.
export function LandingScrollRestorer() {
  useEffect(() => {
    let kayitli: string | null = null;
    try {
      kayitli = sessionStorage.getItem('algora_landing_scrollY');
    } catch {
      return; // private mode vb. — sessiz geç
    }
    if (kayitli === null) return;

    sessionStorage.removeItem('algora_landing_scrollY');
    const y = Number(kayitli);
    if (!Number.isFinite(y) || y <= 0) return;

    // Çift rAF: Next.js geri navigasyondaki kendi scroll işleminden SONRA uygulanır
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        window.scrollTo({ top: y, behavior: 'instant' });
      })
    );
  }, []);

  return null;
}
