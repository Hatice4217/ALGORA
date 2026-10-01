-- ===================================
-- ALGORA — Havuz 4-Şık Temizliği + Kısıt Doğrulama
-- ===================================
-- Sorun (1 Ekim 2026, canlı probe'da yakalandı):
--   Eski dev seed.sql verisinden kalma 26 soru YALNIZCA 4 şıklı.
--   questions_choices_check NOT VALID (grandfather'lu) olduğundan
--   ADD COLUMN status DEFAULT 'active' hızlı-default'u ile havuza
--   sızmışlar; ancak bu satırlarda HERHANGİ bir UPDATE (report_question
--   suspend dahil) 23514 hatasıyla düşer → kitle kaynaklı kalite kontrolü
--   bu sorularda çalışmaz + 4 şıklı soru ÖSYM formatına aykırı.
--
-- Çözüm:
--   1) 4 şıklı (ve 5'ten farklı şıklı) TÜM soruları sil
--      (answers/question_reports FK CASCADE, clone_of SET NULL — güvenli)
--   2) Kısıtı VALIDATE et → bundan sonra tam uygulanır
--
-- NOT: choices kolonu text[] (jsonb DEĞİL) → array_length(choices, 1)
-- kullanılır. array_length boş dizide NULL döner → COALESCE ile 0'a iner.
--
-- İdempotent: tekrar çalıştırmak güvenli.
-- ===================================

-- 1) Şık sayısı 5 olmayan tüm soruları sil
DELETE FROM questions
WHERE COALESCE(array_length(choices, 1), 0) <> 5;

-- 2) Kısıtı doğrula (artık ihlal eden satır kalmadıysa başarılı;
--    NOT VALID'den VALID'e geçer → gelecekte her INSERT/UPDATE garantili)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'questions'::regclass
      AND conname = 'questions_choices_check'
      AND NOT convalidated
  ) THEN
    ALTER TABLE questions VALIDATE CONSTRAINT questions_choices_check;
  END IF;
END
$$;

-- ===================================
-- DOĞRULAMA (çıktıyı kontrol et)
-- ===================================

-- 1) İhlal kalan mı? → 0 dönmeli
SELECT count(*) AS ihlal_sayisi
FROM questions
WHERE COALESCE(array_length(choices, 1), 0) <> 5;

-- 2) Kısıt artık doğrulanmış mı? → convalidated = true olmalı
SELECT conname, convalidated
FROM pg_constraint
WHERE conrelid = 'questions'::regclass
  AND conname = 'questions_choices_check';

-- 3) Kalan havuz büyüklüğü (hepsi 5 şıklı)
SELECT count(*) AS havuz_soru_sayisi,
       count(*) FILTER (WHERE hints IS NOT NULL) AS ipuclu
FROM questions
WHERE status = 'active' AND clone_of IS NULL AND intended_for IS NULL;
