-- ===================================
-- ALGORA V2 — Faz 1a: Havuz (Pool) Altyapısı
-- Supabase SQL Editor'de ELLE çalıştırılır. Idempotent'tir
-- (tekrar çalıştırma güvenli).
-- ===================================
--
-- Mimari kararlar (30 Eylül 2026, BAP danışman toplantısı):
--   • HAVUZ-İLK AKIŞ: soru isteği ÖNCE mevcut global questions tablosundan
--     (ders + konu + zorluk + sınav türü eşleşmesi, öğrencinin daha önce
--     çözmediği) karşılanır; havuz tükenirse Gemini fallback üretir.
--     Yeni ana tablo YOK — mevcut tablo havuz olarak kullanılır.
--   • KİTLE KAYNAKLı KALİTE KONTROL: sorular anında yayında (review beklemiyor).
--     2 FARKLI kullanıcının "⚠️ Hatalı Soru Bildir"i soruyu ATOMİK olarak
--     askıya alır (status='suspended').
--   • SOKRATİK 3 İPUCU: soruyla birlikte üretilir (hints jsonb), ücretsizdir
--     ve ASLA çözümü ifşa etmez (pedagojik kural — prompt tarafında uygulanır).
--   • KLONLAR (Duolingo modeli) AYNI tabloda yaşar: clone_of + intended_for
--     doluysa soru kişiseldir ve genel havuz sorgularında görünmez.
--
-- Bu script: kolon ekleme + question_reports tablosu + 2 RPC + index'ler.
-- Kredi ekonomisi pivotu (PLAN_LIMITS günlük) KOD tarafında, ayrı adımda.
--
-- ⚠️ Supabase default-privileges tuzağı (canlıda doğrulandı): REVOKE ... FROM PUBLIC
-- YETMEZ — Supabase fonksiyon OLUŞTURULDUĞU anda anon/authenticated'a DOĞRUDAN
-- EXECUTE verir. ÜÇÜNDEN de alınmalıdır: PUBLIC + anon + authenticated.
-- ===================================

-- ===================================
-- 1) questions TABLOSUNA YENİ KOLONLAR
-- ===================================

-- 3'lü Sokratik ipucu dizisi: ["ipucu1","ipucu2","ipucu3"]
-- Eski havuz sorularında NULL → UI ipucusuz davranır
-- (gece vardiyası backfill işi sonradan dolduracak).
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS hints jsonb;

-- Havuz yaşam-döngüsü:
--   active    → yayında (havuzdan servis edilebilir)
--   suspended → 2+ bağımsız bildirim → incelemede (havuzdan servis EDİLMEZ)
--   rejected  → uzman kararıyla çöpe (şimdilik yalnızca Supabase UI'dan elle)
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Duolingo modeli klon bağlantıları:
--   clone_of     → klonun üretildiği orijinal soru (NULL = orijinal havuz sorusu)
--   intended_for → klonun sahibi öğrenci (NULL = genel havuz sorusu)
-- Hesap silinince: kişisel klonlar CASCADE ile gider, orijinaller kalır.
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS clone_of uuid REFERENCES public.questions(id) ON DELETE SET NULL;

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS intended_for uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- status CHECK kısıtı (idempotent — kısıt adını biz belirlediğimiz için
-- isimle kontrol güvenlidir; mevcut satırlar DEFAULT 'active' alır)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'questions_status_check'
      AND conrelid = 'public.questions'::regclass
  ) THEN
    ALTER TABLE public.questions
      ADD CONSTRAINT questions_status_check
      CHECK (status IN ('active', 'suspended', 'rejected'));
  END IF;
END $$;

-- ===================================
-- 2) question_reports TABLOSU (kitle kaynaklı kalite kontrol)
-- ===================================
--
-- UNIQUE (question_id, user_id): aynı kullanıcı aynı soruyu bir kez bildirebilir.
-- İkinci FARKLI kullanıcının bildirimi report_question RPC'si içinde
-- atomik olarak soruyu askıya alır (yarış koşulu güvenli).
-- reason: serbest metin (UI "Hatalı cevap / Bozuk içerik / Diğer" + not), 500 krk.
CREATE TABLE IF NOT EXISTS question_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT question_reports_unique_per_user UNIQUE (question_id, user_id)
);

-- Bu UNIQUE kısıt (question_id, user_id) index'i otomatik oluşturur;
-- soru-bazlı bildirim sayımı bu index'i kullanır. Ek index gerekmez.

ALTER TABLE question_reports ENABLE ROW LEVEL SECURITY;

-- Kullanıcı yalnızca kendi bildirimlerini okur ve yazar (payment_claims deseni).
-- UPDATE/DELETE politikası YOK — bildirimler değişmez kayıtlardır.
-- Askıya alma yazımı (questions.status) YALNIZCA RPC üzerinden (service-role) yapılır.
DROP POLICY IF EXISTS "Users can insert own reports" ON question_reports;
CREATE POLICY "Users can insert own reports"
  ON question_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own reports" ON question_reports;
