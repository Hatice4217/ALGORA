import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-900">
      <div className="container mx-auto px-6 pt-12 pb-10 min-[480px]:pt-16 min-[480px]:pb-12 md:pt-20 md:pb-16">
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 gap-10 min-[480px]:gap-12 md:gap-16">
          {/* 1. Sütun - Marka */}
          <div className="flex flex-col space-y-4 min-[480px]:col-span-2 md:col-span-1">
            <div className="flex items-center">
              <span className="text-4xl font-bold text-purple-500">Al</span>
              <span className="text-4xl font-bold text-white">gora</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              AI destekli kişiselleştirilmiş eğitim platformu.
            </p>
          </div>

          {/* 2. Sütun - Ürün */}
          <div>
            <h4 className="font-bold text-white mb-4">Ürün</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#features" className="text-gray-400 hover:text-purple-500 transition-colors">Özellikler</a></li>
              <li><a href="#how-it-works" className="text-gray-400 hover:text-purple-500 transition-colors">Nasıl Çalışır?</a></li>
              <li><a href="#pricing" className="text-gray-400 hover:text-purple-500 transition-colors">Fiyatlandırma</a></li>
            </ul>
          </div>

          {/* 3. Sütun - Yasal */}
          <div>
            <h4 className="font-bold text-white mb-4">Yasal</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/legal/privacy" className="text-gray-400 hover:text-purple-500 transition-colors">Gizlilik Politikası</Link></li>
              <li><Link href="/legal/terms" className="text-gray-400 hover:text-purple-500 transition-colors">Kullanım Şartları</Link></li>
              <li><Link href="/legal/cookies" className="text-gray-400 hover:text-purple-500 transition-colors">Çerez Politikası</Link></li>
            </ul>
          </div>
        </div>

        {/* Alt Kapanış - Copyright */}
        <div className="border-t border-gray-800 mt-8 min-[480px]:mt-10 md:mt-12 pt-6 min-[480px]:pt-7 md:pt-8 text-center text-sm text-gray-400">
          © 2026 ALGORA. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
}
