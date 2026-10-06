# ALGORA V2 — Yol Haritası (kolaydan zora)

> 5 Ekim 2026'da Hasan Hoca'nın revizyon listesi + V2 fiyatlama matrisi "Yakında"
> özellikleri birleştirilerek oluşturuldu. Gün tahminleri kaba net çalışma günüdür
> (geliştirme + test); araya deploy/revizyon girer. Tamamlanan madde işaretlenir.

## 🟢 KOLAY — Hemen Başlanabilir

- [x] **1. Avatar + Gizli Çıkış (SaaS görünümü)** — `~1 gün` ✅ 6 Ekim (commit `ed7657a`, deploy SUCCESS)
  Hasan Hoca #1. Baş harflerden yuvarlak avatar (sağ üst), tıklayınca menü: ad, paket,
  kalan kredi; çıkış menünün altında ince kırmızı link. Mevcut "Çıkış Yap" butonu
  (header + mobil menü) kaldırılır. Saf UI — veriler elimizde.
- [x] **2. generate route deduct_credit temizliği** — `~ yarım gün` ✅ 6 Ekim
  Teknik borç: V2'de soru çekme ücretsiz; generate route'ta kredi düşümü artığı var.
- [ ] **3. B1 — Upstash Redis global rate limit** — `~1 gün`
  Mevcut in-memory limit her serverless instance'ta ayrı çalışır (zaafiyet bulgusu).
  Upstash ücretsiz tier + tek dosya değişimi.
- [ ] **4. Araştırma Modu (BAP deney altyapısı)** — `~ yarım-1 gün`
  Deney/kontrol ayrımı ÖDEME DURUMUNDAN bağımsız olmalı — yoksa "pedagojik etki" ile
  "parası olan daha fazla özellik gördü" karışır, deney geçersizleşir.
  - `user_profiles.research_group` (`NULL` = katılımcı değil / `'deney'` / `'kontrol'`)
  - Kredi limiti + özellik gating kontrollerinde katılımcılar için baypas (if bloğu)
  - Deney grubu: tüm özellikler açık; kontrol grubu: tanımlanan standart deneyim
  - Admin route ile grup ataması (admin-auth deseni, elle DB yok)
  - ŞU AN gating olmadığı için etkisi yok; "Yakında" özellikleri gating'li gelmeden
    altyapısının durması şart (sıralama bu yüzden kolaylarda)

## 🟡 ORTA

- [ ] **5. Hata Sepeti (Duolingo görünümü)** — `~2-3 gün`
  Hasan Hoca #2. Altyapı CANLI (yanlış→gece klonu→ertesi gün "Eksiklerini Kapat",
  MAX 2 tur) — eksik olan oyunlaştırılmış sepet UI'ı: sepet rozeti/sayaç, telafi
  ilerleme çubuğu, tamamlanınca kutlama.
- [ ] **6. Soru Fabrikası doluluk garantisi** — `~2 gün`
  Hasan Hoca #3. Havuz-ilk mimari CANLI (HIT ~0.1sn) ama havuz sığ. Dal bazlı doluluk
  izleme + eşik altına düşen dallara proaktif üretim (gece vardiyası + gün içi top-up)
  → "sıfır bekleme" garantisi.
- [ ] **7. Eksik Kapatma Takvimi (aralıklı tekrar görünümü)** — `~2 gün`
  Klon verisinden takvim/seri görünümü; gelişmiş aralıklı tekrar (1-3-7 gün) algoritması.
- [ ] **8. Zihin Haritası (SVG)** — `~2 gün`
  Radar grafiği deseniyle saf SVG — ders/konu başarı ilişkileri.
- [ ] **9. Detaylı Gelişim Analitiği** — `~2-3 gün`
  Radar + Ders Performans üstüne zaman serisi, zayıf konu listesi, trend okları.

## 🟠 ORTA-ZOR

- [ ] **10. Hata Teşhisi & Çeldirici Analizi (7 hata sınıfı)** — `~3-4 gün`
  Yanlış cevap pattern analizi (dikkatsiz / konu eksiği / çeldirici tuzağı / süre
  baskısı...), AI sınıflandırma + kural motoru karışımı.
- [ ] **11. AI Öğrenci Profili / Öğrenme Hafızası** — `~3-4 gün`
  Konu bazlı derin hafıza; analiz verisinden profil kartı.
- [ ] **12. Çift AI Denetimi (Hallucination Shield)** — `~2-3 gün`
  Hasan Hoca #6. Fallback üretim + gece vardiyası sorularına ikinci Gemini doğrulama
  geçişi (cevap tutarlılığı + müfredat kontrolü); geçemeyen havuza girmez.
- [ ] **13. Algora Radyo (multimodal)** — `~3-4 gün`
  TTS ile sesli soru/anlatım; branş limitleri plan bazlı.

## 🔴 ZOR — Altyapı/Yeni Motor

- [ ] **14. ALGORA Focus (akıllı zaman planı)** — `~3-4 gün`
- [ ] **15. AI Sınav Komutanı / YKS Koçu (yol haritası motoru)** — `~4-5 gün**
  Hedef üni/böl + deneme verisinden haftalık plan, süre dağılımı önerisi.
- [ ] **16. RAG — Kaynak Yükleme & Çoklu Sentez** — `~5-7 gün**
  Dosya yükleme, metin çıkarma, embedding + vektör dep, kaynak bazlı sentez soruları.
  En büyük iş; ayrı faz planı ister.
- [ ] **17. Öncelikli AI Kuyruğu (Jet)** — `~2-3 gün**
  Premium istekleri öncelikli işlenir; gece vardiyası kilit deseni genişletilir.

---

## Hasan Hoca Maddeleri — Durum Tespiti (5 Ekim 2026)

| # | Madde | Durum |
|---|---|---|
| 1 | Avatar + gizli çıkış | ✅ CANLI (6 Ekim, `ed7657a`) |
| 2 | Hata Sepeti (gamified) | 🟡 Altyapı canlı, UI yok → madde 5 |
| 3 | Soru Fabrikası / sıfır bekleme | 🟡 Havuz-ilk canlı, doluluk garantisi yok → madde 6 |
| 4 | Tek tıkla başlatma | ✅ CANLI (11 ders kartı, 1-2 tık akışı) |
| 5 | Akıllı kredi (yalnız Üst Beyin) | ✅ CANLI (madde 2 temizliği de tamam, 6 Ekim) |
| 6 | Çift AI denetimi | ❌ Yapılacak → madde 12 |
