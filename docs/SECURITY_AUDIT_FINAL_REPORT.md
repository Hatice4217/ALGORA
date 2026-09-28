# ALGORA — Güvenlik Denetimi FİNAL RAPORU

> **Tarih:** 28 Eylül 2026
> **Kapsam:** Tüm uygulama — 9 API route, SQL şema/RLS/RPC, istemci bileşenleri, auth akışları, config/deploy/env, test altyapısı
> **Yöntem:** 4 bağımsız denetim turu; her turda 5 paralel salt-okunur inceleme agent'ı + **canlı saldırı simülasyonu** (gerçek probe kullanıcılarıyla exploit, mock yok)
> **Detaylı çalışma dokümanı:** `docs/SECURITY_AUDIT_TEST_PLAN.md` (Bölüm 1-9, bulgu kanıtları dosya:satır düzeyinde)

---

## 1. Yönetici Özeti

| Gösterge | Değer |
|---|---|
| **Açık KRİTİK bulgu** | **0** ✅ |
| Canlı saldırı simülasyonlarında savunanın skoru | **13/13 operasyonda saldırı reddedildi** (Bölüm 4) |
| Kapatılan kritik/yüksek açık | 8/8 (ilk denetimdeki tümü) |
| Kalan ORTA bulgu | 12 (hiçbiri yetki yükseltme veya veri sızıntısı değil) |
| Kalan DÜŞÜK bulgu | ~20 (temizlik/hijyen paketi) |
| Deploy durumu | Canlı: `https://algora-sigma.vercel.app` — deploy zinciri GitHub→Vercel otomatik, SUCCESS |

**Tek cümlelik durum:** Sistemin en değerli katmanları (abonelik/kredi, RLS veri izolasyonu, auth) canlı saldırı altında kanıtlanmış şekilde sağlam; kalan işler tutarlılaştırma (yeni güvenlik standartlarının eski koda yayılması), veri-bütünlüğü kenar durumları ve temizliktir — hiçbiri acil güvenlik riski taşımaz.

**Ana desen (tüm turlarda teyit edildi):** Açıkların kökeni kötü tasarım değil; **güçlü yeni standartların eski koda uygulanmamış olması**. Bu nedenle kalan iş "tutarlılaştırma" niteliğindedir.

---

## 2. Denetim Süreci — Zaman Çizelgesi

| Tarih | Tur | Yöntem | Ana Çıktı |
|---|---|---|---|
| 23 Eyl | **Tur 1: İlk denetim** | 5 salt-okunur agent, statik analiz | 3 KRİTİK + YÜKSEK/ORTA envanteri; fazlı düzeltme planı (Bölüm 1-6) |
| 23 Eyl | **Tur 1b: Güçlü yönler analizi** | Aynı metodoloji, ters bakış | 50+ doğrulanmış güçlü yön (Bölüm 7); "en güçlü katman: abonelik/kredi" |
| 23-26 Eyl | **Faz 0 düzeltmeleri** | Kod + SQL + canlı migrasyon | 8/8 kritik düzeltme uygulandı (Bölüm 3) |
| 26 Eyl | **Tur 2: Final tarama** | 5 agent, düzeltme sonrası | KRİTİK 0; F1-F11 ORTA envanteri (Bölüm 8) |
| 26 Eyl | **Faz A/B/C canlı doğrulama** | Gerçek probe kullanıcıları, canlı sistem | A 8/8 · B 6/6 · C kota zinciri kanıtlı (atomik deduct, refund, rollover) |
| 28 Eyl | **Tur 3: Canlı saldırı simülasyonu** | 3 statik agent + 2 saldırı agent'ı | **KRİTİK 0; savunan 13/13 kazandı** (Bölüm 4); kalan delikler S1-S3 (Bölüm 5) |

**Denetim disiplini:** Her tur salt-okunurdu (kod değiştirilmedi); saldırı simülasyonları `audit-probe-*@test-local.com` sahte kullanıcılarıyla yapıldı, ardından tüm izler (DB satırları + auth kayıtları + geçici scriptler) silindi ve sıfır kalıntı `listUsers` taramasıyla doğrulandı.

---

## 3. Kapatılan Açıklar — İlk Denetimden Kalan 8/8 Kritik/Yüksek

