-- ===================================
-- ALGORA — Çift-AI Soru Doğrulama (U = k/n) + Adil Puanlama
-- ===================================
-- Havuza giren her AI sorusu, ikinci bir AI (doğrulayıcı) tarafından doğru
-- cevabı GÖRMEDEN n kez kör çözülür; k = üreticinin iddia ettiği cevaba uyan
-- çözüm sayısı, U = k/n_eff. Soru üç banttan birine yerleşir:
--   'tam_uyum'   (U ≥ eşik)  → servis edilir
--   'kismi_uyum' (şüpheli)   → ELENMEZ, etiketle saklanır → insan inceleme
--                            kuyruğu (inceleme_kuyrugu view)
--   'uyumsuz'                → status='rejected' + nedeni verification jsonb'de
--
-- Sütun kaydı şeması (verification jsonb):
--   { n, n_eff, k, u, cozumler[], dogrulayici{model, modelVersion, endpoint_base},
--     esikler, temperature, tarih, uretim_tur, neden?, dagilim?, insan_onayi? }
-- Eşik varsayılanları (env ile ezilebilir; şimdilik SIKI — kalibrasyon sonrası
-- gerçek değerler belirlenir): tam 1.0 (5/5), kısmi 0.6 (2/5 ve altı uyumsuz).
--
-- ÇALIŞTIRMA: Supabase SQL Editor — idempotentdir (yeniden çalıştırılabilir).
-- ===================================

-- ===================================
-- 1) KOLONLAR
-- ===================================
-- verification_status: NULL = doğrulanmamış (legacy sorular — backfill
-- penceresi; servis dışı KALMAZ, p_bands filtresi NULL'a dokunmaz).
ALTER TABLE questions ADD COLUMN IF NOT EXISTS verification_status TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS verification JSONB;

-- ===================================
-- 2) CHECK KISITLARI (NOT VALID + VALIDATE → tablo kilitlenmeden doğrulanır)
-- ===================================
-- a) verification_status yalnızca NULL veya üç bant değerinden biri olabilir.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'questions_verification_status_check'
      AND conrelid = 'public.questions'::regclass
  ) THEN
    ALTER TABLE questions ADD CONSTRAINT questions_verification_status_check
      CHECK (verification_status IS NULL OR verification_status IN ('tam_uyum', 'kismi_uyum', 'uyumsuz'))
      NOT VALID;
  END IF;
END $$;
ALTER TABLE questions VALIDATE CONSTRAINT questions_verification_status_check;

-- b) 'uyumsuz' bantı havuza ASLA girmez: bant uyumsuzsa satır rejected olmak ZORUNDA.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'questions_uyumsuz_rejected_check'
      AND conrelid = 'public.questions'::regclass
  ) THEN
    ALTER TABLE questions ADD CONSTRAINT questions_uyumsuz_rejected_check
      CHECK (verification_status IS DISTINCT FROM 'uyumsuz' OR status = 'rejected')
      NOT VALID;
  END IF;
END $$;
ALTER TABLE questions VALIDATE CONSTRAINT questions_uyumsuz_rejected_check;

-- ===================================
-- 3) get_next_pool_question — p_bands parametresi
-- ===================================
-- İmzaya p_bands text[] eklenir: RPC yalnızca istenen doğrulama bantlarından
-- (VEYA doğrulanmamış — NULL) soruları servis eder. Yeni imza → eski
-- overload'lar pg_proc'tan İSİMLE düşülür (parametre sayısından bağımsız
-- desen; varsayılan-değerli imza varyasyonları kalmaz).
-- Risk notu: DROP+CREATE sonrası pooler'daki eski prepared planlar kısa
-- süreliğine bozulabilir → düşük trafikte çalıştır + hemen P2 probe.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public' AND p.proname = 'get_next_pool_question'
  LOOP
    EXECUTE format('DROP FUNCTION public.get_next_pool_question(%s)', fn.args);
  END LOOP;
END $$;

