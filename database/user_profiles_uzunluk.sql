-- ===================================
-- ALGORA — O6: user_profiles metin kolonlarına uzunluk sınırı (DB katmanı)
-- Supabase SQL Editor'de ELLE çalıştırılır. Idempotent'tir.
-- ===================================
-- Neden: name / target_university / target_major API-düzeyinde sınırsızdı
-- (UI maxLength eklenmiştir ama istemci-yanı bypass edilebilir; gerçek savunma
-- DB CHECK'tedir). Sınırlar UI ile aynıdır: name 100, üniversite/bölüm 120.
-- CHECK'ler isimden bağımsız DO bloğuyla eklenir (tekrar çalıştırmada
-- "constraint already exists" hatası vermez).
-- ===================================

-- Önce uzun mevcut satır var mı bak (varsa constraint eklenemez):
SELECT
  'uzun_satirlar' AS kontrol,
  count(*) FILTER (WHERE length(name) > 100) AS isim_uzun,
  count(*) FILTER (WHERE length(target_university) > 120) AS uni_uzun,
  count(*) FILTER (WHERE length(target_major) > 120) AS bolum_uzun
FROM user_profiles;

DO $$
BEGIN
  -- name ≤ 100
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_name_len_check' AND conrelid = 'user_profiles'::regclass
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_name_len_check CHECK (name IS NULL OR length(name) <= 100);
  END IF;

  -- target_university ≤ 120
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_university_len_check' AND conrelid = 'user_profiles'::regclass
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_university_len_check CHECK (length(target_university) <= 120);
  END IF;

  -- target_major ≤ 120
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_major_len_check' AND conrelid = 'user_profiles'::regclass
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_major_len_check CHECK (length(target_major) <= 120);
  END IF;
END $$;

-- Doğrulama (çalıştırdıktan sonra):
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'user_profiles'::regclass AND contype = 'c'
-- ORDER BY conname;
