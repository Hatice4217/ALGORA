'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '../../components/ui/Logo';

const icerikler = [
  {
    id: 'cerez-nedir',
    baslik: '1. Çerez Nedir?',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Çerezler (cookies), web sitelerinin tarayıcınıza küçük metin dosyaları kaydetmesine
          olanak tanıyan teknolojilerdir. Bu dosyalar, bilgilerinizi hatırlamamıza ve
          deneyiminizi kişiselleştirmemize yardımcı olur.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Çerez İşlevi</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Bilgilerinizi hatırlar ve deneyiminizi kişiselleştirir
            </p>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">ALGORA Çerez Politikası</h4>
            <p className="text-sm text-blue-700 leading-relaxed">
              Hangi çerezleri kullandığımızı, neden kullandığımızı ve nasıl kontrol edebileceğinizi açıklar
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'ceriz-turleri',
    baslik: '2. Kullandığımız Çerez Türleri',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          ALGORA platformunda çeşitli türlerde çerezler kullanıyoruz:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <h4 className="font-semibold text-red-900 mb-2">Zorunlu Çerezler</h4>
            <p className="text-sm text-red-700 leading-relaxed mb-2">
              Platformun temel işlevleri için gereklidir, devre dışı bırakılamaz
            </p>
            <ul className="list-disc pl-4 text-sm text-red-700 space-y-1">
              <li>Authentication - Giriş oturumu</li>
              <li>Session - Oturum bilgileri</li>
              <li>Security - Güvenlik önlemleri</li>
              <li>Preferences - Ayar seçimleri</li>
            </ul>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Performans Çerezleri</h4>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              Platform performansını ve kullanıcı deneyimini iyileştirir
            </p>
            <ul className="list-disc pl-4 text-sm text-gray-700 space-y-1">
              <li>Analytics - Özellik kullanımı</li>
              <li>Performance - Yükleme süreleri</li>
              <li>Error - Hata tespiti</li>
              <li>A/B Testing - Tasarım testleri</li>
            </ul>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">İşlevsellik Çerezleri</h4>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              Platformun daha iyi çalışmasını sağlar
            </p>
            <ul className="list-disc pl-4 text-sm text-gray-700 space-y-1">
              <li>Auto-save - İlerleme kaydetme</li>
              <li>Preferences - Tercihler</li>
              <li>Location - Konum hizmetleri</li>
            </ul>
          </div>

          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <h4 className="font-semibold text-yellow-900 mb-2">Hedefleme Çerezleri</h4>
            <p className="text-sm text-yellow-700 leading-relaxed">
              Şu anda aktif değil, gelecekte özelleştirilmiş içerik için kullanılabilir
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'kullanim-amaclari',
    baslik: '3. Çerez Kullanım Amaçları',
    icerik: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Authentication & Session</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Güvenli giriş ve oturum bilgilerini koruma
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Performans İyileştirme</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Popüler sayfaları ve iyileştirme alanlarını analiz etme
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Kullanıcı Deneyimi</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Tercihleri hatırlama ve platform özelleştirme
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Güvenlik</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Hesap koruması ve kötüye kullanım önleme
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Analitik & Araştırma</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Anonim verilerle platform kullanımını anlama ve iyileştirme
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'ceriz-detaylari',
    baslik: '4. Çerez Detayları',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Platformda kullandığımız çerezlerin detayları:
        </p>

        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 font-semibold text-gray-900">Çerez Adı</th>
                <th className="text-left py-2 font-semibold text-gray-900">Tür</th>
                <th className="text-left py-2 font-semibold text-gray-900">Süre</th>
                <th className="text-left py-2 font-semibold text-gray-900">Amaç</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-gray-700">sb-auth-token</td>
                <td className="py-2 text-red-600 font-medium">Zorunlu</td>
                <td className="py-2 text-gray-600">Session</td>
                <td className="py-2 text-gray-600">Giriş oturumu</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-gray-700">sb-refresh-token</td>
                <td className="py-2 text-red-600 font-medium">Zorunlu</td>
                <td className="py-2 text-gray-600">7 gün</td>
                <td className="py-2 text-gray-600">Oturum yenileme</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-gray-700">_ga</td>
                <td className="py-2 text-gray-600">Analitik</td>
                <td className="py-2 text-gray-600">2 yıl</td>
                <td className="py-2 text-gray-600">Google Analytics</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-gray-700">user_preferences</td>
                <td className="py-2 text-gray-600">İşlevsel</td>
                <td className="py-2 text-gray-600">30 gün</td>
                <td className="py-2 text-gray-600">Kullanıcı ayarları</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-700">session_progress</td>
                <td className="py-2 text-gray-600">İşlevsel</td>
                <td className="py-2 text-gray-600">Session</td>
                <td className="py-2 text-gray-600">Çalışma ilerlemesi</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-xl p-4">
          <p className="text-sm text-blue-800">
            <strong>Not:</strong> Bu liste zamanla güncellenebilir. En güncel bilgi için tarayıcınızın geliştirici araçlarını kontrol edin.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'ceriz-yonetimi',
    baslik: '5. Çerez Yönetimi',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Çerezleri kabul etme veya reddetme hakkına sahipsiniz:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">C</span>
              </div>
              <h4 className="font-semibold text-green-900">Chrome</h4>
            </div>
            <p className="text-sm text-green-700 leading-relaxed">
              Settings → Privacy → Cookies
            </p>
          </div>

          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">F</span>
              </div>
              <h4 className="font-semibold text-orange-900">Firefox</h4>
            </div>
            <p className="text-sm text-orange-700 leading-relaxed">
              Options → Privacy & Security → Cookies
            </p>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">S</span>
              </div>
              <h4 className="font-semibold text-blue-900">Safari</h4>
            </div>
            <p className="text-sm text-blue-700 leading-relaxed">
              Preferences → Privacy → Website Data
            </p>
          </div>

          <div className="bg-slate-200 rounded-xl p-4 border border-slate-300">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">E</span>
              </div>
              <h4 className="font-semibold text-gray-900">Edge</h4>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              Settings → Cookies permissions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <h4 className="font-semibold text-red-900 mb-2">Devre Dışı Bırakma Etkisi</h4>
            <p className="text-sm text-red-700 leading-relaxed mb-2">
              Çerezleri devre dışı bırakırsanız:
            </p>
            <ul className="list-disc pl-4 text-sm text-red-700 space-y-1">
              <li>Giriş yapamaz veya oturum açık tutamazsınız</li>
              <li>İlerlemeniz kaydedilmez</li>
              <li>Bazı özellikler düzgün çalışmaz</li>
            </ul>
            <p className="text-sm text-red-700 mt-2 font-medium">
              <strong>Zorunlu çerezler:</strong> Platform çalışması için gereklidir, devre dışı bırakılamaz
            </p>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Çerezleri Silme</h4>
            <p className="text-sm text-blue-700 leading-relaxed">
              Tarayıcınızın geçmişini temizleyerek çerezleri silebilirsiniz
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'ucuncu-taraf',
    baslik: '6. Üçüncü Taraf Çerezler',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Platformda aşağıdaki üçüncü taraf hizmetler çerez kullanabilir:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-2">Supabase</h4>
            <p className="text-sm text-purple-700 leading-relaxed">
              Veritabanı & Auth
            </p>
            <p className="text-sm text-purple-600 mt-2">
              <a href="https://supabase.com/privacy" className="hover:underline" target="_blank" rel="noopener noreferrer">
                Privacy Policy →
              </a>
            </p>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Google Analytics</h4>
            <p className="text-sm text-blue-700 leading-relaxed">
              Analitik ve istatistikler
            </p>
            <p className="text-sm text-blue-600 mt-2">
              <a href="https://policies.google.com/privacy" className="hover:underline" target="_blank" rel="noopener noreferrer">
                Privacy Policy →
              </a>
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Vercel</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Hosting ve performans
            </p>
            <p className="text-sm text-gray-600 mt-2">
              <a href="https://vercel.com/legal/privacy-policy" className="hover:underline" target="_blank" rel="noopener noreferrer">
                Privacy Policy →
              </a>
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'ceriz-onayi',
    baslik: '7. Çerez Onayı',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Platformu ilk kez ziyaret ettiğinizde çerez kullanımı hakkında bilgilendirme alırsınız:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2">Onay Mekanizması</h4>
            <ul className="list-disc pl-4 text-sm text-green-700 space-y-1">
              <li>Zorunlu çerezler otomatik kabul edilir</li>
              <li>Diğer çerezleri kabul edebilir veya reddedebilirsiniz</li>
              <li>Seçiminizi istediğiniz zaman değiştirebilirsiniz</li>
            </ul>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">GDPR/KVKK Uyum</h4>
            <ul className="list-disc pl-4 text-sm text-blue-700 space-y-1">
              <li>Açık rıza alınır (opt-in)</li>
              <li>Ayrıntılı bilgilendirme yapılır</li>
              <li>Ret hakkı tanınır</li>
              <li>Veri minimizasyonu sağlanır</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'ceriz-guvenligi',
    baslik: '8. Çerez Güvenliği',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Çerez güvenliği için şu önlemleri alıyoruz:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2">HTTPS</h4>
            <p className="text-sm text-green-700 leading-relaxed">
              Tüm çerezler SSL/TLS ile korunur
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">HttpOnly</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Hassas çerezler JavaScript&apos;ten gizlenir
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">SameSite</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              CSRF koruması için SameSite özniteliği
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Secure</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Sadece HTTPS ile iletilir
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Expire</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Çerezlere uygun son kullanma tarihi
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-600 rounded-r-xl p-4">
          <p className="text-sm text-yellow-800">
            <strong>Not:</strong> Çerezler arasında şifre gibi hassas bilgiler saklamıyoruz. Şifreler güvenli bir şekilde veritabanında saklanır.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'ceriz-guncellemeleri',
    baslik: '9. Çerez Güncellemeleri',
    icerik: (
      <div className="space-y-4">
        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-xl p-4">
          <p className="text-sm text-blue-800">
            Bu Çerez Politikası zamanla güncellenebilir. Değişiklikleri bu sayfada yayınlayarak ve sizi bilgilendirerek uygulayacağız.
            Lütfen düzenli aralıklarla bu politikayı gözden geçirin.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'iletisim',
    baslik: '10. İletişim Bilgileri',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Çerezler hakkında sorularınız veya geri bildirimleriniz için:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-3">İletişim</h4>
            <p className="text-sm text-gray-700 mb-2">
              <strong>E-posta:</strong>{' '}
              <a href="mailto:privacy@algora.com.tr" className="text-purple-600 hover:underline">
                privacy@algora.com.tr
              </a>
            </p>
          </div>

          <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-3">Çerez Tercihleri</h4>
            <p className="text-sm text-purple-700">
              <strong>Özel:</strong>{' '}
              <a href="mailto:cookies@algora.com.tr" className="font-semibold hover:underline">
                cookies@algora.com.tr
              </a>
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-600 rounded-r-xl p-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-purple-900 mb-1">Önemli Not</p>
              <p className="text-sm text-purple-800 leading-relaxed">
                ALGORA platformunu kullanarak bu Çerez Politikasını kabul etmiş olursunuz.
                Çerezlerinizi nasıl kullandığımızı ve yönetebileceğinizi öğrenmek için lütfen bu politikayı dikkatlice okuyun.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-xl p-4">
          <p className="text-sm text-blue-800">
            <strong>Kolay Kullanım:</strong> Çerez tercihlerinizi değiştirmek için tarayıcınızın ayarlarını kullanın veya bizimle iletişime geçin.
            Zorunlu çerezler olmadan platform düzgün çalışmaz.
          </p>
        </div>
      </div>
    ),
  },
];

