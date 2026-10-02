-- ===================================
-- ALGORA V2 — Faz 1b: Gece Vardiyası Kilit Tablosu + Claim/Release RPC
-- Supabase SQL Editor'de ELLE çalıştırılır. Idempotent'tir
-- (tekrar çalıştırma güvenli).
-- ===================================
--
-- AMAÇ: gece vardiyası cron'u (ipucu backfill + klon üretimi) çakışan
-- run'ları önler. PostgREST pool'unda advisory lock güvenilmez olduğundan
-- SATIR-TABANLI kilit kullanılır: tek satır (id=1), atomik claim RPC.
--
-- Kilit kuralları:
--   • claim_night_shift(runner): satır boşsa veya locked_at 10 dakikadan
--     eskiyse (Vercel kill'e karşı self-heal — çürük kilit çöp tutmaz)
--     kilit alınır, FOUND döner; aksi halde false (başka run işbaşında).
--   • release_night_shift(runner): yalnızca kendi kilitlerini bırakır
--     (finally bloğunda çağrılır; başkasının kilidini düşüremez).
--
-- Güvenlik: RLS açık + FORCE, hiçbir politika YOK → anon/authenticated
-- tabloyu göremez; yalnızca service_role (BYPASSRLS) erişir.
-- RPC'ler SECURITY DEFINER'dır → üçlü REVOKE zorunlu (Supabase
-- default-privileges tuzağı: yeni fonksiyona anon/authenticated otomatik
-- EXECUTE verilir).
-- ===================================

-- 1) Kilit tablosu — her zaman TEK satır (id=1)
CREATE TABLE IF NOT EXISTS night_shift_lock (
  id INT PRIMARY KEY CHECK (id = 1),
  locked_at TIMESTAMP WITH TIME ZONE,
  locked_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Satır tohumu (idempotent — satır varsa dokunulmaz)
INSERT INTO night_shift_lock (id, locked_at, locked_by)
VALUES (1, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE night_shift_lock ENABLE ROW LEVEL SECURITY;
ALTER TABLE night_shift_lock FORCE ROW LEVEL SECURITY;
-- Bilinçli olarak HİÇ politika yok: anon/authenticated satırı göremez.

-- 2) Atomik kilit claim — UPDATE ... WHERE tek cümlede (yarış-güvenli)
CREATE OR REPLACE FUNCTION claim_night_shift(p_runner uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE night_shift_lock
  SET locked_at = NOW(),
      locked_by = p_runner,
      updated_at = NOW()
  WHERE id = 1
    AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '10 minutes');
  RETURN FOUND;
END;
$$;

-- 3) Kilit bırakma — yalnızca KENDİ kilidi (locked_by = p_runner)
CREATE OR REPLACE FUNCTION release_night_shift(p_runner uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE night_shift_lock
  SET locked_at = NULL,
      locked_by = NULL,
      updated_at = NOW()
  WHERE id = 1
    AND locked_by = p_runner;
END;
$$;

-- 4) RPC yetkileri — yalnızca service_role (üçlü REVOKE şart)
REVOKE EXECUTE ON FUNCTION claim_night_shift(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_night_shift(uuid)
  TO service_role;

REVOKE EXECUTE ON FUNCTION release_night_shift(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION release_night_shift(uuid)
  TO service_role;

-- ===================================
-- DOĞRULAMA (script çalışınca çıktıyı kontrol et)
-- ===================================

-- 1) Kilit tablosu — 1 satır, locked_at/locked_by NULL dönmeli
SELECT * FROM night_shift_lock;

-- 2) RLS durumu — rowsecurity=true, forcerowsecurity=true OLMALI
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname = 'night_shift_lock';

-- 3) Politika — 0 satır dönmeli (politika yok)
SELECT policyname FROM pg_policies WHERE tablename = 'night_shift_lock';

-- 4) RPC yetkileri — anon=false, service_role=true OLMALI (4 kontrol)
SELECT
  has_function_privilege('anon', 'public.claim_night_shift(uuid)', 'EXECUTE') AS anon_claim,
  has_function_privilege('service_role', 'public.claim_night_shift(uuid)', 'EXECUTE') AS service_claim,
  has_function_privilege('anon', 'public.release_night_shift(uuid)', 'EXECUTE') AS anon_release,
  has_function_privilege('service_role', 'public.release_night_shift(uuid)', 'EXECUTE') AS service_release;
