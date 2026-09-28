# Canlı Dayanıklılık Testleri — Rapor (28 Eylül 2026)

> Kapsam: Aynı gün yapılan **Probe Tamamlama Turu** (3 vektör) + kullanıcının istediği **4 dayanıklılık testi** tek dosyada. Hedef sistem: Vercel prod (`algora-sigma.vercel.app`) + canlı Supabase (`nfdjxwmhvalwokzyyvre`). Yöntem: geçici probe script'leri (her seferinde oluşturuldu, çalıştırıldı, **silindi**) + her probe için ayrı test kullanıcısı (6 tablo + auth tam temizliği, iz bırakmaz). **Kod değişikliği YAPILMADI** — bulgular sonraki iş maddesi olarak rapor sonunda listelendi.
>
> Not: Testler sırasında (17:41-17:43) Gemini'de kısa süreli hata dalgası gözlendi — bu beklenmedik bir şans oldu: "upstream HTTP hatası → anında iade" yolunun canlıda da çalıştığını 3 ayrı koşuda doğruladı (toplam 4 deduct / 4 refund, kullanıcı kaybı 0).

---

## A) Probe Tamamlama Turu — Özet

Detay: `SECURITY_AUDIT_TEST_PLAN.md` Bölüm 9.7. Üç satır özet:

| Probe | Sonuç | Kanıt |
|---|---|---|
| ① Gerçek JWT ile kredi RPC'lerine doğrudan erişim (5 varyant) | ✅ PASS — Vektör 3 %100 | 5/5 `42501 permission denied`, kredi 20→20, tx 0 |
| ② difficulty:"toString" whitelist bypass | ❌ YENİ BULGU **F12** (DÜŞÜK) | Canlıda HTTP 200 + kredi düştü; `in` prototype chain'i tarıyor; fix: `Object.hasOwn` |
| ③ Gece yarısı simülasyonu (period_end geçmiş + 10 paralel) | ✅ PASS | Rollover tam 1 kez, 10/10 istek credits=20 gördü, period +1.00 gün |

---

## B) Test 1 — Vercel Serverless Zaman Aşımı / Yarıda Kalan İstek (Execution Abort)

**Senaryo:** Kullanıcı "Üret" dedi → kredi düştü (-1) → istek Gemini'de beklerken fonksiyon aniden öldürüldü. Catch + `refund_credit` çalışma şansı bulabiliyor mu?

**Yöntem:** Local prod server (gerçek env, gerçek Gemini) + generate isteği → kredi düştükten ~6 sn sonra (Gemini yanıtı gelmeden) server sürecine `taskkill //F` (SIGKILL eşleniği — serverless platform kill'i birebir modelleyen tek yöntem; Vercel'de Gemini asılı kalıp maxDuration'ı aşması beklenemez).

**Kanıt:**

| Ölçüm | Değer |
|---|---|
| credits_remaining | 20 → **19** |
| credit_transactions | yalnızca `{"amount":-1,"reason":"generation"}` — **refund YOK** |
| questions satırı | **0** |
| istemci fetch | ECONNRESET (bağlantı aniden koptu) |

**Cevap — KRİTİK SORUNUN YANITI: KREDİ BUHARLAŞIYOR.** Fonksiyon dışarıdan (SIGKILL / platform kill) öldürüldüğünde JavaScript çalışmayı anında durdurur; catch bloğu ve `refund_credit` **hiç çalışmaz**. Statik kod incelemesi nedeni teyit ediyor:

- Gemini fetch'inde **timeout/AbortSignal yok** (`app/api/questions/generate/route.ts:360` düz `fetch`) → Gemini asılı kalırsa fonksiyon platform limitine kadar bekler
- vercel.json'da **maxDuration tanımlı değil** → platform varsayılanı geçerli (Fluid compute); gözlemlenen canlı üretimler 34.6-60.2 sn başarılı → limit bunun üstünde, ama Gemini tam anlamıyla asılı kalırsa kill kaçınılmaz ve iadesizdir
- İade yalnızca iki yolda yapılıyor: `!response.ok` anında iade (route.ts:385) ve catch bloğu (route.ts:546) — ikisi de sürecin YAŞAMASI şartına bağlı

**Kalan risk / öneri (kod, sonraki iş):** Gemini fetch'e `AbortSignal.timeout(...)` eklenmeli (platform maxDuration'ın güvenli payı kadar, örn. 60 sn) — böylece asılı çağrı, platform kill'i gerçekleşmeden **catch bloğuna düşer ve iade garantilenir**. Uzun vade: deduct "rezervasyon + mutabakat" modeline taşınabilir (şu anki tek-başına çözüm timeout).

---

## C) Test 2 — F5 / Ağ Kopması ve Öksüz Kredi

