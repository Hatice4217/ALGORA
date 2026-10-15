-- ===================================
-- Havuz RPC'si — kaynak etiketleri (tags) + doğrulama bantları (p_bands)
-- ===================================
-- get_next_pool_question q.tags döndürür; /next rotası istemciye taşır,
-- SoruModali MEB çıkmış sorularında "📅 2022 Çıkmış" rozeti basar.
--
-- Çift-AI doğrulama (database/cift_ai_dogrulama.sql — tam açıklamalı sürüm):
-- imzaya p_bands text[] eklendi → RPC yalnızca istenen doğrulama bantlarından
-- (SERVED_VERIFICATION_BANDS env) VEYA doğrulanmamış (NULL — legacy backfill
-- penceresi) soruları servis eder. İmza değiştiği için canlıya kurulumda
-- eski overload'lar pg_proc'tan İSİMLE düşülür (cift_ai_dogrulama.sql Bölüm 3).
-- Bu dosya referans/baseline kopyasıdır.
-- DİKKAT (güvenlik taraması 9 Eki, O4): taze kurulumda Supabase
-- default-privilege tuzağı SECURITY DEFINER RPC'yi anon/auth'a AÇIK
-- bırakır → üçlü REVOKE bloğu dosyanın içinde gömülüdür.

CREATE OR REPLACE FUNCTION get_next_pool_question(
  p_user_id uuid,
  p_exam_type text,
  p_subject text,
  p_topic text DEFAULT NULL,
  p_difficulty text DEFAULT NULL,
  p_exclude uuid[] DEFAULT '{}',
  p_bands text[] DEFAULT NULL
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
    'tags',          q.tags,
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
    -- ÇİFT-AI: yalnız servis bantları veya doğrulanmamış (NULL) sorular
    AND (p_bands IS NULL OR q.verification_status IS NULL OR q.verification_status = ANY(p_bands))
    AND NOT EXISTS (
      SELECT 1 FROM answers a
      WHERE a.user_id = p_user_id
        AND a.question_id = q.id
    )
    AND NOT (q.id = ANY (p_exclude))
  ORDER BY (q.hints IS NOT NULL) DESC, random()
  LIMIT 1
$$;

-- Üçlü REVOKE (O4): SECURITY DEFINER RPC anon/authenticatedın EXECUTEına kapalı kalsın
REVOKE EXECUTE ON FUNCTION get_next_pool_question(uuid, text, text, text, text, uuid[], text[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_next_pool_question(uuid, text, text, text, text, uuid[], text[])
  TO service_role;
