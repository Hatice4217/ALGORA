/**
 * MEB YKS (TYT/AYT) müfredat konu başlıkları — sınav türüne göre ayrık statik yapı.
 *
 * KAPSAM NOTU: Bu yapı kazanım kodu İÇERMEZ; 'kazanım' ifadesi burada konu
 * başlığı anlamında kullanılır (üretim prompt'una konu odaklılığı sağlamak için).
 * MEB resmi kazanım kodu çerçevesiyle eşleme ayrı bir sonraki aşamadır.
 */

export const EXAM_TYPES = ['TYT', 'AYT', 'YDT'] as const;
export type ExamType = (typeof EXAM_TYPES)[number];

export const MEB_SYLLABUS: Record<"TYT" | "AYT" | "YDT", Record<string, string[]>> = {
  TYT: {
    "Matematik": ["Temel Kavramlar", "Sayı Basamakları", "Bölünebilme", "Rasyonel Sayılar", "Birinci Dereceden Denklemler", "Mutlak Değer", "Üslü ve Köklü İfadeler", "Çarpanlara Ayırma", "Oran-Orantı ve Problemler", "Kümeler", "Fonksiyonlar", "Polinomlar", "Sayma ve Olasılık"],
    "Türkçe": ["Sözcükte Anlam", "Cümlede Anlam", "Paragrafta Anlam", "Ses Bilgisi", "Sözcük Türleri", "Fiiller ve Fiilimsiler", "Cümle Ögeleri", "Cümle Türleri", "Yazım Kuralları", "Noktalama İşaretleri", "Anlatım Bozuklukları"],
    "Fizik": ["Fizik Bilimine Giriş", "Madde ve Özellikleri", "Kuvvet ve Hareket", "İş, Enerji ve Güç", "Isı ve Sıcaklık", "Elektrostatik", "Elektrik ve Manyetizma", "Basınç ve Kaldırma", "Dalgalar", "Optik"],
    "Kimya": ["Kimya Bilimi", "Atom ve Periyodik Sistem", "Kimyasal Türler Arası Etkileşimler", "Maddenin Hâlleri", "Doğa ve Kimya", "Kimyanın Temel Kanunları", "Sulu Çözeltiler", "Karışımlar", "Asitler, Bazlar ve Tuzlar", "Kimya Her Yerde"],
    "Biyoloji": ["Yaşam Bilimi Biyoloji", "Hücre", "Canlılar Dünyası", "Hücre Bölünmeleri", "Kalıtımın Genel İlkeleri", "Ekosistem Ekolojisi"],
    "Tarih": ["Tarih ve Zaman", "İnsanlığın İlk Dönemleri", "Orta Çağ'da Dünya", "İlk ve Orta Çağlarda Türk Dünyası", "İslam Medeniyetinin Doğuşu", "Türklerin İslamiyet'i Kabulü", "Osmanlı Devleti", "Milli Mücadele", "Atatürkçülük"],
    "Coğrafya": ["Doğa ve İnsan", "Dünya'nın Şekli ve Hareketleri", "Yer ve Zaman", "Harita Bilgisi", "Atmosfer ve İklim", "Dünya'nın Tektonik Oluşumu", "Nüfus ve Göç", "Ekonomik Faaliyetler", "Bölgeler ve Ülkeler"],
    "Felsefe": ["Felsefeyi Tanıma", "Felsefe ile Düşünme", "Varlık Felsefesi", "Bilgi Felsefesi", "Ahlak Felsefesi", "Sanat Felsefesi", "Din Felsefesi", "Siyaset Felsefesi", "Bilim Felsefesi"],
    "Din Kültürü": ["Bilgi ve İnanç", "Din ve İslam", "İslam ve İbadet", "Gençlik ve Değerler", "Allah İnancı", "İslam'da İbadetler", "Hz. Muhammed'in Hayatı", "Vahiy ve Akıl"]
  },
  AYT: {
    "Matematik": ["Polinomlar", "İkinci Dereceden Denklemler", "Karmaşık Sayılar", "Parabol", "Trigonometri", "Logaritma", "Diziler", "Limit ve Süreklilik", "Türev", "İntegral", "Sayma ve Olasılık"],
    "Türk Dili ve Edebiyatı": ["Şiir Bilgisi", "İslamiyet Öncesi ve Geçiş Dönemi", "Halk Edebiyatı", "Divan Edebiyatı", "Tanzimat Edebiyatı", "Servetifünun ve Fecriati", "Milli Edebiyat", "Cumhuriyet Dönemi"],
    "Fizik": ["Kuvvet ve Hareket", "İtme ve Çizgisel Momentum", "Tork ve Denge", "Elektrik ve Manyetizma", "Çembersel Hareket", "Basit Harmonik Hareket", "Dalga Mekaniği", "Modern Fizik"],
    "Kimya": ["Kuantum Modeli", "Gazlar", "Sıvı Çözeltiler", "Kimyasal Tepkimelerde Enerji ve Hız", "Kimyasal Denge", "Asit-Baz Dengesi", "Kimya ve Elektrik", "Karbon Kimyasına Giriş", "Organik Bileşikler"],
    "Biyoloji": ["Sinir Sistemi ve Duyu Organları", "Destek ve Hareket Sistemi", "Sindirim Sistemi", "Dolaşım Sistemi", "Solunum Sistemi", "Boşaltım Sistemi", "Üreme Sistemi", "Komünite ve Popülasyon Ekolojisi", "Genden Proteine", "Bitki Biyolojisi", "Canlılarda Enerji Dönüşümleri"],
    "Tarih": ["Tarih ve Zaman", "İlk Çağ Uygarlıkları", "Türklerin İslamiyet'i Kabulü", "Osmanlı Devleti (Kuruluş-Yıkılış)", "Milli Mücadele", "Atatürk İlke ve İnkılapları", "Çağdaş Türk ve Dünya Tarihi"],
    "Coğrafya": ["Doğadaki Ekstremler", "Küresel İklim Değişimi", "Ekonomik Faaliyetler", "Türkiye'nin Ekonomisi", "Küresel Ortam: Bölgeler ve Ülkeler", "Çevre ve Toplum"]
  },
  YDT: {
    "İngilizce": [
      "Kelime Bilgisi (Vocabulary)",
      "Dil Bilgisi (Grammar / Tenses, Modals, vb.)",
      "Cloze Test",
      "Cümle Tamamlama (Sentence Completion)",
      "İngilizce-Türkçe Çeviri",
      "Türkçe-İngilizce Çeviri",
      "Paragraf Okuma (Reading Comprehension)",
      "Diyalog Tamamlama (Dialogue Completion)",
      "Anlamca En Yakın Cümleyi Bulma",
      "Paragraf Tamamlama",
      "Anlam Bütünlüğünü Bozan Cümle"
    ]
  }
};

