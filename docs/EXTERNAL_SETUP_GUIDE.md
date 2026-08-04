# External Setup Guide - ALGORA

**Tarih:** 14 Temmuz 2026
** Amaç:** ALGORA'yı canlıya almak için gerekli external servis kurulumu
**Süre:** Tahmini 30-45 dakika

---

## 🎯 Genel Bakış

Bu rehberde aşağı servisleri kuracağız:
1. **Supabase** - Database + Authentication
2. **OpenAI** - AI Question Generation

Her servis için detaylı adım adım talimatlar aşağıda.

---

## 📚 ADIM 1: Supabase Projesi Oluşturma

### 1.1 Supabase Hesabı Oluştur

```
1. https://supabase.com adresine git
2. "Start your project" butonuna tıkla
3. GitHub ile giriş yap (önerilen) veya email ile kayıt ol
```

### 1.2 Yeni Proje Oluştur

```
Organization Settings:
├── Organization Name: ALGORA (veya seçili olan)
└── Database Password: [Güçlü şifre oluştur ve kaydet]

Project Settings:
├── Project Name: algora-production
├── Database Password: [Aynı şifre]
└── Region: EU Central (Türkiye için en uygun)
```

⚠️ **ÖNEMLİ:** Database şifrenizi mutlaka kaydedin! Geri alınamaz.

### 1.3 Proje Bekleme

```
Proje oluşturma süresi: ~2-3 dakika
Bu sırada kahvenizi içebilirsiniz ☕
```

### 1.4 Database Schema'yı Çalıştırma

```
1. Supabase Dashboard'a git
2. Sol menüden "SQL Editor" seç
3. "New Query" butonuna tıkla
4. Aşağıdaki adımları takip et:
```

**Şimdi yapmanız gereken:**
```bash
# Terminal'de şu komutu çalıştırın:
cat algora/database/schema.sql
```

Bu komut size SQL kodunu gösterecek. Sonra:
1. SQL kodunu kopyalayın
2. Supabase SQL Editor'a yapıştırın
3. "Run" butonuna tıklayın

**Beklenen Sonuç:**
```
✅ 4 tables created (user_profiles, questions, answers, study_sessions)
✅ 2 views created (user_stats, subject_breakdown)
✅ RLS enabled on all tables
✅ Indexes created
✅ Functions and triggers created
```

### 1.5 Supabase Credentials Alma

```
1. Supabase Dashboard → Settings → API
2. Aşağıdaki değerleri kopyalayın:

Project URL:
https://xxxxx.supabase.co

anon/public key:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **ÖNEMLİ:** Bu değerleri güvenli bir yerde saklayın!

---

## 🤖 ADIM 2: OpenAI API Key Alma

### 2.1 OpenAI Hesabı Oluşturma

```
1. https://platform.openai.com adresine git
2. "Sign Up" butonuna tıkla
3. Email ile kayıt ol veya Google ile giriş yap
4. Email adresini doğrula
```

### 2.2 Ödeme Yöntemi Ekleme

```
1. https://platform.openai.com/account/billing
2. "Add payment method" seç
3. Kredi kartı bilgilerini gir
```

⚠️ **NEDEN GEREKLİ:** OpenAI API, ödeme yöntemi olmadan çalışmaz.

### 2.3 API Key Oluşturma

```
1. https://platform.openai.com/api-keys
2. "Create new secret key" butonuna tıkla
3. Key'e bir isim ver: "ALGORA Production"
4. "Create key" butonuna tıkla
```

⚠️ **KRİTİK:** API key sadece bir kez gösterilir! Hemen kopyalayın.

```
Örnek API Key formatı:
sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2.4 API Usage Limit Kontrolü

```
1. https://platform.openai.com/account/limits
2. "Rate limits" bölümünü kontrol et
3. "Usage limits" bölümünü kontrol et

Yeni hesaplar için tipik limitler:
- Rate limit: 200 requests/dakika
- Usage limit: $50/hafta (kademeli artar)
```

---

## 🔧 ADIM 3: Environment Variables Kurulumu

### 3.1 .env.local Dosyasını Güncelleme

**Mevcut dosya:** `algora/.env.local`

**Şu değerleri içermeli:**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-key-for-development

# OpenAI API Key
OPENAI_API_KEY=sk-placeholder-key-for-development
```

**Güncellenecek değerler:**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[SİZİN_SUPABASE_URL]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[SİZİN_ANON_KEY]

# OpenAI API Key
OPENAI_API_KEY=sk-[SİZİN_API_KEY]
```

### 3.2 Güncelleme Adımları

**Terminal komutu:**
```bash
# algora klasörüne git
cd algora

# .env.local dosyasını düzenle
# (Windows: notepad, Mac/Linux: nano/vim)
notepad .env.local  # Windows için
# veya
nano .env.local     # Mac/Linux için
```

**Yapılacak değişiklikler:**
1. `placeholder.supabase.co` → Gerçek Supabase URL
2. `placeholder-key-for-development` → Gerçek anon key
3. `sk-placeholder-key-for-development` → Gerçek OpenAI key

### 3.3 Değişiklikleri Kaydetme

```
1. Dosyayı kaydet (Ctrl+S / Cmd+S)
2. Editörü kapat
3. Değişiklikleri doğrula:
```

```bash
# .env.local dosyasının son 10 satırını görüntüle
tail -n 10 .env.local
```

---

## ✅ ADIM 4: Kurulum Doğrulama

### 4.1 Development Server Test

```bash
# algora klasörüne git
cd algora

# Development server'ı başlat
npm run dev
```

