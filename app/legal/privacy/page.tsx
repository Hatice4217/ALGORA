'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '../../components/ui/Logo';

// İçerik verileri - her sekmenin başlığı ve metni
const icerikler = [
  {
    id: 'genel-bilgi',
    baslik: '1. Genel Bilgi',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          ALGORA kullanıcıların gizliliğini ciddiye alır. Bu Gizlilik Politikası platformumuzu
          kullananların kişisel verilerinin nasıl işlendiğini açıklar:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Platform Kapsamı</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Web ve Mobil uygulamalarımızı kullanan tüm kullanıcıların (&quot;Siz&quot; veya &quot;Kullanıcı&quot;) kişisel verileri
            </p>
          </div>

          {/* 2. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">İşlenen Veriler</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Kişisel verilerinizin nasıl işlendiğini, korunduğunu ve kullanıldığını açıklar
            </p>
          </div>
        </div>

        {/* Yasal Uygunluk */}
        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center mt-0.5">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900 mb-1">Yasal Uygunluk</p>
              <p className="text-sm text-blue-800 leading-relaxed">
                6698 sayılı KVKK ve AB GDPR kapsamında kişisel verilerinizin güvenliğini sağlamak için elimizden geleni yapmaktayız.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'topladigimiz-veriler',
    baslik: '2. Topladığımız Veriler',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Platformumuzu kullanırken şu kişisel verilerinizi topluyoruz:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-3">Kimlik Bilgileri</h4>
            <ul className="list-disc pl-4 text-sm text-gray-700 space-y-2">
              <li>Ad, soyad</li>
              <li>E-posta adresi</li>
              <li>Google hesap bilgileri (Google ile giriş yaparsanız)</li>
            </ul>
          </div>

          {/* 2. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-3">Eğitim Bilgileri</h4>
            <ul className="list-disc pl-4 text-sm text-gray-700 space-y-2">
              <li>Sınav türü (TYT, AYT, LGS)</li>
              <li>Hedef puan</li>
              <li>Çalışma saatleri</li>
              <li>Sınav tarihi</li>
              <li>Seçilen dersler</li>
            </ul>
          </div>

          {/* 3. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-3">Performans Verileri</h4>
            <ul className="list-disc pl-4 text-sm text-gray-700 space-y-2">
              <li>Çözdüğünüz sorular</li>
              <li>Doğru/yanlış cevaplarınız</li>
              <li>Çalışma süreleriniz</li>
              <li>İlerleme istatistikleriniz</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'veri-isleme-amaclari',
    baslik: '3. Veri İşleme Amaçları',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Kişisel verilerinizi aşağıdaki amaçlarla işliyoruz:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Sütun */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Hizmet Sağlama</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              AI destekli soru üretimi ve kişiselleştirilmiş eğitim içeriği sunmak
            </p>
          </div>

          {/* 2. Sütun */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">İlerleme Takibi</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Başarınızı analiz etmek ve size özel öneriler sunmak
            </p>
          </div>

          {/* 3. Sütun */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">İyileştirme</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Platformun kalitesini artırmak ve yeni özellikler geliştirmek
            </p>
          </div>

          {/* 4. Sütun */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">İletişim</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Önemli güncellemeler ve eğitim içerikleri hakkında bilgilendirmek
            </p>
          </div>

          {/* 5. Sütun */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Güvenlik</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Hizmetin güvenliğini sağlamak ve kötüye kullanımı önlemek
            </p>
          </div>

          {/* 6. Sütun */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Yasal Yükümlülükler</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              KVKK, GDPR ve diğer yasal gereklilikleri karşılamak
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'veri-paylasimi',
    baslik: '4. Veri Paylaşımı',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Kişisel verilerinizi üçüncü şahıslarla paylaşmadık, ancak aşağıdaki durumlar hariçtir:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Hizmet Sağlayıcılar</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Supabase (veritabanı), OpenAI (AI hizmetleri), Vercel (hosting)
            </p>
          </div>

          {/* 2. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Yasal Gerekler</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Mahkeme kararları, yasal talepler veya resmi otorite talepleri
            </p>
          </div>

          {/* 3. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">İş Transferi</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Şirket birleşmesi, devri veya iflas durumunda
            </p>
          </div>

          {/* 4. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Onam</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Açık izninizle veya isteğinizle
            </p>
          </div>
        </div>

        {/* Uyarı Mesajı */}
        <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-4">
          <p className="text-sm text-red-800 font-medium">
            Verileriniz asla reklam veya pazarlama amacıyla satılmaz veya kiralanmaz.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'veri-saklama-suresi',
    baslik: '5. Veri Saklama Süresi',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Kişisel verileriniz, hesabınız aktif olduğu sürece saklanır. Hesabınızı silmeniz
          durumunda, verileriniz 30 gün içinde tamamen silinir. Ancak aşağıdaki durumlarda
          veriler daha uzun saklanabilir:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Yasal Zorunluluklar</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Vergi kayıtları gibi yasal gereklilikler (5 yıl)
            </p>
          </div>

          {/* 2. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">İçtihadlar ve Anlaşmazlıklar</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Talep çözülene kadar saklanır
            </p>
          </div>

          {/* 3. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Anonimleştirilmiş Veriler</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Süresiz saklanır (kimlik bilgileri olmadan)
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'kvkk-haklariniz',
    baslik: '6. KVKK Haklarınız',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          KVKK kapsamında aşağıdaki haklara sahipsiniz:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Öğrenme</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Verilerinizin işlenip işlenmediğini öğrenme
            </p>
          </div>

          {/* 2. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Talep</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              İşlenme amacını ve kullanımını talep etme
            </p>
          </div>

          {/* 3. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Düzeltme</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Eksik veya yanlış verilerin düzeltilmesini talep etme
            </p>
          </div>

          {/* 4. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Silme</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Verilerinizin silinmesini talep etme (haklı nedenle)
            </p>
          </div>

          {/* 5. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">İtiraz</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Otomatik analiz kararlarına itiraz etme
            </p>
          </div>

          {/* 6. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Taşıma</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Verilerinizi başka platforma transfer etme
            </p>
          </div>
        </div>

        {/* İletişim Kutusu */}
        <div className="bg-purple-50 border-l-4 border-purple-600 rounded-r-xl p-4">
          <p className="text-sm text-purple-800">
            Bu haklarınızı kullanmak için{' '}
            <a href="mailto:privacy@algora.com.tr" className="font-semibold hover:underline">
              privacy@algora.com.tr
            </a>
            {' '}adresine e-posta gönderebilirsiniz.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'erezler',
    baslik: '7. Çerezler',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Platformumuzda aşağıdaki çerezleri kullanıyoruz:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Oturum Çerezleri</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Güvenli giriş oturumu için
            </p>
          </div>

          {/* 2. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Performans Çerezleri</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Platform iyileştirmeleri için
            </p>
          </div>

          {/* 3. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Analitik Çerezleri</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Kullanım istatistikleri için
            </p>
          </div>
        </div>

        {/* Bilgi Kutusu */}
        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-xl p-4">
          <p className="text-sm text-blue-800">
            Çerezleri tarayıcınızdan yönetebilir veya devre dışı bırakabilirsiniz.
            Daha fazla bilgi için{' '}
            <Link href="/legal/cookies" className="font-semibold hover:underline">
              Çerez Politikası
            </Link>
            {' '}sayfasını ziyaret edin.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'guvenlik-onlemleri',
    baslik: '8. Güvenlik Önlemleri',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Verilerinizin güvenliği için şu önlemleri alıyoruz:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">SSL/TLS Şifreleme</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Verileriniz güvenli iletişim protokolleri ile korunur
            </p>
          </div>

          {/* 2. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Veritabanı Erişim Kontrolü</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Row Level Security (RLS) ile veri güvenliği
            </p>
          </div>

          {/* 3. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Periyodik Denetimler</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Düzenli güvenlik testleri ve güncellemeler
            </p>
          </div>

          {/* 4. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Personel Eğitimi</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Gizlilik ve güvenlik konusunda eğitimli personel
            </p>
          </div>

          {/* 5. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Güvenli Altyapı</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Supabase ve Vercel ile enterprise seviye güvenlik
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'cocuklarin-korunmasi',
    baslik: '9. Çocukların Korunması',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          ALGORA, çocuk güvenliğine önem verir ve yasal gerekliliklere uygun hareket eder:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">18 Yaş Altı Kullanıcılar</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Platformumuz 18 yaşın altındaki öğrenciler için özel olarak tasarlanmıştır
            </p>
          </div>

          {/* 2. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Ebeveyn Onayı</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              13 yaşın altındaki çocuklardan ebeveyn onayı olmadan kişisel veri toplamayız
            </p>
          </div>

          {/* 3. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Ebeveyn Hakları</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Ebeveynler çocuklarının verilerini görüntüleyebilir ve silebilir
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'uluslararasi-veri-transferi',
    baslik: '10. Uluslararası Veri Transferi',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Verileriniz, uluslararası standartlara uygun olarak işlenir:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Türkiye Sunucuları</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Verileriniz Türkiye&apos;deki güvenli sunucularda işlenebilir
            </p>
          </div>

          {/* 2. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">GDPR Uyumlu Hizmetler</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              OpenAI gibi hizmet sağlayıcılar, GDPR uyumlu çerçevelerde veri işler
            </p>
          </div>
        </div>

        {/* Bilgi Kutusu */}
        <div className="bg-green-50 border-l-4 border-green-600 rounded-r-xl p-4">
          <p className="text-sm text-green-800">
            AB standartlarına uygun güvenlik önlemleri olan ülkelerdeki sunucularda veri işleme yapılır.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'iletisim-bilgileri',
    baslik: '11. İletişim Bilgileri',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Bu Gizlilik Politikası ve KVKK kapsamındaki haklarınız hakkında sorularınız için:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Kart */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-3">Veri Sorumlusu</h4>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Platform:</strong> ALGORA
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Adres:</strong> Türkiye - Karaman
            </p>
            <p className="text-sm text-gray-700">
              <strong>E-posta:</strong>{' '}
              <a href="mailto:sarlakhatice2@gmail.com" className="text-purple-600 hover:underline">
                sarlakhatice2@gmail.com
              </a>
            </p>
          </div>

          {/* 2. Kart */}
          <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-3">KVKK Talepleri</h4>
            <p className="text-sm text-purple-800 mb-3">
              KVKK Madde 11 kapsamındaki hak ve taleplerinizi bizimle paylaşabilirsiniz.
            </p>
            <p className="text-sm text-purple-800">
              <strong className="text-purple-900">Yanıt Süresi:</strong> En geç 30 gün içinde ücretsiz sonuçlandırılır
            </p>
          </div>
        </div>

        {/* İkinci İletişim */}
        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-xl p-4">
          <p className="text-sm text-blue-800">
            <strong>Diğer İletişim:</strong>{' '}
            <a href="mailto:privacy@algora.com.tr" className="font-semibold hover:underline">
              privacy@algora.com.tr
            </a>
            {' '}adresinden de bize ulaşabilirsiniz.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'degisiklikler',
    baslik: '12. Değişiklikler',
    icerik: (
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          Bu Gizlilik Politikasında değişiklik yapma hakkımızı saklı tutaruz:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Bilgilendirme</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Değişiklikleri web sitemizde yayınlayarak kullanıcılara bildiririz
            </p>
          </div>

          {/* 2. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Düzenli Gözden Geçirme</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Politikayı düzenli aralıklarla gözden geçirir ve güncelleriz
            </p>
          </div>

          {/* 3. Kart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-2">Devamlı Kullanım</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Platformu kullanmaya devam ederek güncellemeleri kabul etmiş olursunuz
            </p>
          </div>
        </div>

        {/* Önemli Not */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-600 rounded-r-xl p-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-purple-900 mb-1">Önemli Not</p>
              <p className="text-sm text-purple-800 leading-relaxed">
                ALGORA&apos;yı kullanarak bu Gizlilik Politikasını okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan etmiş olursunuz.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

export default function PrivacyPolicy() {
  // Aktif sekme state'i - varsayılan olarak ilk sekme
  const [aktifSekme, setAktifSekme] = useState('genel-bilgi');

  // Her sayfa yüklendiğinde 1. maddesi garanti et
  useEffect(() => {
    setAktifSekme('genel-bilgi');
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

  // Aktif içeriği bul
  const aktifIcerik = icerikler.find((item) => item.id === aktifSekme);

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
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

      {/* Ana İçerik Alanı */}
      <main className="flex-1 container mx-auto px-6 py-8 overflow-hidden flex flex-col">
        {/* Sayfa Başlığı */}
        <div className="mb-6 flex-shrink-0">
          <h1 className="text-3xl font-bold text-gray-900">Gizlilik Politikası</h1>
        </div>

        {/* Dikey Tab Yapısı */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
          {/* Sol Menü - İçindekiler */}
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
                    className={`
                      w-full text-left px-5 py-4 transition-all duration-200 border-l-4
                      ${aktifSekme === item.id
                        ? 'bg-purple-50 border-purple-600 text-purple-900 font-semibold'
                        : 'bg-white border-transparent text-gray-600 hover:bg-slate-50 hover:text-gray-900'
                      }
                    `}
                  >
                    {item.baslik}
                  </button>
                ))}
              </div>
            </nav>
          </aside>

          {/* Sağ Taraf - İçerik Alanı */}
          <div className="lg:col-span-8 xl:col-span-9 overflow-hidden flex flex-col">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex-1 overflow-y-auto">
              {/* Fade-in Animasyonu */}
              <div key={aktifSekme} className="animate-in fade-in duration-300">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-slate-200">
                  {aktifIcerik?.baslik}
                </h2>
                <div className="prose prose-slate max-w-none pb-8">
                  {aktifIcerik?.icerik}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
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
