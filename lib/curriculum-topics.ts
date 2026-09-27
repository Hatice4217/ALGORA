/**
 * YKS (TYT/AYT) ders konu başlıkları — statik konfigürasyon.
 *
 * KAPSAM NOTU: Bu liste kazanım kodu İÇERMEZ; yalnızca soru üretiminde
 * konu odaklılığı sağlamak için standart YKS konu adlarını tanımlar
 * (TYT + AYT konuları ders başına tek listede birleştirilmiştir).
 * MEB resmi kazanım çerçevesiyle eşleme (kazanım kodu veritabanı)
 * ayrı bir sonraki aşamadır.
 */

/** Konu seçilmediğinde / eski isteklerde kullanılan varsayılan değer */
export const DEFAULT_TOPIC = 'Genel';

export const CURRICULUM_TOPICS: Record<string, string[]> = {
  Matematik: [
    'Temel Kavramlar',
    'Sayı Basamakları',
    'Bölme ve Bölünebilme',
    'EBOB - EKOK',
    'Rasyonel Sayılar',
    'Basit Eşitsizlikler',
    'Mutlak Değer',
    'Üslü Sayılar',
    'Köklü Sayılar',
    'Çarpanlara Ayırma',
    'Oran ve Orantı',
    'Kümeler',
    'Fonksiyonlar',
    'Polinomlar',
    'İkinci Dereceden Denklemler',
    'Permütasyon ve Kombinasyon',
    'Olasılık',
    'Trigonometri',
    'Logaritma',
    'Diziler',
    'Limit ve Süreklilik',
    'Türev',
    'İntegral',
    'Analitik Geometri',
    'Üçgen',
    'Dörtgen ve Çokgenler',
    'Çember',
    'Katı Cisimler',
    'Dönüşümler',
  ],
  Türkçe: [
    'Sözcükte Anlam',
    'Cümlede Anlam',
    'Paragrafta Anlam',
    'Ses Bilgisi',
    'Yazım Kuralları',
    'Noktalama İşaretleri',
    'İsimler, Sıfatlar ve Zamirler',
    'Fiiller ve Fiilimsiler',
    'Edatlar, Bağlaçlar ve Ünlemler',
    'Cümlenin Ögeleri',
    'Cümle Türleri',
    'Anlatım Bozuklukları',
    'Sözel Mantık',
  ],
  Fizik: [
    'Fiziğe Giriş ve Vektörler',
    'Kuvvet ve Hareket',
    'Basınç ve Kaldırma Kuvveti',
    'Isı ve Sıcaklık',
    'Enerji, İş ve Güç',
    'Elektriksel Yükler ve Elektrik Enerjisi',
    'Manyetizma',
    'Dalgalar',
    'Optik',
    'Atom Fiziği ve Radyoaktivite',
    'Modern Fizik',
  ],
  Kimya: [
    'Kimyasal Hesaplamalar',
    'Atomun Yapısı',
    'Periyodik Sistem',
    'Kimyasal Türler Arası Etkileşimler',
    'Kimyasal Tepkimeler',
    'Kimyasal Tepkimelerde Enerji',
    'Asitler, Bazlar ve Tuzlar',
    'Kimyasal Denge',
    'Karbon Kimyasına Giriş',
    'Organik Kimya',
    'Günlük Yaşamda Kimya',
  ],
  Biyoloji: [
    'Yaşamın Ortak Temeli',
    'Hücre ve Organelleri',
    'Kalıtım ve Biyokimya',
    'Mitoz ve Mayoz',
    'DNA ve Protein Sentezi',
    'Bitki Biyolojisi',
    'Sistemler',
    'Ekoloji',
    'Ekosistem Ekolojisi',
    'Modern Biyoloji ve Biyoteknoloji',
  ],
  Tarih: [
    'İlk Türk Devletleri',
    'İslam Tarihi ve Uygarlığı',
    'Osmanlı Kuruluş Dönemi',
    'Osmanlı Yükselme Dönemi',
    'Osmanlı Duraklama ve Gerileme Dönemi',
    'Osmanlı Kültür ve Medeniyeti',
    'Değişen Devlet Dengeleri',
    'Millî Mücadele',
    'Türkiye Cumhuriyeti Devrimleri',
    'İki Dünya Savaşı Arası Dönem',
    'İkinci Dünya Savaşı',
    'Soğuk Savaş Dönemi',
    "Günümüz Türkiye'si",
  ],
  Coğrafya: [
    'Doğa ve İnsan',
    'İklim Bilgisi',
    "Türkiye'nin Yer Şekilleri",
    "Türkiye'nin İklimi",
    'Nüfus ve Yerleşme',
    'Göçler',
    'Tarım ve Hayvancılık',
    'Sanayi ve Madencilik',
    'Ulaşım ve Turizm',
    'Doğal Afetler',
    'Coğrafi Bölgeler',
    'Uluslararası Ulaşım Hatları',
  ],
  Felsefe: [
    'Felsefeye Giriş',
    'Bilgi Felsefesi',
    'Bilim Felsefesi',
    'Varlık Felsefesi',
    'Ahlak Felsefesi',
    'Sanat Felsefesi',
    'Din Felsefesi',
    'Siyaset Felsefesi',
    'Mantığa Giriş',
  ],
  'Din Kültürü': [
    'Vahiy ve Akıl',
    "İslam'da İnanç Esasları",
    "İslam'da İbadetler",
    "Hz. Muhammed'in Hayatı",
    'Kuran-ı Kerim ve Özellikleri',
    'İslam Düşüncesi ve Mezhepler',
    'Din ve Ahlak',
    'Din ve Hayat',
  ],
};

/** Dersin konu listesi; bilinmeyen ders için [DEFAULT_TOPIC] döner (geriye dönük güvenli). */
export function getTopicsForSubject(subject: string): string[] {
  return CURRICULUM_TOPICS[subject] ?? [DEFAULT_TOPIC];
}

/** Dropdown seçenekleri: önce Genel (varsayılan), ardından dersin konuları. */
export function getTopicOptionsForSubject(subject: string): string[] {
  return [DEFAULT_TOPIC, ...getTopicsForSubject(subject)];
}

/** Konu "somut" mu? (Genel/boş = üretim prompt'unda konu odağı yok) */
export function isSpecificTopic(topic: string | null | undefined): boolean {
  if (!topic) return false;
  const t = topic.trim().toLowerCase();
  return t.length > 0 && t !== DEFAULT_TOPIC.toLowerCase();
}
