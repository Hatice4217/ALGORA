-- ============================================================
-- user_profiles_unique.sql — S1 fix (28 Eylül 2026)
--
-- SORUN: user_profiles.user_id UNIQUE DEĞİLDİ → lib/supabase.ts'teki
-- INSERT fallback (önce UPDATE, 0 satırsa INSERT) yarış durumunda
-- aynı hesap için ÇİFT profil satırı üretebiliyordu (canlıda kanıtlandı:
-- SECURITY_AUDIT_TEST_PLAN.md → 9.2 S1).
--
-- ÇÖZÜM: ① Varsa çift satırları dedupe et (en güncel satır kalır)
--        ② user_id'ye UNIQUE constraint ekle
--
-- IDEMPOTENT: tekrar çalıştırma güvenli.
-- ÇALIŞTIRMA: Supabase SQL Editor (kullanıcı adımı).
-- ============================================================

-- ① Dedupe: her user_id için yalnızca en güncel satır kalır
--    (updated_at yoksa created_at, o da yoksa id — deterministik sıra)
WITH sirali AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) AS rn
  FROM user_profiles
)
DELETE FROM user_profiles
WHERE id IN (SELECT id FROM sirali WHERE rn > 1);

-- ② UNIQUE constraint — isimden bağımsız kontrol: user_id üzerinde herhangi bir
--    unique index/constraint zaten varsa dokunma (idempotentlik)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY (i.indkey)
    WHERE c.relname = 'user_profiles'
      AND a.attname = 'user_id'
      AND i.indisunique
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- ============================================================
-- DOĞRULAMA (elle çalıştır):
--
-- 1) Çift satır kalmadı mı? (0 satır dönmeli)
-- SELECT user_id, COUNT(*) FROM user_profiles
-- GROUP BY user_id HAVING COUNT(*) > 1;
--
-- 2) Constraint var mı? (1 satır dönmeli: user_profiles_user_id_key)
-- SELECT conname FROM pg_constraint
-- WHERE conrelid = 'user_profiles'::regclass AND contype = 'u';
--
-- 3) Yarış kanıtı: aynı user_id ile 2. INSERT artık 23505 vermeli
--    (RLS'e takılan insert service-role ile denenmeli)
-- ============================================================
