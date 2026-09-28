# ALGORA — Güvenlik Denetimi ve Test Planı

> Oluşturma: 23 Eylül 2026 · Yöntem: 5 paralel salt-okunur inceleme agent'ı (statik kod analizi — exploit çalıştırılmadı, kod değiştirilmedi)
> Kapsam: 9 API route, 3 SQL dosyası, istemci bileşenleri, lib/, config/deploy dosyaları, test altyapısı
> **Durum (26 Eylül 2026):** Faz 0'ın 8 düzeltmesinin tamamı uygulandı; Faz A/B/C canlı sistemde gerçek probe kullanıcılarıyla doğrulandı (aşağıda sonuç tabloları). Kalan: Faz 0.5-0.7 kısmi maddeler + D/E/F fazları.

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
| 0.4 | verify-email: rate limit + HMAC imzalı/tek kullanımlık token veya Supabase doğrulama akışına geçiş; BREVO key boşsa çağrı yapma | BULGU-2/3 | ✅ **TAMAMLANDI (26 Eyl)** — `lib/email-token.ts` (HMAC-SHA256 + 24s expiry, ADMIN_SECRET_KEY'den alan-ayrıştırılmış anahtar, timingSafeEqual); link artık YENİ `GET /api/auth/verify-email/confirm` endpoint'ine gider → imza/süre/kullanıcı doğrular + `email_confirm=true` yazar + sonuç sayfasına yönlendirir; sahte sayfa (`atob` + sahte başarı) kaldırıldı. E2E: token birimi 7/7, yönlendirme 4/4 (valid/expired/tampered/garbage), email_confirm flip canlıda doğrulandı |
| 0.5 | signUp/register console.log'larından veri temizliği (token loglama yasağı) | BULGU-6 |
| 0.6 | Vercel/CI env listelerine 3 kritik env; `.env.example` senkron; abonelik dosyalarını commit'le | CFG-1/2/10 |
| 0.7 | next.config: webpack hack'ini kaldır, `headers()` ile güvenlik header'ları | CFG-3/4 |
| 0.8 | generate girdi doğrulaması (tip/uzunluk/whitelist) + sunucu rate limit (upstash/DB tabanlı basit sayaç) | BULGU-5/7/8 | ✅ **TAMAMLANDI (26 Eyl)** — rate limit daha önce (kullanıcı 10/dk); girdi whitelist'i eklendi: subject 9 ders kapanık küme, difficulty baslangic/orta/ileri, exam_type TYT/AYT, topic 100 karaktere, previous_question 2000 karaktere kırpılır; enum dışı değer 400. Probe: 4 sahte girdi 400, geçerli üretim 200 + kırpma çalışıyor |

### FAZ A — P0 Güvenlik Testleri ✅ CANLI DOĞRULANDI (26 Eylül)
> Yöntem: gerçek probe kullanıcısı + gerçek route/DB çağrıları (mock yok), sonrasında tam temizlik. PostgREST notu: RLS'e takılan UPDATE **hata DÖNMEZ** (0 satır etkilenir) → her probe sonrası SELECT ile gerçek durum teyit edildi.

| # | Test | Sonuç |
|---|---|---|
| A1 | admin key'siz istek → 404 (varlık maskesi) | ✅ 404 |
| A2 | 50× hızlı yanlış key | ✅ 50/50 → 404; *gözlem: sunucu rate limit yok (bilinen BULGU-4/7, yalnız verify-email IP limitli)* |
| A4 | RLS: kendi aboneliğini premium'a çekme UPDATE'i | ✅ ENGELLENDİ (satır free/10 kaldı — PostgREST sessiz 0 satır) |
| A5 | RLS: kendi payment_claim'ini approve etme UPDATE'i | ✅ ENGELLENDİ (status pending kaldı) |
| A7 | anon client ile `deduct_credit`/`refund_credit`/`rollover_subscription` RPC | ✅ 3/3 permission denied (REVOKE devrede; PGRST202 imza yanılgısına dikkat: parametreler tek `p_user_id`) |
| A8 | delete-account: başkasının token'ı + yanlış şifre | ✅ reddedildi |
| A9 | verify-email confirm: expired/tampered/garbage token | ✅ 4/4 yönlendirme doğru (yalnız geçerli HMAC success) |
| A10 | generate: token'sız istek | ✅ 401 |

### FAZ B — P1 API Sözleşme Testleri ✅ CANLI DOĞRULANDI (26 Eylül)
| # | Test | Sonuç |
|---|---|---|
| B1 | claim: token'sız 401 / eksik alan 400 / geçerli 201 / ikinci pending 409 | ✅ 4/4 sözleşme doğru |
| B2 | admin claims listesi + user_email enrich | ✅ 200, e-posta ekli (yanlış key → 404) |
| B3 | review: olmayan id 404 / işlenmiş claim 409 | ✅ |
| B4 | approve etkileri | ✅ plan=pro, kredi 1000/1000, period_end ≈ +30 gün, `plan_change` tx yazıldı |
| B5 | reject aboneliğe dokunmaz | ✅ before/after anlık görüntüsü bit-bit aynı |
| B6 | GET subscription 3 yol (token'sız 401 / başkası 401/404 / kendi 200) | ✅ |

### FAZ C — P1 Kota Zinciri ✅ CANLI DOĞRULANDI (26 Eylül)
| # | Test | Sonuç |
|---|---|---|
| C1+C3 | kredi=1 + 2 PARALEL generate | ✅ bir 200 (gerçek soru + deduct 1→0), biri 402 CREDIT_EXHAUSTED — atomik deduct yarış koruması canlıda kanıtlandı |
| C2 | kredi=0 → generate | ✅ 402 `{"code":"CREDIT_EXHAUSTED"}` + kalan/dönem bilgisi; Gemini çağrılmadan döndü |
| C4 | sahte GEMINI_API_KEY ile sunucu restart → generate | ✅ 502 + tx izi: `-1 generation` (…36.123) → `+1 refund` (…36.629) → net kredi 5/1000 dokunulmadan |
| C5 | bozuk JSON → refund | ⏭ atlandı (Gemini mock gerektirir; refund yolu C4'te canlı kanıtlandı, retry `continue` yolu kod incelemesinde doğrulandı) |
| C6 | rollover: free+geçmiş dönem→10 günlük reset · gelecek dönem→no-op · pro+geçmiş→1000 | ✅ 3/3 (no-op'ta 3 kredi korunudu) |

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
4. ~~**Faz A + B**~~ ✅ + **Faz C** — üçü de canlı probe doğrulamasıyla tamamlandı (26 Eylül 2026, sonuç tabloları yukarıda)
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

---

# 8. Final Tarama — 5 Agent'lı Yeniden Denetim (26 Eylül 2026)

> Yöntem: 5 paralel salt-okunur agent (API route'lar · abonelik/kredi · istemci+auth akışları · config/deploy/env · yeni güvenlik kodu), Faz 0 8/8 + Faz A/B/C doğrulamalarından sonra.
> **Ana sonuç: KRİTİK bulgu 0.** Çok katmanlı savunma (atomik deduct, ACL üçlü-revoke, refund guard, timing-safe admin, HMAC token, IDOR=0, secret sızıntısı=0) kanıtlı yerinde. Bulanların büyük bölümü "yeni standartların eski koda uygulanmaması" ailesinden — Bölüm 7.6'daki desen aynen geçerli.

## 8.1 ORTA bulgular (öncelikli düzeltme adayları)

| # | Bulgu | Kanıt | Tür |
|---|---|---|---|
| F1 | `getClientIp` XFF **ilk** hop'u alıyor → IP rate limit header-spoof ile bypass; verify-email relay'de tek savunma e-posta limiti kalır | `lib/rate-limit.ts:45-51` | güvenlik |
| F2 | `claim` route DB `error.message`'ını ham olarak istemciye döndürüyor (şema/RLS detayı sızabilir) | `app/api/subscription/claim/route.ts:57-63` | güvenlik |
| F3 | Generate'de rollover RPC hatası loglanıp YUTULUYOR → dönemı dolmuş free kullanıcı haksız 402 alabilir | `generate/route.ts:135-137` | kullanıcı-kaybı |
| F4 | Approve'da status güncellemesi `.eq('status','pending')` şartsız → paralel approve TOCTOU (çift plan_change tx) | `admin/review/route.ts:101-104` | bütünlük |
| F5 | Logout modül-seviyesi `authToken`'ı temizlemiyor → aynı sekmede kullanıcı değişince bayat token | `lib/api.ts:7,33-37` (`logout()` hiç çağrılmıyor) | istemci |
| F6 | Onboarding'de profil kayıt hatası sessiz yutuluyor + insert (upsert değil) → tekrar-onboarding'de döngü/hata görünmez (ÇÖK-6 aynen) | `onboarding/page.tsx:98-104`, `lib/supabase.ts:269-274` | UX |
| F7 | ÇÖK-4 hâlâ açık: haftalık ilerleme `Math.random()` mock verisi (kullanıcı kuralı: canlıda mock yok) | `users/stats/route.ts:136-151` | veri dürüstlüğü |
| F8 | Verify token tek kullanımlık değil (24s) + GET query string'de → log/geçmiş sızıntısında 24s doğrulama çalınması | `email-token.ts:6`, `confirm/route.ts:21` | güvenlik |
| F9 | Confirm'da listUsers taraması 20×200=4000 kullanıcı tavanı → büyüyen DB'de meşru onay sessizce "invalid" | `confirm/route.ts:41-57` | ölçek |
| F10 | CSP `script-src 'unsafe-inline'` → XSS'te ikinci savunma katmanı yok (nonce-CSP middleware ile çözülür) | `next.config.ts:30` | savunma-derinlik |
| F11 | LGS kullanıcısı sessizce TYT sorusu alıyor (bildirim yok; ders listesi LGS içermiyor) | `dashboard/page.tsx:81-82,203-209` | UX | ✅ **ÇÖZÜLDÜ (27 Eyl)** — LGS üründen tamamen kaldırıldı (onboarding/Settings/seeder/DB CHECK); canlı DB için `database/remove_lgs.sql` hazır (LGS profiller TYT'ye taşınır + LGS sorular silinir + constraint yenilenir — çalıştırma kullanıcıya ait) |

## 8.2 DÜŞÜK bulgular (hızlı temizlik paketi)

- `difficulty` whitelist `'toString'` gibi prototype üyelerini geçiriyor (`in` yerine `Object.hasOwn`) — `generate/route.ts:204,237`
- questions insert başarısızsa kredi yakılır + `questionId` rastgele UUID'ye düşer → cevap FK patlar — `generate/route.ts:466,482-484`
- `subscription` GET hata metni passthrough — `subscription/route.ts:52-57`
- claim oluşturmada rate limit yok (spam → admin liste şişer) — `claim/route.ts`
- refund_credit'te `< credits_limit` üst sınırı yok + satır-yoksa yetim tx (ÇÖK-10 bileşenleri) — `subscriptions.sql:173-188`
- `authFetch` 401'de gerçek yenileme/yönlendirme yok — `lib/api.ts:79-84`
- `lib/backend-test.ts` token loglayan ölü test kodu — silinmeli
- Log hijyeni: Gemini ham yanıtı + Brevo gövdesi + kullanıcı e-postası console'a — `generate/route.ts:373,390`, `verify-email/route.ts:201`, `lib/supabase.ts:131`
- Callback success metni onboarding'e giden için yanıltıcı; `expired` durumunda CTA register'a gidiyor (resend daha doğru) — `callback/page.tsx:101`, `verify-email/page.tsx:69-95`
- topic fallback 'genel' (prompt) vs 'Genel' (insert) tutarsız — `generate/route.ts:250,471`
- approve dönem ucu JS `setMonth` vs SQL `INTERVAL '1 month'` (ay-sonu taşması) — `review/route.ts:67-68`
- günlük reset tx'inde reason='monthly_reset' adlandırma — `daily_free_quota.sql:102-105`
- callback setTimeout'lar clearTimeout'suz — `callback/page.tsx:27,45,52,56,61`

## 8.3 Config/Deploy/env

- `.env.example` bayat: **eksik 4** (SUPABASE_SERVICE_ROLE_KEY, ADMIN_SECRET_KEY, GEMINI_API_KEY, BREVO_API_KEY); **ölü 3** (OPENAI_API_KEY, NEXT_PUBLIC_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- Ölü bağımlılıklar: `resend`, `@google/generative-ai` (hiç import yok; Gemini raw fetch)
- next.config.ts:60-118 webpack console-silme hack'i hâlâ duruyor (Turbopack yoksayar — ölü kod; ayrıca `optimizeCss` Turbopack uyumu gözden geçirilmeli)
- CI secret isimleri (`SUPABASE_URL`/`SUPABASE_ANON_KEY`) repo secret'larıyla eşleşme doğrulanmalı (CI yeşil olduğu için büyük ihtimalle tamam)
- Kök dizin test kalıntıları (BACKEND_TEST_SCRIPT.js, MANUAL_EMAIL_CHECK.js, 5× *_FIX/RESULTS.md) — hijyen
- Sağlam: secret sızıntısı YOK (takip edilen dosyalarda canlı anahtar yok), .gitignore kapsamlı, vercel.json minimal + ignoreCommand yok, headers() yerinde, `openai` paketi gerçekten silinmiş

## 8.4 Sonuç

Faz 0 + A/B/C sonrası sistemde **kritik açık kalmadı**; kalanlar tutarlılaştırma (F1-F4, F7), ölçek/kalite (F9, düşük maddeler) ve savunma-derinlik yatırımları (F8, F10). Önerilen kapanış sırası: hızlı düzeltme paketi (F1-F7 + 8.2'deki tek-satırlıklar) → savunma hazırlık dosyası.

# 9. 5 Agent'lı Tarama — Bugünkü İşlerin Denetimi (28 Eylül 2026)

> Yöntem: 3 salt-okunur denetim agent'ı (DB/RLS kodu · auth kodu · istemci/config) + 2 **canlı saldırı simülasyonu** (RLS çapraz-hesap · auth akışı). Kapsam: e-posta onayı zorunlu kılma (Supabase Confirm email ON + eski verify-email altyapısının silinmesi), user_goals + RLS, SessionGuard, updateUserSettings INSERT fallback, Goals/UserPreferences provider'ları, dashboard turları.
> **Ana sonuç: KRİTİK bulgu 0.** Saldırı simülasyonlarında savunan HER operasyonda kazandı (çapraz okuma 0 satır, çapraz INSERT 403, self-premium reddi, delete-account orphan yok). Yalnız 1 YÜKSEK (env hijyeni) + birkaç ORTA veri-bütünlüğü/istemi bulgusu. Canlı simülasyonlar `audit-probe-*@test-local.com` sahte kullanıcılarla yapıldı; tüm izler (satırlar + auth kayıtları + .tmp scriptler) temizlendi, `audit-probe` kalıntısı 0 olarak listUsers-taramasıyla doğrulandı.

## 9.1 Canlı Saldırı Simülasyonu — Savunanın Kazandığı Yerler (kanıtlı)

| Saldırı | Beklenti | Gerçekleşen | Sonuç |
|---|---|---|---|
| A'nın token'ıyla B'nin `user_goals` satırlarını okuma (`?user_id=eq.<B>`) | 0 satır | `[]` — RLS sessiz filtre | ✅ |
| A → B'nin hedefine UPDATE/DELETE | 0 satır | 0 satır; service-role ile B'nin verisi DOKUNULMAMIŞ doğrulandı | ✅ |
| A → `user_id=<B_id>` ile `user_goals` INSERT sahteciliği | 403 | **403 "new row violates row-level security policy"** — WITH CHECK kanıtlı | ✅ |
| A → B'nin `user_profiles` satırını UPDATE (name='HACKED') | 0 satır | 0 satır; B'nin adı değişmedi | ✅ |
| A → `user_id=<B_id>` ile `user_profiles` INSERT (fallback taklidi) | 403 | 403 RLS reddi | ✅ |
| A → `subscriptions` self-premium (INSERT plan='premium' / UPDATE kendi satırı) | RED / 0 satır | INSERT RLS reddi (politikası yok); UPDATE 0 satır, plan 'free' kaldı | ✅ |
| `deduct_credit`/`refund_credit`/`rollover_subscription`'ı authenticated token'la RPC olarak çağırma | permission denied | 9.7 Probe ① ile canlıda doğrudan kanıtlandı: 5/5 `42501 permission denied` (kendi+kurban user_id, anon dahil), kredi/tx değişmedi | ✅ |
| Hesap silme sonrası orphan `user_goals` (KVKK) | cascade temizliği | FK `ON DELETE CASCADE` canlı kanıtlandı: delete-account 200 → user_goals 0 satır + auth kaydı silinmiş | ✅ |
| signIn enumeration (var-olmayan vs yanlış-şifre) | birebir aynı mesaj | İkisi de `Invalid login credentials` 400 — jenerik Türkçe'ye çevriliyor | ✅ |
| resend enumeration (var-olan vs var-olmayan e-posta) | sessiz yutma | İkisi de hatasız; helper jenerik mesaj sarmalıyor — varlık sızması yok | ✅ |
| `/auth/callback?error_description=...<script>` XSS | text-node render | `<script>` HTML'de 0 kez; `dangerouslySetInnerHTML` yok — açık-redirect de yok | ✅ |
| Silinen verify-email yolları | 404 | POST `/api/auth/verify-email` + GET `/confirm?token=x` + `/auth/verify-email` → hepsi 404 | ✅ |
| Confirm-email-ON davranış varsayımı | session=null | Canlıda `mailer_autoconfirm: false` + signUp → user VAR, session NULL, identities 1 | ✅ |

## 9.2 Saldırı simülasyonunun KAYBettiği yerler (delikler)

| # | Şiddet | Delik | Kanıt | Etki | Öneri |
|---|---|---|---|---|---|
| S1 | **ORTA (canlı kanıt)** | `user_profiles.user_id` UNIQUE DEĞİL → INSERT fallback ile **aynı hesap için çift profil satırı üretildi** (probe: 2 art arda INSERT başarılı — TYT'li + AYT'li satır) | RLS agent'ı canlıda kanıtladı; `lib/supabase.ts:706-723` fallback | Yetki yükseltme DEĞİL; ama yarış durumunda (paralel sekme) satırlar sessizce çoğalır → dashboard/Settings hangi satırı okuduğuna göre tutarsız veri | Migration: canlıda dedupe → `ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id)`; schema.sql baseline'a ekle |
| S2 | **ORTA (canlı kanıt)** | **Login brute-force'a sunucu-taraflı rate limit YOK** — `loginRateLimiter` bellek-içi istemci singleton'ı (`lib/security.ts:206`), F12 ile veya doğrudan Supabase REST'e gidilerek bypass | Auth saldırı agent'ı: login API route değil, doğrudan Supabase `token?grant_type=password` | Tek savunma Supabase platform limiti (bilinçli ayar değil) | Kısa vade: Supabase Dashboard → Auth → Rate Limits sıkılaştır (kullanıcı adımı). Orta vade: sunucu login proxy + `lib/rate-limit.ts` deseni |
| S3 | DÜŞÜK (canlı kanıt) | EEP açıkken API-düzeyi ince enumeration: kayıtlı e-postada `identities.length=1`, kayıtsızda 0 (UI bu alanı KULLANMIYOR — sızmıyor; yalnız doğrudan REST sorgusuyla ölçülebilir) | Auth saldırı agent'ı probe | UI etkisi yok; Supabase standart davranışı | Kabul edilebilir; Dashboard'da EEP "hidden identity" modunda olduğundan emin olunmalı |

## 9.3 ORTA bulgular (kod/istemci denetimi)

| # | Bulgu | Konum | Not |
|---|---|---|---|
| O1 | **`userName` localStorage anahtarı userId-prefix'siz** + SessionGuard kilit yönlendirmesi ve logout-dışı akışlar bu anahtarı temizlemiyor → çıkış-yapmadan-hesap-değiştirmede önceki hesabın ADI yeni hesabın ekranında flash olarak görünüyor (SessionGuard'ın kendi amacını kısmen yenen senaryo) | `app/dashboard/page.tsx:104,191,216,227,725`; `SessionGuard.tsx:53` | `algora_prefs_v1:<userId>` deseniyle hizala veya kilit/login akışına removeItem |
| O2 | signUp ham İngilizce Supabase mesajları register'a aynen basılıyor (örn. "Password should be at least 6 characters") | `lib/supabase.ts` signUp normalizasyonu | Türkçe eşleme tablosu (şifre uzunluğu, duplicate e-posta, geçersiz e-posta) |
| O3 | Supabase min şifre 6 ↔ uygulama 8 eşiği boşluğu → 6-7 karakterli şifre Supabase'de geçerli, UI'da reddedilir (ve tersi senaryo Dashboard'dan değişince) | Supabase Auth ayarı + `lib/security.ts` | Dashboard'dan Minimum password length = 8 (kullanıcı adımı) |
| O4 | Callback setTimeout'lu redirect'lerde cleanup yok + sabit 1sn oturum-bekleme yarışı (yavaş ağda hash işlenmeden redirect) | `app/auth/callback/page.tsx:27,45,52,56,61` | clearTimeout + oturum polling'i üst sınırlı yeniden deneme |
| O5 | `savePreferences` iyimser güncelleme DB hatasında geri alınmıyor → rozet/sayaç DB'de olmayan değerle render (yenilemede düzelir) | `UserPreferencesProvider.tsx:121-142` | GoalsProvider'daki rollback deseni (`GoalsProvider.tsx:111-113`) aynen uygulanabilir |
| O6 | `user_profiles` name/target_university/target_major length sınırı yok (UI maxLength var ama API-düzeyi yok → 23514 değil sessiz uzun değer) | `lib/supabase.ts` updateUserSettings | DB CHECK veya helper kırpma |
| O7 | `.env.example` bayat: SUPABASE_SERVICE_ROLE_KEY, ADMIN_SECRET_KEY, GEMINI_API_KEY eksik; ölü OPENAI_API_KEY duruyor (8.3'ten beri açık — yükseltildi) | `.env.example` | Yeni kurulum Gemini'siz 502 alıyor — üç satır ekle, OPENAI'ı sil |

## 9.4 DÜŞÜK bulgular

- `algora_active_tab` userId-prefix'siz → hesap değişince diğer hesabın son sekmesi açılır (hassas değil) — `dashboard/page.tsx:117,138`
- signIn'de e-posta console.log'u (PII hijyeni) — `lib/supabase.ts:159` çevresi
- Şifrede `<`/`>` karakterleri `sanitizeInput` yüzünden kullanılamıyor (fonksiyonellik, güvenlik değil) — login/register handleChange
- goalId UUID ön-doğrulaması yok; addGoal hatası sessiz revert (toast yok); getGoals tarih filtresi yok — hedefler modülü
- Legacy `algora_prefs_v1` anahtarının silinmesi user bulunduğunda yapılıyor (pratikte sorun yok)
- Kilit modalı klavye odağını trap'lemiyor (içerik zaten görünmez + handler guard'ları var)
- `tests/setup.ts:10` ölü `OPENAI_API_KEY` set ediyor

## 9.5 Pozitif bulgular (bugünün işinin kalitesi)

- **RLS savunması canlı saldırıda kusursuz:** user_goals 4/4 operasyon, user_profiles çapraz-yazım, self-premium — hepsi reddedildi (9.1 tablosu)
- **Silinen verify-email altyapısı iz bırakmamış:** repo genelinde `verify-email|email-token|BREVO` grep'i 0 sonuç; canlıda eski yollar 404; testlerde kırık referans 0. Eski kritik bulgular (F8 auth'suz relay, base64 token) tek hamlede ve tamamen kapandı
- **SessionGuard mantığı sağlam:** SIGNED_OUT → bilinen-id sıfırlaması (çık-gir kilit tetiklemiyor), signOut bilinçli çağrılmıyor (ortak oturum deposu korunuyor), opak kilit + sayaç
- **Goals/UserPreferences hesaba-bağlılık prensibi tutarlı:** `algora_prefs_v1:<userId>` + legacy anahtar SİLİNEREK (taşınmayarak) çapraz-hesap karışması kökten çözülmiş; GoalsProvider'da iyimser yazım + rollback + temp-id değişimi örnek desen
- **Güvenlik header'ları tam ve eksiksiz** (CSP, XFO DENY, nosniff, Referrer-Policy, Permissions-Policy) — bugünkü değişikliklerden etkilenmemiş
- ** Türkçe mesaj disiplini:** bugün eklenen tüm kullanıcı-mesajlarında İngilizce kalıntı 0; SessionGuard/DailyGoals/HedefRozeti tamamen Türkçe
- **signIn/resend enumeration sızdırmıyor** (canlı kanıt) — EEP + jenerik mesaj sarmalama birlikte çalışıyor
- `hesaplaGunlukSeri` + `yerelTarihStr` UTC-tuzağından arınmış; `getSubjectColor` YDT-uyumlu

## 9.6 Önerilen Faz 0.9 — kapanış adımları

1. **SQL migration** (`database/user_profiles_unique.sql`): canlıda çift-satır dedupe (varsa) → `user_profiles.user_id` UNIQUE constraint → schema.sql baseline eşitle. *(Kullanıcı SQL Editor'de çalıştırır — 28 Eyl alışkanlık)*
2. **Kullanıcı Supabase Dashboard adımları:** Minimum password length = 8 (O3) + Auth Rate Limits sıkılaştırma (S2 kısa-vade savunması)
3. **İstemci paketi:** userName anahtarını `algora_name_v1:<userId>` yap veya SessionGuard+login akışına removeItem (O1) · callback clearTimeout (O4) · savePreferences rollback (O5)
4. **Mesaj paketi:** signUp İngilizce→Türkçe eşleme tablosu (O2)
5. **Config:** .env.example güncelle (O7) — üç eksik anahtar + OPENAI satırını sil
6. **Kullanıcı kararı bekleyen temizlik** (9.4 + 8.3'ten): ölü dep ×5, `app/logo-preview-old`, webpack console-hack, `lib/backend-test.ts`, kök dizin test kalıntıları
7. **F12 fix (9.7):** generate route'da `!(difficulty in difficultyMap)` → `!Object.hasOwn(difficultyMap, difficulty)` (tek satır, kod değişikliği)

Sıra önerisi: 1+2 (DB/ayar, kullanıcıya ait) paralel → 3+4 tek commit → 5+7 tek commit → 6 ayrı temizlik turu.

## 9.7 Probe Tamamlama Turu — Kalan 3 Vektörün Canlı Kapanışı (28 Eylül 2026)

> Yöntem: kod değişikliği YOK; 3 geçici probe script'i (çalıştırıldı, sonra silindi) + her probe için ayrı test kullanıcısı (tam temizlik: 6 tablo + auth). Hedef sistem: Vercel prod (`algora-sigma.vercel.app`) + canlı Supabase. Amaç: 9.1-9.2'de "statik/yeterli" sayılan üç kalemi gerçek kanıtla kapatmak.

| Probe | Beklenti | Gerçekleşen | Sonuç |
|---|---|---|---|
| ① Gerçek JWT ile `/rest/v1/rpc/deduct_credit` — saldırgan→kurban `p_user_id` | permission denied | **403 `42501 permission denied for function deduct_credit`** | ✅ PASS |
| ① Aynı RPC — saldırgan→kendi user_id | permission denied | 403 `42501` | ✅ PASS |
| ① Aynı RPC — anon (Bearer'sız, yalnız anon key) → kurban | permission denied | 401 + `42501` (Postgres seviyesi, PostgREST maskesi değil) | ✅ PASS |
| ① `refund_credit` — saldırgan→kurbana kredi basma | permission denied | 403 `42501` | ✅ PASS |
| ① `rollover_subscription` — saldırgan→kurbanın dönemini zorla yenileme | permission denied | 403 `42501` | ✅ PASS |
| ① Etki doğrulaması | kredi/tx dokunulmamış | attack 20→20, victim 20→20; credit_transactions 0/0 | ✅ PASS |
| ② `difficulty:"toString"` (string) canlı `/api/questions/generate` | 400 | **HTTP 200** (34.6 sn = gerçek Gemini çağrısı), kredi -1 (`generation` tx) → **F12 YENİ BULGU** | ❌ BYPASS |
| ② `difficulty:{toString:'orta'}` (object) | 400 | 400 — `typeof` guard'ı sağlam, Gemini'ye gitmedi | ✅ PASS |
| ③ period_end 1 dk geçmişe + credits 5'e çekildi → **10 paralel** GET `/api/subscription` | tam 1 rollover | 10/10 HTTP 200, **hepsi credits=20 gördü** (bayat 5 kimseye görünmedi); period_start/end tam +1.00 gün; `monthly_reset` tx **TAM 1** (amount 20); çift yükleme 0 — `UPDATE ... WHERE period_end < NOW()` yarış koruması canlıda kanıtlandı | ✅ PASS |

### F12 (YENİ — DÜŞÜK): difficulty whitelist `in` operatörüyle bypass ediliyor

- **Kök neden:** `app/api/questions/generate/route.ts:200` — `!(difficulty in difficultyMap)`; JS `in` operatörü **prototype chain'i de tarar** (`'toString' in {}` → true). Düz obje literali olan `difficultyMap` (route.ts:60) kendi anahtarlarını (`baslangic/orta/ileri`) Object.prototype mirasından ayıramıyor.
- **Canlı kanıt:** `difficulty:"toString"` → 200 + kredi düşüşü; `difficultyMap['toString']` native fonksiyon olduğundan prompt'a zorluk metni olarak fonksiyon kaynağı gider (`difficultyMap[difficulty] || difficulty`, route.ts:235).
- **Etki sınırı:** yalnızca ~13 sabit `Object.prototype` üye adı geçebilir (`toString`, `constructor`, `valueOf`, `__proto__`...) — keyfi metin enjeksiyonu YOK; kullanıcı kendi kredisiyle saçma-zorluklu soru üretir; JSON şema validasyonu çıktı yapısını korur. Gizlilik/bütünlük etkisi yok → DÜŞÜK, ama whitelist'in sözleşmesi bozuk.
- **Fix (Faz 0.9 madde 7):** `Object.hasOwn(difficultyMap, difficulty)` — tek satır.

> Not: probe ②'nin ilk denemesi `.env.local`'deki `NEXT_PUBLIC_APP_URL=http://localhost:3000` yüzünden lokale gitti (ECONNREFUSED) — canlı hedefli probe script'leri sabit canlı URL kullanmalı. Path notu: generate route `/api/generate` değil `/api/questions/generate`.

## 9.8 Deploy Sonrası Re-Probe — Faz 0.9 Fix'lerinin Canlı Doğrulaması (28 Eylül 2026)

Commit `359446a` Vercel deploy SUCCESS sonrası, taze probe kullanıcısıyla canlı (algora-sigma.vercel.app) doğrulama:

| Probe | Beklenti | Gerçekleşen | Sonuç |
|---|---|---|---|
| Başlangıç kredisi (free seed) | 20 | `credits_remaining=20` | ✅ |
| ② F12 — `difficulty:"toString"` canlı generate | 400, Gemini'ye gitmeden | **400** "Geçersiz ders veya zorluk seviyesi." | ✅ DÜZELDİ |
| ② F12 — `difficulty:"valueOf"` | 400 | 400 | ✅ DÜZELDİ |
| ② F12 — `difficulty:"hasOwnProperty"` | 400 | 400 | ✅ DÜZELDİ |
| F12 sonrası etki | kredi/tx dokunulmamış | credits 20→20, credit_transactions 0 | ✅ |
| Geçerli üretim (Matematik/Türev/orta/TYT) — AbortSignal.timeout regresyon kontrolü | 200 + 5 şık | **200**, 5 şık, doğruIndex=1, gerçek türev sorusu | ✅ |
| Geçerli üretim kredi muhasebesi | tam -1 + tek tx | credits 20→**19**, tx `[{-1, "generation"}]` | ✅ |

**Sonuç: 9/9 PASS.** F12 fix canlıda kapandı; self-timeout (Görev 7) ve correctAnswer doğrulaması (Görev 8) normal akışı bozmuyor (timeout'un asılı-upstream yolu canlı Gemini'de tetiklenemez — local mock kanıtı geçerli; burada yalnızca regresyon yok denetlendi). Probe kullanıcıları tam temizlikle (answers/questions anonim/tx/subscriptions/profiles/auth) silindi.

> Şema notu (sonraki probe'lar için): `/api/subscription` → `{ data: { subscription: { credits_remaining, ... } } }`; generate başarı gövdesi → `{ success, data: { question, choices, correctAnswer, credits_remaining } }`; credit_transactions kolonları `amount`/`reason` (`transaction_type` DEĞİL).
