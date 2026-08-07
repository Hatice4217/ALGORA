// Manuel Email Kontrol Script'i
// Tarayıcı Console'a yapıştırın ve çalıştırın

async function checkEmailManually() {
  const email = prompt("Kontrol etmek istediğiniz emaili girin:");

  if (!email) return;

  console.log("🔍 Email kontrol ediliyor:", email);

  try {
    const response = await fetch('/api/check-email', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email})
    });

    const result = await response.json();
    console.log("📊 Email kontrol sonucu:", result);

    if (result.available) {
      console.log("✅ Email KULLANILABİLİR");
    } else {
      console.log("❌ Email ZATEN KAYITLI");
    }

  } catch (error) {
    console.error("❌ Kontrol hatası:", error);
  }
}

// Çalıştırmak için
checkEmailManually();