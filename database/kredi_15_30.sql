-- ===================================
-- ALGORA — Ücretli Plan Kredileri 15/30 Pivotu (V2 fiyatlama matrisi)
-- ===================================
-- Karar (5 Ekim 2026): Pro 20 → 15/GÜN, Premium 50 → 30/GÜN (başlangıç değerleri).
-- free = 3/GÜN değişmedi. Kod tarafı lib/subscription-config.ts > PLAN_LIMITS
-- ile senkron; UI metinleri (PricingSection + PLANS) aynı commit'te.
--
-- Yapılanlar:
--   1) rollover_subscription fonksiyonu CASE'i pro 15 / premium 30 yapar
--      (CREATE OR REPLACE → mevcut GRANT/REVOKE korunur)
--   2) Mevcut pro/premium satırlarının limiti anında çekilir
--      (kalan kredi dokunulmaz — yarınki rollover 15/30 verir;
--       kalan > yeni limit olursa kullanıcı lehine, aynı gün kullanmaya devam eder)
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
  -- PLAN_LIMITS ile senkron: free 3 / pro 15 / premium 30
  v_limit := CASE v_row.plan
    WHEN 'pro' THEN 15
    WHEN 'premium' THEN 30
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

-- Mevcut ücretli satırları: limit anında yeni değere (kalan krediye dokunma)
UPDATE public.subscriptions
SET credits_limit = 15
WHERE plan = 'pro'
  AND credits_limit <> 15;

UPDATE public.subscriptions
SET credits_limit = 30
WHERE plan = 'premium'
  AND credits_limit <> 30;

-- ===================================
-- DOĞRULAMA (çıktıyı kontrol et)
-- ===================================

-- 1) Plan bazlı limitler — pro 15, premium 30 görmelisin
SELECT plan, count(*) AS kullanici, max(credits_limit) AS ust_limit
FROM subscriptions
GROUP BY plan;

-- 2) Fonksiyon gövdesinde yeni değerler var mı?
SELECT prosrc LIKE '%THEN 15%' AS pro_15_var,
       prosrc LIKE '%THEN 30%' AS premium_30_var,
       prosrc LIKE '%THEN 20%' AS eski_20_kaldi,
       prosrc LIKE '%THEN 50%' AS eski_50_kaldi
FROM pg_proc
WHERE proname = 'rollover_subscription';
