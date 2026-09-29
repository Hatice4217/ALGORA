-- ============================================================
-- LOGIN KİLİTLEMESİ (hesaba göre) — 3 yanlış deneme → 1 saat kilit
-- ============================================================
-- Akış:
--   Yanlış şifre  → /api/auth/login record_failed_login çağırır
--                   (dönen json: failed_count, attempts_left, locked, locked_until)
--   3. yanlış     → locked_until = now() + 1 saat; route 429 + Retry-After döner
--   Başarılı giriş → reset_failed_login ile sayaç tamamen silinir
--   Kilit süresi dolunca → yeni ilk yanlış, sayacı 1'den yeniden başlatır
--
-- Notlar:
--  • OLmayan e-postalar da aynı şekilde kaydedilir — böylece "kalanHak"
--    alanı var/yok hesap arasında FARK ETMEZ (enumerasyon sızıntısı olmaz)
--  • Kilit süresi DOLMUŞ hesapta yeni yanlış, sayacı 1'den başlatır
--  • Kilitliyken gelen ek yanlışlar kilidi UZATMAZ (sabit 1 saat)
--  • IP bazlı katman ayrıdır (route'taki in-memory 15/5dk) — okul NAT'ını
--    kilitlememek için agresif sayım bilerek HESAP bazlıdır
--
-- İdempotent: CREATE IF NOT EXISTS + DO-blok isimden-bağımsız fonksiyon
-- yenileme. Tekrar çalıştırmak güvenlidir.
-- ============================================================

-- 1) Tablo ---------------------------------------------------
CREATE TABLE IF NOT EXISTS login_lockouts (
  email        text PRIMARY KEY,
  failed_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Yalnızca service-role erişir (RLS açık, politika YOK → anon/authenticated
-- satırları göremez; service_role RLS'i bypass eder)
ALTER TABLE login_lockouts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON login_lockouts FROM PUBLIC, anon, authenticated;
GRANT ALL ON login_lockouts TO service_role;

-- 2) RPC: başarısız denemeyi kaydet --------------------------
-- Dönüş: { failed_count, attempts_left, locked, locked_until }
CREATE OR REPLACE FUNCTION record_failed_login(
  p_email        text,
  p_max_attempts integer DEFAULT 3,
  p_lock         interval DEFAULT interval '1 hour'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email       text := lower(trim(p_email));
  v_count       int;
  v_locked_until timestamptz;
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'email gerekli';
  END IF;

  SELECT failed_count, locked_until
    INTO v_count, v_locked_until
    FROM login_lockouts
    WHERE email = v_email
    FOR UPDATE;

  IF NOT FOUND THEN
    v_count := 1;
    v_locked_until := NULL;
  ELSIF v_locked_until IS NOT NULL AND v_locked_until <= now() THEN
    -- Önceki kilit süresi dolmuş → sayacı tazele
    v_count := 1;
    v_locked_until := NULL;
  ELSE
    v_count := v_count + 1;
  END IF;

  -- Eşiği ilk kez geçiyorsa kilitle; mevcut kilitliyken UZATMA
  IF v_count >= p_max_attempts AND v_locked_until IS NULL THEN
    v_locked_until := now() + p_lock;
  END IF;

  INSERT INTO login_lockouts (email, failed_count, locked_until, updated_at)
  VALUES (v_email, v_count, v_locked_until, now())
  ON CONFLICT (email) DO UPDATE
    SET failed_count = EXCLUDED.failed_count,
        locked_until = EXCLUDED.locked_until,
        updated_at   = now();

  RETURN json_build_object(
    'failed_count',  v_count,
    'attempts_left', GREATEST(p_max_attempts - v_count, 0),
    'locked',        v_locked_until IS NOT NULL AND v_locked_until > now(),
    'locked_until',  v_locked_until
  );
END;
$$;

-- 3) RPC: kilit sorgusu --------------------------------------
-- Kilitliyse locked_until döner, değilse NULL
CREATE OR REPLACE FUNCTION check_login_lock(p_email text)
RETURNS timestamptz
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT CASE WHEN locked_until > now() THEN locked_until END
    FROM login_lockouts
    WHERE email = lower(trim(p_email));
$$;

-- 4) RPC: başarılı girişte temizle ---------------------------
CREATE OR REPLACE FUNCTION reset_failed_login(p_email text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM login_lockouts WHERE email = lower(trim(p_email));
$$;

-- 5) Fonksiyon yetkileri (Supabase default-privileges tuzağı:
--    REVOKE FROM PUBLIC YETMEZ — anon/authenticated'a doğrudan
--    verilen EXECUTE'i de geri almak zorunlu) -----------------
DO $$
DECLARE
  fn record;
  fn_names text[] := ARRAY['record_failed_login', 'check_login_lock', 'reset_failed_login'];
  n text;
BEGIN
  FOREACH n IN ARRAY fn_names LOOP
    FOR fn IN
      SELECT p.oid, p.proname
      FROM pg_proc p
      JOIN pg_namespace ns ON ns.oid = p.pronamespace
      WHERE ns.nspname = 'public' AND p.proname = n
    LOOP
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I FROM PUBLIC, anon, authenticated', fn.proname);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I TO service_role', fn.proname);
    END LOOP;
  END LOOP;
END;
$$;

-- ============================================================
-- DOĞRULAMA (opsiyonel — çalıştırınca şunu görmelisiniz):
--   SELECT has_function_privilege('anon', 'record_failed_login(text,integer,interval)', 'EXECUTE');  → false
--   SELECT has_function_privilege('service_role', 'record_failed_login(text,integer,interval)', 'EXECUTE');  → true
--   SELECT count(*) FROM login_lockouts;  → hata vermez (RLS'ye rağmen SQL Editor service-role bağlanır)
-- ============================================================
