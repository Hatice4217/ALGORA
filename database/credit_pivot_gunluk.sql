-- ===================================
-- ALGORA V2 — Kredi Ekonomisi Pivotu (AI Özel Hoca / Üst Beyin)
-- Supabase SQL Editor'de ELLE çalıştırılır. Idempotent'tir.
-- ===================================
--
-- ⚠️ DEPLOY SIRASI KRİTİK: Bu migration YALNIZCA yeni UI (havuz-ilk akış)
-- deploy edilirken/sonrasında çalıştırılmalıdır. Eski UI soru başına Gemini
-- çağırıp kredi düşer; bu migration canlıya alınırsa free kullanıcılar
-- yeni kotayla (3/gün) günde yalnızca 3 soru üretir → UX çöker.
-- KURAL: yeni UI deploy + bu SQL AYNI adımda.
--
-- Kararlar (30 Eylül 2026, BAP danışman toplantısı):
--   • Havuzdan soru çekmek/çözmek SINIRSIZ ve ÜCRETSİZ (free dahil) —
--     kredi bu akışta hiç düşmez.
--   • Kredi artık "AI Özel Hoca (Üst Beyin)" kredisidir: derin çözüm/anlatım.
--     free = 3/GÜN, pro = 20/GÜN, premium = 50/GÜN (1 Eki 2026 güncellemesi).
--   • TÜM planlarda dönem 1 GÜN (gece yarısı yenileme — lazy rollover).
--   • Ücretli planın SATIN ALMA süresi artık period_end'ten BAĞIMSIZDIR:
--     paid_until kolonu onay + 1 ayı tutar; her günlük kota resetinde plan
--     korunur, paid_until geçince otomatik free'e düşürülür.
--
-- Eski davranış farkı: ücretli planda period_end ARTIK plan bitişi DEĞİL,
-- günlük kota dönemidir. Plan bitişi = paid_until.
-- ===================================

-- ===================================
-- 1) paid_until KOLONU
-- ===================================
-- NULL = free plan (bitiş yok). Approve route'u onayda +1 ay yazar.
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS paid_until timestamptz;

-- ===================================
-- 2) MEVCUT ÜCRETLİ ABONELERİN GEÇİŞİ (backfill + anlık günlük kotaya geçiş)
-- ===================================
-- paid_until = eski period_end (satın alma süreleri KORUNUR);
-- kotalar hemen yeni günlük limite çekilir (pro 20 / premium 50), dönem yarın yenilenir.
-- Idempotent: paid_until dolu satırlara dokunmaz.
-- Not: period_end'i geçmiş ücretli abonelerde paid_until geçmiş kalır →
-- ilk rollover'da otomatik free'e düşer (doğru davranış).
UPDATE public.subscriptions
SET paid_until = period_end,
    credits_remaining = CASE plan WHEN 'premium' THEN 50 ELSE 20 END,
    credits_limit = CASE plan WHEN 'premium' THEN 50 ELSE 20 END,
    period_start = NOW(),
    period_end = NOW() + INTERVAL '1 day'
WHERE plan IN ('pro', 'premium')
  AND paid_until IS NULL;

-- ===================================
-- 3) rollover_subscription v2 (GÜNLÜK dönem + otomatik downgrade)
-- ===================================
-- Akış (dönem bitmişse):
--   a) Ücretli plan ve paid_until geçmiş/NULL → free'e düşür (3 kredi, 1 gün)
--   b) Değilse günlük reset: kredi = plan limiti (free 3 / pro 20 / premium 50)
-- Yarış koruması aynen korunur: UPDATE ... WHERE period_end < NOW() —
-- paralel isteklerde yalnızca biri resetler (canlıda 10/10 paralel testle kanıtlandı).
-- 'monthly_reset' reason değeri tarihsel uyumluluk için KORUNDU (etiket: "Kredi yenileme").
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

