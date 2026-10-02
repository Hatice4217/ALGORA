-- ===================================
-- ALGORA V2 — Faz 1b: ai_solutions Önbellek Tablosu
-- Supabase SQL Editor'de ELLE çalıştırılır. Idempotent'tir
-- (tekrar çalıştırma güvenli).
-- ===================================
--
-- AMAÇ: "Üst Beyin" derin anlatımı (question_id, user_id) başına
-- ÖNBELLEKLENİR — aynı öğrenci aynı sorunun anlatımını tekrar izlerken
-- ("Son Çözülenler"den dönüp) YENİDEN kredi ödemez, Gemini de tekrar
-- çağrılmaz.
--
-- Yazma modeli (payment_claims deseni):
--   • Kullanıcıya yalnızca SELECT politikası VAR (kendi satırları)
--   • INSERT/UPDATE/DELETE politikası YOK → yalnızca service-role
--     (solution route'u) yazar. Kullanıcı anlatım metnini sonradan
--     değiştiremez, başkasının satırını okuyamaz.
--   • PK (question_id, user_id): bir soru-öğrenci çifti tek anlatım taşır;
--     route ignoreDuplicates ile yarış-güvenli upsert yapar.
--
-- Süreklilik: soru silinince (ON DELETE CASCADE) veya hesap silinince
-- anlatım kaydı da gider — bağımsız yaşamaz.
-- ===================================

CREATE TABLE IF NOT EXISTS ai_solutions (
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  solution TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gemini-flash-lite-latest',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT ai_solutions_pkey PRIMARY KEY (question_id, user_id)
);

-- RLS: FORCE — tablosahibinin de (anon key ile) politikasız erişimi olmasın;
-- service_role BYPASSRLS ile yazmaya devam eder.
ALTER TABLE ai_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_solutions FORCE ROW LEVEL SECURITY;

-- Kullanıcı yalnızca KENDİ anlatımlarını okur.
DROP POLICY IF EXISTS "Users can view own solutions" ON ai_solutions;
CREATE POLICY "Users can view own solutions"
  ON ai_solutions FOR SELECT
  USING (auth.uid() = user_id);

-- ===================================
-- DOĞRULAMA (script çalışınca çıktıyı kontrol et)
-- ===================================

-- 1) Tablo kolonları listelenmeli (5 kolon)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ai_solutions'
ORDER BY ordinal_position;

-- 2) RLS durumu — rowsecurity=true, forcerowsecurity=true OLMALI
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname = 'ai_solutions';

-- 3) Politika — yalnızca 1 satır (view own) dönmeli; yazma politikasi OLMAMALI
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'ai_solutions';