-- Gövde, database/havuz_rpc_kaynak_rozeti.sql:13-56 birebirdir; tek fark
-- WHERE'e eklenen p_bands satırıdır (aşağıda işaretli).
CREATE FUNCTION get_next_pool_question(
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
    -- ÇİFT-AI: yalnızca servis bantları (SERVED_VERIFICATION_BANDS) veya
    -- doğrulanmamış (NULL — legacy backfill penceresi) sorular döner
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

-- Üçlü REVOKE (O4 deseni): SECURITY DEFINER RPC anon/authenticated'ın
-- EXECUTE'ına kapalı kalsın (Supabase default-privilege tuzağı).
REVOKE EXECUTE ON FUNCTION get_next_pool_question(uuid, text, text, text, text, uuid[], text[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_next_pool_question(uuid, text, text, text, text, uuid[], text[])
  TO service_role;

-- ===================================
-- 4) report_question — klon kaskadı
-- ===================================
-- 2 FARKLI kullanıcının bildirimi → soru suspended (mevcut davranış korunur).
-- YENİ (Karar 5): kaynak suspend olunca KLONLARI da suspend edilir. Graf
-- FLAT'tır (clone_of her zaman kökü gösterir, tek hop): rapor edilen soru
-- klon ise KÖK + kardeş klonlar, kök ise TÜM klonlar askıya alınır.
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
  v_kok      uuid;
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

    -- Klon kaskadı (graf FLAT — clone_of = kök, tek hop): kök + tüm klonlar.
    -- NOT: 'uyumsuz' satırlar zaten rejected'tır (CHECK), status='active'
    -- olmadıklarından kaskaddan etkilenmez; CHECK ihlali mümkün değil.
    SELECT COALESCE(clone_of, id) INTO v_kok FROM questions WHERE id = p_question_id;
    UPDATE questions c
    SET status = 'suspended'
    WHERE c.status = 'active'
      AND (c.id = v_kok OR c.clone_of = v_kok);
  END IF;

  SELECT status INTO v_status FROM questions WHERE id = p_question_id;

  RETURN jsonb_build_object('success', true, 'question_status', v_status);
END;
$$;

-- Üçlü REVOKE (imza değişmedi; taze kurulum tuzağına karşı yine de yazılır)
REVOKE EXECUTE ON FUNCTION report_question(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION report_question(uuid, uuid, text)
  TO service_role;

-- ===================================
-- 5) inceleme_kuyrugu VIEW — insan inceleme kuyruğu
-- ===================================
-- kismi_uyum bantındaki şüpheli sorular: ELENMEZLER, burada birikirler.
-- Yalnızca service-role SELECT (admin /api/questions/admin/inceleme route'u).
CREATE OR REPLACE VIEW inceleme_kuyrugu WITH (security_invoker = true) AS
SELECT
  id,
  subject,
  topic,
  difficulty,
  exam_type,
  question_text,
  choices,
  correct_answer,
  tags,
  verification,
  created_at
FROM questions
WHERE status = 'active'
  AND verification_status = 'kismi_uyum'
  AND clone_of IS NULL
  AND intended_for IS NULL;

REVOKE ALL ON inceleme_kuyrugu FROM PUBLIC, anon, authenticated;
GRANT SELECT ON inceleme_kuyrugu TO service_role;

-- ===================================
-- 6) ADİL PUANLAMA — subject_breakdown yalnız aktif soruları saysın
-- ===================================
-- Performans istatistikleri yalnız status='active' soruların cevaplarını sayar
-- (suspended/rejected soruların cevapları başarı oranını çarpıtmaz).
-- İleride w=1 / w=0,3 ağırlığına evrilebilir — filtre merkezi burasıdır.
-- (getAnswerDates/günlük seri bilinçli FILTRELENMEZ: aktivite ≠ performans.)
DROP VIEW IF EXISTS subject_breakdown;
CREATE VIEW subject_breakdown WITH (security_invoker = true) AS
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
WHERE q.status = 'active'
GROUP BY a.user_id, q.subject, q.exam_type;

-- ===================================
-- 7) DOĞRULAMA — beklenen çıktıları KULLANICIYA raporla
-- ===================================

-- 7.1 Yeni kolonlar
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'questions'
  AND column_name IN ('verification_status', 'verification');

-- 7.2 RPC yetki matrisi — beklenen: anon/authenticated FALSE, service_role TRUE
SELECT
  has_function_privilege('anon', 'get_next_pool_question(uuid,text,text,text,text,uuid[],text[])', 'EXECUTE') AS anon_next_pool,
  has_function_privilege('authenticated', 'get_next_pool_question(uuid,text,text,text,text,uuid[],text[])', 'EXECUTE') AS auth_next_pool,
  has_function_privilege('service_role', 'get_next_pool_question(uuid,text,text,text,text,uuid[],text[])', 'EXECUTE') AS service_next_pool,
  has_function_privilege('anon', 'report_question(uuid,uuid,text)', 'EXECUTE') AS anon_report,
  has_function_privilege('service_role', 'report_question(uuid,uuid,text)', 'EXECUTE') AS service_report;

-- 7.3 CHECK bütünlüğü — beklenen: 0 (uyumsuz ama rejected olmayan satır yok)
SELECT count(*) AS uyumsuz_ama_rejected_degil
FROM questions
WHERE verification_status = 'uyumsuz' AND status <> 'rejected';

-- 7.4 inceleme kuyruğu erişilebilir mi — beklenen: sayı (0 da normaldir)
SELECT count(*) AS inceleme_kuyrugu_sayisi FROM inceleme_kuyrugu;

-- 7.5 Bant dağılımı — backfill öncesi hepsi NULL beklenir
SELECT verification_status, count(*) AS adet
FROM questions
GROUP BY verification_status
ORDER BY verification_status NULLS FIRST;
