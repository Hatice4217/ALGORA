-- ===================================
-- ALGORA — Premium Günlük Kredi 20 → 50 (premium değer farkı)
-- ===================================
-- Karar (1 Ekim 2026): pro = 20/GÜN, premium = 50/GÜN (2,5 kat fark).
-- free = 3/GÜN değişmedi. Kod tarafı lib/subscription-config.ts > PLAN_LIMITS
-- ile senkron; UI metinleri (PricingSection + PLANS) aynı commit'te.
--
-- Yapılanlar:
--   1) rollover_subscription v2 fonksiyonu premium CASE'i 50 yapar
--      (CREATE OR REPLACE → mevcut GRANT/REVOKE korunur)
--   2) Mevcut premium satırlarının limiti anında 50'ye çekilir
--      (kalan kredi dokunulmaz — yarınki rollover 50 verir)
--
-- İdempotent: tekrar çalıştırmak güvenli.
-- ===================================

CREATE OR REPLACE FUNCTION rollover_subscription(p_user_id uuid)
RETURNS subscriptions AS $$
DECLARE
  v_row subscriptions;
  v_limit integer;
BEGIN
  SELECT * INTO v_row FROM subscriptions WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_row.period_end >= NOW() THEN
    RETURN v_row; -- dönem geçerli, dokunma
  END IF;

  -- (a) Ücretli planın SATIN ALMA süresi dolmuş → free'e düşür
  IF v_row.plan <> 'free' AND (v_row.paid_until IS NULL OR v_row.paid_until < NOW()) THEN
    UPDATE subscriptions
    SET plan = 'free',
        status = 'active',
        paid_until = NULL,
        credits_remaining = 3,          -- PLAN_LIMITS.free (lib/subscription-config.ts)
        credits_limit = 3,
        period_start = NOW(),
        period_end = NOW() + INTERVAL '1 day'
    WHERE user_id = p_user_id
      AND period_end < NOW()
    RETURNING * INTO v_row;

    IF v_row IS NULL THEN
      -- Paralel istek az önce güncelledi; taze satırı dön
      SELECT * INTO v_row FROM subscriptions WHERE user_id = p_user_id;
      RETURN v_row;
    END IF;

    INSERT INTO credit_transactions (user_id, amount, reason)
    VALUES (p_user_id, 3, 'monthly_reset');

    RETURN v_row;
  END IF;

  -- (b) Normal GÜNLÜK reset — tüm planlar
  -- PLAN_LIMITS ile senkron: free 3 / pro 20 / premium 50
  v_limit := CASE v_row.plan
    WHEN 'pro' THEN 20
    WHEN 'premium' THEN 50
    ELSE 3
  END;

  UPDATE subscriptions
  SET credits_remaining = v_limit,
      credits_limit = v_limit,
      period_start = NOW(),
      period_end = NOW() + INTERVAL '1 day'
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

-- Yetkiler değişmez (CREATE OR REPLACE ACL'yi korur):
-- REVOKE EXECUTE ON FUNCTION rollover_subscription(uuid) FROM PUBLIC, anon, authenticated;
-- GRANT EXECUTE ON FUNCTION rollover_subscription(uuid) TO service_role;

-- Mevcut premium satırları: limit anında 50 (kalan krediye dokunma)
UPDATE public.subscriptions
SET credits_limit = 50
WHERE plan = 'premium'
  AND credits_limit <> 50;

-- ===================================
-- DOĞRULAMA (çıktıyı kontrol et)
-- ===================================

-- 1) Plan bazlı limitler — premium satırında 50 görmeli
SELECT plan, count(*) AS kullanici, max(credits_limit) AS ust_limit
FROM subscriptions
GROUP BY plan;

-- 2) Fonksiyon gövdesinde 50 var mı?
SELECT prosrc LIKE '%THEN 50%' AS premium_50_var
FROM pg_proc
WHERE proname = 'rollover_subscription';
