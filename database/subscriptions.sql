-- ===================================
-- ALGORA - Subscription / Credit System
-- Supabase SQL Setup Script (Adım 1)
-- ===================================

-- Bu script paket/abonelik sisteminin tablolarını, RLS politikalarını,
-- atomik kredi düşme fonksiyonunu ve mevcut kullanıcı backfill'ini oluşturur.
-- Supabase SQL Editor'de ELLE çalıştırılır. Idempotent'tir (tekrar çalıştırılabilir).

-- NOT: Free plan kredi limiti (10) burada sabit kodlanmıştır.
-- lib/subscription-config.ts > PLAN_LIMITS ile senkron tutulmalıdır.

-- ===================================
-- TABLES
-- ===================================

-- Subscriptions Table
-- Her kullanıcının tek abonelik satırı vardır (user_id PRIMARY KEY = 1:1 garanti).
-- DİKKAT: yalnızca user_id PRIMARY KEY olabilir — id UNIQUE'tir ama PK değildir
-- (Postgres tablo başına tek PK kabul eder).
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'premium')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'cancelled')),
  credits_remaining INTEGER NOT NULL DEFAULT 10 CHECK (credits_remaining >= 0),
  credits_limit INTEGER NOT NULL DEFAULT 10 CHECK (credits_limit > 0),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '1 month',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit Transactions Table
