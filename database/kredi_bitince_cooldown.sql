-- ===================================
-- ALGORA — Kredi Bitince Cooldown (ChatGPT/Gemini modeli)
-- ===================================
-- Karar (1 Ekim 2026): günlük yenilenme penceresi KREDİ BİTİNCE başlar.
-- Son kredi harcandığı anda dönem o ana sabitlenir (period_end = NOW()+24h)
-- → kullanıcı "kredim bitti, 23s 12dk sonra yenilenecek" geri sayımı TAM
-- tükenme anından itibaren görür. Eski davranışta pencere ilk kullanımda
-- sabitleniyordu; 14:00'te biten kullanıcı pencere 09:00'da açıldıysa
-- 19 saat bekliyordu.
--
-- Değişiklik: deduct_credit — kredi 1→0 düştüğü UPDATE'de dönem yeniden
-- sabitlenir (atomik, yarış güvenli). UI değişikliği GEREKMEZ: tüm geri
-- sayımlar (QuotaExhaustedModal + Paketim) period_end'i zaten okuyor.
--
-- Kenar durumlar:
--   • Refund (Gemini hatası): kredi 0→1 geri gelir; kullanıcı isterse harcar,
--     tekrar 0'a düşerse dönem yeniden o anda sabitlenir (tutarlı).
--   • Kredi bitmeden gün geçerse: lazy rollover aynen çalışır (ilk istekte reset).
--   • Beklemeden dönen kullanıcı: period_end geçtikten sonra ilk istekte
--     rollover krediyi plan limitine doldurur.
--
-- İdempotent: CREATE OR REPLACE — tekrar çalıştırmak güvenli (ACL korunur:
-- yalnızca service_role EXECUTE).
-- ===================================

CREATE OR REPLACE FUNCTION deduct_credit(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_remaining integer;
BEGIN
  -- Son kredi (1→0) harcanırken dönemi TÜKENME ANINA sabitle (24 saat cooldown).
  -- SET ifadeleri ESKİ satır değerlerini görür: credits_remaining = 1,
  -- düşülen son kredidir. Diğer düşümlerde dönem olduğu gibi kalır.
  UPDATE subscriptions
  SET credits_remaining = credits_remaining - 1,
      period_start = CASE WHEN credits_remaining = 1 THEN NOW() ELSE period_start END,
      period_end   = CASE WHEN credits_remaining = 1 THEN NOW() + INTERVAL '24 hours'
                          ELSE period_end END
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
-- DOĞRULAMA (çıktıyı kontrol et)
-- ===================================

-- 1) Fonksiyon gövdesinde cooldown mantığı var mı? → true olmalı
SELECT prosrc LIKE '%INTERVAL ''24 hours''' AS cooldown_var
FROM pg_proc
WHERE proname = 'deduct_credit';

-- 2) Yetkiler hâlâ doğru mü? → service_role true, anon false olmalı
SELECT
  has_function_privilege('service_role', 'public.deduct_credit(uuid)', 'EXECUTE') AS service_role_edebilir,
  has_function_privilege('anon', 'public.deduct_credit(uuid)', 'EXECUTE') AS anon_edebilir;
