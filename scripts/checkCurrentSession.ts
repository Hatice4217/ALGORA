#!/usr/bin/env tsx
/**
 * ALGORA - Check Current Session
 * Checks if there's an active session in the browser
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nfdjxwmhvalwokzyyvre.supabase.co';
const supabaseKey = 'sb_publishable_8itghQE6NQSX2acTpo7Iqg_3CcnSb3j';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSession() {
  console.log('🔍 Aktif Session Kontrolü...\n');

  try {
    // Aktif session'ı kontrol et
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session kontrol hatası:', sessionError.message);
      return;
    }

    if (!session) {
      console.log('❌ Aktif session yok');
      console.log('→ Google ile kayıt olmamış veya session silinmiş');
      return;
    }

    console.log('✅ Aktif session bulundu!\n');
    console.log('👤 Kullanıcı Bilgileri:');
    console.log('- Email:', session.user.email);
    console.log('- ID:', session.user.id);
    console.log('- Created At:', new Date(session.user.created_at).toLocaleString('tr-TR'));
    console.log('- Last Sign In:', new Date(session.user.last_sign_in_at).toLocaleString('tr-TR'));

    // User metadata
    if (session.user.user_metadata) {
      console.log('\n📋 User Metadata:');
      console.log(JSON.stringify(session.user.user_metadata, null, 2));
    }

    // Identities kontrolü
    if (session.user.identities && session.user.identities.length > 0) {
      console.log('\n🔐 Identities:');
      session.user.identities.forEach((identity, index) => {
        console.log(`${index + 1}. Provider: ${identity.provider}`);
        console.log(`   Identity ID: ${identity.identity_data?.sub || identity.id}`);
      });
    }

    // Şimdi de user_profiles tablosuna bak
    console.log('\n🔍 User Profiles Kontrolü...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (profileError) {
      console.log('❌ Profile sorgulama hatası:', profileError.message);
    } else if (profile) {
      console.log('✅ User Profile bulundu!');
      console.log('- Exam Type:', profile.exam_type);
      console.log('- Target Score:', profile.target_score);
      console.log('- Subjects:', profile.subjects);
    } else {
      console.log('❌ User Profile yok!');
      console.log('→ Google ile kayıt olunmuş ama profile oluşturulmamış');
    }

  } catch (error) {
    console.error('❌ Genel hata:', error);
  }
}

checkSession();