-- Kredi hareketleri: -1 tüketim / +N reset, plan değişimi, iade, admin müdahalesi
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL CHECK (amount <> 0),
  reason TEXT NOT NULL CHECK (reason IN ('generation', 'monthly_reset', 'plan_change', 'admin_adjust', 'refund')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Claims Table
-- Manuel ödeme talepleri (havale/EFT). provider/provider_ref ileride PSP (Iyzico/PayTR) için.
CREATE TABLE IF NOT EXISTS payment_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('pro', 'premium')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  sender_name TEXT,
  reference_note TEXT,
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_ref TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- INDEXES
-- ===================================

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_claims_user_id ON payment_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_claims_status ON payment_claims(status);

-- Tek pending talep garantisi (DB seviyesinde, yarış koşullarına karşı)
-- Aynı kullanıcının aynı anda yalnızca 1 adet 'pending' durumunda talebi olabilir
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_claim_per_user
  ON payment_claims (user_id)
  WHERE status = 'pending';

-- ===================================
-- ROW LEVEL SECURITY (RLS)
-- ===================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_claims ENABLE ROW LEVEL SECURITY;

-- Not: UPDATE politikaları YOK — kredi düşme RPC (service-role) ve admin onayları
-- service-role key ile yapılır (RLS'i bypass eder).
-- Not: subscriptions için INSERT politikası da YOK (aşağıda bilinçli olarak kaldırılmıştır) —
-- seed yalnızca on_auth_user_created trigger'ı, backfill ve service-role fallback ile yapılır.

-- Subscriptions Policies
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT politikası YOK ve OLMAMALI. Gerekçe (yetki yükseltme açığı):
-- WITH CHECK (auth.uid() = user_id) yalnızca user_id'yi kısıtlar; kullanıcının
-- seçtiği plan/credits_remaining/credits_limit serbest kalır → anon key ile
-- JS konsolundan kendine 'premium' + 5000 kredi yazılabilirdi.
-- Eski sürümü çalıştıran ortamlar için idempotent temizlik:
DROP POLICY IF EXISTS "Users can insert own subscription" ON subscriptions;

-- Credit Transactions Policies (salt okunur — insert yalnızca service-role üzerinden)
DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Payment Claims Policies
DROP POLICY IF EXISTS "Users can view own claims" ON payment_claims;
CREATE POLICY "Users can view own claims"
  ON payment_claims FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own claims" ON payment_claims;
CREATE POLICY "Users can insert own claims"
  ON payment_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ===================================
-- FUNCTIONS
-- ===================================

-- updated_at trigger'ları (mevcut update_updated_at_column fonksiyonunu kullanır;
-- fonksiyon şeması bu scriptte yeniden tanımlanır ki dosya bağımsız çalışabilsin)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_claims_updated_at ON payment_claims;
CREATE TRIGGER update_payment_claims_updated_at
  BEFORE UPDATE ON payment_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- deduct_credit(p_user_id)
-- Atomik kredi düşme: yalnızca credits_remaining > 0 iken günceller (yarış koşulu güvenli).
-- Başarılıysa güncel kalan krediyi (integer), kredi yoksa NULL döndürür.
-- Transaction kaydı aynı işlem içinde yazılır.
-- Çağrım: service-role client ile RPC (RLS bypass) — app/api/questions/generate/route.ts
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
  VALUES (p_user_id, -1, 'generation');

  RETURN v_remaining;
END;
$$ LANGUAGE plpgsql;

-- refund_credit(p_user_id)
-- Gemini hata iadesi: +1 kredi ve 'refund' transaction kaydı.
CREATE OR REPLACE FUNCTION refund_credit(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_remaining integer;
BEGIN
  UPDATE subscriptions
  SET credits_remaining = credits_remaining + 1
  WHERE user_id = p_user_id
  RETURNING credits_remaining INTO v_remaining;

  INSERT INTO credit_transactions (user_id, amount, reason)
  VALUES (p_user_id, 1, 'refund');

  RETURN v_remaining;
END;
$$ LANGUAGE plpgsql;

-- rollover_subscription(p_user_id)
-- Lazy rollover: period_end geçmişse yeni dönem açar (period +1 ay, kredi plan limitine reset).
-- Dönem henüz bitmemişse satırı olduğu gibi döndürür (no-op). Yarış koruması:
-- UPDATE ... WHERE period_end < NOW() — paralel çağrılarda yalnızca biri resetler.
-- Çağrım: YALNIZCA service-role (GET /api/subscription ve generate route) — kullanıcı
-- subscriptions üzerinde UPDATE yetkisine sahip DEĞIL (yetki yükseltme koruması).
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

  -- PLAN_LIMITS ile senkron: free 10 / pro 1000 / premium 5000
  v_limit := CASE v_row.plan
    WHEN 'pro' THEN 1000
    WHEN 'premium' THEN 5000
    ELSE 10
  END;

  UPDATE subscriptions
  SET credits_remaining = v_limit,
      credits_limit = v_limit,
      period_start = NOW(),
      period_end = NOW() + INTERVAL '1 month'
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
-- FUNCTION PERMISSIONS
-- ===================================

-- Postgres fonksiyonlara varsayılan olarak PUBLIC execute verir; kredi fonksiyonları
-- yetki yükseltme vektörüdür (anon kullanıcı deduct/refund/rollover'ı başkasının
-- user_id'si ile çağırabilir). Yalnızca service_role çalıştırabilsin.
-- ⚠️ DİKKAT: Yalnızca PUBLIC'ten almak YETMEZ — Supabase'in ALTER DEFAULT PRIVILEGES
-- ayarı fonksiyon OLUŞTURULDUĞU anda anon/authenticated rollerine DOĞRUDAN EXECUTE
-- verir (canlı veride ACL denetimiyle doğrulandı: PUBLIC revoke sonrası bile
-- anon=X, authenticated=X kalmıştı). ÜÇÜNDEN de alınmalıdır.
REVOKE EXECUTE ON FUNCTION deduct_credit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION deduct_credit(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION refund_credit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION refund_credit(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION rollover_subscription(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rollover_subscription(uuid) TO service_role;

-- ===================================
-- NEW USER TRIGGER (abonelik seed'i)
-- ===================================

-- Her yeni kaydolan kullanıcı için free abonelik satırı oluşturur.
-- Seed'in BURADAN yapılmasının nedeni: subscriptions'a authenticated INSERT
-- politikası yoktur (yukarıdaki yetki yükseltme gerekçesi). Seed yalnızca:
--   1) bu trigger (yeni kullanıcılar)
--   2) aşağıdaki backfill (trigger'dan önceki kullanıcılar)
--   3) service-role fallback (app/api/questions/generate — beklenmedik boşluk için)
CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan, status, credits_remaining, credits_limit, period_start, period_end)
  VALUES (
    NEW.id,
    'free',
    'active',
    10,                              -- PLAN_LIMITS.free (lib/subscription-config.ts ile senkron)
    10,                              -- PLAN_LIMITS.free
    NOW(),
    NOW() + INTERVAL '1 month'
  )
  ON CONFLICT (user_id) DO NOTHING;  -- idempotent
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_subscription();

-- Trigger fonksiyonu yalnızca trigger bağlamında çalışabilir (doğrudan çağrıda Postgres
-- hata verir); yine de PostgREST /rpc/ yüzeyini kapatıyoruz: yalnızca auth olayını
-- ateşleyen rol çalıştırabilsin. SECURITY DEFINER olduğu için gövde tablo sahibi
-- (postgres) olarak çalışır ve RLS'i bypass eder — istenen davranış budur.
REVOKE EXECUTE ON FUNCTION handle_new_user_subscription() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user_subscription() TO supabase_auth_admin;

-- ===================================
-- BACKFILL (mevcut kullanıcılar)
-- ===================================

-- Mevcut tüm kullanıcılara free abonelik seed'i.
-- Idempotent: ON CONFLICT (user_id) DO NOTHING sayesinde tekrar çalıştırma güvenli.
-- Yeni kaydolanlar on_auth_user_created trigger'ı ile otomatik seed edilir;
-- bu backfill yalnızca trigger'dan ÖNCE kaydolmuş kullanıcıları kapatır.
INSERT INTO subscriptions (user_id, plan, status, credits_remaining, credits_limit, period_start, period_end)
SELECT
  id,
  'free',
  'active',
  10,                              -- PLAN_LIMITS.free
  10,                              -- PLAN_LIMITS.free
  NOW(),
  NOW() + INTERVAL '1 month'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ===================================
-- SETUP COMPLETE
-- ===================================

-- Verify setup
SELECT
  'Subscription schema setup complete!' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('subscriptions', 'credit_transactions', 'payment_claims')) as tables_created,
  (SELECT COUNT(*) FROM subscriptions) as subscription_rows,
  (SELECT COUNT(*) FROM auth.users) as total_users;