| # | Açık (ilk şiddet) | Çözüm | Kanıt |
|---|---|---|---|
| 1 | Auth'suz tüm-kullanıcı-silme endpoint'i (KRİTİK) | `clear-users` route'u **tamamen silindi** | curl → 404; kodda referans yok |
| 2 | Self-premium: `subscriptions` INSERT RLS'i plan/kredi kısıtlamıyordu (KRİTİK) | INSERT politikası kaldırıldı; seed `on_auth_user_created` trigger'ına taşındı (SECURITY DEFINER) | Canlı probe: INSERT → 403 RLS reddi; UPDATE → 0 satır, plan `free` kaldı |
| 3 | `user_stats`/`subject_breakdown` view'ları RLS bypass ediyordu (YÜKSEK) | View'lar `security_invoker = true` ile yeniden oluşturuldu (canlı migrasyon) | Anon REST isteği artık boş döner |
| 4 | verify-email: auth'suz Brevo spam-relay + tahmin edilebilir base64 token (YÜKSEK) | Önce HMAC-SHA256 imzalı token (timingSafeEqual); ardından **altyapı tamamen kaldırılıp Supabase native e-posta onayına geçildi** (-575 satır) | Eski yollar 404; repo genelinde `verify-email\|email-token\|BREVO` grep'i 0 sonuç; canlıda `mailer_autoconfirm: false` + onaysız oturum NULL |
| 5 | Session access_token console'a loglanıyordu (ORTA) | Tüm token sızıntı logları temizlendi/güvenli hale getirildi | Grep doğrulaması |
| 6 | Kritik env'ler deploy hattında yoktu (KRİTİK-deploy koşullu) | Vercel Git entegrasyonu kuruldu; env'ler Vercel dashboard'a eklendi (10 anahtar); 11 untracked dosya commit'lendi | İlk başarılı deploy 26 Eyl (914c2e9) |
| 7 | Sunucu tarafı rate limit hiç yoktu (ORTA) | `lib/rate-limit.ts` sliding window: generate 10/dk (auth sonrası, kredi düşümü ÖNCE), verify-email IP 5/10dk + e-posta 3/saat | Local smoke: `200 200 200 429` + Retry-After |
| 8 | Güvenlik header'ları yoktu (YÜKSEK) | `next.config.ts headers()`: CSP, XFO DENY, nosniff, Referrer-Policy, Permissions-Policy | Yanıt header'larında doğrulandı |

**Ek olarak kapatılanlar:** generate girdi whitelist'i (subject/difficulty/exam_type kapanık küme, dışı 400; topic 100 / previous_question 2000 krk kırpma) · 500 internal hata sızıntısı → jenerik 502 · sahte forgot-password → gerçek `resetPasswordForEmail` akışı · mock/veri-dürüstlüğü temizliği (Math.random istatistikleri, hardcoded "Son Çözülenler", sahte bülten formu ve "500+ öğrenci" iddiası) · Türkçe karakterli e-postaya anlaşılır uyarı · e-posta onayı zorunlu (Confirm email ON) · çift-oturum koruması (SessionGuard).

---

## 4. Canlı Saldırı Simülasyonu — Savunanın Kazandığı Yerler (28 Eylül, kanıtlı)

> Gerçek iki hesap (A, B) + gerçek route/DB çağrılarıyla exploit denendi. PostgREST notu: RLS'e takılan UPDATE hata DÖNMEZ (0 satır) → her probe sonrası SELECT ile gerçek durum teyit edildi.

