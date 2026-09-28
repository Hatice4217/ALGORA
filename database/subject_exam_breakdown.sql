-- ===================================
-- ALGORA - Ders kırılımına sınav türü (exam_type) ekleme
-- Canlı DB'de Supabase SQL Editor'de ELLE çalıştırılır. Idempotent'tir.
-- ===================================

-- AMAÇ:
-- Analizler sekmesinde aynı ders farklı sınav türleri için ayrı satır görünsün:
-- "Coğrafya (TYT)" ve "Coğrafya (AYT)" ayrı performans kartları.
-- View artık (user_id, subject, exam_type) üçlüsüne göre gruplanır.

-- NOT 1: CREATE OR REPLACE VIEW sütun adı/tipini DEĞİŞTİREMEZ; bu yüzden
-- DROP + CREATE gereklidir. View düz projeksiyondur, bağımlı nesne yoktur.
-- NOT 2: security_invoker = true KORUNUR (RLS bypass düzeltmesinin geri
-- dönmemesi için — bkz. security_fixes_views.sql).
-- NOT 3: Veri taşıma yok — view answers+questions'tan yeniden hesaplar;
-- eski cevaplar anında doğru tür kırılımıyla görünür.

-- ===================================
-- 1) Eski view'ı kaldır
-- ===================================

DROP VIEW IF EXISTS subject_breakdown;

-- ===================================
-- 2) exam_type kırılımlı yeniden oluştur
--    (tanım database/schema.sql ile birebir aynıdır)
-- ===================================

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
GROUP BY a.user_id, q.subject, q.exam_type;

-- ===================================
-- 3) Yetkiler (açıkça — default privilege'lara güvenmeden)
-- ===================================

GRANT SELECT ON subject_breakdown TO anon, authenticated, service_role;

-- ===================================
-- DOĞRULAMA
-- 1) Beklenen: reloptions = {security_invoker=true}
-- 2) Beklenen: aynı ders farklı exam_type değerleriyle ayrı satırlar
-- ===================================

SELECT c.relname AS view_name, c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'subject_breakdown';

SELECT subject, exam_type, total_questions, correct_answers, accuracy_rate
FROM subject_breakdown
ORDER BY subject, exam_type
LIMIT 20;
