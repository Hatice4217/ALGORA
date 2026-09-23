# ALGORA — Güvenlik Denetimi ve Test Planı

> Oluşturma: 23 Eylül 2026 · Yöntem: 5 paralel salt-okunur inceleme agent'ı (statik kod analizi — exploit çalıştırılmadı, kod değiştirilmedi)
> Kapsam: 9 API route, 3 SQL dosyası, istemci bileşenleri, lib/, config/deploy dosyaları, test altyapısı
> Bu doküman **plan**'dır; hiçbir düzeltme henüz uygulanmadı. Bulgu ID'leri kaynak agent raporlarıyla izlenebilir.

---

## 1. Yönetici Özeti — Proje Nerede Patlıyor?

| # | Bulgu | Şiddet | Kaynak |
|---|---|---|---|
| 1 | `/api/admin/clear-users` — **auth'suz tüm kullanıcı silme** endpoint'i | KRİTİK | BULGU-1 |
| 2 | **Kullanıcı kendini 1 istekle premium yapabiliyor**: `subscriptions` INSERT RLS politikası `plan`/`credits` alanlarını kısıtlamıyor | KRİTİK | RLS-BULGU-1 |
| 3 | `user_stats` / `subject_breakdown` view'ları RLS bypass ediyor — **anon kullanıcı herkesin profil/performans verisini okuyabilir** | YÜKSEK | RLS-BULGU-2 |
| 4 | `/api/auth/verify-email` — auth'suz, rate limit'siz **Brevo spam-relay** + tahmin edilebilir base64 token | YÜKSEK | BULGU-2/3 |
| 5 | `ADMIN_SECRET_KEY` admin tarayıcısında **localStorage'da düz metin** (XSS/erişimle çalınırsa ödeme onaylama yetkisi) | YÜKSEK | CLI-BULGU-1 |
| 6 | Kritik env'ler (`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SECRET_KEY`, `BREVO_API_KEY`) **vercel.json ve CI'da yok** → deploy anında hesap silme/kota/admin kırılır | KRİTİK (deploy koşullu) | CFG-1 |
| 7 | Abonelik sistemi dahil **11 dosya hiç commit'lenmemiş** — push edilse bile Vercel env'siz kırılır | YÜKSEK | CFG-10 |
| 8 | **Sunucu tarafı rate limit hiçbir yerde yok** — Gemini maliyet saldırısı ve admin key brute-force açık | ORTA | BULGU-4/7 |
| 9 | Kayıt akışı **session access_token'ı console'a logluyor** (`signUp` sonucu) | ORTA | BULGU-6 |
| 10 | `next.config.ts` webpack console-silme hack'i **Turbopack'te etkisiz** (ölü kod; ayrıca regex iç içe parantezde bundle kırıcıydı) | ORTA | CFG-3 / ÇÖK-1 |

**Cevaplanan ana sorular:**
- *Nerede çöküyor?* → Bölüm 4 (11 kararlılık bulgusu): bayat token önbelleği, refund sessiz kaybı, onboarding hata yutması → "Paketim" sonsuz yükleniyor, delete-account kısmi silme.
- *Nerede saldırıya karşı savunmasız?* → Bölüm 3: yukarıdaki 1-5 + güvenlik header'ları yok + prompt injection + soru havuzuna keyfi içerik.
- *Ne olunca güvenlik açığı ortaya çıkar?* → Bölüm 5'te 6 somut saldırı senaryosu (tetikleyici koşullarıyla).

---

## 2. Güvenlik Bulgu Envanteri (API + İstemci + DB)

### KRİTİK
- **BULGU-1** `app/api/admin/clear-users/route.ts:4-51` — DELETE endpoint'i hiçbir kimlik doğrulama yapmıyor; tüm auth.users listelenip siliniyor. "Çalışmaz" garantisi yok (anon key'e Supabase'in tepkisine bağımlı); korunmalı/kaldırılmalı.
- **RLS-BULGU-1** `database/subscriptions.sql:91-94` — INSERT politikası `WITH CHECK (auth.uid() = user_id)`; `plan='premium', credits_remaining=5000` ile insert CHECK'lere takılmıyor (`credits_limit > 0` yeterli). Sınırlayıcı tek şey PK (tek satır). *Not: Bu politika, onboarding seed'inin client'tan yapılabilmesi için bilinçli eklenmişti — tasarım hatası olarak kayda geçti.* Önerilen çözüm (uygulanacak): seed'i `on_auth_user_created` DB trigger'ına taşımak + authenticated INSERT'i kaldırmak; alternatif: kolon bazlı GRANT veya CHECK.
- **CFG-1** Kodun kullandığı `SUPABASE_SERVICE_ROLE_KEY` (generate, delete-account, subscription admin), `ADMIN_SECRET_KEY`, `BREVO_API_KEY` → vercel.json env bloğunda, .env.example'da ve CI workflow'unda yok.

