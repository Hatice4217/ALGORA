-- ============================================================
-- Hedefleri hesaba bağlama (localStorage'dan DB'ye):
--   ① user_goals — "Bugünün Hedefleri" localStorage'daydı; aynı tarayıcıda
--      hesap değiştiren kullanıcı başkasının hedeflerini görüyordu.
--      Artık hesaba bağlı (RLS: yalnız kendi satırları).
--   ② user_profiles.target_university / target_major — "Hedef Üniversite/Bölüm"
--      localStorage'daydı (cihaz-bazlı); artık DB'de, cihazlar arası senkron.
--   ③ user_profiles.name — kolon garantisi: ayarlardan değişen isim
--      user_profiles.name'e yazılacak (daha önce yalnız auth metadata'ya
--      yazılıyordu; profil satırındaki eski isim dashboard'da onu eziyordu).
-- Çalıştırma: Supabase Dashboard → SQL Editor → tüm dosyayı yapıştır → Run
-- Idempotent: tekrar çalıştırmak güvenlidir.
-- ============================================================

-- ①) Bugünün Hedefleri
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_text TEXT NOT NULL CHECK (char_length(goal_text) <= 200),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  -- yerel 'YYYY-MM-DD' (Goal.date ile aynı format; hangi güne ait olduğu)
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

-- Politikalar: kullanıcı yalnızca kendi hedeflerini görür/yazar/değiştirir/siler
DROP POLICY IF EXISTS user_goals_select_own ON user_goals;
DROP POLICY IF EXISTS user_goals_insert_own ON user_goals;
DROP POLICY IF EXISTS user_goals_update_own ON user_goals;
DROP POLICY IF EXISTS user_goals_delete_own ON user_goals;

CREATE POLICY user_goals_select_own ON user_goals
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY user_goals_insert_own ON user_goals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_goals_update_own ON user_goals
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_goals_delete_own ON user_goals
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_goals_user_id_date ON user_goals (user_id, date);

-- ②) Hedef üniversite / bölüm (motivasyon rozeti)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS target_university TEXT NOT NULL DEFAULT '';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS target_major TEXT NOT NULL DEFAULT '';

-- ③) İsim kolonu garantisi (baseline şemada eksikti; canlıda varsa dokunulmaz)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS name TEXT;

-- ============================================================
-- DOĞRULAMA (opsiyonel — Run sonrası):
-- ① SELECT count(*) FROM user_goals;                      → 0 hatasız dönmeli
-- ② SELECT column_name FROM information_schema.columns
--    WHERE table_name='user_profiles'
--      AND column_name IN ('target_university','target_major','name');  → 3 satır
-- ③ SELECT policyname FROM pg_policies WHERE tablename='user_goals';   → 4 satır
-- ============================================================
