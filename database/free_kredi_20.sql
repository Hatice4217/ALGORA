-- ============================================================================
-- FREE KREDİ 10 → 20 — CANLI DB MIGRATION
-- Supabase SQL Editor'de çalıştırılacak.
-- ============================================================================
-- Bağlam:
--   • Free plan günlük kotası 10 → 20'ye çıkarılıyor (kullanıcı kararı, 27 Eylül).
--   • lib/subscription-config.ts > PLAN_LIMITS.free = 20 ile senkron.
-- Kapsam:
--   1) rollover_subscription → CASE ELSE 20 (free reset limiti)
--   2) handle_new_user_subscription → yeni kullanıcı seed 20/20
--   3) subscriptions kolon DEFAULT'leri 20
--   4) Mevcut free satırlarına TEK SEFERLİK tamamlama: kalan kredi 20'ye çekilir,
--      artış miktarı credit_transactions'e 'admin_adjust' olarak yazılır.
--   5) REVOKE/GRANT blokları (CREATE OR REPLACE sonrası Supabase default-privilege
--      tuzağına karşı ZORUNLU — anon/authenticated'a EXECUTE sızabilir).
-- İdempotent: tekrar çalıştırma güvenli (top-up yalnızca credits_limit < 20 satırlara
-- dokunur; ikinci çalıştırmada 0 satır eşleşir).
-- ============================================================================

-- 1) rollover_subscription — free reset limiti 20
CREATE OR REPLACE FUNCTION rollover_subscription(p_user_id uuid)
RETURNS subscriptions AS $$
DECLARE
  v_row subscriptions;
  v_limit integer;
  v_period interval;
BEGIN
  SELECT * INTO v_row FROM subscriptions WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_row.period_end >= NOW() THEN
    RETURN v_row; -- dönem geçerli, dokunma
  END IF;

  -- PLAN_LIMITS ile senkron: free 20 / pro 1000 / premium 5000
  v_limit := CASE v_row.plan
    WHEN 'pro' THEN 1000
    WHEN 'premium' THEN 5000
    ELSE 20
  END;

  -- Dönem uzunluğu: free günlük, ücretli paketler aylık (ödeme dönemiyle uyumlu)
  v_period := CASE v_row.plan
    WHEN 'pro' THEN INTERVAL '1 month'
    WHEN 'premium' THEN INTERVAL '1 month'
    ELSE INTERVAL '1 day'
  END;

  UPDATE subscriptions
  SET credits_remaining = v_limit,
      credits_limit = v_limit,
      period_start = NOW(),
      period_end = NOW() + v_period
  WHERE user_id = p_user_id
    AND period_end < NOW()
  RETURNING * INTO v_row;

  IF v_row IS NULL THEN
    -- Paralel istek az önce güncelledi; taze satırı dön
    SELECT * INTO v_row FROM subscriptions WHERE user_id = p_user_id;
    RETURN v_row;
  END IF;

  INSERT INTO credit_transactions (user_id, amount, reason)
  VALUES (p_user_id, v_limit, 'monthly_reset');

  RETURN v_row;
END;
$$ LANGUAGE plpgsql;

-- 2) handle_new_user_subscription — yeni kullanıcı seed 20/20
CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan, status, credits_remaining, credits_limit, period_start, period_end)
  VALUES (
    NEW.id,
    'free',
    'active',
    20,                              -- PLAN_LIMITS.free (lib/subscription-config.ts ile senkron)
    20,                              -- PLAN_LIMITS.free
    NOW(),
    NOW() + INTERVAL '1 day'         -- free dönemi GÜNLÜK (günlük 20 soru)
  )
  ON CONFLICT (user_id) DO NOTHING;  -- idempotent
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3) Kolon DEFAULT'leri 20 (explicit değer içermeyen gelecek INSERT'ler için hijyen)
ALTER TABLE subscriptions ALTER COLUMN credits_remaining SET DEFAULT 20;
ALTER TABLE subscriptions ALTER COLUMN credits_limit SET DEFAULT 20;

-- 4) Mevcut free satırları: kalan kredi 20'ye tamamlanır + denetim izi
--    (yalnızca plan='free' VE credits_limit<20 — eski limitli satırlar;
--     pro/premium satırlarına dokunulmaz)
DO $$
DECLARE
  r RECORD;
  v_amount integer;
  v_touched integer := 0;
BEGIN
  FOR r IN
    SELECT user_id, credits_remaining
    FROM subscriptions
    WHERE plan = 'free' AND credits_limit < 20
    FOR UPDATE
  LOOP
    v_amount := 20 - r.credits_remaining; -- free satırlarda remaining <= 10 → amount > 0 garantili
    UPDATE subscriptions
    SET credits_remaining = 20,
        credits_limit = 20
    WHERE user_id = r.user_id;

    INSERT INTO credit_transactions (user_id, amount, reason)
    VALUES (r.user_id, v_amount, 'admin_adjust');

    v_touched := v_touched + 1;
  END LOOP;
  RAISE NOTICE 'free_kredi_20: % satır 20''ye tamamlandı', v_touched;
END $$;

-- 5) Fonksiyon izinleri — CREATE OR REPLACE sonrası ZORUNLU
--    (Supabase default-privileges tuzağı: fonksiyon oluşturulduğu anda
--     anon/authenticated'a EXECUTE verilir; üçünden de alınmalı)
REVOKE EXECUTE ON FUNCTION rollover_subscription(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rollover_subscription(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION handle_new_user_subscription() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user_subscription() TO supabase_auth_admin;

-- ============================================================================
-- DOĞRULAMA (beklenen: her satırda 20)
-- SELECT plan, credits_remaining, credits_limit
-- FROM subscriptions ORDER BY created_at DESC LIMIT 10;
--
-- İzin denetimi (beklenen: hepsi f):
-- SELECT has_function_privilege('anon', 'rollover_subscription(uuid)', 'EXECUTE') AS anon_rollover,
--        has_function_privilege('anon', 'handle_new_user_subscription()', 'EXECUTE') AS anon_trigger;
-- ============================================================================
