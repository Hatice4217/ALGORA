-- ===================================
-- Havuz RPC'sine kaynak etiketleri (tags) — MEB yıl rozeti altyapısı
-- ===================================
-- get_next_pool_question artık q.tags de döndürür; /next rotası istemciye
-- taşır, SoruModali MEB çıkmış sorularında "📅 2022 Çıkmış" rozeti basar.
-- CREATE OR REPLACE → idempotent, davranış başka hiçbir şekilde değişmez
-- (WHERE/ORDER/LIMIT birebir korunur; SECURITY DEFINER + üçlü REVOKE zaten
-- function sahibi değişmediği için aynen geçerli).

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
    AND NOT EXISTS (
      SELECT 1 FROM answers a
      WHERE a.user_id = p_user_id
        AND a.question_id = q.id
    )
    AND NOT (q.id = ANY (p_exclude))
  ORDER BY (q.hints IS NOT NULL) DESC, random()
  LIMIT 1
$$;