export default function CookiePolicy() {
  const [aktifSekme, setAktifSekme] = useState('ceriz-nedir');

  // Her sayfa yüklendiğinde 1. maddesi garanti et
  useEffect(() => {
    setAktifSekme('ceriz-nedir');
  }, []);

  // Scroll koruma: Ana sayfaya dönüldüğünde kayıtlı pozisyona git
  useEffect(() => {
    const kayitliScroll = localStorage.getItem('ana-sayfa-scroll');
    if (kayitliScroll) {
      window.scrollTo(0, parseInt(kayitliScroll));
      localStorage.removeItem('ana-sayfa-scroll');
    }
  }, []);

  // Scroll değiştiğinde kaydet (yasal sayfadan çıkarken için)
  useEffect(() => {
    const handleScroll = () => {
      localStorage.setItem('ana-sayfa-scroll', window.scrollY.toString());
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const aktifIcerik = icerikler.find((item) => item.id === aktifSekme);

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Logo size="lg" />
            </Link>
            <Link href="/">
              <button className="text-gray-600 hover:text-purple-600 transition">
                ← Ana Sayfaya Dön
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8 overflow-hidden flex flex-col">
        <div className="mb-6 flex-shrink-0">
          <h1 className="text-3xl font-bold text-gray-900">Çerez Politikası</h1>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
          <aside className="lg:col-span-4 xl:col-span-3 overflow-hidden flex flex-col">
            <nav className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
                <h2 className="font-semibold text-gray-900">İçindekiler</h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                {icerikler.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setAktifSekme(item.id)}
                    className={`w-full text-left px-5 py-4 transition-all duration-200 border-l-4 ${
                      aktifSekme === item.id
                        ? 'bg-purple-50 border-purple-600 text-purple-900 font-semibold'
                        : 'bg-white border-transparent text-gray-600 hover:bg-slate-50 hover:text-gray-900'
                    }`}
                  >
                    {item.baslik}
                  </button>
                ))}
              </div>
            </nav>
          </aside>

          <div className="lg:col-span-8 xl:col-span-9 overflow-hidden flex flex-col">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex-1 overflow-y-auto">
              <div key={aktifSekme} className="animate-in fade-in duration-300">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-slate-200">
                  {aktifIcerik?.baslik}
                </h2>
                <div className="prose prose-slate max-w-none">
                  {aktifIcerik?.icerik}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 flex-shrink-0">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
            <p>© 2026 ALGORA. Tüm hakları saklıdır.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/legal/privacy" className="hover:text-purple-600">Gizlilik</Link>
              <Link href="/legal/terms" className="hover:text-purple-600">Şartlar</Link>
              <Link href="/legal/cookies" className="hover:text-purple-600">Çerezler</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
