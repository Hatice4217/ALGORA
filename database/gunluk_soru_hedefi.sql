-- ===================================
-- Günlük Soru Hedefi (Ayarlar > Sınav Hedefleri)
-- ===================================
-- Kullanıcı günlük soru hedefini kendisi belirleyebilir; NULL = Koç,
-- günlük saat + hedef puandan otomatik hesaplar (mevcut davranış).
-- İdempotent: tekrar çalıştırmak hatasız geçer.

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS daily_question_target int;

-- Aralık kısıtı: 1-500 (boş = NULL serbest)
DO $$
BEGIN
  ALTER TABLE user_profiles ADD CONSTRAINT daily_question_target_aralik
    CHECK (daily_question_target IS NULL OR daily_question_target BETWEEN 1 AND 500);
EXCEPTION
  WHEN duplicate_object THEN NULL; -- kısıt zaten var
END $$;