### YÜKSEK
- **RLS-BULGU-2** `schema.sql:76-110` — `user_stats`, `subject_breakdown` view'ları `security_invoker=true` olmadan oluşturulmuş → view sahibi (postgres) haklarıyla çalışır, RLS atlanır. Anon REST isteğiyle her kullanıcıya ait exam_type, hedef puan, dersler, çalışma süresi okunabilir.
- **BULGU-2** `verify-email/route.ts:30` — token = `base64(email)`, sırrız; "24 saat geçerli" iddiası yalan, doğrulama sunucu tarafında yok.
- **BULGU-3** Aynı route auth'suz + rate limit'siz Brevo çağırıyor (key boşsa bile) → spam relay/maliyet; alan adı kara liste riski.
- **CLI-BULGU-1** `app/admin/page.tsx:64,74` — admin key localStorage'da; XSS veya paylaşılan bilgisayar = ödeme onaylama yetkisinin çalınması. Çözüm yönü: httpOnly cookie + sunucu oturumu.
- **CFG-4** Güvenlik header'ları yok (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
- **CFG-10** Working tree'de 11 untracked dosya (abonelik sistemi + admin paneli dahil) — push/deploy zinciri tamamlanmamış.

### ORTA
- **BULGU-4** Admin key denemesi için rate limit + loglama yok (karşılaştırma timing-safe, bu doğru).
- **BULGU-5** `generate/route.ts:156+` — subject/topic/exam_type tip-uzunluk doğrulaması olmadan prompt'a enterole ediliyor → prompt injection (JSON formatını bozma, maliyet şişirme).
- **BULGU-6** Loglama disiplini: `lib/supabase.ts:75` signUp sonucu (içinde session token) console'a; `register/page.tsx:148` aynısı; generate route'ta Gemini ham yanıtı logu; verify-email'te Brevo yanıt logu.
- **BULGU-7** Rate limiter yalnızca client-side bellek içi (`lib/security.ts`) — sunucuda login/claim/generate için limit yok.
- **RLS-BULGU-3** `payment_claims` INSERT'te status serbest → kullanıcı `status='approved'` sahte satır yazabilir (plan yükseltmez — subscriptions UPDATE kapalı — ama veri bütünlüğü bozulur).
- **RLS-BULGU-4** `questions` tablosuna kullanıcı keyfi içerikli, uzunluksuz soru yazabilir (tüm kullanıcılara görünür); kendi sorusunu `correct_answer` dahil düzenleyebilir.
- **RLS-BULGU-5/6/7** Gamification manipülasyonu: `user_profiles.current_streak/total_study_time` serbest UPDATE; `study_sessions.duration_seconds` üst sınırsız (streak CASE'i NULL completed_at'ta hatalı); `answers`'ta (user_id, question_id) unique yok → istatistik şişirme.
- **CFG-2** `.env.example` kodla senkron değil (6+ eksik değişken).
- **CFG-7** CI'da test adımı yok ("ci: test adımı kaldırıldı" commit'i).
- **CLI-BULGU-2** OAuth callback hash'te access_token taşıyor (implicit kalıntısı) + 1 sn'lik uyku yarışı (yavaş ağda başarılı girişe hata gösterme riski, ÇÖK-9).
- **CLI-BULGU-6** Tüm validasyon client-side; sunucuya giden serbest metin alanlarında (question_text, sender_name…) uzunluk kısıtı yok.

