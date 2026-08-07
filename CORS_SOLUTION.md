# 🔄 CORS HATASI ÇÖZÜM REHBERİ

## ❌ Sorun: CORS Policy

**Aldığınız hata:**
```
Access to fetch at 'http://localhost:3000/auth/register' from origin
'https://algora-sigma.vercel.app' has been blocked by CORS policy
```

**Bu normal!** Production domain üzerinden localhost'a erişemezsiniz.

---

## ✅ ÇÖZÜMLER

### Çözüm 1: Localhost'u Doğrudan Kullan (ÖNERİLEN)

**Tarayıcıda doğrudan localhost'a gidin:**
```
http://localhost:3000/auth/register
```

**Sonra test script'i çalıştırın:**
```javascript
const testEmail = "sarlakhatice2@gmail.com";

fetch('http://localhost:3000/auth/register', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    email: testEmail,
    password: 'Test123456!',
    name: 'Test User',
    confirmPassword: 'Test123456!'
  })
}).then(r=>r.json())
.then(result => {
  console.log("🧪 Test sonucu:", result);
  console.log("📋 Hata:", result.error ? "❌ Email zaten kayıtlı" : "✅ Yeni email");
});
```

### Çözüm 2: Production'da Test (ALTERNATİF)

**Production domain'de test edin:**
```
https://algora-sigma.vercel.app/auth/register
```

**Production test script'i:**
```javascript
const testEmail = "sarlakhatice2@gmail.com";

fetch('/auth/register', {  // localhost değil, relative path
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    email: testEmail,
    password: 'Test123456!',
    name: 'Test User',
    confirmPassword: 'Test123456!'
  })
}).then(r=>r.json())
.then(result => {
  console.log("🧪 Test sonucu:", result);
  console.log("📋 Hata:", result.error ? "❌ Email zaten kayıtlı" : "✅ Yeni email");
});
```

---

## 🧪 DOĞRU TEST YÖNTEMİ

### 1. Localhost Test (Tavsiye)
```
1. Tarayıcıda yeni sekme açın
2. Adres çubuğuna yazın: http://localhost:3000/auth/register
3. F12 → Console açın
4. Test script'i yapıştırıp Enter'a basın
5. Sonuçları görün
```

### 2. Production Test
```
1. https://algora-sigma.vercel.app/auth/register sayfasına gidin
2. F12 → Console açın
3. Test script'i çalıştırın
4. Sonuçları görün
```

---

## 🎯 ÖNEMLİ NOTLAR

### Localhost vs Production:
- **Localhost:** http://localhost:3000 → Geliştirme ortamı
- **Production:** https://algora-sigma.vercel.app → Canlı site

### CORS Nedir?
- **Cross-Origin Resource Sharing** politikası
- Production domain'den localhost'a erişimi **engeller**
- Bu **güvenlik önlemidir**, hata değil!

### Neden CORS Hatası?
- Tarayıcı: "Production sitesinden localhost'a erişmesine izin vermiyorum"
- Sunucu: "Farklı origin'den gelen istekleri kabul etmiyorum"

---

## 💡 HIZLI ÇÖZÜM

**Şu anda hangi ortamdasınız?**

1. **Local Development (npm run dev çalışıyor):**
   → http://localhost:3000 kullanın
   → Test script'i localhost'te çalıştırın

2. **Production (Canlı site):**
   → https://algora-sigma.vercel.app kullanın
   → Test script'i production'da çalıştırın

---

## 🧪 ŞİMDİ TEKRAR DENEYİN

**Doğru test ortamını seçin:**
- Local development için → http://localhost:3000
- Production test için → https://algora-sigma.vercel.app

**Sonra test script'i tekrar çalıştırın!**

**Sonuçları bekliyorum...** 🎯