-- ===================================
-- ALGORA — Güvenlik Onarımı Paketi (9 Ekim 2026)
-- Tarama raporu: docs/SECURITY_PENTEST_RAPORU_2026-10-09.md
-- Supabase SQL Editor'da ELLE çalıştırılır. Tamamı idempotanttır.
-- ===================================

-- ------------------------------------------------------------
-- O1 + D5: questions SELECT/UPDATE politikaları
--
-- BULGU (O1, canlıda kanıtlı): anon key ile PostgREST'ten
--   GET /rest/v1/questions?select=correct_answer,explanation,hints
--   200 + DOLU dönüyordu — giriş adımı bypass, Sokratik ipucu mantığı
--   deliniyordu; suspended satırlar dahil sızıyordu.
-- ÇÖZÜM: SELECT yalnız girişli kullanıcıya + genel havuzda yalnız
--   status='active'; kendi klonları status'suz görünür (telafi akışı
--   korunur). Uygulama istemcisi her zaman oturumlu; /next zaten auth
--   şart → ürün akışı bozulmaz.
--
-- BULGU (D5): UPDATE politikasında WITH CHECK yoktu — satır sahibi
--   intended_for/status gibi alanları serbest değiştirebilirdi.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Pool public, clones private" ON questions;
CREATE POLICY "Pool public, clones private"
  ON questions FOR SELECT
  TO authenticated
  USING (
    (intended_for IS NULL AND status = 'active')
    OR intended_for = auth.uid()
  );

DROP POLICY IF EXISTS "Question creators can update own questions" ON questions;
CREATE POLICY "Question creators can update own questions"
  ON questions FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- ------------------------------------------------------------
-- O3: research_group kolonu kullanıcı tarafından değiştirilemesin
--
-- BULGU: user_profiles UPDATE politikası kolon-bazlı değildi → kullanıcı
--   ham PostgREST PATCH ile kendini research_group='deney' yapabiliyordu
--   (BAP deney kontaminasyonu + Üst Beyin kredi baypası).
-- ÇÖZÜM: kolon-ayrıcalığı — authenticated/anon'un bu kolonda UPDATE/INSERT
--   izni kaldırılır. Kolonu HİÇ yazmayan istekler etkilenmez (SettingsPanel
--   güvenle çalışır); admin atama route'u service-role ile yazmaya devam
--   eder (service-role tüm ayrıcalıklara sahiptir).
-- ------------------------------------------------------------
REVOKE UPDATE (research_group), INSERT (research_group)
  ON TABLE user_profiles FROM authenticated, anon;

-- ------------------------------------------------------------
-- O4: havuz RPC üçlü REVOKE tazesi
--
-- BULGU: havuz_rpc_kaynak_rozeti.sql CREATE OR REPLACE yapıp REVOKE
--   içermiyordu — canlıda ACL korundu, ama fonksiyon drop edilip
--   yeniden oluşturulursa SECURITY DEFINER RPC anon/auth'a açık kalırdı.
-- ÇÖZÜM: ACL'i burada yeniden sabitle (idempotent).
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION get_next_pool_question(uuid, text, text, text, text, uuid[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_next_pool_question(uuid, text, text, text, text, uuid[])
  TO service_role;

-- ===================================
-- DOĞRULAMA (çalıştırınca çıktıyı kontrol et)
-- ===================================

-- 1) questions SELECT politikası: roles={authenticated}, qual'da
--    status='active' koşulu ve intended_for = auth.uid() olmalı
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'questions' AND cmd = 'SELECT';

-- 2) questions UPDATE politikası: with_check dolu olmalı
SELECT policyname, with_check
FROM pg_policies
WHERE tablename = 'questions' AND cmd = 'UPDATE';

-- 3) research_group kolon izni: ikisi de false beklenir
SELECT
  has_column_privilege('authenticated', 'user_profiles', 'research_group', 'UPDATE') AS auth_update,
  has_column_privilege('anon', 'user_profiles', 'research_group', 'UPDATE') AS anon_update;

-- 4) Havuz RPC'si: ikisi de false beklenir
SELECT
  has_function_privilege('anon', 'get_next_pool_question(uuid, text, text, text, text, uuid[])', 'EXECUTE') AS anon_exec,
  has_function_privilege('authenticated', 'get_next_pool_question(uuid, text, text, text, text, uuid[])', 'EXECUTE') AS auth_exec;
