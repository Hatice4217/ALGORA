# ALGORA — KR-20 Güvenilirlik Ölçüm Raporu

> Faz 2 pedagoji kapsamında, BAP proje formunda vaat edilen KR-20 iç tutarlılık
> ölçümünün metodolojisi ve tarihli ölçüm sonuçları. KR-20 ürün UI'ında GÖRÜNMEZ —
> yalnızca ölçüm + rapor amacıyla (jüri/rapor değerlendirmesi) hesaplanır.

## Metodoloji

**Kuder-Richardson 20 (KR-20)**, dikotom (doğru/yanlış) puanlanan maddelerden
oluşan bir testin iç tutarlılığını (güvenilirliğini) ölçer:

```
KR-20 = k/(k−1) · (1 − Σpᵢqᵢ / σ²ₓ)
```

| Sembol | Anlamı |
|---|---|
| k | Grup (sınav türü + ders) içindeki madde (soru) sayısı |
| pᵢ | i. sorunun doğru cevaplanma oranı |
| qᵢ | 1 − pᵢ |
| Σpᵢqᵢ | Tüm maddelerin p·q toplamı |
| σ²ₓ | Öğrenci-başı toplam doğru puanlarının örneklem varyansı |

**Yorumlama:** 0,80+ çok iyi · 0,60–0,79 kabul edilebilir · 0,40–0,59 sınırlı ·
<0,40 güvenilmez (sınıf içi ölçümler için).

### Veri kuralları (`database/kr20_olcumu.sql`)

1. **Tek gözlem kuralı:** Her (öğrenci, soru) çiftinden yalnızca İLK cevap
   (`DISTINCT ON ... ORDER BY created_at ASC`) — tekrar çözümler ve "Eksiklerini
   Kapat" klon turları ölçümü yapay şekilde şişirmez.
2. **Kronlar hariç:** Klon sorular (`clone_of IS NOT NULL`) dışlanır — bir maddenin
   türevi iç tutarlılığı yapay yükseltir.
3. **Askıdakiler hariç:** Yalnız `status = 'active'` sorular.
4. **Madde eşiği:** Bir soru en az `p_min_cevap` (varsayılan 5) öğrenci tarafından
   cevaplanmış olmalı; tek-öğrencilik maddede p istatistiksel olarak anlamsızdır.
5. **Küçük havuz guard'ı:** `k < 2` veya `σ²ₓ = 0` (ya da tek öğrenci → varyans
   tanımsız) ise KR-20 **NULL** döner — yanlış değer yerine "ölçülemedi" raporlanır.

### Ölçümün çalıştırılması

Supabase SQL Editor'de:

```sql
SELECT * FROM public.get_kr20(5);   -- 5 = madde başına min öğrenci sayısı
```

Fonksiyon `STABLE`, `SECURITY DEFINER`, üçlü REVOKE'lıdır (`PUBLIC`, `anon`,
`authenticated` çalıştıramaz; yalnız `service_role` + SQL Editor sahibi).

## Ölçüm Sonuçları

> Not: Faz 2 başında havuz küçüktür ve aktif öğrenci sayısı düşüktür. İlk
> ölçümlerde **NULL / küçük-k satırları beklenir** — bu bir hata değil, guard'ın
> doğru çalıştığının kanıtıdır. Havuz ve kullanıcı tabanı büyüdükçe ölçümler
> anlamlılaşır; aşağıdaki tablo tarih tarih doldurulur.

### Ölçüm 1 — 5 Ekim 2026 (sistem doğrulama ölçümü)

**Sonuç: Satır döndürmedi ("No rows returned") — veri yok.**

- `SELECT count(*) FROM answers;` → **0**. Sistem 5 Ekim veri kazası sonrası gerçek
  kullanıcı verisiyle sıfırlandı; E2E probe'larının cevapları da temizlik cascade'iyle
  silindi. `p_min_cevap` eşiğine (5) giren madde bulunmadığından fonksiyon boş küme
  döndürdü — **küçük havuz/veri guard'ının tasarlandığı gibi çalıştığının kanıtı.**
- `get_kr20` SQL'inin kurulumu doğrulandı (üçlü REVOKE: `anon`/`authenticated`
  çalıştıramıyor — `false/false` teyitli; yalnız SQL Editor sahibi + `service_role`).
- **KR-20 sayısal ölçümü, deney dönemi verisiyle (80–100 öğrenci, ön/son test) yapılacak.**
  BAP formundaki vaat ölçümü bu dönemde karşılanır.

| Sınav Türü | Ders | k (soru) | Cevap Sayısı | Ort. p | KR-20 | Yorum |
|---|---|---|---|---|---|---|
| — | — | — | 0 | — | — | Veri yok (guard doğrulandı); ölçüm deney dönemine ertelendi |

## Sınırlılıklar (raporda açıkça belirtilir)

- KR-20, aynı madde setini çözen **öğrenci grubu** varsayar; ALGORA'da her öğrenci
  farklı soru alt kümeleri çözer → hesap, aynı gruba en çok cevaplanan ortak
  maddeler üzerinden yapılır (kappa etiketli yaklaşık ölçüm).
- Yapay zeka üretimli maddelerin madde istatistikleri (p, ayırt edicilik) üretim
  sıcaklığına ve konu çeşitliliğine bağlıdır; havuz genişledikçe stabilize olur.
- Küçük k ve küçük öğrenci sayısında KR-20 aşağı yönlü yanlıdır (kısıtlanmış
  varyans) — değerler düşük çıkarsa önce k'ye bakılmalıdır.
