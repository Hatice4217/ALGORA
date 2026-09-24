-- ===================================
-- ALGORA — Free paketi GÜNLÜK kotaya geçiş migrasyonu
-- ===================================
-- Ne zaman: 24 Eylül 2026
-- Ne yapar:
--   1) rollover_subscription → free için yeni dönem 1 GÜN olur (pro/premium 1 ay)
--   2) handle_new_user_subscription → yeni kullanıcılar 1 günlük dönemle seed edilir
--   3) Mevcut free kullanıcılar anında günlük dönemle + taze 10 krediye taşınır
-- Nasıl: Supabase SQL Editor'de TE SEFER çalıştır. Idempotenttir (tekrarı zararsız).
-- NOT: CREATE OR REPLACE ACL'leri korur; yine de REVOKE/GRANT bloğu güvenlik için
--      tekrar çalıştırılıyor (Supabase default-privileges tuzağına karşı).
-- ===================================

-- 1) Lazy rollover — free günlük dönem
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

  -- PLAN_LIMITS ile senkron: free 10 / pro 1000 / premium 5000
  v_limit := CASE v_row.plan
    WHEN 'pro' THEN 1000
    WHEN 'premium' THEN 5000
    ELSE 10
  END;

  -- Dönem uzunluğu: free günlük, ücretli paketler aylık
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
    SELECT * INTO v_row FROM subscriptions WHERE user_id = p_user_id;
    RETURN v_row;
  END IF;

  INSERT INTO credit_transactions (user_id, amount, reason)
  VALUES (p_user_id, v_limit, 'monthly_reset');

  RETURN v_row;
END;
$$ LANGUAGE plpgsql;

-- 2) Yeni kullanıcı seed'i — 1 günlük dönem
CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan, status, credits_remaining, credits_limit, period_start, period_end)
  VALUES (
    NEW.id,
    'free',
    'active',
    10,
    10,
    NOW(),
    NOW() + INTERVAL '1 day'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3) Fonksiyon izinleri (default-privileges tuzağına karşı teyit)
REVOKE EXECUTE ON FUNCTION rollover_subscription(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rollover_subscription(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION handle_new_user_subscription() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user_subscription() TO supabase_auth_admin;

-- 4) Mevcut free kullanıcıları günlük döneme taşı + taze 10 kredi ver
--    (aylık dönemin dolmasını bekleme; kota bitmiş kullanıcılar anında kurtulur)
UPDATE subscriptions
SET credits_remaining = 10,
    credits_limit = 10,
    period_start = NOW(),
    period_end = NOW() + INTERVAL '1 day'
WHERE plan = 'free';

-- Denetim izi: migrasyon yenilemesini kaydet
INSERT INTO credit_transactions (user_id, amount, reason)
SELECT user_id, 10, 'monthly_reset'
FROM subscriptions
WHERE plan = 'free';

-- 5) Doğrulama
SELECT
  plan,
  COUNT(*) AS kullanci,
  MIN(period_end) AS en_yakin_yenilenme,
  MAX(period_end) AS en_gec_yenilenme
FROM subscriptions
GROUP BY plan;
