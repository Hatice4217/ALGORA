import { supabase } from './supabase';

/**
 * BACKEND EMAIL DUPLICATE KONTROL TESTİ
 *
 * Bu test Supabase'in gerçekten duplicate email kontrol yapıp yapmadığını test eder
 */

export async function testBackendEmailCheck() {
  const testEmail = 'sarlakhatice2@gmail.com';

  console.log('🔍 BACKEND EMAIL KONTROL TESTİ BAŞLADI');
  console.log('📧 Test Email:', testEmail);

  if (!supabase) {
    console.error('❌ Supabase client not initialized!');
    return { success: false, error: 'Supabase not initialized' };
  }

  try {
    // Test 1: Mevcut kullanıcı kontrolü
    console.log('\n📋 Test 1: Mevcut kullanıcı kontrolü...');

    const { data: users, error: listError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(10);

    if (listError) {
      console.error('❌ User_profiles sorgu hatası:', listError);
    } else {
      console.log('✅ User_profiles:', users);
      console.log('📊 Kayıtlı kullanıcı sayısı:', users?.length || 0);

      // Email'in listede olup olmadığını kontrol et
      const emailExists = users?.some((user) =>
        user.email === testEmail ||
        user.user_metadata?.email === testEmail
      );
      console.log('🔍 Email user_profiles tablosunda var mı?', emailExists);
    }

    // Test 2: Supabase Auth kullanıcı listesi
    console.log('\n📋 Test 2: Supabase Auth kontrolü...');

    const { data: { users: authUsers }, error: authListError } = await supabase.auth.admin.listUsers();

    if (authListError) {
      console.error('❌ Auth listUsers hatası:', authListError);
      console.log('💡 Bu normal, admin API gerektiriyor');
    } else {
      console.log('✅ Auth users:', authUsers);
      console.log('📊 Auth kullanıcı sayısı:', authUsers?.length || 0);

      // Email'in auth listesinde olup olmadığını kontrol et
      const emailInAuth = authUsers?.some((user) =>
        user.email === testEmail
      );
      console.log('🔍 Email auth listesinde var mı?', emailInAuth);
    }

    // Test 3: Login denemesi ile email kontrolü
    console.log('\n📋 Test 3: Login denemesi ile kontrol...');

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: 'yanlis-sifre-12345'
    });

    console.log('🔍 Login sonucu:', { loginData, loginError });

    if (loginError?.message?.includes('Invalid login credentials')) {
      console.log('✅ EMAIL VAR (şifre yanlış ama email kayıtlı)');
      return { success: true, emailExists: true };
    }

    if (loginData?.user) {
      console.log('✅ EMAIL VAR (login başarılı)');
      return { success: true, emailExists: true };
    }

    if (loginError?.message?.includes('User not found')) {
      console.log('✅ EMAIL YOK (kayıtlı değil)');
      return { success: true, emailExists: false };
    }

    console.log('⚠️ Belirsiz durum');
    return { success: false, error: 'Belirsiz login response' };

  } catch (error) {
    console.error('❌ Backend test hatası:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Gerçek kayıt denemesi testi
 */
export async function testRealSignUp() {
  console.log('🧪 GERÇEK KAYIT DENEMESİ TESTİ');

  if (!supabase) {
    console.error('❌ Supabase client not initialized!');
    return;
  }

  const testEmail = `test-${Date.now()}@example.com`;

  try {
    console.log('📧 Test email:', testEmail);

    // İlk kayıt denemesi
    const { data: signUp1, error: error1 } = await supabase.auth.signUp({
      email: testEmail,
      password: 'Test123456!',
      options: {
        data: { name: 'Test User' }
      }
    });

    console.log('📋 İlk kayıt sonucu:', { signUp1, error1 });

    if (error1) {
      console.error('❌ İlk kayıt hatası:', error1);
      return { success: false, error: error1.message };
    }

    // İkinci kayıt denemesi (aynı email)
    console.log('\n🔄 Aynı email ile ikinci kayıt denemesi...');

    const { data: signUp2, error: error2 } = await supabase.auth.signUp({
      email: testEmail,
      password: 'Test123456!',
      options: {
        data: { name: 'Test User 2' }
      }
    });

    console.log('📋 İkinci kayıt sonucu:', { signUp2, error2 });

    if (error2) {
      console.log('✅ İkinci kayıt BAŞARISIZ (hata var):', error2);
      return { success: true, duplicateBlocked: true };
    }

    if (signUp2?.user) {
      console.error('❌ İkinci kayıt BAŞARILI (!!!) - Duplicate kontrol YOK');
      return { success: false, duplicateBlocked: false };
    }

    return { success: true };

  } catch (error) {
    console.error('❌ Gerçek kayıt test hatası:', error);
    return { success: false, error: (error as Error).message };
  }
}
