-- ===================================
-- Soru Fabrikası — question_sources (kaynak izlenebilirlik)
-- ===================================
-- MEB çıkmış sorularının hangi kaynaktan (PDF/kitap), hangi yıl/sınav
-- oturumundan ve orijinal soru numarasıyla havuza girdiğini kaydeder.
-- BAP raporu için kaynak izlenebilirlik + jüriye şeffaf provenance.
--
-- KULLANIM: Supabase SQL Editor'de çalıştır (idempotent — tekrar hatasız geçer).
-- Yazma yalnızca service-role (RLS açık, politika yok → anon/auth erişemez;
-- Supabase Table Editor service role ile okuyabilir).

CREATE TABLE IF NOT EXISTS question_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'MEB çıkmış'
    CHECK (source_type IN ('MEB çıkmış', 'MEB ders kitabı', 'üretilmiş')),
  source_name TEXT NOT NULL,          -- örn. 'MEB TYT Çıkmış Sorular — Din Kültürü 2018-2026'
  year INT CHECK (year IS NULL OR year BETWEEN 2000 AND 2100),
  exam_session TEXT,                  -- örn. 'TYT' (PDF'teki etiketten)
  original_question_no INT,           -- kaynak PDF'teki soru numarası
  unit TEXT,                          -- PDF'teki ünite/konu başlığı (ham)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aynı sorunun aynı kaynaktan mükerrer kaydını engelle (pipeline retry güvenliği)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'question_sources'::regclass
      AND conname = 'question_sources_unique_soru'
  ) THEN
    ALTER TABLE question_sources
      ADD CONSTRAINT question_sources_unique_soru
      UNIQUE (question_id, source_name, original_question_no);
  END IF;
END $$;

-- RLS: açık + politika yok → yalnız service-role okur/yazar
ALTER TABLE question_sources ENABLE ROW LEVEL SECURITY;

-- Yetki matrisi savunması (tekrar çalıştırılabilir):
-- ALTER DEFAULT PRIVILEGES anon/authenticated'a EXECUTE verir (RPC'te öğrenildi);
-- tablolarda benzer risk yönetimi için PUBLIC'ten açık reddetmek gereksiz —
-- RLS politika yokluğu zaten tüm anon/auth erişimi kapatır.

CREATE INDEX IF NOT EXISTS question_sources_question_id_idx
  ON question_sources(question_id);
