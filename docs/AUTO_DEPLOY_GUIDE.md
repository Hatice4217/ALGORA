# ALGORA Otomatik Deploy Kılavuzu

## 🚀 Otomatik Deploy Sistemi

Artık her değişiklikte manuel deploy yapmanıza gerek yok! Otomatik deploy sistemi aktif.

### 📋 Çalışma Mantığı

**Her push işlemi için:**
1. ✅ TypeScript kontrolü
2. ✅ ESLint kontrolü
3. ✅ Test çalıştırma
4. ✅ Production build
5. ✅ Otomatik deploy

**Sadece main branch'e push'lerde:**
- Tüm kontroller + Vercel'e otomatik deploy

**Pull Request'lerde:**
- Tüm kontroller + deploy preview

---

## 🔧 Kurulum Adımları

### 1. GitHub Secrets Ayarları

GitHub repository'nizde bu secrets'ları ekleyin:

**Setting > Secrets and variables > Actions > New repository secret**

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
```

### 2. Vercel Entegrasyonu

**Option A: Vercel Dashboard (Önerilen)**
1. https://vercel.com adresine git
2. "Import Project" seç
3. GitHub repository'nizi seçin
4. Otomatik deploy ayarları açıksa bırakın

**Option B: Vercel CLI**
```bash
npm install -g vercel
vercel login
vercel link
```

### 3. Git Hooks Aktifleştirme

```bash
chmod +x .git/hooks/pre-commit
```

---

## 🎯 Kullanım Senaryoları

### Normal Geliştirme Döngüsü

```bash
# 1. Kod değişiklikleri yap
# 2. Değişiklikleri test et
npm run dev

# 3. Commit et (pre-commit otomatik kontrol yapar)
git add .
git commit -m "Yeni özellik"

# 4. Push et (otomatik deploy başlar)
git push origin main
```

### Hızlı Fix Deploy

```bash
# Acil düzeltme
git add .
git commit -m "fix: Critical bug fix"
git push origin main
```

**⏱️ Deploy süresi: ~3-5 dakika**

---

## 🔍 Troubleshooting

### Deploy Başarısız Olursa

**GitHub Actions logs kontrol et:**
1. GitHub repository > Actions sekmesi
2. Failed workflow'u tıkla
3. Hata mesajını kontrol et

**Yaygın sorunlar:**
- ❌ Environment variables eksik → GitHub Secrets ekle
- ❌ Build hatası → Local'de `npm run build` test et
- ❌ Test hatası → `npm test` ile lokal test

### Manuel Deploy Gerekirse

```bash
# Acil durumda manuel deploy
npm run build
vercel --prod
```

---

## 📊 Deploy Durumunu Takip Et

### GitHub Actions
```
Repository > Actions > Workflows
```

### Vercel Dashboard
```
https://vercel.com/dashboard
```

### Deploy URL
```
https://algora.vercel.app (veya custom domain)
```

---

## 🎉 Avantajları

✅ **Zaman Tasarrufu:** Manuel deploy derdi yok
✅ **Hata Azaltma:** Pre-commit kontrolleri
✅ **Sürüm Takibi:** Her deploy için otomatik log
✅ **Geri Alma:** Hatalı deploy'ları hızlı rollback
✅ **Ekip İşbirliği:** PR review ile otomatik test

---

**Son güncelleme:** 26 Ağustos 2026
**Durum:** Aktif ✅