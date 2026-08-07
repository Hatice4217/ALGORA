// 🔍 BACKEND EMAIL DUPLICATE TEST
// Production'da çalıştırın: https://algora-sigma.vercel.app
// Console'a yapıştırın ve Enter'a basın

async function testBackend() {
  console.log('🔍 BACKEND EMAIL KONTROL TESTİ BAŞLADI...');

  try {
    // Test 1: Login denemesi ile email kontrolü
    console.log('\n📋 Test 1: Login denemesi...');

    const response = await fetch('/api/auth/check-email', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        email: 'sarlakhatice2@gmail.com'
      })
    });

    const result = await response.json();
    console.log('📊 Backend test sonucu:', result);

    if (result.available === false) {
      console.log('✅ Backend: Email ZATEN KAYITLI');
      console.log('📋 Frontend de bunu yakalamalı');
    } else {
      console.log('⚠️ Backend: Email YENİ (veya kontrol çalışmıyor)');
      console.log('❌ Bu sorun! Backend duplicate kontrol yapmıyor');
    }

  } catch (error) {
    console.error('❌ Backend test hatası:', error);
  }
}

// Çalıştır
testBackend();