**Senaryo:** Kredi düştü, Gemini çalışıyor; istemcinin bağlantısı koptu (F5 / mobil internet). Kredi mi gidiyor, soru mu kayboluyor, ikisi birden mi?

**Yöntem:** CANLI Vercel + AbortController ile +3.0 sn'de bağlantı koparıldı (kredi düştükten sonra, Gemini yanıtı gelmeden). 70 sn beklenip DB durumu okundu.

**Kanıt:**

| Ölçüm | Değer |
|---|---|
| deduct | 17:37:17.5 (`-1 generation`) |
| refund | **17:38:01.7 (`+1 refund`)** — deduct'ten 44 sn sonra |
| credits_remaining | 20 → **20 (tam iade)** |
| questions satırı | 0 (soru hiç DB'ye yazılmadı) |

**Cevap — EN İYİ SENARYO: Vercel, istemci kopmasını fonksiyonun içine taşıyor; altta yatan çağrı settle olduğunda hata catch bloğuna düşüyor ve kredi İADE EDİLİYOR.** Öğrenci kredi kaybetmiyor; yalnızca ~40 sn zaman kaybediyor. "Geçmiş Sorular"da kurtarma ihtiyacı da doğmuyor, çünkü soru hiç materialize olmadı.

**Notlar:**
- İade gecikmeli geliyor (~44 sn) → UI'daki kredi sayacı bu pencerede bayat görünür (kozmetik)
- Bu davranış Vercel platformuna bağlı (Fluid compute iptal propagasyonu); Test 1'deki **sert kill** bundan farklıdır ve iadesizdir — iki senaryoyu karıştırmamak gerek

---

## D) Test 3 — Çift Cihaz Canlı Saldırısı (SessionGuard Stresi)

**Senaryo:** Aynı hesap telefonda ve laptop'ta açık; aynı saniyede iki cihazdan "Üret". SessionGuard diğer cihazın oturumunu 401 ile kesiyor mu?

**Yöntem:** Tek hesap + **2 bağımsız oturum** (iki ayrı `signInWithPassword` = iki cihaz simülasyonu). ① 2. girişten sonra 1. token hâlâ geçerli mi? ② Eşzamanlı 2 generate isteği. 2 koşu + tek-çağrı sağlaması.

**Kanıt (koşu 1):**
- 2. girişten sonra 1. token ile `/api/subscription` → **HTTP 200** (oturum öldürülmedi)
- Telefon (Matematik): **HTTP 200**, soru geldi (60.2 sn); Laptop (Türkçe): HTTP 502 (~1.5 sn'de hızlı upstream hatası)
- tx: `-1, -1, +1` → credits **19** (muhasebe kusursuz: başarısız olan iade edildi)

**Kanıt (koşu 2):** 2. token yine 200; **iki istek de 502**; tx: `-1, -1, +1, +1` → credits **20** (tam iade)

**Sağlama:** Tek çağrı da 502 döndü (3.4 sn) → hatalar Gemini tarafındaydı (o an key throttle/arıza), paralellikle ilgisiz.

**Cevap:**
1. **Çoklu oturum serbest** — 2. giriş diğer cihazın token'ını geçersiz kılmıyor. SessionGuard yalnızca **aynı tarayıcı deposunu** (aynı origin localStorage) izleyen istemci bileşeni; iki cihaz = iki bağımsız Supabase oturumu, sunucu ikisini de kabul eder. Beklenen davranış bu (401 kesme YOK).
2. **İki cihazdan eşzamanlı üretim kabul ediliyor** — auth, rate limit ve kredi düşümü her iki istekte de sorunsuz işledi (deduct zaman damgaları 0.6 sn arayla).
3. **Kredi muhasebesi yarışlara karşı kusursuz** — 2 koşuda toplam 4 deduct / tam karşılığı 4 refund; tek kuruş kayıp/yutma yok (atomik RPC + iade disiplini canlıda bir kez daha kanıtlandı).
4. Gemini arıza durumunda sistem **zarif düşüyor**: 502 + tam iade.

---

## E) Test 4 — Zehirli LLM Yanıtı (Structural Hallucination)

**Senaryo:** Gemini syntax-geçerli ama mantıksal olarak bozuk JSON döndürürse (A: 2 şıklık soru; B: 5 şık + correctAnswer=9) validasyon katmanı retry'ı mı tetikliyor, bozuk veri DB'ye mi yazılıyor, UI çöküyor mu?

**Yöntem:** Gerçek route modülü import edildi (tsx) + `globalThis.fetch` monkey-patch ile Gemini çağrısı yakalanıp zehirli JSON döndürüldü. Deduct/insert/refund **gerçek canlı DB**'de gerçekleşti (probe kullanıcı, sonunda temizlik). Durum C (tamamen geçerli soru) düzeneğin kendini kanıtlaması için kontrol grubu.

**Kanıt:**

| Durum | Zehir | HTTP | Retry? | DB | Kredi | Sonuç |
|---|---|---|---|---|---|---|
| **A** | `choices: ["3","4"]` (2 şık) | 500 | ✅ 2 deneme de "şema dışı üretim elendi" (route.ts:467 `length !== 5`) | 0 satır | -1 + **+1 refund = net 0** | ✅ **SAVUNDU** — öğrenciye gitmedi, DB'ye yazılmadı, iade tamam |
| **B** | `correctAnswer: 9` (sınır dışı, 5 şık) | 200 | ❌ ilk denemede kabul | **1 satır, `correct_answer=4` olarak YAZILDI** | -1 (iade yok) | ⚠️ **SESSİZ CLAMP** — `Math.min(4, Math.max(0, 9))` (route.ts:493) |
| **C** | geçerli soru (kontrol) | 200 | — | 1 satır, correct=3 doğru | -1 | ✅ Düzenek doğrulandı |

**Cevap:**
- **2 şık senaryosu:** retry mekanizması (MAX_ATTEMPTS=2) çalışıyor; tüm denemeler başarısız → catch → iade; bozuk soru ne ekrana ne DB'ye gitti. Şema kontrolü (`length !== 5`) bu sınıfı tam kapatıyor.
- **Sınır-dışı indeks senaryosu:** sistem **çökMÜYOR ama bozuk veriyi sessizce kabul ediyor** — 9 → 4'e kırpılıyor, yani Gemini hangi şıkkı doğru işaret etmek istediyse unutulup **son şık (E) doğru kabul edilerek** soru DB'ye yazılıyor ve öğrenciye dönüyor. UI çökmesi yok; risk içerik bütünlüğü (küresel soru havuzuna semantik-bozuk satır girmesi).
- Ek gözlem (kod incelemesinden, test kapsamı dışı): `correctAnswer` string/NaN gelirse clamp `NaN` üretir → insert hatası → placeholder UUID yolu (cevap FK reddi riski) — sonraki işte guard alınabilir.

---

## Sonuç Matrisi

| # | Test | Sistem davranışı | Kredi kaybı | Veri bütünlüğü | Not |
|---|---|---|---|---|---|
| 1 | Server kill (execution abort) | ❌ catch çalışmıyor | **VAR (-1, iadesiz)** | Soru yok | Tek gerçek kredi-kaybı yolu; self-timeout ile kapatılabilir |
| 2 | F5 / ağ kopması (canlı) | ✅ iptal → catch → iade | 0 | Soru materialize olmadı | En iyi senaryo; iade ~44 sn gecikmeli |
| 3 | Çift cihaz (2 oturum, paralel) | ✅ oturumlar bağımsız, istekler kabul, muhasebe kusursuz | 0 | 2 koşu + sağlama temiz | SessionGuard istemci-bileşeni; sunucu tarafını ilgilendirmiyor |
| 4 | Zehirli LLM — 2 şık | ✅ retry (2 deneme) → iade | 0 | DB temiz | Şema kontrolü tam kapatıyor |
| 4 | Zehirli LLM — index 9 | ⚠️ sessiz clamp | -1 (sorulu) | Bozuk soru DB'ye yazıldı | Çökme yok; aralık doğrulaması (retry) önerilir |
| — | Probe turu (Bölüm A) | 2 PASS + 1 bulgu (F12) | 0 | — | Detay: SECURITY_AUDIT_TEST_PLAN.md 9.7 |

## Rapor Sonrası İş Kalemleri (kod değişikliği — kullanıcı onayına bekliyor)

1. **Gemini fetch'e self-timeout** (`AbortSignal.timeout`) — Test 1'deki tek kredi-kaybı yolunu kapatır; catch'teki iade zaten hazır
2. **correctAnswer aralık doğrulaması** — clamp yerine 0-4 dışındaysa "şema dışı" sayıp retry'a düşür (Test 4-B); NaN/string guard'ı da aynı if'te
3. **F12 fix** (Bölüm A'dan): `!(difficulty in difficultyMap)` → `!Object.hasOwn(difficultyMap, difficulty)`
4. (Kozmetik, isteğe bağlı) Test 2'deki ~40 sn'lik iade penceresinde UI kredi sayacı bayat görünüyor — kabul edilebilir, not düşüldü

**Temizlik beyanı:** 5 test kullanıcısı (Test 1: 1, Test 2: 1, Test 3: 2, Test 4: 1) 6 tablo + auth ile silindi; probe script'leri silindi; `questions.created_by` probe izleri NULL'a çekildi. Local server Test 1 sonrası kapatıldı (port 3000 boş doğrulandı).