-- ===================================
-- 4) YENİ KULLANICI SEED'İ (free 3 kredi / gün)
-- ===================================
CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan, status, credits_remaining, credits_limit, period_start, period_end)
  VALUES (
    NEW.id,
    'free',
    'active',
    3,                               -- PLAN_LIMITS.free (AI Üst Beyin / gün)
    3,                               -- PLAN_LIMITS.free
    NOW(),
    NOW() + INTERVAL '1 day'         -- dönem GÜNLÜK
  )
  ON CONFLICT (user_id) DO NOTHING;  -- idempotent
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- (trigger'ın kendisi zaten var — CREATE TRIGGER'a dokunulmadı;
-- handle_new_user_subscription'ın yetkileri değişmedi)

-- ===================================
-- 5) credit_transactions reason CHECK'ine 'higher_brain' ekle
-- ===================================
-- Üst Beyin tüketimi (1b'deki /api/questions/solution) için ayrı reason:
-- analitikte "kaç Üst Beyin çağrısı" net izlenir. Kısıt adı Postgres
-- tarafından otomatik üretildiğinden isimden-bağımsız DROP zorunlu.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.credit_transactions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%reason%'
  LOOP
    EXECUTE format('ALTER TABLE public.credit_transactions DROP CONSTRAINT %I', c.conname);
  END LOOP;

  ALTER TABLE public.credit_transactions
    ADD CONSTRAINT credit_transactions_reason_check
    CHECK (reason IN ('generation', 'monthly_reset', 'plan_change', 'admin_adjust', 'refund', 'higher_brain'));
END $$;

-- 'generation' reason'ı ŞİMDİLİK duruyor: eski UI'in /api/questions/generate
-- route'u yeni UI'e geçene kadar kredi düşmeye devam eder. UI geçişinde o
-- route emekli edilince 'generation' yalnızca tarihsel kayıtlarda kalır.

-- ===================================
-- 6) deduct_credit artık 'higher_brain' yazar
-- ===================================
-- V2'de krediyi yalnızca Üst Beyin (/api/questions/solution) tüketir.
-- deduct_credit 'generation' yazsaydı PackagePanel bu hareketleri GİZLERDİ
-- ('generation' filtresi) → öğrenci harcadığı krediyi geçmişte göremezdi.
-- Atomik UPDATE ... WHERE credits_remaining > 0 mantığı aynen korunur.
CREATE OR REPLACE FUNCTION deduct_credit(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_remaining integer;
BEGIN
  UPDATE subscriptions
  SET credits_remaining = credits_remaining - 1
  WHERE user_id = p_user_id
    AND credits_remaining > 0
  RETURNING credits_remaining INTO v_remaining;

  IF v_remaining IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO credit_transactions (user_id, amount, reason)
  VALUES (p_user_id, -1, 'higher_brain');

  RETURN v_remaining;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- DOĞRULAMA (script çalışınca çıktıyı kontrol et)
-- ===================================

-- 1) paid_until kolonu listelenmeli
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'subscriptions'
  AND column_name = 'paid_until';

-- 2) Plan dağılımı + ücretlilerde paid_until dolu mu?
SELECT plan, count(*),
  count(*) FILTER (WHERE plan <> 'free' AND paid_until IS NULL) AS paid_until_eksik
FROM subscriptions
GROUP BY plan;

-- 3) reason CHECK güncel mi? ('higher_brain' dahil 6 değer dönmeli)
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.credit_transactions'::regclass
  AND conname = 'credit_transactions_reason_check';

-- 4) Yeni rollover yüklü mü? (fonksiyon tanımında paid_until geçmeli)
SELECT position('paid_until' in prosrc) > 0 AS rollover_v2_yuklu
FROM pg_proc
WHERE proname = 'rollover_subscription' AND pronamespace = 'public'::regnamespace;

-- 5) deduct_credit 'higher_brain' yazıyor mu?
SELECT position('higher_brain' in prosrc) > 0 AS deduct_higher_brain_yaziyor
FROM pg_proc
WHERE proname = 'deduct_credit' AND pronamespace = 'public'::regnamespace;