### DÜŞÜK
- BULGU-8 generate body boyut sınırı yok · BULGU-9 approve 3 adımlı non-atomik yazım · BULGU-10 e-posta URL parametresinde · BULGU-11 Origin doğrulaması yok (Bearer deseni CSRF'i fiilen engelliyor) · RLS-BULGU-5/6/7'nin gamification kısmı · RLS-BULGU-9 `period_end < period_start` CHECK yok · CFG-6 deprecated vercel-action · CFG-8 lint --max-warnings=50 · CFG-11 README gerçeklikten kopuk (Next 14/OpenAI iddiası) · CLI-BULGU-4/5 standart localStorage oturumu + NEXT_PUBLIC env'leri.

### Güvenli olan kısımlar (korunmalı)
Timing-safe admin key (sha256+timingSafeEqual) · service-role key client'a sızmıyor, NEXT_PUBLIC değil · IDOR yok (user_id hep token'dan) · delete-account'ta sunucu tarafı şifre doğrulama · Gemini key header'da · tek-pending partial unique index + 23505→409 · atomik deduct + Gemini-öncesi düşüm + refund deseni · credit_transactions salt-SELECT · kredi RPC'lerinde REVOKE/GRANT doğru · JSX interpolation (dangerouslySetInnerHTML yok → XSS kapalı).

---

## 3. Kararlılık Bulguları — Nerede Çöküyor / Sessizce Yanlış Davranıyor?

| ID | Dosya | Tetikleyici koşul | Etki |
|---|---|---|---|
| ÇÖK-3 | `lib/api.ts:7` | ~1 saat sonra expire olan JWT önbellekte kalır | İlk API isteği 401 ile düşer; istek kaybı |
| ÇÖK-2 | `generate/route.ts:215-224` | Gemini hatası + refund RPC hatası aynı anda | Kredi kalıcı kaybolur (retry/compensation yok) |
| ÇÖK-5 | `generate/route.ts:231-247` | Gemini yavaş yanıtı | Timeout/AbortController yok → istek dakikalarca açık, kredi kilitli |
| ÇÖK-6 | `onboarding/page.tsx:86-115` | Profil/abonelik insert hatası (hata hiç kontrol edilmiyor) | Dashboard'a gidilir; kredi pill yok, "Paketim" sonsuz yükleniyor; çift-submit yarışı |
| ÇÖK-7 | `delete-account/route.ts:64-85` | 8 silmeden biri başarısız sonra auth silme başarısız | Hesap yaşar, verisi yok ("yarım hesap") |
| ÇÖK-4 | `users/stats/route.ts:125-141` | Her GET | Haftalık ilerleme `Math.random()` — gerçekmiş gibi mock veri |
| ÇÖK-8 | `lib/supabase.ts:692` | Ay sonu seed (31 Oca) | JS `setMonth(+1)` taşıması; SQL interval ile tutarsız dönem uzunluğu |
| ÇÖK-10 | `subscriptions.sql:168-183` | Refund sırasında rollover çakışması / satır yok | credits_limit aşımı (1001/1000) veya yetim transaction |
| ÇÖK-11 | `lib/supabase.ts:753` | claims sorgusu hata verirse | pending_claim null döner → kullanıcı 409 ile şaşırır |
| ÇÖK-1/CFG-3 | `next.config.ts:60-77` | — (Turbopack webpack bölümünü yoksayıyor — build çıktısı "Turbopack" doğrulandı) | Console-silme hack'i etkinsiz: prod'da console.log'lar silinmiyor; hack ölü kod olarak temizlenmeli (çökme riski YOK) |
| ÇÖK-9 | `auth/callback/page.tsx:35-47` | Yavaş ağ, PKCE | 1 sn uyku sonrası hatalı "oturum kurulamadı" |

