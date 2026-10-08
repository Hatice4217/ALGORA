'use client';

import Link from 'next/link';
import { scrollToElementId } from '../lib/smooth-scroll';

export function Footer() {
  const bolumeKaydir = (e: React.MouseEvent<HTMLAnchorElement>, hedefId: string) => {
    e.preventDefault();
    scrollToElementId(hedefId);
  };

  // Yasal sayfaya geçerken kalınan konumu kaydet — dönüşte LandingScrollRestorer geri yükler
  const yasalLinkTikla = () => {
    try {
      sessionStorage.setItem('algora_landing_scrollY', String(window.scrollY));
    } catch {
      // private mode vb. — kayıt olmadan normal git
    }
  };

  return (
    <footer className="bg-purple-100 border-t border-purple-200">
      <div className="w-full px-4 md:px-6 lg:px-8 pt-14 pb-8 md:pt-16 md:pb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-10 md:gap-16">
          {/* 1. Sütun - Marka */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center">
              <span className="text-4xl font-bold text-purple-600">Al</span>
              <span className="text-4xl font-bold text-gray-900">gora</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              AI destekli kişiselleştirilmiş eğitim platformu.
            </p>
          </div>

          {/* 2. Sütun - Ürün */}
          <div>
            <h4 className="font-bold text-gray-900 mb-4">Ürün</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#features" onClick={(e) => bolumeKaydir(e, 'features')} className="text-gray-500 hover:text-purple-600 transition-colors">Özellikler</a></li>
              <li><a href="#how-it-works" onClick={(e) => bolumeKaydir(e, 'how-it-works')} className="text-gray-500 hover:text-purple-600 transition-colors">Nasıl Çalışır?</a></li>
              <li><a href="#pricing" onClick={(e) => bolumeKaydir(e, 'pricing')} className="text-gray-500 hover:text-purple-600 transition-colors">Fiyatlandırma</a></li>
            </ul>
          </div>

          {/* 3. Sütun - Yasal */}
          <div>
            <h4 className="font-bold text-gray-900 mb-4">Yasal</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="/legal/privacy" onClick={yasalLinkTikla} className="text-gray-500 hover:text-purple-600 transition-colors">Gizlilik Politikası</Link></li>
              <li><Link href="/legal/terms" onClick={yasalLinkTikla} className="text-gray-500 hover:text-purple-600 transition-colors">Kullanım Şartları</Link></li>
              <li><Link href="/legal/cookies" onClick={yasalLinkTikla} className="text-gray-500 hover:text-purple-600 transition-colors">Çerez Politikası</Link></li>
            </ul>
          </div>
        </div>

        {/* Alt Kapanış - Copyright */}
        <div className="border-t border-purple-100 mt-10 md:mt-12 pt-6 text-center text-sm text-gray-500">
          © 2026 ALGORA. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
}
