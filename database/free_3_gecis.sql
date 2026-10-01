-- ===================================
-- ALGORA — Mevcut FREE Satırların 3 Krediye Geçişi
-- ===================================
-- Sorun (1 Ekim 2026, canlıda gözlemlendi): credit_pivot_gunluk.sql
-- yalnızca pro/premium backfill'i ve YENİ kullanıcı seed'ini güncelledi;
-- mevcut FREE satırları V1'den kalan limit=20 ile kaldı → UI "15/20 AI
-- kredisi" gösteriyor (V2 free = 3/GÜN olmalıydı). Dönem bitip ilk
-- rollover'da kendiliğinden 3/3 olur ama geçiş döneminde tutarsız.
--
-- Çözüm: free satırların limitini 3'e çek; kalan krediyi 3 ile sınırla
-- (LEAST — kullanıcı fazladan kredi biriktirmişse 3'e iner, eksiye düşmez).
--
-- İdempotent: tekrar çalıştırmak güvenli.
-- ===================================

UPDATE public.subscriptions
SET credits_remaining = LEAST(credits_remaining, 3),
    credits_limit = 3
WHERE plan = 'free'
  AND (credits_limit <> 3 OR credits_remaining > 3);

-- ===================================
-- DOĞRULAMA (çıktıyı kontrol et)
-- ===================================

-- 1) Plan/limit dağılımı — yalnızca "free / 3" satırları kalmalı
SELECT plan, credits_limit, count(*) AS kullanici
FROM subscriptions
GROUP BY plan, credits_limit;

-- 2) Kalan kredi 3'ü aşan free satır var mı? → 0 dönmeli
SELECT count(*) AS asiri_kredi
FROM subscriptions
WHERE plan = 'free' AND credits_remaining > 3;