**Yarış koşulu senaryoları** (adım adım): (1) rollover↔refund limit aşımı, (2) delete-account↔in-flight generate yetim refund, (3) onboarding çift-submit (23505 yutulur; user_profiles'ta unique olmayabilir — doğrulanacak). Paralel generate + rollover senaryosu ise **korunmuş** durumda (SQL `WHERE period_end < NOW()` + atomik deduct).

---

## 4. Saldırı Senaryoları — "Ne Olunca Açık Ortaya Çıkar?"

1. **Ücretsiz premium:** Yeni kayıt olan (veya backfill öncesi satırı olmayan) herhangi bir oturumlu kullanıcı, anon key ile `subscriptions` tablosuna `{plan:'premium', credits_remaining:5000}` insert eder → RLS INSERT politikası değerleri kısıtlamadığı için kabul edilir → sınırsız AI kullanımı, Gemini faturası bizde. *(Bulgu 2; en gerçekçi ve en maliyetli senaryo.)*
2. **Veri sızıntısı (auth'suz):** Herkes `GET /rest/v1/user_stats?user_id=eq.*` → view RLS'i atladığı için tüm kullanıcıların profili/performansı açık. KVKK/veri koruma açısından kritik.
3. **Spam-relay:** `/api/auth/verify-email`'e binlerce POST → Brevo kotası/paramız tüketilir, domain kara listeye düşer; ayrıca `base64(kurban@mail.com)` ile "doğrulanmış" sayfası görüntülenebilir.
4. **Admin key hırsızlığı zinciri:** Herhangi bir XSS (bugün yok ama gelecekte bir bileşende `dangerouslySetInnerHTML` kullanılırsa) veya paylaşılan bilgisayar → localStorage'daki adminKey → saldırgan `/admin` akışıyla istediği kullanıcıya pro/premium onaylar.
5. **Gemini maliyet saldırısı (birleşik):** Pro kotası olan kullanıcı + sunucu rate limit yokluğu + sınırsız body + prompt injection (`subject` alanına 10K token talimat) → saniyede yüzlerce paralel generate isteği → kotayı meşru yolla tüketip üstüne API maliyeti şişirme.
6. **Deploy-günü felaketi:** Abonelik dosyaları push'lanır ama `SUPABASE_SERVICE_ROLE_KEY`/`ADMIN_SECRET_KEY` Vercel'e eklenmemişse: soru üretimi (kota adımı 500), hesap silme, admin panel, e-posta — **hepsi prod'da kırılır**; site teknik olarak "açık" ama temel akışlar ölü.

---

## 5. Düzeltme + Test Planı (Fazlı Yürütme)

> Kural: Önce Faz 0'daki kritik düzeltmeler, sonra testler. Her fazın çıktısı bir sonrakinin ön koşulu.

### FAZ 0 — Kritik Düzeltmeler (testlerden önce, P0)
| # | İş | Çözdüğü bulgu | Durum |
|---|---|---|---|
| 0.1 | `clear-users` route'unu sil veya `verifyAdminKey` ile koru | BULGU-1 | ✅ **TAMAMLANDI (23 Eyl)** — route + boş klasör tamamen silindi (koda referans yoktu, zaten fonksiyonel olarak bozuktu); curl ile 404 doğrulandı |
| 0.2 | subscriptions seed'ini `on_auth_user_created` trigger'ına taşı; authenticated INSERT politikasını kaldır (veya kolon-GRANT/CHECK ile kısıtla) | RLS-BULGU-1 | ✅ **TAMAMLANDI (23 Eyl)** — `subscriptions.sql`'de INSERT politikası kaldırıldı + trigger eklendi (SECURITY DEFINER, idempotent, PostgREST yüzeyi kapalı); `getSubscription` salt-okunur; çift-PK hatası da düzeltildi. **SQL'i Supabase'de çalıştırma kullanıcıya ait** |
| 0.3 | View'ları `WITH (security_invoker = true)` olarak yeniden oluştur | RLS-BULGU-2 | ✅ **TAMAMLANDI (23 Eyl)** — `schema.sql` güncellendi + canlı DB için `database/security_fixes_views.sql` migrasyonu hazır. **Migrasyonu Supabase'de çalıştırma kullanıcıya ait** |
| 0.4 | verify-email: rate limit + HMAC imzalı/tek kullanımlık token veya Supabase doğrulama akışına geçiş; BREVO key boşsa çağrı yapma | BULGU-2/3 |
| 0.5 | signUp/register console.log'larından veri temizliği (token loglama yasağı) | BULGU-6 |
| 0.6 | Vercel/CI env listelerine 3 kritik env; `.env.example` senkron; abonelik dosyalarını commit'le | CFG-1/2/10 |
| 0.7 | next.config: webpack hack'ini kaldır, `headers()` ile güvenlik header'ları | CFG-3/4 |
| 0.8 | generate girdi doğrulaması (tip/uzunluk/whitelist) + sunucu rate limit (upstash/DB tabanlı basit sayaç) | BULGU-5/7/8 |

### FAZ A — P0 Güvenlik Testleri (Faz 0 sonrası doğrulama)
A1 admin key yanlış→404 · A2 50x hızlı yanlış key (limit davranışı) · A3 env boşken verifyAdminKey=false · A4 RLS: premium self-assign UPDATE engeli · A5 RLS: claim self-approve engeli · A6 RLS: credit forge INSERT engeli · A7 SQL RPC'lerine anon erişim → permission denied · A8 delete-account IDOR/şifre · A9 sahte verify token reddi · A10 generate token'sız→401

### FAZ B — P1 API Sözleşme Testleri (integration, izole test-Supabase)
B1 claim 401/400/201/409(23505) · B2 claims liste+email enrich · B3 review 404/409/400 · B4 approve=yeni dönem (credits=limit, period=now+1ay, plan_change tx) · B5 reject aboneliğe dokunmaz · B6 GET subscription 3 yol · B7 delete-account tam akış · B8 generate girdi 400

### FAZ C — P1 Kota Zinciri
C1 kredi 1→0 · C2 kredi 0→402 (Gemini çağrılmaz) · C3 paralel 2 istek, kredi 1 → 200+402 · C4 Gemini 500→refund+1 · C5 bozuk JSON→refund · C6 rollover reset/no-op

### FAZ D — P2 SQL Unit Testleri
D1 deduct 0'da NULL · D2 refund limit aşımı davranışı (bilgilenme) · D3 paralel rollover tek reset · D4 ay-sonu tarihi (JS setMonth vs SQL interval farkı belgelenir) · D5 CHECK kısıtları

### FAZ E — P2 E2E (tek mutlu yol)
E1 kayıt→onboarding→soru→kredi azalır→claim→admin onay→kredi=limit · E2 auth regresyonu (mevcut spec'in URL assert düzeltmesiyle)

### FAZ F — P3 UI/Stub Sonrası Regresyon
F1 forgot-password (önce stub gerçek `resetPasswordForEmail`'e bağlanacak) · F2 WorkRecords DB kalıcılığı · F3 mobil/a11y
*(Stub farkları ayrıca ÇÖK-3 bayat token, ÇÖK-6 onboarding hata kontrolü, dashboard Çıkış Yap onClick'i düzeltme işlerine bağlıdır.)*

### Altyapı İhtiyaçları
1. İzole test Supabase projesi (branching); migration = `schema.sql` + `subscriptions.sql`; prod key'i testte yok.
2. Seed/teardown: `t_<runid>` önekli kullanıcılar; global-teardown service-role ile temizlik (mevcut auth testi kullanıcı bırakıyor — düzeltilecek).
3. Gemini mock: setup.ts'teki her-şeyi-mocklayan global fetch kaldırılacak; yalnızca `generativelanguage.googleapis.com` eşleşmesinde stub.
4. jest.config: `moduleNameMapper` `^@/` düzeltmesi; admin key için test env.
5. CI: PR'da unit+A+B; gece C+D+E. (`--max-warnings` düşürülür.)

---

## 6. Önerilen Başlangıç Sırası

1. ~~**Faz 0.1 + 0.2 + 0.3**~~ ✅ **KOD TARAFI TAMAMLANDI (23 Eylül 2026)** — üç kritik açık kodda/SQL'de kapatıldı (3 doğrulama agent'ı 16/16 kontrol GEÇTİ + çift-PK hatası yakalanıp düzeltildi + build yeşil + smoke test 5/5). **Kalan kullanıcı adımı: `subscriptions.sql` ve `security_fixes_views.sql`'i Supabase SQL Editor'de çalıştırmak.**
2. **Faz 0.6** (env + commit) — deploy edilebilir taban
3. **Faz 0.4 + 0.5 + 0.7 + 0.8** (verify-email, loglar, header'lar, girdi doğrulama)
4. **Faz A + B** testleri yazılır ve koşulur → yeşilse C+D → E
5. Sürekli: ÇÖK bulgularının (bayat token, refund retry, onboarding, Gemini timeout) küçük düzeltme paketleri F fazından önce

**Rapor sınırları:** Tüm bulgular statik kod incelemesinden; çalıştırılmış exploit/PoC yok. "Şüphe" işaretli maddeler (ÇÖK-9, user_profiles unique eksikliği, CI secrets durumu) dinamik testle doğrulanmalı.

---

# 7. Güçlü Yönler Analizi — Savunmanın Sağlam Olduğu Yerler

> Bölüm 1-6 zayıflıkları listeler; bu bölüm dengeyi kurar. Aynı metodoloji: 5 paralel araştırma agent'ı, kanıt temelli (dosya:satır), statik inceleme — kod değişikliği yapılmadı. Toplam 50+ doğrulanmış güçlü yönün özeti.

## 7.1 Güvenlik Güçleri

| # | Güç | Kanıt | Ne Önlüyor |
|---|-----|-------|-----------|
| G-1 | Timing-safe admin key: sha256 + `timingSafeEqual`, boş key'de fail-closed | `lib/admin-auth.ts:6-13` | Timing oracle saldırısı; konfigürasyon hatasında açık-kalma |
| G-2 | Admin endpoint'lerde 404 maskesi (401/403 yerine) | `admin/review/route.ts:12-14`, `admin/claims/route.ts:9` | Endpoint varlığının keşfi |
| G-3 | `subscriptions`'ta kullanıcı UPDATE politikası YOK — plan/kredi değişimi yalnızca service-role | `subscriptions.sql:81-111` | JS konsolundan self-premium (Faz 0.2'nin konusu olan INSERT boşluğu hariç — o kapatılınca tasarım tam) |
| G-4 | `credit_transactions` SELECT-only RLS — denetim izi kullanıcıdan dokunulmaz | `subscriptions.sql:96-100` | İşlem geçmişi silme/sahte kayıt |
| G-5 | Tüm kredi RPC'lerinde `REVOKE FROM PUBLIC` + `GRANT TO service_role` | `subscriptions.sql:242-249` | Postgres'in varsayılan PUBLIC EXECUTE açığı ile başkasının kredisini basma/düşürme |
| G-6 | Atomik `deduct_credit` + `CHECK (credits_remaining >= 0)` | `subscriptions.sql:24, 149-157` | Paralel istekle negatif kredi (TOCTOU) |
| G-7 | Rollover'da `WHERE period_end < NOW()` race guard + taze-okuma fallback | `subscriptions.sql:213-226` | Çift reset = bedava kredi yarışı |
| G-8 | Service-role key yalnızca `app/api/**` route'larda (grep ile tüm kod tabanı doğrulandı) | 5 route dosyası | Süper-anahtarın tarayıcıya sızması |
| G-9 | Her endpoint'te `auth.getUser(token)` + token'dan türetilen `user.id` — kullanıcı kontrollü user_id kabulü yok | 5 endpoint (ör. `claim/route.ts:41`) | IDOR — başkasının verisine erişim |
| G-10 | Hesap silmede şifre step-up doğrulaması + 8 tablo temizliği + auth kaydı silme | `users/delete-account/route.ts:40-78` | Çalınmış oturumla hesap silme; KVKK silme hakkı |
| G-11 | Gemini key URL yerine `x-goog-api-key` header'ında | `generate/route.ts:229-235` | Key'in proxy/access-log'larda kalıcı iz bırakması |

## 7.2 Mimari / Veri Bütünlüğü Güçleri

| # | Güç | Kanıt | Değer |
|---|-----|-------|-------|
| M-1 | Kota zinciri sıralaması: auth → rollover → 402 ön-kontrol → **atomik deduct → Gemini** | `generate/route.ts:67-231` | Kredisiz kullanıcı LLM maliyeti tetikleyemiyor |
| M-2 | Refund tüm hata yollarında; `creditDeducted` null-guard çift iadeyi engelliyor | `generate/route.ts:62-64, 215-224, 349-356` | Gemini arızasında kullanıcı kredi kaybetmiyor; `reason='refund'` ayrı denetim izi |
| M-3 | Lazy rollover — dönem yenileme ilk istekte, koşullu UPDATE ile | `subscriptions.sql:191-233` | Cron/worker altyapısı maliyeti sıfır, race güvenli |
| M-4 | `getSubscriptionSummary`: 3 paralel okuma (Promise.all), kısmi hata tolere | `lib/supabase.ts:730-754` | 3 RTT → 1 RTT; transactions çökse bile panel açılır |
| M-5 | `getOrCreateSubscription` select→insert fallback + route'ta upsert | `lib/supabase.ts:672-723` | Abonelik satırı olmayan kullanıcı kotasız Gemini kullanamıyor (self-healing seed) |
| M-6 | Tek pending claim: dostane kontrol + partial unique index + 23505→409 | `supabase.ts:768-816`, `subscriptions.sql:69-71` | App kontrolü bypass edilebilir, DB index edilemez — doğru katman |
| M-7 | Gemini JSON çıkarımında 3 kademeli fallback + şema validasyonu (choices=4, alan alias) | `generate/route.ts:287-339` | LLM format sapması kullanıcıya hata yansıtmıyor |
| M-8 | Tek-kaynak konfigürasyon: `PLAN_LIMITS` (Record, derleyici zorunlu) + SQL tarafında karşılıklı senkron uyarısı | `subscription-config.ts:5-10`, `subscriptions.sql:10-11` | Plan limiti tek yerden değişir, sapma iki taraftan da işaretli |
| M-9 | Stateless route handler'lar — modül seviyesi mutable state yok | tüm `app/api/**` | Serverless/yatay ölçekleme uyumu |
| M-10 | dbHelpers `withConnectionCheck` wrapper — env eksikse çökme yerine tanımlı degrade | `lib/supabase.ts:22-32` | Yanlış deploy'da net hata sözleşmesi |

## 7.3 Kod Kalitesi Güçleri

| # | Güç | Kanıt | Ölçüm |
|---|-----|-------|-------|
| K-1 | TypeScript strict mod | `tsconfig.json:7` | strict + isolatedModules |
| K-2 | Gerçek `any` kullanımı **0** (tek grep eşleşmesi yorum satırı) | `lib/validation.ts:146` (yorum) | 0 gerçek any |
| K-3 | Whitelist + tip daraltma + trim/slice input doğrulaması | `claim/route.ts:5, 29-39` | VALID_PLANS deseni (şimdilik tek route) |
| K-4 | Ayrık loglama: server'a Türkçe detaylı `console.error` (38 adet), kullanıcıya jenerik mesaj | `claim/route.ts:57-58` vb. | İç detay sızması yok |
| K-5 | Env guard'ları — eksik yapılandırmada console.error + 500 | `subscription/route.ts:14-20` | 3 route'da doğrulandı |
| K-6 | Zengin union/Record tipleri DB CHECK constraint'leriyle hizalı | `types/subscription.ts` ↔ `subscriptions.sql:22-48` | Tip-DB uyumu derleyici + DB çift katman |
| K-7 | Karmaşık eşzamanlılık kararlarının SQL dosyasında gerekçelendirilmesi | `subscriptions.sql` (index, RLS, atomik bölümler) | Bakımda bağlam kaybı yok |
| K-8 | ESLint: next core-web-vitals + typescript, kural zayıflatma yok | `eslint.config.mjs` | Kurallar fiilen devrede |
| K-9 | ~23 bileşen işlevsel klasörlü (ui/landing/dashboard) + lucide-react ikonlar | `app/components/`, `components/` | Tekrar eden UI parçası yok |

## 7.4 UX / Ürün Güçleri

| # | Güç | Kanıt | Kullanıcı Değeri |
|---|-----|-------|------------------|
| U-1 | 402 CREDIT_EXHAUSTED → upgrade modal (3 ayrı tetik noktası) | `dashboard/page.tsx:262-266` | Kredi bitince ölü uç yok, çözüme yönlendirme |
| U-2 | Context-aware CTA: Pricing → `/dashboard?tab=package&upgrade=plan` | `PricingSection.tsx:16-17`, `dashboard/page.tsx:105-117` | Modal doğru planda açılıyor |
| U-3 | PackagePanel durum şeffaflığı: renk eşikli progress (≤%10 kırmızı), amber pending kartı, Türkçe etiketli işlem geçmişi | `PackagePanel.tsx:75-145` | "Param gitti mi, ne zaman aktif?" belirsizliği görünür cevap |
| U-4 | UpgradeModal 3 adım + IBAN/tutar kopyala butonları + clipboard fallback | `PackagePanel.tsx:214-405` | IBAN okuma hatası riski düşük |
| U-5 | Görünür UI'da İngilizce sızması **0**, tr-TR locale tarih/saat | grep doğrulaması, `PackagePanel.tsx:20,23` | Hedef kitleye tam yerel deneyim |
| U-6 | Loading/disabled/empty state'ler fiilen her ekranda (9 spinner, işlem başına buton kilidi, 4+ empty state) | `admin/page.tsx:135-208`, `PackagePanel.tsx:123-124` vb. | Boş/beyaz ekran yok |
| U-7 | Onboarding 3 adım + validasyon kilidi + abonelik seed entegrasyonu | `onboarding/page.tsx:107, 334-337` | Dashboard'a mutlaka kredili giriş |
| U-8 | Admin paneli: durum rozetleri, çift tıklama koruması, Enter ile giriş | `admin/page.tsx` | Tek yönetici için yeterli, hatasız akış |

## 7.5 Performans / Build Güçleri

| # | Güç | Kanıt | Ölçüm |
|---|-----|-------|-------|
| P-1 | **Lighthouse: Performance 93, Erişilebilirlik/İyi Uygulama/SEO 100** (mobil emülasyon, rapor dosyası mevcut) | `.lh-tmp/report.json` (22.09.2026) | Doğrulanmış uçtan uca metrik |
| P-2 | Hafif bağımlılık: 13 production dep, ağır UI framework yok | `package.json:28-44` | Küçük node_modules + bundle |
| P-3 | Aktif optimizasyonlar: compress, etags, AVIF/WebP pipeline, optimizeCss, lucide-react tree-shaking, kaynak haritasız prod | `next.config.ts:11-25` | Yapısal hız kazançları |
| P-4 | %53 server component oranı (43 tsx'den 23 'use client') | grep sayımı | Client bundle'a girmeyen yarı yarıya |
| P-5 | next/font self-hosted: display swap, Sans preload, Mono bilinçli lazy | `layout.tsx:2-16` | 0 Google font RTT |
| P-6 | Minimal varlık: public/ toplam ~4 KB (8 SVG/ico) | `ls public/` | LCP bozan raster yok |
| P-7 | Erken çıkış zinciri + `gemini-flash-lite-latest` + `maxOutputTokens: 1000` | `generate/route.ts:227, 244` | Gecikme/maliyet dengesi bilinçli |
| P-8 | Singleton anon Supabase client (30+ kullanım); service client'larda `persistSession: false` | `lib/supabase.ts:17-19` | Tekrarlanan createClient overhead'i yok |

## 7.6 Denge Değerlendirmesi

**En güçlü katman: abonelik/kredi sistemi.** Atomik deduct (G-6) + deduct-before-Gemini sıralaması (M-1) + refund guard'ı (M-2) + PUBLIC EXECUTE revoke'u (G-5) + UPDATE politikası yokluğu (G-3) birbirini tamamlayan çok katmanlı bir savunma kurmuş; route kodu ile SQL fonksiyonları tutarlı. Bu katman çoğu üretim uygulamasından olgun.

**Genel desen:** Yeni yazılan kod (abonelik sistemi, admin-auth) yüksek standartta; açıkların çoğu (bkz. Bölüm 1-2) **yeni güçlerin eski koda uygulanmamış olmasından** kaynaklanıyor — clear-users'a verifyAdminKey eklenmemesi (KRİTİK-1), view'larda security_invoker eksikliği (KRİTİK-3), eski route'larda VALID_PLANS deseninin olmayışı (ORTA). Yani sistem kötü tasarlanmış değil; **tutarlılaştırılmaya ihtiyacı var.** Faz 0'daki 8 düzeltmenin tamamı bu "yeni standardı eskiye yayma" işidir.

**Doğrulanamayanlar:** K-3 whitelist deseni yalnızca 1 route'da; U-9 erişilebilirlik kısmi (aria ~15 kullanım, focus trap yok); P-3'teki webpack bloğu Turbopack altında etkisiz (önceki denetimde doğrulandı — ölü kod).
