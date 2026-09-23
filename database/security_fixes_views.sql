-- ===================================
-- ALGORA - GÜVENLİK DÜZELTMESİ: View RLS Bypass (KRİTİK-3)
-- Canlı DB'de Supabase SQL Editor'de ELLE çalıştırılır. Idempotent'tir.
-- ===================================

-- SORUN:
-- user_stats ve subject_breakdown view'ları security_invoker seçeneği olmadan
-- oluşturulmuştu. View'lar sahiplerinin (postgres) yetkileriyle çalıştığı için
-- alttaki tabloların (user_profiles, answers) RLS politikalarını BYPASS ediyorlar.
-- Sonuç: anon key ile TÜM kullanıcıların istatistikleri okunabiliyordu (veri sızıntısı).

-- ÇÖZÜM:
-- security_invoker = true → view, çağıran kullanıcının yetkileriyle çalışır;
-- auth.uid() tabanlı RLS politikaları (kendi profili/kendi cevapları) geçerli olur.

-- NOT 1: CREATE OR REPLACE VIEW, view seçeneklerini (reloptions) DEĞİŞTİREMEZ;
-- bu yüzden DROP + CREATE gereklidir. View'lar düz projeksiyonlardır,
-- bağımlı nesne yoktur (CASCADE gerekmez).
-- NOT 2: security_invoker PostgreSQL 15+ gerektirir (Supabase projeleri PG15+).
-- NOT 3: İstatistik kodu bu değişiklikten etkilenmez — lib/supabase.ts içindeki
-- getUserStats/getSubjectBreakdown zaten .eq('user_id', userId) filtresiyle sorguluyor;
-- artık bu filtre ek olarak RLS ile de zorlanır (savunma derinliği).

-- ===================================
-- 1) Eski view'ları kaldır
-- ===================================

DROP VIEW IF EXISTS user_stats;
DROP VIEW IF EXISTS subject_breakdown;

-- ===================================
-- 2) security_invoker = true ile yeniden oluştur
--    (tanımlar database/schema.sql ile birebir aynıdır)
-- ===================================

CREATE VIEW user_stats WITH (security_invoker = true) AS
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

CREATE VIEW subject_breakdown WITH (security_invoker = true) AS
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
-- 3) Yetkiler (açıkça — default privilege'lara güvenmeden)
-- ===================================

GRANT SELECT ON user_stats TO anon, authenticated, service_role;
GRANT SELECT ON subject_breakdown TO anon, authenticated, service_role;

-- ===================================
-- DOĞRULAMA (çalıştırdıktan sonra beklenen: reloptions = {security_invoker=true})
-- ===================================

SELECT c.relname AS view_name, c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('user_stats', 'subject_breakdown');
