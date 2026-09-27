-- ============================================================================
-- 5 ŞIK (ÖSYM) + YDT GEÇİŞİ — CANLI DB MIGRATION
-- Supabase SQL Editor'de çalıştırılacak.
-- ============================================================================
-- Bağlam:
--   • Sorular artık 5 şıklı (A-E) — eski `array_length(choices,1) = 4` CHECK'i
--     üretim INSERT'lerini DÜŞÜRÜYOR (probe ile kanıtlandı:
--     "violates check constraint questions_choices_check").
--   • exam_type ailesine 3. oturum YDT eklendi.
--   • correct_answer / selected_answer index aralığı 0-3 → 0-4.
-- Not:
--   • choices CHECK'e NOT VALID eklenir → mevcut 4 şıklık eski satırlar
--     geçerli kalır (grandfathered), yeni yazımlar 5 şık zorunludur.
--   • DO blokları, o kolonu ilgilendiren MEVCUT her CHECK'i isminden
--     bağımsız düşürür (farklı isimli constraint riskine karşı).
-- ============================================================================

-- 1) questions.choices → 5 şık
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'questions'::regclass AND contype = 'c'
             AND pg_get_constraintdef(oid) ILIKE '%choices%'
  LOOP
    EXECUTE format('ALTER TABLE questions DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
ALTER TABLE questions
  ADD CONSTRAINT questions_choices_check
  CHECK (array_length(choices, 1) = 5) NOT VALID;

-- 2) questions.correct_answer → 0-4
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'questions'::regclass AND contype = 'c'
             AND pg_get_constraintdef(oid) ILIKE '%correct_answer%'
  LOOP
    EXECUTE format('ALTER TABLE questions DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
ALTER TABLE questions
  ADD CONSTRAINT questions_correct_answer_check
  CHECK (correct_answer >= 0 AND correct_answer <= 4);

-- 3) questions.exam_type → TYT / AYT / YDT
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'questions'::regclass AND contype = 'c'
             AND pg_get_constraintdef(oid) ILIKE '%exam_type%'
  LOOP
    EXECUTE format('ALTER TABLE questions DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
ALTER TABLE questions
  ADD CONSTRAINT questions_exam_type_check
  CHECK (exam_type IN ('TYT', 'AYT', 'YDT'));

-- 4) answers.selected_answer → 0-4
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'answers'::regclass AND contype = 'c'
             AND pg_get_constraintdef(oid) ILIKE '%selected_answer%'
  LOOP
    EXECUTE format('ALTER TABLE answers DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
ALTER TABLE answers
  ADD CONSTRAINT answers_selected_answer_check
  CHECK (selected_answer >= 0 AND selected_answer <= 4);

-- 5) user_profiles.exam_type → TYT / AYT / YDT (profil katmanı uyumu)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'user_profiles'::regclass AND contype = 'c'
             AND pg_get_constraintdef(oid) ILIKE '%exam_type%'
  LOOP
    EXECUTE format('ALTER TABLE user_profiles DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_exam_type_check
  CHECK (exam_type IN ('TYT', 'AYT', 'YDT'));

-- ============================================================================
-- DOĞRULAMA (beklenen: her satırda yeni tanımlar)
-- SELECT conrelid::regclass AS tablo, conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname IN ('questions_choices_check','questions_correct_answer_check',
--                   'questions_exam_type_check','answers_selected_answer_check',
--                   'user_profiles_exam_type_check');
-- ============================================================================
