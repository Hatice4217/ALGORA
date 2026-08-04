-- ===================================
-- ALGORA - Seed Data
-- Sample questions and data for testing
-- ===================================

-- This script inserts sample data for development and testing
-- Run this AFTER schema.sql

-- Disable triggers temporarily for bulk insert
SET session_replication_role = 'default';

-- ===================================
-- SAMPLE QUESTIONS
-- ===================================

-- Matematik Soruları
INSERT INTO questions (subject, topic, difficulty, exam_type, question_text, choices, correct_answer, explanation, tags) VALUES
-- Matematik - Türev - Beginner
('Matematik', 'Türev', 'beginner', 'TYT',
 'f(x) = 3x² + 2x fonksiyonunun türevi nedir?',
 ARRAY['f''(x) = 6x + 2', 'f''(x) = 3x + 2', 'f''(x) = 6x', 'f''(x) = 3x² + 2'],
 0,
 'x² nin türevi 2x, 3x² nin türevi 6x, 2x nin türevi 2 olur. Bu nedenle f''(x) = 6x + 2',
 ARRAY['türev', 'fonksiyon', 'matematik', 'tyt']),

-- Matematik - Türev - Intermediate
('Matematik', 'Türev', 'intermediate', 'TYT',
 'f(x) = (x + 1)(x - 2) fonksiyonunun x = 1 noktasındaki türevi kaçtır?',
 ARRAY['-1', '0', '1', '2'],
 2,
 'Önce fonksiyonu çarpanlara ayıralım: f(x) = x² - x - 2. Türevi: f''(x) = 2x - 1. x = 1 için: f''(1) = 2(1) - 1 = 1',
 ARRAY['türev', 'fonksiyon', 'matematik', 'tyt']),

-- Matematik - Türev - Advanced
('Matematik', 'Türev', 'advanced', 'AYT',
 'f(x) = e^(2x) fonksiyonunun ikinci türevi nedir?',
 ARRAY['f''(x) = 2e^(2x)', 'f''(x) = 4e^(2x)', 'f''(x) = e^(2x)', 'f''(x) = 8e^(2x)'],
 1,
 'f(x) = e^(2x) fonksiyonunun birinci türevi: f''(x) = 2e^(2x). İkinci türevi: f''(x) = 4e^(2x)',
 ARRAY['türev', 'üstel fonksiyon', 'matematik', 'ayt']),

-- Matematik - Integral - Beginner
('Matematik', 'İntegral', 'beginner', 'TYT',
 '∫(2x + 3)dx integrali nedir?',
 ARRAY['x² + 3x + C', 'x² + 3', '2x² + 3x + C', 'x² + C'],
 0,
 '∫2x dx = x², ∫3 dx = 3x. Sonuç: x² + 3x + C (C entegrasyon sabiti)',
 ARRAY['integral', 'matematik', 'tyt']),

-- Matematik - Logaritma - Intermediate
('Matematik', 'Logaritma', 'intermediate', 'TYT',
 'log₂(8) + log₃(27) değeri kaçtır?',
 ARRAY['5', '6', '7', '8'],
 1,
 'log₂(8) = 3 (çünkü 2³ = 8), log₃(27) = 3 (çünkü 3³ = 27). Toplam: 3 + 3 = 6',
 ARRAY['logaritma', 'matematik', 'tyt']),

-- Türkçe Soruları
-- Türkçe - Paragraf - Beginner
('Türkçe', 'Paragraf', 'beginner', 'TYT',
 'Aşağıdaki cümlelerin hangisinde anlam cağırlaması yapılmıştır?',
 ARRAY['Bugün hava çok güzel.', 'Kitabı okudu.', 'Kapıyı aç.', 'Arabaya bin.'],
 1,
 'Kitabı okudu cümlesinde kitabın ne zaman okunduğu belirsiz - dün mü, bugün mü? Bu cağırlama anlamına gelir.',
 ARRAY['paragraf', 'cağırlama', 'türkçe', 'tyt']),

-- Türkçe - Paragraf - Intermediate
('Türkçe', 'Paragraf', 'intermediate', 'TYT',
 '"Her sabah koşuya çıkan adam, parkta karşılaştığı köpeğe susuzluk verir." cümlesinin ana düşüncesi nedir?',
 ARRAY['Adam her sabah koşuya çıkar.', 'Parkta köpek vardır.', 'Adam köpeği sever.', 'Adam düzenli bir insandır.'],
 0,
 'Cümlenin ana düşüncesi adamın her sabah koşuya çıkmasıdır. Köpek ve susuzluk verme detaylı bilgi verir.',
 ARRAY['paragraf', 'ana düşünce', 'türkçe', 'tyt']),

-- Türkçe - Sözcük - Beginner
('Türkçe', 'Sözcük', 'beginner', 'TYT',
 '"Açık" sözcüğünün zıt anlamlısı hangisidir?',
 ARRAY['Kapalı', 'Karanlık', 'Dar', 'Uzak'],
 0,
 'Açık kelimesinin zıt anlamlısı "kapalı"dır. Açık-kapalı karşıtı zıt anlamlı kelimelerdir.',
 ARRAY['sözcük', 'zıt anlam', 'türkçe', 'tyt']),

