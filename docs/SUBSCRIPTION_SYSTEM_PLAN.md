# ALGORA Paket/Abonelik Sistemi — Uygulama Planı

> Oluşturma tarihi: 22 Eylül 2026
> Durum: Plan onaylandı, uygulamaya başlanmadı.
> Revizyon 2 (22 Eylül): kod incelemesi sonrası 7 nokta güçlendirildi — yarış koşulları (partial unique index, deduct null → 402), approve period semantiği, refund reason ayrımı, timing-safe admin key, mevcut kullanıcı backfill, `cancelled` kapsam notu.
> Bu dosya, plan modunda hazırlanan uygulama planının revize edilmiş halidir.

## Bağlam
Pricing sayfasındaki 3 paket (Başlangıç ücretsiz / Pro ₺199 / Premium ₺499) tamamen görsel; veritabanında abonelik veya kredi tablosu yok. Amaç: paket sistemini çalışır hale getirmek — kredi takibi, AI soru üretiminde kota zorlaması, "Paketim" sekmesi ve manuel ödeme onay akışı (şimdilik PSP yok; mimari ileride Iyzico/PayTR'e hazır).

## Kararlar
- **Ödeme:** Şimdilik manuel — kullanıcı havale/EFT yapar, talep oluşturur, admin onaylar. `payment_claims` tablosuna `provider`/`provider_ref` kolonları şimdiden konur (PSP geçişi için).
- **Kotalar:** Free 10/ay · Pro 1000/ay · Premium 5000/ay ("sınırsız" adil kullanım).
- **Kota bitince:** 402 + dashboard'da ikna edici yükseltme modalı + kredi sayacı.
- **UI:** Dashboard'a yeni **"Paketim"** sekmesi.
- **Yükseltme onayı semantiği:** Admin onayı anında **yeni 1 aylık dönem** başlar — `period_start = now()`, `period_end = now() + 1 ay`, `credits_remaining = credits_limit = PLAN_LIMITS[plan]`, `status = 'active'`. (Gerekçe: onay, ödemenin geldiğinin teyidi olduğu için faturalama döngüsü onay gününden başlar; mevcut (free) dönemin devam ettirilmesi rollover ile tutarsız düşer.)
- **Tek pending talep — DB seviyesinde garanti:** `payment_claims` üzerinde partial unique index: `(user_id) WHERE status = 'pending'`. Uygulama katmanındaki check-then-insert yalnızca dostane hata mesajı için kalır; eşzamanlı isteklerde unique ihlali (Postgres `23505`) yakalanıp 409'a çevrilir.
- **Refund ayrımı:** Gemini hata iadesi `reason = 'refund'` olarak kaydedilir; `admin_adjust` yalnızca gerçek admin manuel bakiye müdahalesi. Loglarda karışmaz.
- **Admin key karşılaştırması timing-safe:** düz `===` yerine sha256 + `crypto.timingSafeEqual` (bkz. Adım 4).
- **Mevcut kullanıcılar (backfill):** SQL dosyasında `auth.users`'tan tüm mevcut kullanıcılara free subscription seed'i bulunur (`ON CONFLICT (user_id) DO NOTHING` — idempotent). Böylece admin listelerinde eksik satır olmaz; sonradan eklenen kullanıcılar için lazy `getOrCreateSubscription` fallback korunur (ikisi birlikte güvenli).
- **`cancelled` status:** MVP kapsamı DIŞINDA — enum'da kalır (ileride migration gerektirmesin) ama MVP'de hiçbir route bu değeri set etmez. Downgrade/iptal akışı sonraki faz.

## Mimari
- 3 yeni tablo (RLS'li): `subscriptions`, `credit_transactions`, `payment_claims`. Kullanıcı kendi satırlarını okur/insert eder; **onay ve kredi düşme işlemleri service-role client ile API route'ta** yapılır (mevcut desen: `app/api/users/delete-account/route.ts`, `SUPABASE_SERVICE_ROLE_KEY`).
- Kredi düşme **race-safe**: atomik SQL fonksiyonu `deduct_credit` (`UPDATE ... WHERE credits_remaining > 0`); fonksiyon **null döndürürse** (paralel istek son krediyi aldı) route Gemini'yi **hiç çağırmadan** 402 verir.
- Tek pending talep **race-safe**: DB seviyesinde partial unique index; uygulama katmanı kontrolü yalnızca kullanıcı dostu mesaj için.
- Aylık reset: cron yok, **lazy rollover** — okumada `period_end < now()` ise period +1 ay, kredi plan limitine resetlenir. (Approve'daki period sıfırlaması bu mantıkla tutarlı: her plan değişimi yeni dönem demek.)

## Uygulama Adımları

### 1. `database/subscriptions.sql` (yeni dosya — Supabase SQL Editor'de elle çalıştırılacak)
- `subscriptions`: `user_id (unique, FK cascade)`, `plan ('free'|'pro'|'premium')`, `status ('active'|'pending'|'cancelled')`, `credits_remaining`, `credits_limit`, `period_start`, `period_end`, timestamps
- `credit_transactions`: `user_id`, `amount` (-1 tüketim / +N reset/iade), `reason ('generation'|'monthly_reset'|'plan_change'|'admin_adjust'|'refund')`
- `payment_claims`: `user_id`, `plan`, `status ('pending'|'approved'|'rejected')`, `sender_name`, `reference_note`, `provider`, `provider_ref`, `reviewed_at`
  - **Partial unique index (tek pending):** `CREATE UNIQUE INDEX one_pending_claim_per_user ON payment_claims (user_id) WHERE status = 'pending';`
- `deduct_credit(p_user_id)` fonksiyonu: atomik düşme + transaction kaydı; kredi yoksa null döner
- **Backfill:** `INSERT INTO subscriptions (...) SELECT id, 'free', 'active', PLAN_LIMITS.free, ... FROM auth.users ON CONFLICT (user_id) DO NOTHING;` — mevcut kullanıcılar için idempotent seed
- Not: `status = 'cancelled'` enum'da durur ama MVP'de set eden kod yok (downgrade/iptal sonraki faz)
- RLS: kullanıcı kendi satırlarını görür/yazar; fonksiyon ve onaylar service-role ile

### 2. Tipler ve config (yeni dosyalar)
- `types/subscription.ts`: `PlanId`, `PlanConfig`, `PLANS`, `Subscription`, `CreditTransaction`, `PaymentClaim`, `SubscriptionSummary` (types/question.ts düz-interface stili)
- `lib/subscription-config.ts`: `PLAN_LIMITS = { free: 10, pro: 1000, premium: 5000 }`, `PAYMENT_INFO` (IBAN vs. — **PLACEHOLDER, kullanıcı dolduracak**)

### 3. `lib/supabase.ts` — yeni dbHelpers (mevcut `{ data, error }` deseni)
- `getOrCreateSubscription(userId)`: select → yoksa free insert; **lazy rollover** kontrolü
- `getSubscriptionSummary(userId)`: subscription + son 20 transaction + pending claim (Paketim tek çağrıda dolar)
- `createPaymentClaim(...)`: önce select ile bekleyen talep kontrolü → varsa 409 (dostane mesaj); asıl garanti DB'deki partial unique index'te — insert sırasında `23505` yakalanır, o da 409'a çevrilir (check-then-insert yarışına karşı)
- Kredi düşme helper'ı burada YOK (RPC service-role ile route'ta)

### 4. Yeni API route'ları
- `GET /api/subscription` — Bearer auth (mevcut desen) → `getSubscriptionSummary`
- `POST /api/subscription/claim` — body `{ plan, sender_name, reference_note }`; bekleyen varsa 409
- `GET /api/subscription/admin/claims` + `POST /api/subscription/admin/review` — auth: `x-admin-key` header vs `ADMIN_SECRET_KEY` env (yanlışsa 404). Karşılaştırma **timing-safe**:
  ```typescript
  import { createHash, timingSafeEqual } from 'crypto';
  const ok = timingSafeEqual(
    createHash('sha256').update(provided ?? '').digest(),
    createHash('sha256').update(expected).digest()
  ); // sha256 ile uzunluk farkı throw'unu ve timing sızıntısını aynı anda önler
  ```
- **Approve semantiği:** service-role ile subscription upsert — `plan`, `status='active'`, `credits_remaining = credits_limit = PLAN_LIMITS[plan]`, `period_start = now()`, `period_end = now() + 1 ay` (**onay anında yeni dönem başlar**) + `plan_change` transaction kaydı. **Reject:** yalnızca claim durumu güncellenir (`reviewed_at` set).
- `.env.local`'e `ADMIN_SECRET_KEY` eklenecek

### 5. Kota zorlaması — `app/api/questions/generate/route.ts`
- Satır ~77 (auth check sonrası): subscription'ı çek (rollover dahil), `credits_remaining <= 0` → `402 { error, code: 'CREDIT_EXHAUSTED', data: { plan, credits_remaining, period_end } }`
- Gemini çağrısından **önce** `deduct_credit` çağır (yarış penceresi kapanır); fonksiyon **null döndürürse** Gemini **hiç çağrılmadan** `402 CREDIT_EXHAUSTED` döndür (paralel istek son krediyi almış olabilir); Gemini hata verirse krediyi iade et (+1, `reason: 'refund'`)
- Başarılı yanıtta `data.credits_remaining` döner (sayaç güncellemesi için)

### 6. Dashboard — `app/dashboard/page.tsx`
- Satır 64: tab union'a `'package'` ekle; satır ~358 tabs dizisine `{ id: 'package', label: 'Paketim' }` (Analizler ile Ayarlar arası)
- `generateQuestion` (satır ~204): `CREDIT_EXHAUSTED` kodunu yakala → upgrade modal aç; başarılı üretimde `credits_remaining` ile state güncelle
- Header'a kredi sayacı pill'i (tıklayınca Paketim sekmesi)
- Yeni state'ler: `subscription`, `showUpgradeModal`; `fetchData`'ya `/api/subscription` çağrısı

### 7. `components/dashboard/PackagePanel.tsx` (yeni — SettingsPanel deseni)
1. Durum kartı: plan, kredi progress bar, yenilenme tarihi
2. Bekleyen talep kartı (sarı uyarı)
3. Kullanım geçmişi (son 20 transaction)
4. Upgrade kartları (Pro/Premium) → 3 adımlı modal: IBAN talimatı (kopyala butonları) → talep formu → `POST /claim` + toast

### 8. Diğer dokunuşlar
- `app/components/landing/PricingSection.tsx`: oturum varsa Pro/Premium CTA → `/dashboard?tab=package` (dashboard query param'ı okuyup upgrade modalı açar); yoksa mevcut `/auth/register`
- `app/onboarding/page.tsx` handleSubmit (~satır 112): profil sonrası `getOrCreateSubscription` seed
- `app/api/users/delete-account/route.ts` satır ~53 `userTables`'a `'subscriptions'`, `'credit_transactions'`, `'payment_claims'` ekle

## Doğrulama (E2E)
1. SQL'i Supabase'de çalıştır → tablolar + RLS
2. Yeni kullanıcı → onboarding → free/10 kredi satırı
3. 1 soru üret → kredi 9'a düşer, `-1 generation` transaction'ı
4. Krediyi tüket (SQL ile hızlandırılabilir) → 402 + upgrade modal + sayaç 0
5. Paketim → Pro talebi → pending kartı; ikinci talep 409 (uygulama katmanı); iki **eşzamanlı** claim isteği → yalnız biri insert olur (partial unique index testi)
6. `/admin` (key girilir) → claim listele → Approve → plan Pro, 1000 kredi, `plan_change` kaydı ve `period_end ≈ onay zamanı + 1 ay` (yeni dönem)
7. SQL ile `period_end`'i geçmiş yap → Paketim'i aç → kredi resetlendi
8. Hesap sil → üç yeni tabloda satır kalmadığını doğrula
9. Yanlış admin key → 404
10. `npm run build` + production sunucuda duman testi

## Kritik Dosyalar
- `database/subscriptions.sql` (yeni)
- `lib/supabase.ts`, `types/subscription.ts` (yeni), `lib/subscription-config.ts` (yeni)
- `app/api/questions/generate/route.ts` (kota zorlaması)
- `app/api/subscription/**` (yeni route'lar), `/admin` sayfası (yeni)
- `app/dashboard/page.tsx`, `components/dashboard/PackagePanel.tsx` (yeni)
- `app/components/landing/PricingSection.tsx`, `app/onboarding/page.tsx`, `app/api/users/delete-account/route.ts` (küçük düzenlemeler)
