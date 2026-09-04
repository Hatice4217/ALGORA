#!/usr/bin/env tsx
/**
 * ALGORA - Check Auth Users in Supabase
 * Tries to check auth.users table with various methods
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nfdjxwmhvalwokzyyvre.supabase.co';
const supabaseKey = 'sb_publishable_8itghQE6NQSX2acTpo7Iqg_3CcnSb3j';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAuthUsers() {
  console.log('🔍 Auth Users Kontrolü...\n');

  try {
    // Method 1: List users through admin API (won't work with anon key)
    console.log('Method 1: Admin API (anon key ile çalışmaz)');
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.log('❌ Admin API Error (beklenen):', error.message);
    } else {
      console.log('✅ Users found:', users.length);
      users.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   Created: ${new Date(user.created_at).toLocaleString('tr-TR')}`);
        console.log(`   Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('tr-TR') : 'Never'}`);
      });
    }

  } catch (adminError) {
    console.log('❌ Admin API failed (beklenen):', adminError);
  }

  console.log('\nMethod 2: Current session check');
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.log('❌ Session error:', sessionError.message);
    } else if (session) {
      console.log('✅ Current session found:');
      console.log(`   Email: ${session.user.email}`);
      console.log(`   Name: ${session.user.user_metadata?.name || session.user.user_metadata?.full_name || 'N/A'}`);
      console.log(`   Created: ${new Date(session.user.created_at).toLocaleString('tr-TR')}`);
      console.log(`   Last Sign In: ${new Date(session.user.last_sign_in_at).toLocaleString('tr-TR')}`);
    } else {
      console.log('❌ No active session');
    }

  } catch (sessionException) {
    console.log('❌ Session check failed:', sessionException);
  }

  console.log('\n📋 ÖZET:');
  console.log('❌ Anon key ile auth.users kontrolü yapılamaz');
  console.log('❌ Admin API methodları anon key ile çalışmaz');
  console.log('✅ Supabase Dashboard kullanın:');
  console.log('   https://nfdjxwmhvalwokzyyvre.supabase.co/dashboard/auth/users');
  console.log('   veya https://nfdjxwmhvalwokzyyvre.supabase.co/dashboard/authentication/users');
}

checkAuthUsers();
