-- ===================================
-- ALGORA — ARAŞTIRMA MODU (BAP Deney Altyapısı)
-- ===================================
-- Yol Haritası madde 4. BAP deneyinde (80-100 öğrenci, deney/kontrol) ayrım
-- ÖDEME DURUMUNDAN bağımsız olmalı: yoksa "pedagojik etki" ile "parası olan
-- daha fazla özellik gördü" karışır, deney geçersizleşir.
--
--   research_group = NULL      → katılımcı değil (varsayılan; tüm kullanıcılar)
--   research_group = 'deney'   → deney grubu: tüm özellikler AÇIK (kredi baypası)
--   research_group = 'kontrol' → kontrol grubu: standart deneyim (planı neyse o)
--
-- Kredi baypası UYGULAMA tarafındadır (app/api/questions/solution — deduct
-- çağrılmadan önce if bloğu); bu migration yalnızca veri modelini kurar.
-- Atama: POST /api/subscription/admin/research (x-admin-key, 404 maskesi) —
-- elle DB dokunuşu yok.
--
-- İDEMPOTENTTİR: tekrar çalıştırmak güvenli ("Success. No rows returned" normaldir).
-- ===================================

-- 1) Kolon + kapalı-küme CHECK (varsa atlanır)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS research_group text
  CONSTRAINT user_profiles_research_group_check
  CHECK (research_group IS NULL OR research_group IN ('deney', 'kontrol'));

-- 2) E-posta → UUID çözümleme (admin atama route'u için).
-- supabase-js'in bu sürümünde getUserByEmail YOK; listUsers ise güvenilmez
-- (sayfalama + filtre sessiz boş dönebilir). Tek satırlık SECURITY DEFINER
-- RPC — auth.users yalnız sahibi (service_role) okur.
CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;

-- ⚠️ Üçlü REVOKE (default-privileges tuzağı): PUBLIC'e REVOKE yetmez
REVOKE EXECUTE ON FUNCTION get_user_id_by_email(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_id_by_email(text)
  TO service_role;

-- ===================================
-- DOĞRULAMA (çıktıyı kontrol et)
-- ===================================

-- a) Kolon var mı + tipi doğru mu? → column_name satırı dönmeli
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
  AND column_name = 'research_group';

-- a2) RPC yetki matrisi → HER İKİ de false olmalı
SELECT
  has_function_privilege('anon', 'get_user_id_by_email(text)', 'EXECUTE') AS anon_calistirabilir,
  has_function_privilege('authenticated', 'get_user_id_by_email(text)', 'EXECUTE') AS authenticated_calistirabilir;

-- b) Geçersiz değer reddedilmeli (hata almak NORMAL ve istenendir):
--    UPDATE user_profiles SET research_group = 'deneme' WHERE false;
--    → "new row ... violates check constraint user_profiles_research_group_check"

-- c) Atama API'si: admin key ile (URL canlı):
--    POST /api/subscription/admin/research  { "email": "...", "group": "deney" }
