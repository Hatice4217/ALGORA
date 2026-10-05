-- ===================================
-- FAZ 2 PEDAGOJİ — KR-20 GÜVENİLİRLİK ÖLÇÜMÜ
-- ===================================
-- BAP formunda vaat edilen KR-20 (Kuder-Richardson 20) iç tutarlılık
-- katsayısının hesaplanması. UI'da GÖRÜNMEZ — yalnızca ölçüm + rapor:
-- jüri/rapor için SQL Editor'den çalıştırılır, sonuç docs/KR20_RAPORU.md'ye işlenir.
--
-- Metodoloji:
--   KR-20 = k/(k-1) · (1 − Σpq / σ²ₓ)
--     k     = gruptaki (sınav türü + ders) soru sayısı
--     p     = sorunun doğru cevaplanma oranı, q = 1 − p
--     σ²ₓ   = öğrenci-başı toplam doğru puanlarının popülasyon varyansı
--   k < 2 veya σ²ₓ = 0 → NULL (küçük havuz guard'ı; rapora "ölçülemedi" yazılır)
--
-- Veri temizliği:
--   - Her (öğrenci, soru) çifti TEK gözlem: İLK cevap (DISTINCT ON, created_at ASC)
--     — tekrar çözümler ölçümü şişirmez.
--   - Yalnız etkin (status='active') ve klon OLMAYAN (clone_of IS NULL) sorular:
--     klonlar aynı maddenin türevi olduğu için iç tutarlılığı yapay şişirirdi.
--   - p_min_cevap: en az N öğrencinin cevapladığı sorular madde havuzuna girer
--     (DEFAULT 5 — tek öğrencilik maddelerde p anlamsızdır).
--
-- ⚠️ Supabase default-privileges tuzağı: REVOKE ... FROM PUBLIC YETMEZ —
-- fonksiyon OLUŞTURULDUĞU anda anon/authenticated'a DOĞRUDAN EXECUTE verilir.
-- ÜÇÜNDEN de alınmalıdır: PUBLIC + anon + authenticated (question_pool_faz1a.sql deseni).
--
-- İDEMPOTENTTİR: tekrar çalıştırmak güvenlidir ("Success. No rows returned" normaldir).
-- ===================================

-- ===================================
-- 1) FONKSİYON
-- ===================================
CREATE OR REPLACE FUNCTION public.get_kr20(p_min_cevap integer DEFAULT 5)
RETURNS TABLE (
  exam_type text,
  subject text,
  k bigint,
  cevap_sayisi bigint,
  mean_p double precision,
  kr20 double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ilk_cevaplar AS (
    -- Her (öğrenci, soru) çiftinden İLK cevap
    SELECT DISTINCT ON (a.user_id, a.question_id)
      a.user_id,
      a.question_id,
      a.is_correct
    FROM answers a
    JOIN questions q ON q.id = a.question_id
    WHERE q.status = 'active'
      AND q.clone_of IS NULL
      AND q.exam_type IS NOT NULL
    ORDER BY a.user_id, a.question_id, a.answered_at ASC
  ),
  madde AS (
    -- Soru başına p/q istatistikleri (en az p_min_cevap öğrenci koşulu)
    SELECT
      q.exam_type,
      q.subject,
      ic.question_id,
      count(*) AS n,
      avg(ic.is_correct::int) AS p
    FROM ilk_cevaplar ic
    JOIN questions q ON q.id = ic.question_id
    GROUP BY q.exam_type, q.subject, ic.question_id
    HAVING count(*) >= p_min_cevap
  ),
  madde_pq AS (
    SELECT
      exam_type,
      subject,
      question_id,
      n,
      p,
      p * (1.0 - p) AS pq
    FROM madde
  ),
  ogrenci_puani AS (
    -- Öğrenci-başı toplam doğru (yalnız madde havuzuna giren sorular üzerinden)
    SELECT
      mp.exam_type,
      mp.subject,
      ic.user_id,
      sum(ic.is_correct::int) AS toplam_dogru
    FROM ilk_cevaplar ic
    JOIN madde_pq mp ON mp.question_id = ic.question_id
    GROUP BY mp.exam_type, mp.subject, ic.user_id
  ),
  grup AS (
    -- Grup (sınav türü + ders) başına madde istatistikleri
    SELECT
      exam_type,
      subject,
      count(*) AS k,
      sum(n) AS cevap_sayisi,
      avg(p) AS mean_p,
      sum(pq) AS sum_pq
    FROM madde_pq
    GROUP BY exam_type, subject
  ),
  varyans AS (
    -- σ²ₓ: öğrenci toplam doğru puanlarının örneklem varyansı
    -- (tek öğrenci → NULL → KR-20 NULL döner, guard devrede)
    SELECT
      exam_type,
      subject,
      var_samp(toplam_dogru) AS sigma2
    FROM ogrenci_puani
    GROUP BY exam_type, subject
  )
  SELECT
    g.exam_type,
    g.subject,
    g.k,
    g.cevap_sayisi,
    g.mean_p,
    CASE
      WHEN v.sigma2 IS NULL OR v.sigma2 = 0 THEN NULL
      WHEN g.k < 2 THEN NULL
      ELSE (g.k::double precision / (g.k - 1)) * (1.0 - g.sum_pq / v.sigma2)
    END AS kr20
  FROM grup g
  JOIN varyans v
    ON v.exam_type = g.exam_type
   AND v.subject = g.subject
  ORDER BY g.exam_type, g.subject;
$$;

-- ===================================
-- 2) YETKİ MATRİSİ — üçlü REVOKE (zorunlu)
-- ===================================
REVOKE EXECUTE ON FUNCTION public.get_kr20(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_kr20(integer)
  TO service_role;

-- ===================================
-- 3) DOĞRULAMA (script çalışınca çıktıyı kontrol et)
-- ===================================

-- a) Yetki matrisi: HER İKİ satır da false olmalı (anon/authenticated çalıştıramaz)
SELECT
  has_function_privilege('anon', 'get_kr20(integer)', 'EXECUTE') AS anon_calistirabilir,
  has_function_privilege('authenticated', 'get_kr20(integer)', 'EXECUTE') AS authenticated_calistirabilir;

-- b) Örnek çağrı — havuz küçükse kr20 NULL/eksik satır döner (normal, rapora not edilir)
SELECT * FROM public.get_kr20(5);