| Saldırı | Beklenti | Gerçekleşen | Sonuç |
|---|---|---|---|
| A'nın token'ıyla B'nin `user_goals` satırlarını okuma | 0 satır | `[]` — RLS sessiz filtre | ✅ |
| A → B'nin hedefine UPDATE/DELETE | 0 satır | 0 satır; B'nin verisi dokunulmamış doğrulandı | ✅ |
| A → `user_goals` INSERT sahteciliği (user_id=B) | 403 | **403 "violates row-level security policy"** — WITH CHECK kanıtlı | ✅ |
| A → B'nin `user_profiles` satırını UPDATE | 0 satır | 0 satır; B'nin adı değişmedi | ✅ |
| A → `user_profiles` INSERT (fallback taklidi) | 403 | 403 RLS reddi | ✅ |
| `subscriptions` self-premium (INSERT premium / UPDATE kendi satırı) | RED | INSERT RLS reddi; UPDATE 0 satır, plan `free` kaldı | ✅ |
| Kredi RPC'lerini (`deduct_credit` vb.) kullanıcı token'ıyla çağırma | permission denied | Üçlü-revoke devrede (Bölüm 8'de 3/3 denied kanıtlı) | ✅ |
| Hesap silme sonrası orphan veri (KVKK) | cascade temizliği | FK `ON DELETE CASCADE` canlı kanıt: delete → `user_goals` 0 satır | ✅ |
| signIn enumeration (yok vs yanlış-şifre) | aynı mesaj | İkisi de jenerik `Invalid login credentials` → Türkçe | ✅ |
| resend enumeration | sessiz yutma | Varlık sızması yok | ✅ |
| Callback XSS (`<script>` hash'te) | text-node render | HTML'de 0 kez; `dangerouslySetInnerHTML` yok; açık-redirect yok | ✅ |
| Silinen verify-email yolları | 404 | 3/3 → 404 | ✅ |
| Confirm-email-ON davranış varsayımı | session=null | Canlı: `mailer_autoconfirm:false` + signUp → user VAR, session NULL | ✅ |

---

## 5. Güçlü Yönler — Kanıtlanmış Savunma Katmanları (özet)

**En güçlü katman: abonelik/kredi sistemi** — üretim uygulamalarının çoğundan olgun:
- **Atomik kredi düşümü** (`deduct_credit` RPC + `CHECK credits_remaining >= 0`): paralel istekle negatif kredi imkansız — canlıda kanıtlandı (kredi=1 + 2 paralel istek → 200 + 402)
- **Deduct-before-Gemini sıralaması:** kredisiz kullanıcı LLM maliyeti tetikleyemiyor
- **Refund guard:** Gemini arızasında iade; çift-iade engeli; `-1 generation → +1 refund` denetim izi canlı doğrulandı
- **RPC üçlü-revoke:** `REVOKE FROM PUBLIC, anon, authenticated` + `GRANT service_role` (Supabase default-privilege tuzağına karşı kalıcı düzeltme)
- **credit_transactions salt-okunur RLS:** denetim izi kullanıcıdan dokunulmaz

**Diğer katmanlar:**
- **Kimlik doğrulama:** IDOR=0 (user_id her yerde token'dan); hesap silmede step-up doğrulama (şifre / Google re-auth penceresi); timing-safe admin key + 404 maskesi; HMAC token'da `timingSafeEqual`
- **Veri izolasyonu:** RLS tüm kullanıcı-verisi tablolarında; `user_goals` 4/4 politika canlı saldırıda kusursuz
- **Kod kalitesi:** TypeScript strict, **0 gerçek `any`**, enum/whitelist doğrulama deseni, tür↔DB CHECK hizası
- **Performans:** Lighthouse **93 / 100 / 100 / 100**; %53 server component; 13 prod bağımlılığı
- **Yerelleştirme:** görünür UI'da İngilizce sızması 0

---

## 6. Kalan Bulgular (Açık İşler)

### 6.1 Bölüm 9 delikleri (28 Eylül saldırı simülasyonu)

| # | Şiddet | Bulgu | Çözüm yönü |
|---|---|---|---|
| S1 | ORTA (canlı kanıt) | `user_profiles.user_id` UNIQUE değil → INSERT fallback ile aynı hesap için çift profil satırı üretilebiliyor (yetki yükseltme değil; yarışta tutarsız okuma) | Migration: canlıda dedupe → UNIQUE constraint; `schema.sql` baseline'a ekle |
| S2 | ORTA (canlı kanıt) | Login brute-force'a sunucu-taraflı rate limit yok (istemci singleton bypass edilebilir; tek savunma Supabase platform limiti) | Kısa vade: Supabase Dashboard → Auth → Rate Limits sıkılaştır. Orta vade: sunucu login proxy + mevcut rate-limit deseni |
| S3 | DÜŞÜK | API-düzeyi e-posta enumeration (identities uzunluğundan ölçülebilir; UI kullanmıyor, sızmıyor) | Kabul edilebilir; Dashboard EEP "hidden identity" ayarı kontrol edilmeli |

### 6.2 Bölüm 9 ORTA bulguları (istemci/veri bütünlüğü)

| # | Bulgu | Not |
|---|---|---|
| O1 | `userName` localStorage anahtarı userId-prefix'siz + hesap-değiştirme akışlarında temizlenmiyor → eski hesabın adı yeni hesapta flash | `algora_name_v1:<userId>` deseni (prefs ile aynı çözüm) |
| O2 | signUp ham İngilizce Supabase mesajları basılıyor | Türkçe eşleme tablosu (şifre/duplicate/geçersiz e-posta) |
| O3 | Supabase min şifre 6 ↔ uygulama eşiği 8 boşluğu | **Kullanıcı adımı:** Supabase Dashboard → Minimum password length = 8 |
| O4 | Auth callback setTimeout'larında cleanup yok + sabit 1sn oturum-bekleme yarışı | clearTimeout + polling üst sınırı |
| O5 | `savePreferences` iyimser güncelleme DB hatasında geri alınmıyor | GoalsProvider'daki rollback deseni aynen uygulanır |
| O6 | `user_profiles` name/hedef alanlarında API-düzeyi uzunluk sınırı yok (UI maxLength var) | DB CHECK veya helper kırpma |
| O7 | `.env.example` bayat: 3 kritik anahtar eksik, ölü OPENAI duruyor | Yeni kurulum Gemini'siz 502 alıyor — tek commit'lik düzeltme |

### 6.3 Bölüm 8 orta bulgularının güncel durumu

| # | Bulgu | Durum |
|---|---|---|
| F1 | getClientIp XFF ilk-hop spoof (IP rate limit bypass) | AÇIK |
| F2 | claim route DB hata mesajını ham döndürüyor | AÇIK |
| F3 | generate'de rollover RPC hatası yutuluyor → haksız 402 riski | AÇIK |
| F4 | approve'da `status='pending'` şartı yok → paralel approve TOCTOU | AÇIK |
| F5 | logout modül-seviyesi authToken temizlemiyor | KISMEN (buton canlıda; token temizliği doğrulanmadı) |
| F6 | Onboarding hata-yutma | ✅ ÇÖZÜLDÜ — onboarding tamamen kaldırıldı (27 Eyl) |
| F7 | Math.random mock istatistiği | ✅ ÇÖZÜLDÜ (mock-data politikası: canlıda ASLA mock) |
| F8 | Verify token tek kullanımlık + GET query | ✅ ÇÖZÜLDÜ — altyapı Supabase native onayla değişti |
| F9 | listUsers 4000 tavanı | ✅ ÇÖZÜLDÜ — aynı altyapının silinmesiyle ortadan kalktı |
| F10 | CSP `unsafe-inline` (nonce-CSP middleware çözümü) | AÇIK (savunma derinliği; acil değil) |
| F11 | LGS kullanıcısı sessizce TYT sorusu alıyor | ✅ ÇÖZÜLDÜ — LGS üründen tamamen kaldırıldı |

### 6.4 Temizlik paketi (kullanıcı kararı bekliyor)

- Ölü bağımlılıklar ×5: `resend`, `@google/generative-ai`, `react-hook-form`, `@hookform/resolvers`, `zod`
- `app/logo-preview-old` (prod build'e giriyor) · `lib/backend-test.ts` (ölü, token logluyor)
- next.config.ts webpack console-silme hack'i (Turbopack yoksayar — ölü kod)
- Kök dizin 7 test kalıntısı · `scripts/` içinde 6 canlı-DB dev scripti
- `.env.example` güncellemesi (O7 ile aynı iş)
- README bayat bilgiler (Next 14 + GPT-4o-mini → gerçek: Next 16 + React 19 + Gemini)

---

## 7. Kapanış Planı — Faz 0.9

| # | İş | Kim |
|---|---|---|
| 1 | `database/user_profiles_unique.sql`: canlı çift-satır dedupe → UNIQUE constraint → schema.sql baseline (S1) | Claude yazar, **kullanıcı SQL Editor'de çalıştırır** |
| 2 | Supabase Dashboard: Minimum password length = 8 (O3) + Auth Rate Limits sıkılaştırma (S2 kısa vade) | **Kullanıcı** |
| 3 | İstemci paketi tek commit: O1 (userName anahtarı) + O4 (callback cleanup) + O5 (savePreferences rollback) | Claude |
| 4 | Mesaj paketi: signUp İngilizce→Türkçe eşleme (O2) | Claude |
| 5 | `.env.example` güncelleme (O7) | Claude |
| 6 | Temizlik turu (6.4 listesi) | Kullanıcı kararı sonrası |

---

## 8. Sonuç

1. **Dört bağımsız denetim turunun ortak sonucu: KRİTİK açık 0.** İlk turda bulunan tüm kritik/yüksek açıklar kapatıldı ve kapatıldıkları canlı sistemde saldırı simülasyonuyla kanıtlandı.
2. **Savunma katmanları birbirini tamamlıyor:** RLS (yetki) → atomik RPC (bütünlük) → rate limit (maliyet) → whitelist (enjeksiyon) → header'lar (tarayıcı) → HMAC/native auth (kimlik). Tek bir katmanın aşılması senaryosunda ikinci katman devrede.
3. **Kalan 12 ORTA bulgunun hiçbiri yetki yükseltme veya çapraz-hesap veri erişimi değil** — tümü tutarlılaştırma, UX kenar durumu, ölçek veya savunma-derinlik kategorisinden.
4. **Bilinçli risk kabulü belgelenmiştir:** S2'de (login rate limit) kısa vadede tek savunma Supabase platform limitidir; kullanıcı Dashboard ayarıyla (adım 2) kapatılacak.
5. **Süreklilik koşulu:** Bu seviyenin korunması için yeni yazılan her route/özellik mevcut desenleri (whitelist doğrulama, userId'li storage anahtarları, iyimser yazım + rollback, DB CHECK ↔ form vaadi uyumu) izlemelidir — ilk denetimin ana dersi, açıkların çoğunun desen eksikliğinden değil, **desenin eskilere uygulanmamasından** çıkmıştı.

---

*Rapor, 23-28 Eylül 2026 arasındaki 4 denetim turunun tüm kayıtlarından derlenmiştir. Kanıt detayları (dosya:satır, probe çıktıları, SQL) için: `docs/SECURITY_AUDIT_TEST_PLAN.md`.*