**Beklenen çıktı:**
```
▲ Next.js 16.2.10
- Local: http://localhost:3000
✓ Ready in 2.2s
```

### 4.2 Database Connection Test

**Browser'da:**
```
1. http://localhost:3000/auth/register
2. Developer Tools → Console aç
3. Şu kodu paste et ve Enter'a bas:

const response = await fetch('/api/test-db');
const data = await response.json();
console.log('Database Test:', data);
```

⚠️ **NOT:** `/api/test-db` endpoint'i henüz yok, bunu oluşturmamız gerekebilir.

### 4.3 OpenAI Connection Test

**Terminal'de:**
```bash
# .env.local'deki OpenAI key ile test
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Merhaba!"}]
  }'
```

**Beklenen sonuç:** JSON response with OpenAI response

---

## 🧪 ADIM 5: İlk Entegrasyon Testi

### 5.1 Authentication Test

```
1. http://localhost:3000/auth/register
2. Email: test@example.com
3. Password: Test123456!
4. "Kayıt Ol" butonuna tıkla
```

**Beklenen sonuç:**
```
✅ Hesap oluşturuldu
✅ Dashboard'a yönlendirildi
✅ Supabase'de kullanıcı görülebilir
```

### 5.2 Question Generation Test

```
1. Dashboard'da "Soru Üret" butonuna tıkla
2. Subject seç
3. Difficulty seç
4. Bekle ve sonucu gör
```

**Beklenen sonuç:**
```
✅ AI soru üretti
✅ Soru Türkçe
✅ 4 seçenek var
✅ Açıklama mevcut
```

---

## 🔍 ADIM 6: Sorun Giderme

### 6.1 Supabase Bağlantı Hataları

**Hata:** "Connection refused"
```bash
# Çözümler:
1. Supabase URL formatını kontrol et
2. Projenin aktif olduğunu doğrula
3. Network bağlantısını kontrol et
```

**Hata:** "Invalid API key"
```bash
# Çözümler:
1. Anon key'in doğru kopyalandığını kontrol et
2. Key'in başında/sonunda fazla boşluk olmadığını kontrol et
3. Key'i Supabase'den tekrar kopyalayın
```

### 6.2 OpenAI Hataları

**Hata:** "Invalid API key"
```bash
# Çözümler:
1. API key formatını kontrol et (sk-proj-...)
2. .env.local dosyasını kaydettiğinden emin ol
3. Server'ı restart et: npm run dev
```

**Hata:** "Rate limit exceeded"
```bash
# Çözümler:
1. Birkaç dakika bekle
2. OpenAI dashboard'da kullanımı kontrol et
3. Rate limiting implement et (önemli!)
```

### 6.3 Environment Variable Hataları

**Hata:** Credentials çalışmıyor
```bash
# Çözümler:
1. .env.local dosyasını kontrol et
2. Değişken adlarının doğru olduğunu doğrula
3. Server'ı restart et
4. Browser cache'ini temizle
```

---

## 📋 ADIM 7: Son Kontrol Listesi

### Supabase Setup
- [ ] Proje oluşturuldu
- [ ] Database schema çalıştırıldı
- [ ] 4 table oluşturuldu
- [ ] RLS policies aktif
- [ ] Credentials kopyalandı
- [ ] .env.local güncellendi

### OpenAI Setup
- [ ] Hesap oluşturuldu
- [ ] Ödeme yöntemi eklendi
- [ ] API key oluşturuldu
- [ ] Key kopyalandı ve saklandı
- [ ] .env.local güncellendi
- [ ] Test isteği başarılı

### Integration Test
- [ ] Dev server çalışıyor
- [ ] Auth sayfası erişilebilir
- [ ] Kayıt ol çalışıyor
- [ ] Soru üretimi çalışıyor
- [ ] Dashboard erişilebilir

---

## 🚀 ADIM 8: Sonraki Adımlar

Setup tamamlandıktan sonra:

1. **Authentication Flow Test**
   - Kayıt ol, giriş yap, çıkış yap
   - OAuth (Google) test

2. **Onboarding Flow Test**
   - Exam type selection
   - Subject selection
   - Goals setup

3. **Question Generation Test**
   - AI soru üretimi
   - Cevap gönderme
   - İlerleme takibi

4. **Mobile Menu Implementation**
   - Hamburger menu
   - Mobile navigation

---

## 📞 Destek ve Kaynaklar

### Dokümantasyon
- Supabase: https://supabase.com/docs
- OpenAI: https://platform.openai.com/docs
- Next.js: https://nextjs.org/docs

### Proje Dokümantasyonu
- `docs/API_CONFIG_GUIDE.md` - Detaylı API kurulum
- `docs/OPENAI_SETUP.md` - OpenAI spesifik
- `docs/MANUAL_TEST_CHECKLIST.md` - Test rehberi

---

## ⏱️ Tahmini Süreler

| Görev | Süre | Zorluk |
|------|------|--------|
| Supabase setup | 15 dk | Orta |
| OpenAI setup | 10 dk | Kolay |
| Environment config | 5 dk | Kolay |
| Testing & validation | 15 dk | Orta |
| **TOPLAM** | **45 dk** | |

---

## 🎯 Başarı Kriterleri

Setup başarılı kabul edilir when:

✅ Supabase database çalışıyor
✅ OpenAI API responding
✅ Authentication flow working
✅ Question generation working
✅ No console errors
✅ Environment variables correct

---

**Last Updated:** 14 Temmuz 2026
**Status:** Ready for Execution
**Next Step:** Adım 1'den başlayın ve sırayla ilerleyin
