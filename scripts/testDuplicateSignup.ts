#!/usr/bin/env tsx
/**
 * ALGORA - Test Duplicate Signup Detection
 * Tests both methods of duplicate email detection:
 * 1. Direct error message from Supabase
 * 2. identities.length === 0 check (Supabase's official method)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nfdjxwmhvalwokzyyvre.supabase.co';
const supabaseKey = 'sb_publishable_8itghQE6NQSX2acTpo7Iqg_3CcnSb3j';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDuplicateSignup() {
  console.log('🔍 Duplicate Email Detection Testi Başlatılıyor...\n');

  const testEmail = `test-${Math.random().toString(36).substring(7)}@algora-test.com`;
  const testPassword = 'TestPassword123!';

  console.log('📧 Test Email:', testEmail);
  console.log('🔑 Test Password:', testPassword);
  console.log('');

  // İLK SIGNUP ATTEMPT
  console.log('1. İLK KAYIT DENEYMESİ...');
  const { data: firstSignup, error: firstError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: { full_name: 'Test User' }
    }
  });

  console.log('İlk signup sonucu:');
  console.log('- Error:', firstError?.message || 'No error');
  console.log('- User created:', !!firstSignup?.user);
  console.log('- Identities length:', firstSignup?.user?.identities?.length || 0);
  console.log('');

  // İKİNCİ SIGNUP ATTEMPT (AYNI EMAIL)
  console.log('2. İKİNCİ KAYIT DENEYMESİ (AYNI EMAIL)...');
  const { data: secondSignup, error: secondError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: { full_name: 'Test User 2' }
    }
  });

  console.log('İkinci signup sonucu:');
  console.log('- Error:', secondError?.message || 'No error');
  console.log('- User created:', !!secondSignup?.user);
  console.log('- Identities length:', secondSignup?.user?.identities?.length || 0);
  console.log('');

  // ANALİZ
  console.log('🎯 ANALİZ:\n');

  // 1. YÖNTEM: Direkt hata mesajı kontrolü
  console.log('1. YÖNTEM - Direkt Hata Mesajı:');
  if (secondError) {
    const errorMessage = (secondError.message || '').toLowerCase();
    const isDuplicateError = errorMessage.includes('already') ||
                             errorMessage.includes('registered') ||
                             errorMessage.includes('exists') ||
                             errorMessage.includes('taken') ||
                             errorMessage.includes('duplicate');

    console.log('   - Hata mesajı:', secondError.message);
    console.log('   - Duplicate tespit edildi:', isDuplicateError ? '✅ EVET' : '❌ HAYIR');
  } else {
    console.log('   - Hata yok ❌');
  }
  console.log('');

  // 2. YÖNTEM: identities.length === 0 kontrolü
  console.log('2. YÖNTEM - Identities Kontrolü (Supabase Resmi Yöntem):');
  if (secondSignup?.user) {
    const isEmptyIdentities = !secondSignup.user.identities ||
                             secondSignup.user.identities.length === 0;

    console.log('   - Identities length:', secondSignup.user.identities?.length || 0);
    console.log('   - Duplicate tespit edildi:', isEmptyIdentities ? '✅ EVET' : '❌ HAYIR');
  } else {
    console.log('   - User objesi yok ❌');
  }
  console.log('');

  // SONUÇ
  console.log('🏁 SONUÇ:');
  const firstMethodWorks = secondError && (
    (secondError.message || '').toLowerCase().includes('already') ||
    (secondError.message || '').toLowerCase().includes('registered')
  );

  const secondMethodWorks = secondSignup?.user && (
    !secondSignup.user.identities ||
    secondSignup.user.identities.length === 0
  );

  console.log('1. Yöntem (Hata mesajı):', firstMethodWorks ? '✅ Çalışıyor' : '❌ Çalışmıyor');
  console.log('2. Yöntem (Identities):', secondMethodWorks ? '✅ Çalışıyor' : '❌ Çalışmıyor');
  console.log('');

  // Cleanup - test user'ı sil
  try {
    console.log('🧹 Temizlik: Test user siliniyor...');
    // Not: Anon key ile user silme işlemi yapılamaz, bu kısım atlanıyor
    console.log('⚠️  Anon key ile user sililemedi, elle silmeniz gerekebilir.');
  } catch (e) {
    console.log('Temizlik hatası:', e);
  }
}

testDuplicateSignup();