-- Fizik Soruları
-- Fizik - Kuvvet - Beginner
('Fizik', 'Kuvvet ve Hareket', 'beginner', 'TYT',
 '10 kg kütleli bir cismin ağırlığı kaç newtondur? (g = 10 m/s²)',
 ARRAY['10 N', '50 N', '100 N', '1000 N'],
 2,
 'Ağırlık formülü: G = m × g. G = 10 kg × 10 m/s² = 100 N.',
 ARRAY['kuvvet', 'ağırlık', 'fizik', 'tyt']),

-- Fizik - Enerji - Intermediate
('Fizik', 'Enerji', 'intermediate', 'TYT',
 '5 kg kütleli bir cisim 4 m yükseklikten düşerse, yere çarptığında kinetik enerjisi kaç jouledır? (g = 10 m/s²)',
 ARRAY['100 J', '150 J', '200 J', '250 J'],
 2,
 'Potansiyel enerji = m × g × h = 5 × 10 × 4 = 200 J. Yere çarptığında bu enerji kinetik enerjiye dönüşür.',
 ARRAY['enerji', 'kinetik', 'fizik', 'tyt']),

-- Kimya Soruları
-- Kimya - Atom - Beginner
('Kimya', 'Atom', 'beginner', 'TYT',
 'Bir atomda proton sayısı ile elektron sayısı arasındaki ilişki nasıldır?',
 ARRAY['Proton sayısı her zaman fazladır.', 'Elektron sayısı her zaman fazladır.', 'Nötr atomlarda eşittir.', 'İlişki yoktur.'],
 2,
 'Nötr atomlarda proton sayısı ile elektron sayısı eşittir. Pozitif iyonlarda proton fazladır, negatif iyonlarda elektron fazladır.',
 ARRAY['atom', 'proton', 'elektron', 'kimya', 'tyt']),

-- Kimya - Periyodik Sistem - Intermediate
('Kimya', 'Periyodik Sistem', 'intermediate', 'TYT',
 'Periyodik tabloda aynı grupta yer alan elementler hakkında aşağıdaki ifadelerden hangisi yanlıştır?',
 ARRAY['Valans elektron sayıları aynıdır.', 'Kimyasal özellikleri benzer.', 'Atom numaraları ardışık artar.', 'Fiziksel özellikleri benzer.'],
 2,
 'Aynı gruptaki elementler benzer kimyasal özellik gösterir ancak atom numaraları ardışık artmaz.',
 ARRAY['periyodik sistem', 'element', 'kimya', 'tyt']),

-- Biyoloji Soruları
-- Biyoloji - Hücre - Beginner
('Biyoloji', 'Hücre', 'beginner', 'TYT',
 'Aşağıdakilerden hangisi hücre organellerinden değildir?',
 ARRAY['Mitokondri', 'Kloroplast', 'Ribozom', 'Nükleer zar'],
 3,
 'Nükleer zar hücre organeli değil, hücre çekirdeğinin bir parçasıdır. Mitokondri, kloroplast ve ribozom organellerdir.',
 ARRAY['hücre', 'organel', 'biyoloji', 'tyt']),

-- Tarih Soruları
-- Tarih - Osmanlı - Beginner
('Tarih', 'Osmanlı Tarihi', 'beginner', 'TYT',
 'Osmanlı Devleti"nin kurucusu Osman Bey"in babası kimdir?',
 ARRAY['Orhan Bey', 'Alparslan', 'Ertuğrul Gazi', 'Osman Gazi'],
 2,
 'Osman Bey"in babası Ertuğrul Gazi"dir. Oğulları Osman ve Orhan"dır.',
 ARRAY['osmanlı', 'kuruluş', 'tarih', 'tyt']),

-- Coğrafya Soruları
-- Coğrafya - Harita - Beginner
('Coğrafya', 'Harita Bilgisi', 'beginner', 'TYT',
 'Bir haritada 1:100.000 ölçeğinde 2 cm olan bir mesafe gerçekte kaç metredir?',
 ARRAY['20 m', '200 m', '2000 m', '20000 m'],
 2,
 'Ölçek 1:100.000 ise, her 1 cm = 100.000 cm = 1000 m. 2 cm = 2000 m.',
 ARRAY['harita', 'ölçek', 'coğrafya', 'tyt']),

-- LGS Soruları
-- LGS - Matematik - Beginner
('Matematik', 'Oran-Orantı', 'beginner', 'LGS',
 'Bir kitabevinde 3 kitap 45 TL"ye satılıyor. 5 kitap kaç TL"dir?',
 ARRAY['60 TL', '65 TL', '70 TL', '75 TL'],
 3,
 '3 kitap = 45 TL ise, 1 kitap = 15 TL. 5 kitap = 5 × 15 = 75 TL.',
 ARRAY['oran-orantı', 'matematik', 'lgs']),

