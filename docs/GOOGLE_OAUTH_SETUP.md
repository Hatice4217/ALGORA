# 🔧 Google OAuth Sorun Giderme Rehberi

## 🚨 Durum: "Google ile Giriş" Hata Veriyor

## ✅ Çözüm Adımları

### Adım 1: Supabase Authentication Settings

1. **Supabase Projenize Gidin:**
   - https://supabase.com/dashboard
   - Projenizi seçin

2. **Authentication → Providers → Google:**
   - "Enable Google provider"'i **aktif** edin (toggle açık olmalı)
   - "Google Client ID" girin: `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com`
   - "Google Client Secret" girin: `YOUR_GOOGLE_CLIENT_SECRET`

3. **Redirect URL'leri Ekleyin:**
   - Localhost için: `http://localhost:3000/auth/callback`
   - Production için: `https://algora-sigma.vercel.app/auth/callback`

### Adım 2: Google Cloud Console Ayarları

1. **Google Cloud Console'a Gidin:**
   - https://console.cloud.google.com/apis/credentials
   - Projenizi seçin

2. **OAuth 2.0 Client ID'yi Düzenleyin:**
   - "OAuth consent screen" sekmesinde:
     - "External" user type seçin
     - Required fields doldurun (App name, logo, etc.)
     - "Scopes" için: `email`, `profile`, `openid`

   - "Credentials" sekmesinde:
     - Client ID'nizi bulun
     - "Authorized redirect URIs" ekleyin:
       - `http://localhost:3000/auth/callback`
       - `https://algora-sigma.vercel.app/auth/callback`

### Adım 3: Environment Variables Kontrolü

`.env.local` dosyanızda şu değişkenler olduğundan emin olun:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
```

### Adım 4: Supabase Redirect URL Ayarı

Supabase Dashboard'da:
1. **Settings → Authentication → URL Configuration**
2. **Site URL**'yi ayarlayın:
   - Local: `http://localhost:3000`
   - Production: `https://algora-sigma.vercel.app`

3. **Redirect URLs**'e ekleyin:
   - `http://localhost:3000/auth/callback`
   - `https://algora-sigma.vercel.app/auth/callback`

## 🧪 Test Etme

### Localhost Test:
```bash
npm run dev
```
- http://localhost:3000/auth/login
- "Google ile Giriş" butonuna tıkla
- Google hesabını seç
- `/auth/callback` sayfasına yönlendirilmelisin

### Production Test:
- https://algora-sigma.vercel.app/auth/login
- Aynı adımları tekrarla

## 🐛 Yaygın Hatalar ve Çözümleri

### Hata: "redirect_uri_mismatch"
**Çözüm:** Google Cloud Console'da redirect URI'leri kontrol et ve eksikleri ekle.

### Hata: "Invalid Google OAuth configuration"
**Çözüm:** Supabase'te Google provider'ı aktif et.

### Hata: "400 error_code=403"
**Çözüm:** Google Cloud Console'da OAuth consent screen'i tamamla.

### Hata: "Callback sayfasında kalıyor"
**Çözüm:** `auth/callback` sayfasını kontrol et ve console'da hata mesajı var mı bak.

## 📋 Kontrol Listesi

- [ ] Supabase Authentication → Providers → Google **aktif**
- [ ] Google Client ID ve Secret Supabase'te girilmiş
- [ ] Google Cloud Console'da redirect URI'ler doğru
- [ ] OAuth consent screen tamamlanmış
- [ ] Environment variables doğru
- [ ] Production redirect URL'leri eklenmiş
- [ ] Callback sayfası mevcut ve çalışıyor

## 🔍 Debug

Tarayıcı console'da şu hataları ara:

1. **Network Tab:**
   - `supabase.com/auth/v1/authorize` çağrısı başarılı mı?
   - Google OAuth URL'i doğru mu?

2. **Console Tab:**
   - JavaScript hataları var mı?
   - Supabase client hatası var mı?

3. **Application Tab:**
   - Cookie'ler set edildi mi?
   - LocalStorage'da session var mı?

## 🆘 Hala Çözülemediyse

1. **Supabase Logs:**
   - Dashboard → Auth → Logs
   - Hata mesajlarını kontrol et

2. **Google Cloud Logs:**
   - API & Services → Credentials
   - OAuth hatalarını kontrol et

3. **Curl Test:**
   ```bash
   curl -X POST "https://nfdjxwmhvalwokzyyvre.supabase.co/auth/v1/authorize?provider=google" \
     -H "Content-Type: application/json"
   ```

## ✅ Başarılı Giriş Akışı

1. "Google ile Giriş" butonuna tıkla
2. Google OAuth popup açılır
3. Hesap seçimi ekranı gelir
4. Yetki verirsin
5. `/auth/callback` sayfasına yönlendirilirsin
6. 1-2 saniye yüklenir
7. Dashboard'a yönlendirilirsin

Bu akışı takip ediyorsan, Google OAuth çalışıyor demektir! 🎉