CREATE POLICY "Users can view own reports"
  ON question_reports FOR SELECT
  USING (auth.uid() = user_id);

-- ===================================
-- 3) INDEX'LER
-- ===================================

-- Havuz arama sorgusunun ana yolu: (sınav, ders, zorluk) filtresi +
-- partial predicate RPC'nin WHERE koşuluyla birebir aynı (status/clone/kişisel hariç)
CREATE INDEX IF NOT EXISTS idx_questions_pool_lookup
  ON questions (exam_type, subject, difficulty)
  WHERE status = 'active' AND clone_of IS NULL AND intended_for IS NULL;

-- "Eksiklerini Kapat" modunun kişisel klon araması için
CREATE INDEX IF NOT EXISTS idx_questions_intended_for
  ON questions (intended_for)
  WHERE intended_for IS NOT NULL;

-- ===================================
-- 4) RPC: get_next_pool_question
-- ===================================
--
-- Havuzdan öğrencinin SIRADAKİ sorusunu getirir. Kural kümesi:
--   • status = 'active' (askıda/reddedilmiş sorular servis edilmez)
--   • clone_of IS NULL AND intended_for IS NULL (genel havuz;
--     kişisel klonlar yalnızca "Eksiklerini Kapat" modunda, 1b'de ayrı sorgu)
--   • sınav türü + ders ZORUNLU eşleşme; zorluk verildiyse birebir
--   • konu: spesifik verilmişse birebir; 'Genel'/NULL ise dersteki HERHANGİ konu
--   • öğrencinin answers'ta kaydı olan sorular HARİÇ (çözmediği filtresi)
--   • p_exclude: oturumda ekranda görülen sorular (client gönderir)
--   • Tercih sırası: ipuçlu sorular önce, sonra rastgele (çeşitlilik)
-- Dönüş: jsonb (explicit alan listesi — created_by gibi iç alanlar sızmaz),
-- havuz boşsa NULL → route Gemini fallback'e geçer.
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

-- ===================================
-- 5) RPC: report_question
-- ===================================
--
-- Kitle kaynaklı kalite kontrolün atomik çekirdeği:
--   1. Soru var mı? → yoksa QUESTION_NOT_FOUND
--   2. Bildirim insert (UNIQUE sayesinde aynı kullanıcı 2. kez → ALREADY_REPORTED)
--   3. DISTINCT bildirimci sayısı >= 2 → soru askıya alınır
--      (UPDATE ... AND status='active': yarışta çift-tetikleme zararsız)
--   4. Güncel soru durumu döner (UI bilgilendirme kullanır)
-- Çağrım: YALNIZCA service-role (app route'u; auth'suz RPC çağrısı kapalı).
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

-- ===================================
-- 6) FONKSİYON YETKİLERİ
-- ===================================
--
-- Her iki RPC de SECURITY DEFINER olduğundan yetki yükseltme vektörüdür:
-- yalnızca service_role çalıştırabilsin. ÜÇLÜ REVOKE zorunlu
-- (Supabase default-privileges tuzağı — dosya başındaki nota bak).
REVOKE EXECUTE ON FUNCTION get_next_pool_question(uuid, text, text, text, text, uuid[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_next_pool_question(uuid, text, text, text, text, uuid[])
  TO service_role;

REVOKE EXECUTE ON FUNCTION report_question(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION report_question(uuid, uuid, text)
  TO service_role;

-- ===================================
-- DOĞRULAMA (script çalışınca çıktıyı kontrol et)
-- ===================================

-- 1) 4 yeni kolon listelenmeli (hints, status, clone_of, intended_for)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'questions'
  AND column_name IN ('hints', 'status', 'clone_of', 'intended_for')
ORDER BY column_name;

-- 2) Havuz durum sayımı — mevcut tüm sorular 'active' görünmeli
SELECT status, count(*) FROM questions GROUP BY status;

-- 3) RPC yetkileri — anon=false, service_role=true OLMALI (4 kontrol)
SELECT
  has_function_privilege('anon', 'public.get_next_pool_question(uuid,text,text,text,text,uuid[])', 'EXECUTE') AS anon_next_pool,
  has_function_privilege('service_role', 'public.get_next_pool_question(uuid,text,text,text,text,uuid[])', 'EXECUTE') AS service_next_pool,
  has_function_privilege('anon', 'public.report_question(uuid,uuid,text)', 'EXECUTE') AS anon_report,
  has_function_privilege('service_role', 'public.report_question(uuid,uuid,text)', 'EXECUTE') AS service_report;

-- 4) RLS politikaları — 2 satır dönmeli (insert own / view own)
-- (kolon adı policyname — bitişik yazılır, policy_name DEĞİL)
SELECT policyname FROM pg_policies WHERE tablename = 'question_reports';

-- 5) İpucu envanteri — backfill işinin büyüklüğünü gösterir
SELECT
  count(*) FILTER (WHERE hints IS NULL)     AS ipucusuz_eski,
  count(*) FILTER (WHERE hints IS NOT NULL) AS ipuclu
FROM questions;
