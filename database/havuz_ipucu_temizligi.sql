-- ═══════════════════════════════════════════════════════════════════
-- HAVUZ İPUCU TEMİZLİĞİ (1 Ekim 2026)
--
-- Amaç: "her şey tam olmalı" — ipucu (hints) eksik olan sorular defolu
-- sayılır ve havuzdan kaldırılır. Yeni üretimler ipucuyla birlikte geldiği
-- için havuz kendini tam sorularla onarır (fallback → havuza ekler).
--
-- Kapsam: hints NULL / boş dizi / dizi-olmayan TÜM sorular (status'tan
-- bağımsız — askıda olanlar da aynı standarda tabi).
--
-- Beklenen (01 Eki probe): 28 soru + 17 bağlı cevap kaydı silinir;
-- havuzda 6 ipuçlu soru kalır.
--
-- İdempotent: tekrar çalıştırılırsa 0 satır etkiler.
-- Not: "Success. No rows returned" görmek normal değildir burada —
-- RETURNING silinen satırları listeler.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- 1) Önce bağlı cevap kayıtları (FK ihlali olmadan soru silebilmek için;
--    kayıtlar test kullanıcılarına ait — kayıp yok)
WITH defolu AS (
  SELECT id FROM questions
  WHERE jsonb_array_length(
    CASE WHEN jsonb_typeof(COALESCE(hints, '[]'::jsonb)) = 'array'
         THEN COALESCE(hints, '[]'::jsonb)
         ELSE '[]'::jsonb
    END
  ) = 0
)
DELETE FROM answers WHERE question_id IN (SELECT id FROM defolu);

-- 2) Defolu soruların kendisi
WITH defolu AS (
  SELECT id FROM questions
  WHERE jsonb_array_length(
    CASE WHEN jsonb_typeof(COALESCE(hints, '[]'::jsonb)) = 'array'
         THEN COALESCE(hints, '[]'::jsonb)
         ELSE '[]'::jsonb
    END
  ) = 0
)
DELETE FROM questions WHERE id IN (SELECT id FROM defolu)
RETURNING id, subject, exam_type;

-- 3) Doğrulama: kalan havuz tamamen ipuçlu olmalı (0 satır dönmeli)
SELECT id, subject, exam_type
FROM questions
WHERE jsonb_array_length(
  CASE WHEN jsonb_typeof(COALESCE(hints, '[]'::jsonb)) = 'array'
       THEN COALESCE(hints, '[]'::jsonb)
       ELSE '[]'::jsonb
  END
) = 0;

-- 4) Özet: kalan sorular branş bazında
SELECT subject, exam_type, count(*) AS kalan
FROM questions
GROUP BY subject, exam_type
ORDER BY subject, exam_type;

COMMIT;
