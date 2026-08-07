# 🧪 ALGORA Test Suite

Bu dizin ALGORA projesi için otomatik test suit'lerini içerir.

## 📁 Test Yapısı

```
tests/
├── api/                    # API endpoint tests
│   ├── auth-api.test.ts
│   ├── questions-api.test.ts
│   └── users-api.test.ts
├── e2e/                    # End-to-end browser tests
│   ├── auth-flow.spec.ts
│   └── dashboard-flow.spec.ts
├── setup.ts               # Jest setup
├── global-setup.ts        # Global setup
├── global-teardown.ts     # Global teardown
└── README.md             # This file
```

## 🚀 Test Çalıştırma

### API Testleri (Jest)

```bash
# Tüm API testlerini çalıştır
npm run test:api

# Watch mode ile çalıştır
npm run test:watch

# Coverage ile çalıştır
npm run test:coverage

# Sadece belirli bir test dosyası
npm test -- auth-api.test.ts
```

### E2E Testleri (Playwright)

```bash
# Tüm E2E testlerini çalıştır
npm run test:e2e

# Playwright UI ile çalıştır (interaktif)
npm run test:e2e:ui

# Belirli bir test dosyası
npx playwright test auth-flow.spec.ts

# Belirli bir tarayıcıda çalıştır
npx playwright test --project=chromium
```

## 📋 Test Kapsamı

### API Testleri

#### Auth API (`auth-api.test.ts`)
- ✅ Kullanıcı kaydı
- ✅ Giriş yapma
- ✅ Çıkış yapma
- ✅ Google OAuth
- ✅ Rate limiting
- ✅ Input sanitization
- ✅ Performans testleri

#### Questions API (`questions-api.test.ts`)
- ✅ Authentication kontrolü
- ✅ Request validation
- ✅ Soru kalitesi
- ✅ AI entegrasyonu
- ✅ Rate limiting
- ✅ Güvenlik testleri
- ✅ Performans testleri

#### Users API (`users-api.test.ts`)
- ✅ Authentication kontrolü
- ✅ İstatistik yapısı
- ✅ Konu breakdown
- ✅ Haftalık ilerleme
- ✅ Güçlü/zayıf alanlar
- ✅ Performans testleri
- ✅ Güvenlik testleri

### E2E Testleri

#### Auth Flow (`auth-flow.spec.ts`)
- ✅ Kayıt formu validasyonları
- ✅ Başarılı kayıt
- ✅ Giriş formu validasyonları
- ✅ Başarılı giriş
- ✅ Google OAuth
- ✅ Şifre sıfırlama
- ✅ Çıkış
- ✅ Mobil uyumluluk
- ✅ Erişilebilirlik

#### Dashboard Flow (`dashboard-flow.spec.ts`)
- ✅ Dashboard erişimi
- ✅ İstatistik kartları
- ✅ Çalışma kayıtları
- ✅ Soru pratik odası
- ✅ Analiz paneli
- ✅ Tab navigasyonu
- ✅ Mobil uyumluluk
- ✅ Performans
- ✅ Erişilebilirlik

## 🔧 Yapılandırma

### Jest (`jest.config.js`)
- Test environment: Node.js
- TypeScript support
- Coverage reporting
- 30s timeout for API tests
- Max workers: 1 (database conflicts önlemek için)

### Playwright (`playwright.config.ts`)
- Test URL: http://localhost:3000
- Browsers: Chromium, Firefox, WebKit
- Mobile viewports: Pixel 5, iPhone 12
- Screenshot on failure
- Video on failure
- HTML reporter

## 📊 Coverage

Coverage raporları `coverage/` dizininde oluşturulur:

```bash
npm run test:coverage
```

Coverage hedefleri:
- Branches: 50%
- Functions: 50%
- Lines: 50%
- Statements: 50%

## 🐛 Debugging

### API Tests

```bash
# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# verbose output
npm test -- --verbose
```

### E2E Tests

```bash
# Debug mode
npx playwright test --debug

# headed mode (browser visible)
npx playwright test --headed

# slow motion
npx playwright test --slow-mo=1000
```

## 📝 Notlar

### API Testleri
- Supabase ve OpenAI credential'larına ihtiyaç duyar
- Mock data kullanırlar (gerçek database'ı etkilemezler)
- Authentication gerektiren testler için mock session kullanırlar

### E2E Testleri
- Gerçek tarayıcıda çalışırlar
- Local dev server'ı otomatik başlatırlar
- Her test için yeni bir tarayıcı instance'ı oluştururlar
- Test data'si otomatik temizlenir

## 🔮 Gelecek Planlar

- [ ] Integration tests (database ile)
- [ ] Performance tests (load testing)
- [ ] Visual regression tests
- [ ] Mobile app tests (React Native)
- [ ] API performance monitoring
- [ ] Continuous testing setup

## 🆘 Sorun Giderme

### "Cannot find module" Hatası
```bash
npm install
```

### "Supabase connection failed" Hatası
`.env.local` dosyasını kontrol edin:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### "OpenAI API error" Hatası
`.env.local` dosyasında OpenAI key kontrolü:
```
OPENAI_API_KEY=your-openai-key
```

### Port 3000 Already in Use
```bash
# Başka bir port kullan
PORT=3001 npm run test:e2e
```

## 📚 Kaynaklar

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
- [Next.js Testing](https://nextjs.org/docs/testing)
