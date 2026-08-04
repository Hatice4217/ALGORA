'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '../../components/ui/Logo';

const icerikler = [
  {
    id: 'kabul-edilme',
    baslik: '1. Kabul Edilme',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          ALGORA platformunu (&quot;Hizmet&quot;) kullanarak, bu Kullanım Şartlarını (&quot;Şartlar&quot;)
          okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan etmiş olursunuz.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Kabül Edilme</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Hizmeti kullanarak Şartları kabul etmiş sayılırsınız
            </p>
          </div>

          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <h4 className="font-semibold text-red-900 mb-2">Reddedilme</h4>
            <p className="text-sm text-red-700 leading-relaxed">
              Şartları kabul etmiyorsanız, Hizmeti kullanmamalısınız
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'hizmet-tanimi',
    baslik: '2. Hizmet Tanımı',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          ALGORA, Türk eğitim sistemi (YKS - TYT/AYT, LGS) için hazırlanan öğrencilere
          yönelik AI destekli öğrenme platformudur:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">AI Soru Üretimi</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Kişiselleştirilmiş soru üretimi
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Çalışma Programları</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Kişiselleştirilmiş çalışma planları
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Performans Analizi</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              İlerleme takibi ve raporlama
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'yas-uygunluk',
    baslik: '3. Yaş ve Uygunluk',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Hizmeti kullanmak için en az 13 yaşında olmalısınız. 18 yaşın altındaki
          kullanıcılar için ebeveyn onayı gereklidir.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Yaş Sınırı</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              En az 13 yaşında olmalısınız
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Ebeveyn Onayı</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              18 yaş altı için ebeveyn izni gerekir
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'hesap-guvenlik',
    baslik: '4. Hesap Oluşturma ve Güvenlik',
    icerik: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Hesap Bilgileri</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Doğru, güncel ve tam bilgi sağlamak zorundasınız
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Şifre Güvenliği</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Şifrenizi gizli tutmalı ve paylaşmamalısınız
            </p>
          </div>

          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <h4 className="font-semibold text-red-900 mb-2">Tek Hesap</h4>
            <p className="text-sm text-red-700 leading-relaxed">
              Kişibaşına tek hesap. Birden fazla hesap ihlal sayılır
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'kullanici-sorumluluk',
    baslik: '5. Kullanıcı Sorumlulukları',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Hizmeti kullanırken aşağıdaki yükümlülükleri kabul etmiş olursunuz:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Yasara Uygunluk</h4>
            <ul className="list-disc pl-4 text-sm text-gray-700 space-y-1">
              <li>Türkiye Cumhuriyeti yasalarına uymak</li>
              <li>Yasa dışı amaçlarla kullanmamak</li>
              <li>Başkalarının haklarını ihlal etmemek</li>
            </ul>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">İçerik Kullanımı</h4>
            <ul className="list-disc pl-4 text-sm text-gray-700 space-y-1">
              <li>Kişisel kullanım için kullanmak</li>
              <li>İçerikleri kopyalamamak, dağıtmamak</li>
              <li>AI soruları ticari amaçla kullanmamak</li>
            </ul>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Platform Bütünlüğü</h4>
            <ul className="list-disc pl-4 text-sm text-gray-700 space-y-1">
              <li>Platformu hacklememek, bozmamak</li>
              <li>Bot veya otomatik sistemlerle kullanmamak</li>
              <li>İzinsiz erişmemek, virüs yüklememek</li>
            </ul>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Diğer Kullanıcılara Saygı</h4>
            <ul className="list-disc pl-4 text-sm text-blue-700 space-y-1">
              <li>Taciz etmemek veya tehditkar içerikler paylaşmamak</li>
              <li>Ayrımcılık, nefret söylemi yapmamak</li>
              <li>Gizliliği ihlal etmemek, çocukları korumak</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'fikri-mulkiyet',
    baslik: '6. Fikri Mülkiyet Hakları',
    icerik: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-2">Platform Sahipliği</h4>
            <p className="text-sm text-purple-700 leading-relaxed">
              ALGORA platformu, tasarım, kodlar ve tüm içerik ALGORA&apos;ya aittir
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Kullanım Lisansı</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Kişisel, ticari olmayan kullanım için sınırlı lisans
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Kullanıcı İçeriği</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              İçeriği yüklemekle depolama ve analiz hakkı verirsiniz
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'hizmet-degisiklik',
    baslik: '7. Hizmet Değişiklikleri ve Sonlandırma',
    icerik: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Hizmet Değişiklikleri</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Hizmetleri değiştirme, geliştirme veya durdurma hakkımız saklıdır
            </p>
          </div>

          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <h4 className="font-semibold text-red-900 mb-2">Hesap Sonlandırma</h4>
            <p className="text-sm text-red-700 leading-relaxed">
              İhlal, kötüye kullanım, yasal yükümlülük veya 6+ ay inaktivite durumunda
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Hizmet Sonlandırma</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Tüm Hizmeti durdurma hakkımız saklıdır. 30 günlük geri alma süresi
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'ucretler-odemeler',
    baslik: '8. Ücretler ve Ödemeler',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Şu anda ALGORA tamamen ücretsizdir. Gelecekte şu özellikler için ücret alabiliriz:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2">Şu Anda Ücretsiz</h4>
            <p className="text-sm text-green-700 leading-relaxed">
              Platformun tüm özellikleri şu anda tamamen ücretsizdir
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Gelecekteki Ücretli Özellikler</h4>
            <ul className="list-disc pl-4 text-sm text-gray-700 space-y-1">
              <li>Premium abonelikler</li>
              <li>Özel AI özellikler</li>
              <li>Ders kitapları veya materyaller</li>
            </ul>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-xl p-4">
          <p className="text-sm text-blue-800">
            Ücretli özellikler için önceden bilgi verilecek ve seçim şansı tanınacak.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'sorumluluk-reddi',
    baslik: '9. Sorumluluk Reddi ve Garanti',
    icerik: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <h4 className="font-semibold text-red-900 mb-2">&quot;Olduğu Gibi&quot; Sağlama</h4>
            <p className="text-sm text-red-700 leading-relaxed">
              Hiçbir garanti vermiyoruz. Kesintisiz çalışacağı garanti edilmez
            </p>
          </div>

          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <h4 className="font-semibold text-orange-900 mb-2">Sorumluluk Sınırı</h4>
            <p className="text-sm text-orange-700 leading-relaxed">
              Dolaylı, arızi zararlar ve veri kayıpları için sorumlu değiliz
            </p>
          </div>

          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <h4 className="font-semibold text-yellow-900 mb-2">Eğitim Sonuçları</h4>
            <p className="text-sm text-yellow-700 leading-relaxed">
              Sınav sonuçları veya başarı garantisi vermiyoruz
            </p>
          </div>
        </div>

        <div className="bg-red-50 border-l-4 border-red-600 rounded-r-xl p-4">
          <h4 className="font-semibold text-red-900 mb-2">Yapay Zeka Sorumluluk Reddi ⚠️</h4>
          <p className="text-sm text-red-800 leading-relaxed">
            Platformda sunulan tüm eğitim materyalleri ve sorular bir yapay zeka modeli (OpenAI GPT-4o-mini) tarafından üretilmektedir.
            Bu yapay zeka destekli içerikler eğitim amaçlı destekleyici araçlar olup, her zaman %100 doğruluk garantisi verilemez.
            Yapay zeka üretimli soruların müfredata uygunluğunu ve doğruluğunu kullanıcıların kendi sorumluluğunda kontrol etmesi gerekir.
          </p>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-600 rounded-r-xl p-4">
          <h4 className="font-semibold text-yellow-900 mb-2">MEB/ÖSYM Uyarısı ⚠️</h4>
          <p className="text-sm text-yellow-800 leading-relaxed">
            Milli Eğitim Bakanlığı (MEB) ve ÖSYM müfredat veya soru tiplerinde değişiklik yapabileceği için,
            platformdaki içeriklerin güncel resmi müfredat ile birebir eşleştiğini doğrulamak kullanıcının kendi sorumluluğundadır.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'tazminat',
    baslik: '10. Tazminat',
    icerik: (
      <div className="space-y-4">
        <div className="bg-red-50 border-l-4 border-red-600 rounded-r-xl p-4">
          <h4 className="font-semibold text-red-900 mb-2">Tazminat Yükümlülüğü</h4>
          <p className="text-sm text-red-800 leading-relaxed">
            Şartları ihlal etmeniz veya Hizmeti kötüye kullanmanız nedeniyle ortaya çıkan talepler,
            zararlar, kayıplar ve masraflar (makul avukatlık ücretleri dahil) için ALGORA&apos;yu tazmin etmeyi kabul edersiniz.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'uyusmazlik-cozumu',
    baslik: '11. Uyuşmazlık Çözümü',
    icerik: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Türkiye Cumhuriyeti Yasaları</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Şartlar Türkiye yasalarına göre yorumlanır
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Arabuluculuk</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Uyuşmazlıkları dostane yollarla çözmeye çalışırız
            </p>
          </div>

          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-2">Yetkili Mahkeme</h4>
            <p className="text-sm text-purple-700 leading-relaxed">
              <strong className="text-purple-900">Karaman Adliyesi Mahkemeleri</strong> münhasır yargı yetkisine sahiptir
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'genel-hukumler',
    baslik: '12. Genel Hükümler',
    icerik: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Bütünlük</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Şartlar, Hizmetle ilgili tüm anlaşmanın bütünüünü oluşturur
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Feragat</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Hakkı kullanmamak, o hakkından feragat etmek değildir
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Bölünebilirlik</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Şartların bir kısmı geçersiz olsa bile, kalan kısmın yürürlüğü devam eder
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Devir</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Hak ve yükümlülükler tamamen veya kısmen devredilebilir
            </p>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Diğer Yasalar</h4>
            <p className="text-sm text-blue-700 leading-relaxed">
              Tüketici Koruma, KVKK, GDPR zorunlu yasaları önce gelir
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'iletisim-bilgileri',
    baslik: '13. İletişim Bilgileri',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Şartlar hakkında sorularınız veya uyuşmazlıklar için:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-3">İletişim</h4>
            <p className="text-sm text-gray-700 mb-2">
              <strong>E-posta:</strong>{' '}
              <a href="mailto:legal@algora.com.tr" className="text-purple-600 hover:underline">
                legal@algora.com.tr
              </a>
            </p>
            <p className="text-sm text-gray-700">
              <strong>Adres:</strong> Türkiye - Karaman
            </p>
          </div>

          <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-3">Müşteri Hizmetleri</h4>
            <p className="text-sm text-purple-700">
              <strong>Destek:</strong>{' '}
              <a href="mailto:destek@algora.com.tr" className="font-semibold hover:underline">
                destek@algora.com.tr
              </a>
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'degisiklikler',
    baslik: '14. Şartların Değişikliği',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Şartları değiştirme hakkımızı saklı tutarız:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Bilgilendirme</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Değişiklikleri web sitemizde yayınlayarak bildiririz
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Bildirim</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Size bildirim göndererek bilgilendiririz
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Kabul</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Hizmeti kullanmaya devam ederek yeni Şartları kabul etmiş olursunuz
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
                ALGORA&apos;yı kullanarak bu Kullanım Şartlarını okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan etmiş olursunuz.
                Lütfen bu Şartları düzenli aralıklarla gözden geçirin.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

export default function TermsOfService() {
  const [aktifSekme, setAktifSekme] = useState('kabul-edilme');

  // Her sayfa yüklendiğinde 1. maddesi garanti et
  useEffect(() => {
    setAktifSekme('kabul-edilme');
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
          <h1 className="text-3xl font-bold text-gray-900">Kullanım Şartları</h1>
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
