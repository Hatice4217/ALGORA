-- ===================================
-- ALGORA - LGS Kaldırma Migrasyonu
-- ===================================
-- Amaç: Ürün yalnızca YKS (TYT/AYT) hedef kitlesine odaklandığı için
-- LGS tamamen kaldırılıyor (karar kaynağı: BAP proje formu, Bölüm 5.5 —
-- "Hedef kitle ... yalnızca YKS'ye (TYT/AYT) hazırlanan lise
-- öğrencileriyle sınırlandırılmıştır").
--
-- ⚠️ CANLI DB'DE Supabase SQL Editor'de TEK SEFER çalıştırılır.
-- Idempotenttir — yanlışlıkla tekrar çalıştırılması güvenlidir.
--
-- Sıralama önemlidir:
--   1. LGS profilleri TYT'ye taşınır (constraint değişmeden ÖNCE)
--   2. LGS soruları silinir (answers.question_id ON DELETE CASCADE
--      olduğundan ilgili cevap kayıtları da otomatik silinir)
--   3. CHECK constraint'leri LGS'siz yeniden oluşturulur

-- ✅ 0) ÖNCE BAK (opsiyonel ama önerilir — silinecek/taşınacak veriyi gör):
-- SELECT exam_type, COUNT(*) FROM user_profiles GROUP BY exam_type;
-- SELECT exam_type, COUNT(*) FROM questions GROUP BY exam_type;

-- 1) LGS profillerini TYT'ye taşı
UPDATE user_profiles
SET exam_type = 'TYT', updated_at = NOW()
WHERE exam_type = 'LGS';

-- 2) LGS sorularını sil (bağlı cevaplar CASCADE ile gider)
DELETE FROM questions WHERE exam_type = 'LGS';

-- 3) CHECK constraint'lerini LGS'siz yeniden oluştur
-- (Not: constraint adları schema.sql'deki inline CHECK'lerin Postgres
--  varsayılan adlarıdır: <tablo>_<kolon>_check. Farklıysa pg_constraint
--  sorgusuyla gerçek adı bulun — aşağıdaki doğrulama sorgusuna bakın.)

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_exam_type_check;
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_exam_type_check CHECK (exam_type IN ('TYT', 'AYT'));

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_exam_type_check;
ALTER TABLE questions
  ADD CONSTRAINT questions_exam_type_check CHECK (exam_type IN ('TYT', 'AYT'));

-- ✅ 4) SONRA DOĞRULA:
-- a) LGS kalmadığını göster:
--    SELECT COUNT(*) FROM user_profiles WHERE exam_type = 'LGS';  -- 0 olmalı
--    SELECT COUNT(*) FROM questions    WHERE exam_type = 'LGS';  -- 0 olmalı
-- b) Yeni constraint'leri göster (her ikisi de ('TYT','AYT') içermeli):
--    SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--     WHERE conrelid IN ('user_profiles'::regclass, 'questions'::regclass)
--       AND conname LIKE '%exam_type%';
-- c) LGS insert artık reddedilmeli:
--    SELECT has_column_privilege('authenticated', 'questions', 'exam_type', 'INSERT');
--    (gerçek red testi: authenticated client ile exam_type='LGS' insert denemesi → CHECK hatası)
