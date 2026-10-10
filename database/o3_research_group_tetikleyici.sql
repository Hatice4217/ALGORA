-- ===================================
-- ALGORA — O3 İkinci Onarım: research_group koruma TETİKLEYİCİSİ (10 Ekim 2026)
--
-- ARKA PLAN: guvenlik_onarimi_2026-10-09.sql'deki
--   REVOKE UPDATE (research_group), INSERT (research_group) ON user_profiles ...
-- canlıda ETKİSİZ kaldı (probe kanıtı: kullanıcı PATCH'i HTTP 204 geçti).
-- Kök neden: tablonun UPDATE ayrıcalığı başka bir grantor'dan geliyor
-- (Supabase default-privilege zinciri). PostgreSQL'de REVOKE'u yalnız izni
-- VEREN rol çekebilir — postgres'unki "no matching privileges" UYARISI
-- üretir (hata değil), script geri kalanı normal çalışır.
--
-- ÇÖZÜM: grantor'dan bağımsız, kesin işleyen BEFORE INSERT/UPDATE trigger.
-- research_group'u yalnız service-role (admin route) / postgres (SQL Editor)
-- değiştirebilir; authenticated/anon denemesi 42501 ile reddedilir.
-- Tamamı idempotanttır.
-- ===================================

-- ------------------------------------------------------------
-- 0) TANI (çıktıya bak: grantor kim? muhtemelen supabase_admin)
-- ------------------------------------------------------------
SELECT grantor, grantee, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
  AND column_name = 'research_group'
  AND privilege_type = 'UPDATE';

-- Aynı iznin tablo-düzeyi kaynağı (UPDATE satırındaki grantor'lar)
SELECT grantor, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
  AND grantee IN ('authenticated', 'anon')
  AND privilege_type = 'UPDATE';

-- ------------------------------------------------------------
-- 1) Koruma fonksiyonu (ERRCODE 42501 → PostgREST 403 döner)
--
-- INSERT'te: research_group NULL dışında bir değerle gelemez (eski = NULL).
-- UPDATE'te: mevcut değerden farklı bir değere değiştirilemez.
-- Muafiyet: current_user service_role (admin route) veya postgres/supabase_admin
-- (SQL Editor / bakım) ise serbest.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION koru_research_group() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  eski text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    eski := OLD.research_group;
  ELSE
    eski := NULL; -- INSERT: hiçbir değer giremez (seed'ler zaten NULL yazar)
  END IF;

  IF NEW.research_group IS DISTINCT FROM eski
     AND current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'research_group alani yalnizca yonetici tarafindan degistirilebilir'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS koru_research_group_trg ON public.user_profiles;
CREATE TRIGGER koru_research_group_trg
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION koru_research_group();

-- ------------------------------------------------------------
-- 2) Eski REVOKE denemesi kalsın (zararsız; grantor eşleşirse ikinci katman)
-- ------------------------------------------------------------
REVOKE UPDATE (research_group), INSERT (research_group)
  ON TABLE user_profiles FROM authenticated, anon;

-- ===================================
-- DOĞRULAMA (çıktıyı kontrol et)
-- ===================================

-- 1) Tetikleyici takılı mı? (tgtype: 2=BEFORE, 4=INSERT|UPDATE kombinasyonu → 7 veya 6/10 beklenir)
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.user_profiles'::regclass AND NOT tgisinternal;

-- 2) Uygulama tarafı kanıtı: ALGORA canlı sitesinde giriş yapıp Profil > Ayarlar'ın
--    hâlâ kaydettiği (name/phone gibi normal alanlar tetikleyiciden etkilenmez).
