# 🚨 Google OAuth Sorunu - HIZLI ÇÖZÜM

## 🎯 En Muhtemel Sorun: Supabase Google Provider Aktif Değil

### ✅ HIZLI ÇÖZÜM (5 Dakika)

#### 1. Supabase Dashboard (2 Dakika)

1. https://supabase.com/dashboard
2. Projenizi seçin: `nfdjxwmhvalwokzyyvre`
3. **Authentication** → **Providers** → **Google**
4. **"Enable Google provider"** toggle'ı **AÇ** (ON position)
5. Client ID ve Secret girin:
   ```
   Client ID: YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
   Client Secret: YOUR_GOOGLE_CLIENT_SECRET
   ```
6. **Save** butonuna tıkla

#### 2. Redirect URL'ler (2 Dakika)

Supabase'te:
- **Settings** → **Authentication** → **URL Configuration**
- **Site URL**: `https://algora-sigma.vercel.app`
- **Redirect URLs**'e ekle:
  ```
  https://algora-sigma.vercel.app/auth/callback
  http://localhost:3000/auth/callback
  ```

#### 3. Google Cloud Console (1 Dakika)

https://console.cloud.google.com/apis/credentials
- OAuth 2.0 Client ID'nizi bulun
- **Authorized redirect URIs**'e ekleyin:
  ```
  https://algora-sigma.vercel.app/auth/callback
  http://localhost:3000/auth/callback
  ```

---

## 🧪 Test Et

### Localhost Test:
```bash
npm run dev
```
http://localhost:3000/auth/login → Google ile Giriş

### Production Test:
https://algora-sigma.vercel.app/auth/login → Google ile Giriş

---

## 🔍 Hangi Hata?

Aldığınız hatayı söyleyin, daha spesifik çözüm sunayım:

1. **"redirect_uri_mismatch"** → Redirect URI'leri kontrol et
2. **"Invalid Google OAuth configuration"** → Provider'ı aktif et
3. **"400 error_code=403"** → OAuth consent screen tamamla
4. **"Callback'de kalıyor"** → Session kontrol et
5. **"Popup açılmıyor"** → Browser popup'ı engelliyor olabilir

---

## 🎯 En Kolay Test

**Google ile Giriş** butonuna tıklayın:
- ✅ Google popup açılıyor mu?
- ✅ Hesap seçimi ekranı geliyor mu?
- ❌ Hata ekranı mı geliyor?

Sonucu söyleyin, hemen çözelim! 🚀
