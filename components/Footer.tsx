'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function Footer() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [subscribedEmails, setSubscribedEmails] = useState<Set<string>>(new Set());
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || email.trim() === '') {
      setStatus('error');
      setMessage('Lütfen e-posta adresinizi girin.');
      setShowNotification(true);
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setStatus('error');
      setMessage('Lütfen geçerli bir e-posta adresi girin.');
      setShowNotification(true);
      return;
    }

    // Check if email already subscribed
    if (subscribedEmails.has(email.toLowerCase())) {
      setStatus('error');
      setMessage('Bu e-posta adresi zaten bültene abone.');
      setShowNotification(true);
      return;
    }

    setLoading(true);

    // Mock API call with setTimeout
    setTimeout(() => {
      setLoading(false);
      setStatus('success');
      setMessage('Bültene başarıyla abone oldunuz! 🎉');
      setShowNotification(true);

      // Add email to subscribed list
      setSubscribedEmails(prev => new Set(prev).add(email.toLowerCase()));
      setEmail('');
    }, 1000);
  };

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => {
        setShowNotification(false);
        setTimeout(() => {
          setStatus(null);
          setMessage('');
        }, 300); // Wait for fade out animation
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showNotification]);

  // ESC key handler to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isBlogModalOpen) {
        setIsBlogModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isBlogModalOpen]);

  return (
    <>
    <footer className="bg-gray-900">
      <div className="container mx-auto px-6 pt-20 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16">
          {/* 1. Sütun - Marka */}
          <div className="flex flex-col space-y-4">
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
              <li><button onClick={() => setIsBlogModalOpen(true)} className="text-gray-400 hover:text-purple-500 transition-colors">Blog</button></li>
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

          {/* 4. Sütun - Bülten (Interaktif) */}
          <div className="relative">
            <h4 className="font-bold text-white mb-4">Gelişmelerden Haberdar Ol</h4>
            <p className="text-gray-400 text-sm mb-4">Yeni özellikler ve sınav tüyoları için e-bültenimize abone olun.</p>

            <form onSubmit={handleSubmit} className="relative">
              <input
                type="email"
                placeholder="E-posta adresiniz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 pr-24 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-500 text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className={`absolute right-1 top-1 bottom-1 px-4 rounded-md transition-all font-medium text-sm whitespace-nowrap ${
                  loading
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700'
                } text-white`}
              >
                {loading ? 'Gönderiliyor...' : 'Abone Ol'}
              </button>
            </form>

            {/* Süzülen Bildirim Animasyonu */}
            <div
              className={`absolute left-0 right-0 mt-3 text-base font-semibold text-center transition-all duration-700 ease-out ${
                showNotification && message
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 -translate-y-8 pointer-events-none'
              }`}
            >
              {message && (
                <span className={status === 'success' ? 'text-green-400' : 'text-red-400'}>
                  {message}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Alt Kapanış - Copyright */}
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-400">
          © 2026 ALGORA. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
    </>

    {/* Blog Modal */}
    {isBlogModalOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={() => setIsBlogModalOpen(false)}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />

        {/* Modal Content */}
        <div
          className="relative bg-white shadow-2xl rounded-2xl w-11/12 h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={() => setIsBlogModalOpen(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Content */}
          <div className="flex-1 flex flex-col justify-center p-8 md:p-12">
            {/* Category Badge */}
            <div className="inline-block mb-4">
              <span className="bg-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                YKS / LGS Strateji
              </span>
            </div>

            {/* Title */}
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
              Zaman Kaybını Durdur, Netlerini Artır
            </h2>

            {/* Meta Info */}
            <div className="text-gray-500 text-sm mb-6">
              1 dk okuma • 16 Temmuz 2026
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
              {/* Sol Taraf - Genişletilmiş Metin */}
              <div className="space-y-6">
                <p className="text-gray-700 text-lg leading-relaxed">
                  Sınav senesinde en büyük düşmanın zor sorular değil, zaman kaybıdır. Bildiğin konuları tekrar tekrar çözmek yerine, sadece eksik olduğun noktalara odaklansaydın ne olurdu?
                </p>

                <h3 className="text-xl font-bold text-purple-700">Zaman = Net Demektir</h3>
                <p className="text-gray-700 text-lg leading-relaxed">
                  Algora, yapay zeka destekli analizleriyle deneme sonuçlarını saniyeler içinde tarar ve sana sadece çalışman gerekenleri söyler. Geleneksel yöntemleri bırak, zamanını yönet ve netlerini hızla artır.
                </p>

                <p className="text-gray-700 text-lg leading-relaxed">
                  Yapay zeka koçun sana sadece eksiklerini göstermekle kalmıyor. Hangi konuya ne kadar vakit ayırman gerektiğini de hesaplıyor. Böylece her dakikan gerçekten önemli olan netleri artırmaya gidiyor.
                </p>

                <h3 className="text-xl font-bold text-purple-700">Hedef Odaklı İlerleme</h3>
                <p className="text-gray-700 text-lg leading-relaxed">
                  Sınavın son sorusuna kadar enerjik kalacaksın çünkü artık gereksiz tekrarlar yok. Algora hedefini belirler, sana sadece masaya oturup netlerini artırmak kalıyor.
                </p>
              </div>

              {/* Sağ Taraf - Kutucuklar */}
              <div className="space-y-6">
                {/* Öncesi / Sonrası Kıyaslaması */}
                <div className="grid grid-cols-1 gap-6">
                  {/* Sol Kart - Geleneksel Yöntem */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Klasik Soru Bankaları</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-gray-600">Zaman kaybı</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-gray-600">Gereksiz tekrar</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-gray-600">Yavaş ilerleme</span>
                      </li>
                    </ul>
                  </div>

                  {/* Sağ Kart - Algora AI (Vurgulu) */}
                  <div className="bg-white border-2 border-purple-200 rounded-xl p-6 shadow-md">
                    <h3 className="text-lg font-semibold text-purple-600 mb-4">Algora AI Analizi</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">Nokta atışı analiz</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">Zaman tasarrufu</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">Hızlı net artışı</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Günün Tüyosu Kutucuğu */}
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-purple-900 mb-2">Bunu Biliyor Muydun?</h4>
                      <p className="text-gray-700 text-base leading-relaxed">
                        Sınavda derece yapan öğrencilerin %80'i, bildikleri konulardan ziyade sadece yanlış yaptıkları soruların analizine odaklanıyor.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="border-t border-gray-100 mt-8 pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-gray-700 text-sm">
                  Yapay zeka ile eksiklerini anında tespit etmeye hazırsın değil mi?
                </p>
                <Link
                  href="/auth/register"
                  onClick={() => setIsBlogModalOpen(false)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors font-medium text-sm whitespace-nowrap text-center"
                >
                  Hemen Deneme Çöz
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
