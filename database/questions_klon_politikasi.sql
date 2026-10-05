-- ===================================
-- ALGORA — Zaafiyet Onarımı B2 (5 Ekim 2026)
-- Kişisel klon ifşası kapatması
-- ===================================
--
-- BULGU (zaafiyet raporu Tur 1, H3/B2): questions SELECT politikası
-- USING(true) olduğundan BAŞKA kullanıcının kişisel klon satırı
-- (intended_for = onun UUID'si) herhangi bir girişli kullanıcıya
-- görünüyor: soru metni + intended_for UUID'si sızıyor.
--
-- ÇÖZÜM: yalnız GENEL havuz (intended_for NULL) + kullanıcının KENDİ
-- klonları görünür.
--
-- DOĞRULANAN ETKİSİZLİK (kod analizi, 5 Eki):
--   • /next, /solution, /report, gece vardiyası → service-role (RLS bypass)
--   • get_next_pool_question RPC → SECURITY DEFINER
--   • getPendingClones → .eq('intended_for', userId) (= auth.uid()) aynı satırlar
--   • getRecentAnswers embed → genel havuz NULL'la görünür, kendi klonu görünür
--   • subject_breakdown view (security_invoker) → yalnız kendi answers'ları join eder
--
-- Supabase SQL Editor'da ELLE çalıştırılır. İdpotanttır.
-- ===================================

-- Eski geniş politika (isim korunarak) kalkar
DROP POLICY IF EXISTS "Anyone can view questions" ON questions;

-- Yeni: genel havuz + kendi kişisel klonları
DROP POLICY IF EXISTS "Pool public, clones private" ON questions;
CREATE POLICY "Pool public, clones private"
  ON questions FOR SELECT
  USING (intended_for IS NULL OR intended_for = auth.uid());

-- ===================================
-- DOĞRULAMA (çalıştırınca çıktıyı kontrol et)
-- ===================================

-- 1) Tek politika, SELECT, yeni koşul:
--    qual sütununda "(intended_for IS NULL) OR (intended_for = auth.uid()::uuid)" olmalı
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'questions' AND cmd = 'SELECT';
