// 🔍 SUPABASE BACKEND UNIQUE TEST
// Bu test Supabase'in gerçekten duplicate email engelleyip engellemediğini kontrol eder

const testEmail = "sarlakhatice2@gmail.com";

console.log('🔍 BACKEND UNIQUE EMAIL TEST BAŞLADI');
console.log('📧 Test Email:', testEmail);

// Browser'da çalıştırın (https://algora-sigma.vercel.app/auth/register)
// F12 → Console'a yapıştırın

async function testSupabaseBackend() {
  try {
    // Supabase client oluştur
    const supabaseUrl = 'https://nfdjxwmhvalwokzyyvre.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZGp4d21odmFsd29renl5dnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI5Njk2NzYsImV4cCI6MjAzODU0MzY3Nn0.Zx9QOwxqWIN7rqKUmSScU6N4JJPLn5SWKy9MQUe6SOQ';
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log('\n📋 TEST 1: Mevcut kullanıcı login kontrolü...');
    
    // Login denemesi ile email kontrolü
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: 'dummy-password-for-check-12345'
    });

    console.log('🔍 Login sonucu:', { loginData, loginError });

    if (loginError?.message?.includes('Invalid login credentials')) {
      console.log('✅ EMAIL VAR (kayıtlı ama şifre yanlış)');
      console.log('⚠️ Bu email ile yeni kayıt ENGELENMELİ!');
    } else if (loginError?.message?.includes('User not found')) {
      console.log('✅ EMAIL YOK (yeni kayıt yapılabilir)');
    } else if (loginData?.user) {
      console.log('✅ EMAIL VAR VE LOGIN BAŞARILI');
    }

    console.log('\n📋 TEST 2: Gerçek kayıt denemesi (duplicate kontrolü)...');
    
    // Şimdi aynı email ile kayıt deneyelim
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'Test123456!',
      options: {
        data: { name: 'Test User Duplicate' }
      }
    });

    console.log('🔍 Kayıt sonucu:', { signUpData, signUpError });

    // 🚨 EMAIL ENUMERATION PROTECTION KONTROLÜ
    if (signUpData?.user) {
      console.log('📊 User object:', signUpData.user);
      console.log('📊 Identities:', signUpData.user.identities);
      console.log('📊 Identities length:', signUpData.user.identities?.length);

      if (!signUpData.user.identities || signUpData.user.identities.length === 0) {
        console.error('🚨 EMAIL ENUMERATION PROTECTION AKTİF!');
        console.error('❌ Supabase: User object döndü ama identities BOŞ');
        console.error('✅ Bu email zaten kayıtlı demektir!');
        console.log('\n🎯 SONUÇ: Backend ÇALIŞIYOR ✅');
        return { success: true, blocked: true, reason: 'Email Enumeration Protection' };
      }

      console.log('✅ Email yeni kayıt - identities length:', signUpData.user.identities.length);
      console.error('❌ BU SORUN! Duplicate email KABUL EDİLDİ!');
      console.log('\n🎯 SONUÇ: Backend ÇALIŞMIYOR ❌');
      return { success: false, blocked: false, reason: 'Duplicate accepted' };
    }

    if (signUpError) {
      console.log('⚠️ Kayıt hatası:', signUpError.message);
      console.log('\n🎯 SONUÇ: Backend Hata Döndürdü');
      return { success: true, blocked: true, reason: signUpError.message };
    }

  } catch (error) {
    console.error('❌ Test hatası:', error);
    return { success: false, error: error.message };
  }
}

// Testi çalıştır
testSupabaseBackend().then(result => {
  console.log('\n🏁 FINAL SONUÇ:', result);
  console.log('\n📋 ÖZET:');
  if (result.blocked) {
    console.log('✅ Backend duplicate email ENGELLİYOR');
  } else {
    console.log('❌ Backend duplicate email ENGELLEMİYOR!');
    console.log('⚠️ Bu güvenlik açığıdır!');
  }
});
