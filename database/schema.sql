-- ===================================
-- ALGORA - Database Schema
-- Supabase SQL Setup Script
-- ===================================

-- This script creates all necessary tables, views, and RLS policies
-- Run this in Supabase SQL Editor after creating your project

-- ⚠️ ÖNEMLİ: Bu dosya YENİ (boş) bir Supabase projesi için başlangıç şemasıdır.
-- Canlı/mevcut veritabanına TEKRAR çalıştırma:
--   - Tablo/policy zaten varsa 42710 (already exists) hatası alırsın
--   - View seçenekleri CREATE OR REPLACE ile değişmez — canlı DB'deki
--     view düzeltmeleri için database/security_fixes_views.sql dosyasını kullan
-- Idempotentlik: politikalar DROP IF EXISTS + CREATE deseniyle yazılmıştır,
-- ancak bu dosyanın amacı canlı DB bakımı değil, fresh kurulumdur.

-- ===================================
-- TABLES
-- ===================================

-- User Profiles Table
-- Stores additional user information beyond auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- UNIQUE (S1 fix, database/user_profiles_unique.sql): INSERT fallback'in
  -- yarış durumunda çift satır üretmesini engeller
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  -- O6 uzunluk sınırları (database/user_profiles_uzunluk.sql) — API-düzeyi savunma;
  -- UI maxLength ile aynı değerler (name 100, üniversite/bölüm 120)
  CONSTRAINT user_profiles_name_len_check CHECK (name IS NULL OR length(name) <= 100),
  exam_type TEXT NOT NULL CHECK (exam_type IN ('TYT', 'AYT', 'YDT')),
  target_score INTEGER NOT NULL CHECK (target_score >= 0 AND target_score <= 500),
  subjects TEXT[] NOT NULL,
  -- NUMERIC: form 0.5 adım vaat ediyor (INTEGER 0.5'i düşürür → 400)
  study_hours_per_day NUMERIC NOT NULL CHECK (study_hours_per_day >= 0 AND study_hours_per_day <= 24),
  exam_date DATE,
  -- Hedef üniversite/bölüm — motivasyon rozetini besler (Sınav Hedefleri bölümü)
  target_university TEXT NOT NULL DEFAULT '' CONSTRAINT user_profiles_university_len_check CHECK (length(target_university) <= 120),
  target_major TEXT NOT NULL DEFAULT '' CONSTRAINT user_profiles_major_len_check CHECK (length(target_major) <= 120),
  current_streak INTEGER DEFAULT 0,
  total_study_time INTEGER DEFAULT 0, -- in minutes
  -- Araştırma Modu (BAP deneyi, database/arastirma_modu.sql): NULL = katılımcı
  -- değil / 'deney' = tüm özellikler açık / 'kontrol' = standart deneyim
  research_group TEXT CONSTRAINT user_profiles_research_group_check
    CHECK (research_group IS NULL OR research_group IN ('deney', 'kontrol')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Goals Table
-- "Bugünün Hedefleri" — hesaba bağlı (RLS: yalnız kendi satırları);
-- canlıya kurulum: database/user_goals_ve_hedefler.sql
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_text TEXT NOT NULL CHECK (char_length(goal_text) <= 200),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  date DATE NOT NULL, -- yerel 'YYYY-MM-DD'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_goals_select_own ON user_goals;
DROP POLICY IF EXISTS user_goals_insert_own ON user_goals;
DROP POLICY IF EXISTS user_goals_update_own ON user_goals;
DROP POLICY IF EXISTS user_goals_delete_own ON user_goals;

CREATE POLICY user_goals_select_own ON user_goals
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY user_goals_insert_own ON user_goals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_goals_update_own ON user_goals
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_goals_delete_own ON user_goals
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Questions Table
-- Stores AI-generated and manually created questions
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  exam_type TEXT NOT NULL CHECK (exam_type IN ('TYT', 'AYT', 'YDT')),
  question_text TEXT NOT NULL,
  choices TEXT[] NOT NULL CHECK (array_length(choices, 1) = 5),
  correct_answer INTEGER NOT NULL CHECK (correct_answer >= 0 AND correct_answer <= 4),
  explanation TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  times_answered INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  -- V2 havuz alanları (database/question_pool_faz1a.sql):
  hints JSONB, -- 3'lü Sokratik ipucu dizisi; eski sorularda NULL (gece vardiyası backfill)
  status TEXT NOT NULL DEFAULT 'active' CONSTRAINT questions_status_check CHECK (status IN ('active', 'suspended', 'rejected')),
  clone_of UUID REFERENCES questions(id) ON DELETE SET NULL, -- klonun kaynağı (NULL = orijinal)
  intended_for UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- kişisel klon sahibi (NULL = genel havuz)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Answers Table
-- Records user answers to questions
CREATE TABLE IF NOT EXISTS answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  selected_answer INTEGER NOT NULL CHECK (selected_answer >= 0 AND selected_answer <= 4),
  is_correct BOOLEAN NOT NULL,
  time_spent INTEGER NOT NULL CHECK (time_spent > 0), -- in seconds
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study Sessions Table
-- Tracks individual study sessions
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  questions_answered INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  duration_seconds INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- User Stats View
-- Aggregated user statistics
-- security_invoker = true: view, çağıran kullanıcının yetkileriyle çalışır.
-- OLMADAN: view sahibi (postgres) yetkileriyle çalışır → RLS bypass → anon
-- kullanıcı TÜM kullanıcıların istatistiklerini görebilirdi (veri sızıntısı).
CREATE OR REPLACE VIEW user_stats WITH (security_invoker = true) AS
SELECT
  a.user_id,
  up.exam_type,
  up.target_score,
  up.subjects,
  COUNT(DISTINCT a.id) as total_questions_answered,
  SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as correct_answers,
  ROUND(
    ((SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(DISTINCT a.id), 0)) * 100)::numeric,
    2
  ) as accuracy_rate,
  ROUND(AVG(a.time_spent)::numeric, 2) as average_time_per_question,
  up.current_streak,
  up.total_study_time,
  up.exam_date
FROM answers a
LEFT JOIN user_profiles up ON up.user_id = a.user_id
GROUP BY a.user_id, up.exam_type, up.target_score, up.subjects, up.current_streak, up.total_study_time, up.exam_date;

-- Subject Breakdown View
-- User performance by subject, broken down by exam type (TYT/AYT/YDT) —
-- aynı ders farklı sınav türlerinde ayrı satır (ör. "Coğrafya (TYT)" / "Coğrafya (AYT)")
-- security_invoker = true (gerekçe yukarıda, user_stats yorumunda)
CREATE OR REPLACE VIEW subject_breakdown WITH (security_invoker = true) AS
SELECT
  a.user_id,
  q.subject,
  q.exam_type,
  COUNT(DISTINCT a.id) as total_questions,
  SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as correct_answers,
  ROUND(
    ((SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::FLOAT / COUNT(DISTINCT a.id)) * 100)::numeric,
    2
  ) as accuracy_rate
FROM answers a
JOIN questions q ON a.question_id = q.id
GROUP BY a.user_id, q.subject, q.exam_type;

-- ===================================
-- INDEXES
-- ===================================

-- Improve query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_exam_type ON questions(exam_type);
CREATE INDEX IF NOT EXISTS idx_answers_user_id ON answers(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_created_at ON answers(answered_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id_date ON user_goals (user_id, date);
-- V2 havuz index'leri (database/question_pool_faz1a.sql)
CREATE INDEX IF NOT EXISTS idx_questions_pool_lookup
  ON questions (exam_type, subject, difficulty)
  WHERE status = 'active' AND clone_of IS NULL AND intended_for IS NULL;
CREATE INDEX IF NOT EXISTS idx_questions_intended_for
  ON questions (intended_for) WHERE intended_for IS NOT NULL;

-- ===================================
-- ROW LEVEL SECURITY (RLS)
-- ===================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- ===================================
-- RLS POLICIES
-- ===================================

-- User Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Questions Policies
-- B2 onarımı (zaafiyet raporu 5 Eki): yalnız genel havuz (intended_for NULL)
-- + kullanıcının kendi kişisel klonları görünür — başkasının klonu ifşa edilmez.
-- Kurulum: database/questions_klon_politikasi.sql
DROP POLICY IF EXISTS "Anyone can view questions" ON questions;
DROP POLICY IF EXISTS "Pool public, clones private" ON questions;
CREATE POLICY "Pool public, clones private"
  ON questions FOR SELECT
  USING (intended_for IS NULL OR intended_for = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can insert questions" ON questions;
CREATE POLICY "Authenticated users can insert questions"
  ON questions FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Question creators can update own questions" ON questions;
CREATE POLICY "Question creators can update own questions"
  ON questions FOR UPDATE
  USING (auth.uid() = created_by);

-- Question Reports Table (V2 kitle kaynaklı kalite kontrol)
-- 2 FARKLI kullanıcının bildirimi report_question RPC'siyle soruyu askıya alır.
-- UNIQUE (question_id, user_id) index'i soru-bazlı sayımı da karşılar.
-- Canlıya kurulum: database/question_pool_faz1a.sql
CREATE TABLE IF NOT EXISTS question_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT question_reports_unique_per_user UNIQUE (question_id, user_id)
);

ALTER TABLE question_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own reports" ON question_reports;
CREATE POLICY "Users can insert own reports"
  ON question_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own reports" ON question_reports;
CREATE POLICY "Users can view own reports"
  ON question_reports FOR SELECT
  USING (auth.uid() = user_id);

-- Answers Policies
DROP POLICY IF EXISTS "Users can view own answers" ON answers;
CREATE POLICY "Users can view own answers"
  ON answers FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own answers" ON answers;
CREATE POLICY "Users can insert own answers"
  ON answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own answers" ON answers;
CREATE POLICY "Users can update own answers"
  ON answers FOR UPDATE
  USING (auth.uid() = user_id);

-- Study Sessions Policies
DROP POLICY IF EXISTS "Users can view own sessions" ON study_sessions;
CREATE POLICY "Users can view own sessions"
  ON study_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON study_sessions;
CREATE POLICY "Users can insert own sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON study_sessions;
CREATE POLICY "Users can update own sessions"
  ON study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- ===================================
-- FUNCTIONS AND TRIGGERS
-- ===================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update question statistics when answered
CREATE OR REPLACE FUNCTION update_question_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE questions
  SET
    times_answered = times_answered + 1,
    times_correct = times_correct + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END
  WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_question_stats_trigger ON answers;
CREATE TRIGGER update_question_stats_trigger
  AFTER INSERT ON answers
  FOR EACH ROW
  EXECUTE FUNCTION update_question_stats();

-- Update user study time
CREATE OR REPLACE FUNCTION update_user_study_time()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET
    total_study_time = total_study_time + (NEW.duration_seconds / 60),
    current_streak = CASE
      WHEN NEW.completed_at >= CURRENT_DATE THEN current_streak + 1
      ELSE 1
    END
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_study_time_trigger ON study_sessions;
CREATE TRIGGER update_user_study_time_trigger
  AFTER INSERT ON study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_study_time();

-- ===================================
-- LOGIN KİLİTLEMESİ (hesaba göre: 3 yanlış deneme → 1 saat kilit)
-- Kaynak: database/login_lockouts.sql (tam açıklamalı sürüm)
-- ===================================

CREATE TABLE IF NOT EXISTS login_lockouts (
  email        text PRIMARY KEY,
  failed_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE login_lockouts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON login_lockouts FROM PUBLIC, anon, authenticated;
GRANT ALL ON login_lockouts TO service_role;

CREATE OR REPLACE FUNCTION record_failed_login(
  p_email        text,
  p_max_attempts integer DEFAULT 3,
  p_lock         interval DEFAULT interval '1 hour'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email       text := lower(trim(p_email));
  v_count       int;
  v_locked_until timestamptz;
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'email gerekli';
  END IF;

  SELECT failed_count, locked_until
    INTO v_count, v_locked_until
    FROM login_lockouts
    WHERE email = v_email
    FOR UPDATE;

  IF NOT FOUND THEN
    v_count := 1;
    v_locked_until := NULL;
  ELSIF v_locked_until IS NOT NULL AND v_locked_until <= now() THEN
    v_count := 1;
    v_locked_until := NULL;
  ELSE
    v_count := v_count + 1;
  END IF;

  IF v_count >= p_max_attempts AND v_locked_until IS NULL THEN
    v_locked_until := now() + p_lock;
  END IF;

  INSERT INTO login_lockouts (email, failed_count, locked_until, updated_at)
  VALUES (v_email, v_count, v_locked_until, now())
  ON CONFLICT (email) DO UPDATE
    SET failed_count = EXCLUDED.failed_count,
        locked_until = EXCLUDED.locked_until,
        updated_at   = now();

  RETURN json_build_object(
    'failed_count',  v_count,
    'attempts_left', GREATEST(p_max_attempts - v_count, 0),
    'locked',        v_locked_until IS NOT NULL AND v_locked_until > now(),
    'locked_until',  v_locked_until
  );
END;
$$;

CREATE OR REPLACE FUNCTION check_login_lock(p_email text)
RETURNS timestamptz
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT CASE WHEN locked_until > now() THEN locked_until END
    FROM login_lockouts
    WHERE email = lower(trim(p_email));
$$;

CREATE OR REPLACE FUNCTION reset_failed_login(p_email text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM login_lockouts WHERE email = lower(trim(p_email));
$$;

DO $$
DECLARE
  fn record;
  fn_names text[] := ARRAY['record_failed_login', 'check_login_lock', 'reset_failed_login'];
  n text;
BEGIN
  FOREACH n IN ARRAY fn_names LOOP
    FOR fn IN
      SELECT p.oid, p.proname
      FROM pg_proc p
      JOIN pg_namespace ns ON ns.oid = p.pronamespace
      WHERE ns.nspname = 'public' AND p.proname = n
    LOOP
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I FROM PUBLIC, anon, authenticated', fn.proname);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I TO service_role', fn.proname);
    END LOOP;
  END LOOP;
END;
$$;

-- ===================================
-- V2 SORU HAVUZU RPC'LERİ
-- (database/question_pool_faz1a.sql — tam açıklamalı sürüm)
-- ===================================

-- Havuzdan öğrencinin sıradaki sorusu (çözmedikleri + oturumda görülenler hariç;
-- ipuçlu sorular tercih edilir). Havuz boşsa NULL → route Gemini fallback.
CREATE OR REPLACE FUNCTION get_next_pool_question(
  p_user_id uuid,
  p_exam_type text,
  p_subject text,
  p_topic text DEFAULT NULL,
  p_difficulty text DEFAULT NULL,
  p_exclude uuid[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id',            q.id,
    'exam_type',     q.exam_type,
    'subject',       q.subject,
    'topic',         q.topic,
    'difficulty',    q.difficulty,
    'question_text', q.question_text,
    'choices',       q.choices,
    'correct_answer',q.correct_answer,
    'explanation',   q.explanation,
    'hints',         q.hints,
    'created_at',    q.created_at
  )
  FROM questions q
  WHERE q.status = 'active'
    AND q.clone_of IS NULL
    AND q.intended_for IS NULL
    AND q.exam_type = p_exam_type
    AND q.subject = p_subject
    AND (p_difficulty IS NULL OR q.difficulty = p_difficulty)
    AND (p_topic IS NULL OR p_topic = 'Genel' OR q.topic = p_topic)
    AND NOT EXISTS (
      SELECT 1 FROM answers a
      WHERE a.user_id = p_user_id
        AND a.question_id = q.id
    )
    AND NOT (q.id = ANY (p_exclude))
  ORDER BY (q.hints IS NOT NULL) DESC, random()
  LIMIT 1
$$;

-- Kitle kaynaklı askıya alma: 2 FARKLI kullanıcının bildirimi → status='suspended'
CREATE OR REPLACE FUNCTION report_question(
  p_question_id uuid,
  p_user_id uuid,
  p_reason text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status   text;
  v_distinct int;
BEGIN
  SELECT status INTO v_status FROM questions WHERE id = p_question_id;
  IF v_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'QUESTION_NOT_FOUND');
  END IF;

  INSERT INTO question_reports (question_id, user_id, reason)
  VALUES (p_question_id, p_user_id, left(coalesce(p_reason, ''), 500))
  ON CONFLICT (question_id, user_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_REPORTED');
  END IF;

  SELECT count(DISTINCT user_id) INTO v_distinct
  FROM question_reports
  WHERE question_id = p_question_id;

  IF v_distinct >= 2 THEN
    UPDATE questions
    SET status = 'suspended'
    WHERE id = p_question_id
      AND status = 'active';
  END IF;

  SELECT status INTO v_status FROM questions WHERE id = p_question_id;

  RETURN jsonb_build_object('success', true, 'question_status', v_status);
END;
$$;

-- RPC yetkileri: yalnızca service_role (üçlü REVOKE zorunlu —
-- Supabase default-privileges tuzağı)
REVOKE EXECUTE ON FUNCTION get_next_pool_question(uuid, text, text, text, text, uuid[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_next_pool_question(uuid, text, text, text, text, uuid[])
  TO service_role;

REVOKE EXECUTE ON FUNCTION report_question(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION report_question(uuid, uuid, text)
  TO service_role;

-- ===================================
-- SAMPLE DATA (Optional - for testing)
-- ===================================

-- Insert sample questions (disabled by default - uncomment if needed)
/*
INSERT INTO questions (subject, topic, difficulty, exam_type, question_text, choices, correct_answer, explanation, tags) VALUES
('Matematik', 'Türev', 'beginner', 'TYT',
 'f(x) = 3x² + 2x fonksiyonunun türevi nedir?',
 ARRAY['f''(x) = 6x + 2', 'f''(x) = 3x + 2', 'f''(x) = 6x', 'f''(x) = 3x² + 2'],
 0,
 'x² nin türevi 2x, 3x² nin türevi 6x, 2x nin türevi 2 olur. Bu nedenle f''(x) = 6x + 2',
 ARRAY['türev', 'fonksiyon', 'matematik']),

('Türkçe', 'Paragraf', 'intermediate', 'TYT',
 'Aşağıdaki cümlelerin hangisinde anlam cağırlaması yapılmıştır?',
 ARRAY['Bugün hava çok güzel.', 'Kitabı okudu.', 'Kapıyı aç', 'Arabaya bin'],
 2,
 'Kitabı okudu cümlesinde kitabın ne zaman okunduğu belirsiz - dün mü, bugün mü? Bu cağırlama anlamına gelir.',
 ARRAY['paragraf', 'cağırlama', 'türkçe']);
*/

-- ===================================
-- SETUP COMPLETE
-- ===================================

-- Verify setup
SELECT
  'Database schema setup complete!' as status,
  COUNT(DISTINCT table_name) as tables_created
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_profiles', 'questions', 'answers', 'study_sessions');

-- Expected output: 4 tables created