/** Sınav türünün ders adları (bilinmeyen sınav → boş liste, geriye dönük güvenli). */
export function getSubjects(exam: string): string[] {
  const data = MEB_SYLLABUS[exam as ExamType];
  return data ? Object.keys(data) : [];
}

/** Sınav + dersin konu listesi (bilinmeyen kombinasyon → boş liste). */
export function getTopics(exam: string, subject: string): string[] {
  return MEB_SYLLABUS[exam as ExamType]?.[subject] ?? [];
}

/** Konu "somut" mu? (boş = üretim prompt'unda konu odağı yok, 'Genel' davranışı).
 *  Bu YALNIZCA boşluk kontrolüdür — müfredat kontrolü için isKnownTopic. */
export function isSpecificTopic(topic: string | null | undefined): boolean {
  return !!topic && topic.trim().length > 0;
}

/** Konu bu sınav+dersin MEB müfredat listesinde mi? (G1 onarımı — gerçek
 *  whitelist: API sınırından gelen keyfi konu metni buraya takılır, prompt'a
 *  ve questions.topic sütununa asla ham sızmaz) */
export function isKnownTopic(
  exam: string,
  subject: string,
  topic: string | null | undefined
): boolean {
  if (!topic) return false;
  return getTopics(exam, subject).includes(topic.trim());
}