-- LGS - Türkçe - Beginner
('Türkçe', 'Sözcükler', 'beginner', 'LGS',
 '"Güneş" kelimesinin eş anlamlısı hangisidir?',
 ARRAY['Ay', 'Yıldız', 'Gün ışığı', 'Karanlık'],
 2,
 'Güneş kelimesinin eş anlamlısı "gün ışığı"dır. Güneş ve gün ışığı aynı anlama gelir.',
 ARRAY['sözcük', 'eş anlam', 'türkçe', 'lgs']),

-- LGS - Fen Bilimleri - Beginner
('Fen Bilimleri', 'Maddenin Halleri', 'beginning', 'LGS',
 'Aşağıdakilerden hangisi maddenin gaz hali örneğidir?',
 ARRAY['Taş', 'Su', 'Oksijen', 'Buz'],
 2,
 'Oksijen gaz halinde bir maddedir. Taş katı, su sıvı, buzbuz da katı haldedir.',
 ARRAY['maddenin halleri', 'gaz', 'fen', 'lgs']),

-- LGS - Sosyal Bilgiler - Beginner
('Sosyal Bilgiler', 'Türkiye Coğrafyası', 'beginner', 'LGS',
 'Türkiye"nin başkenti neresidir?',
 ARRAY['İstanbul', 'İzmir', 'Ankara', 'Bursa'],
 2,
 'Türkiye"nin başkenti Ankara"dır. 1923"ten beri başkentimiz Ankara"dır.',
 ARRAY['türkiye', 'başkent', 'sosyal', 'lgs']),

-- More TYT Questions
('Matematik', 'Trigonometri', 'intermediate', 'TYT',
 'sin(30°) + cos(60°) değeri nedir?',
 ARRAY['0', '0.5', '1', '1.5'],
 2,
 'sin(30°) = 0.5, cos(60°) = 0.5. Toplam = 0.5 + 0.5 = 1',
 ARRAY['trigonometri', 'sinüs', 'kosinüs', 'matematik', 'tyt']),

('Fizik', 'Elektrik', 'intermediate', 'TYT',
 '2 Ω ve 3 Ω dirençler seri bağlandığında toplam direnç kaç ohmdur?',
 ARRAY['1 Ω', '1.2 Ω', '5 Ω', '6 Ω'],
 2,
 'Seri bağlantıda dirençler toplanır: R_toplam = 2 + 3 = 5 Ω',
 ARRAY['elektrik', 'direnç', 'seri bağlantı', 'fizik', 'tyt']),

-- More AYT Questions
('Matematik', 'Limit', 'advanced', 'AYT',
 'lim(x→0) (sin(x)/x) limiti nedir?',
 ARRAY['0', '0.5', '1', 'Sonsuz'],
 2,
 'Bu ünlü limit değeridir: lim(x→0) (sin(x)/x) = 1. L"Hopital kuralı ile de ispatlanabilir.',
 ARRAY['limit', 'türev', 'matematik', 'ayt']),

('Kimya', 'Asit-Baz', 'advanced', 'AYT',
 'pH değeri 3 olan bir çözeltinin asit konsantrasyonu kaç mol/L"dir?',
 ARRAY['10⁻³ M', '10⁻⁴ M', '10⁻⁵ M', '10⁻⁷ M'],
 0,
 'pH = -log[H⁺]. pH = 3 ise [H⁺] = 10⁻³ M',
 ARRAY['asit-baz', 'pH', 'konsantrasyon', 'kimya', 'ayt']),

-- Insert more questions for variety
('Türkçe', 'Cümle', 'intermediate', 'TYT',
 '"Ali okula gitti, eve geldi." cümlesinde aşağıdaki sondan ekilemlerden hangisi yoktur?',
 ARRAY['-di (geçmiş zaman)', '-i (belirtme)', '-e (yönelme)', '-de (bulunma)'],
 3,
 'Cümlede "gedi" (-di), "eve" (-e), "geldi" (-di) ekleri var. "-de" eki yok.',
 ARRAY['cümle', 'ekim', 'türkçe', 'tyt']),

('Fizik', 'Basınç', 'intermediate', 'TYT',
 'Yerçekimi ivmesi g = 10 m/s² ise, 1000 kg ağırlığındaki bir aracın lastiklere yaptığı basınç kaç Pascal"dır? (Lastik temas alanı = 0.04 m²)',
 ARRAY['250.000 Pa', '500.000 Pa', '750.000 Pa', '1.000.000 Pa'],
 0,
 'Basınç = Kuvvet / Alan. Kuvvet = 1000 × 10 = 10.000 N. Basınç = 10.000 / 0.04 = 250.000 Pa',
 ARRAY['basınç', 'kuvvet', 'fizik', 'tyt']),

-- Enable triggers again
SET session_replication_role = 'origin';

-- ===================================
-- VERIFICATION
-- ===================================

-- Verify inserted questions
SELECT
  subject,
  difficulty,
  exam_type,
  COUNT(*) as question_count
FROM questions
GROUP BY subject, difficulty, exam_type
ORDER BY subject, difficulty, exam_type;

-- Expected output: Various subjects with different difficulty levels
