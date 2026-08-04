-- ===================================
-- ALGORA - Database Schema
-- Supabase SQL Setup Script
-- ===================================

-- This script creates all necessary tables, views, and RLS policies
-- Run this in Supabase SQL Editor after creating your project

-- ===================================
-- TABLES
-- ===================================

-- User Profiles Table
-- Stores additional user information beyond auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('TYT', 'AYT', 'LGS')),
  target_score INTEGER NOT NULL CHECK (target_score >= 100 AND target_score <= 500),
  subjects TEXT[] NOT NULL,
  study_hours_per_day INTEGER NOT NULL CHECK (study_hours_per_day >= 1 AND study_hours_per_day <= 24),
  exam_date DATE,
  current_streak INTEGER DEFAULT 0,
  total_study_time INTEGER DEFAULT 0, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions Table
-- Stores AI-generated and manually created questions
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  exam_type TEXT NOT NULL CHECK (exam_type IN ('TYT', 'AYT', 'LGS')),
  question_text TEXT NOT NULL,
  choices TEXT[] NOT NULL CHECK (array_length(choices, 1) = 4),
  correct_answer INTEGER NOT NULL CHECK (correct_answer >= 0 AND correct_answer <= 3),
  explanation TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  times_answered INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Answers Table
-- Records user answers to questions
CREATE TABLE IF NOT EXISTS answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  selected_answer INTEGER NOT NULL CHECK (selected_answer >= 0 AND selected_answer <= 3),
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
CREATE OR REPLACE VIEW user_stats AS
SELECT
  up.user_id,
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
FROM user_profiles up
LEFT JOIN answers a ON up.user_id = a.user_id
GROUP BY up.user_id, up.exam_type, up.target_score, up.subjects, up.current_streak, up.total_study_time, up.exam_date;

-- Subject Breakdown View
-- User performance by subject
CREATE OR REPLACE VIEW subject_breakdown AS
SELECT
  a.user_id,
  q.subject,
  COUNT(DISTINCT a.id) as total_questions,
  SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as correct_answers,
  ROUND(
    ((SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::FLOAT / COUNT(DISTINCT a.id)) * 100)::numeric,
    2
  ) as accuracy_rate
FROM answers a
JOIN questions q ON a.question_id = q.id
GROUP BY a.user_id, q.subject;

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
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Questions Policies
CREATE POLICY "Anyone can view questions"
  ON questions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert questions"
  ON questions FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Question creators can update own questions"
  ON questions FOR UPDATE
  USING (auth.uid() = created_by);

-- Answers Policies
CREATE POLICY "Users can view own answers"
  ON answers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own answers"
  ON answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own answers"
  ON answers FOR UPDATE
  USING (auth.uid() = user_id);

-- Study Sessions Policies
CREATE POLICY "Users can view own sessions"
  ON study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

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
