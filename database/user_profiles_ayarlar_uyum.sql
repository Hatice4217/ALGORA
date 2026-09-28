-- ============================================================
-- user_profiles: Ayarlar formu ↔ şema uyumu (400 düzeltmesi)
-- Çalıştırma: Supabase Dashboard → SQL Editor → tüm dosyayı yapıştır → Run
-- Idempotent: tekrar çalıştırmak güvenlidir.
--
-- SORUN: Ayarlar > Sınav Hedefleri kaydı canlıda 400 üretiyordu:
--   ① target_score CHECK (>= 100) — form 0-500 vaat ediyor; 0-99 girilince 23514 → HTTP 400
--   ② study_hours_per_day INTEGER + CHECK (>= 1) — form 0-24 (0.5 adımlı) vaat ediyor;
--      boşsa 0, 0.5 girilirse tip hatası → HTTP 400
--   ③ exam_type CHECK'i YDT içermeyebilir (YDT sınav türü sonradan eklendi)
-- ÇÖZÜM: kısıtlar form vaadiyle hizalanır (0 tabanlı + NUMERIC saat).
-- ============================================================

DO $$
DECLARE k text;
BEGIN
  -- İsimden bağımsız düş: ilgili kolonu kısıtlayan CHECK'leri bul-sil
  -- (5sik_ve_ydt.sql'deki kanıtlanmış desen)
  FOR k IN
    SELECT conname FROM pg_constraint c
    WHERE c.conrelid = 'user_profiles'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%exam_type%'
  LOOP
    EXECUTE format('ALTER TABLE user_profiles DROP CONSTRAINT %I', k);
  END LOOP;

  FOR k IN
    SELECT conname FROM pg_constraint c
    WHERE c.conrelid = 'user_profiles'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%target_score%'
  LOOP
    EXECUTE format('ALTER TABLE user_profiles DROP CONSTRAINT %I', k);
  END LOOP;

  FOR k IN
    SELECT conname FROM pg_constraint c
    WHERE c.conrelid = 'user_profiles'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%study_hours%'
  LOOP
    EXECUTE format('ALTER TABLE user_profiles DROP CONSTRAINT %I', k);
  END LOOP;
END $$;

-- 0.5 saatlik girişler INTEGER'a sığmaz → NUMERIC
ALTER TABLE user_profiles ALTER COLUMN study_hours_per_day TYPE NUMERIC;

-- Yeni kısıtlar (form vaadiyle birebir: 0-500 puan, 0-24 saat, 3 sınav türü)
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_exam_type_check
  CHECK (exam_type IN ('TYT', 'AYT', 'YDT'));

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_target_score_check
  CHECK (target_score >= 0 AND target_score <= 500);

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_study_hours_per_day_check
  CHECK (study_hours_per_day >= 0 AND study_hours_per_day <= 24);

-- ============================================================
-- DOĞRULAMA (opsiyonel — Run sonrası beklenen: 3 satır, hepsi güncel tanım)
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'user_profiles'::regclass AND contype = 'c';
-- ============================================================
