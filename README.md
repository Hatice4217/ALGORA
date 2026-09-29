# ALGORA — Yapay Zekâ Destekli Kişisel Rehber Platformu

YKS (TYT / AYT / YDT) hazırlanan Türk öğrencileri için yapay zekâ ile soru üreten,
ilişkisel istatistik ve hedef takibi sunan web platformu.

**Canlı:** https://algora-sigma.vercel.app

## 🛠️ Teknoloji Yığını

- **Framework:** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- **Stil:** Tailwind CSS v4
- **Veritabanı:** Supabase (PostgreSQL + RLS)
- **Kimlik Doğrulama:** Supabase Auth (e-posta onayı zorunlu + Google OAuth)
- **AI:** Google Gemini (soru üretimi)
- **Abonelik/Kredi:** Atomik `deduct_credit` RPC + manuel ödeme onay akışı
- **Barındırma:** Vercel (Git entegrasyonu ile otomatik deploy)

## 📁 Proje Yapısı

```
algora/
├── app/                  # App Router sayfaları + API route'ları
│   ├── api/
│   │   ├── auth/login/           # S2 sunucu login proxy (IP rate limit)
│   │   ├── questions/generate/   # Gemini soru üretimi + kredi düşümü
│   │   ├── subscription/         # Paket/kredi özeti, ödeme talebi
│   │   └── users/delete-account/ # Hesap silme (service-role)
│   ├── auth/             # Giriş / kayıt / şifre sıfırlama / OAuth callback
│   └── dashboard/        # Dinamik Soru Bankası, Genel Bakış, Analizler, Paketim
├── components/           # UI + dashboard bileşenleri (Context provider'lar dahil)
├── lib/                  # supabase.ts (dbHelpers), rate-limit, security, syllabus
├── types/                # TypeScript tanımları
├── database/             # Supabase SQL migrasyonları (SQL Editor'de elle çalıştırılır)
├── docs/                 # Denetim raporları, kurulum rehberleri, BAP formu
└── tests/                # Jest birim/API testleri + Playwright E2E
```

## 🚀 Geliştirme

```bash
npm install
cp .env.example .env.local   # değerleri doldurun
npm run dev
```

**Gerekli ortam değişkenleri** (`.env.example`'da açıklamalı):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` (yalnız sunucu), `GEMINI_API_KEY`,
`ADMIN_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`, Google OAuth anahtarları (opsiyonel).

### Veritabanı Kurulumu

Supabase SQL Editor'de `database/` altındaki migrasyonlar sırayla çalıştırılır.
`schema.sql` tüm tabloların baseline'ıdır; sonraki dosyalar artan düzeltmeleri
(idempotent) taşır.

### Test

```bash
npm test              # Jest
npm run test:e2e      # Playwright
npm run build         # tip + lint + üretim derlemesi
```

## 🔐 Güvenlik

Çok katmanlı denetim geçmişi: RLS (tüm tablolar `auth.uid()` sahiplikli),
atomik kredi RPC'leri (`REVOKE FROM PUBLIC` + yalnız service-role),
sunucu login proxy'si (IP-bazlı rate limit), HMAC imzalı işlemler,
CSP/güvenlik başlıkları. Detaylı denetim raporları:

- `docs/SECURITY_AUDIT_FINAL_REPORT.md` — 4 denetim turunun nihai durumu
- `docs/LIVE_RESILIENCE_TEST_REPORTS.md` — canlı dayanıklılık testleri

## 📄 Lisans

Proprietary — Tüm hakları saklıdır.

---

**Son güncelleme:** Eylül 2026
