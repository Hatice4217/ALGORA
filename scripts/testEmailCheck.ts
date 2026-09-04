#!/usr/bin/env tsx
/**
 * ALGORA - Test Email Check Function
 * Tests if the email check function actually works
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nfdjxwmhvalwokzyyvre.supabase.co';
const supabaseKey = 'sb_publishable_8itghQE6NQSX2acTpo7Iqg_3CcnSb3j';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmailCheck() {
  console.log('🔍 Testing email check function...\n');

  // Test 1: Check non-existent email
  console.log('Test 1: Checking non-existent email...');
  const testEmail1 = 'nonexistent12345@example.com';
  const { data: data1, error: error1 } = await supabase.auth.signInWithPassword({
    email: testEmail1,
    password: 'dummy-password-for-check-12345',
  });

  console.log('Email:', testEmail1);
  console.log('Error:', error1?.message || 'No error');
  console.log('Data:', data1?.user ? 'User found' : 'No user');
  console.log('');

  // Test 2: Check existing email (if you have one in your database)
  console.log('Test 2: Checking another non-existent email...');
  const testEmail2 = 'another67890@example.com';
  const { data: data2, error: error2 } = await supabase.auth.signInWithPassword({
    email: testEmail2,
    password: 'dummy-password-for-check-12345',
  });

  console.log('Email:', testEmail2);
  console.log('Error:', error2?.message || 'No error');
  console.log('Data:', data2?.user ? 'User found' : 'No user');
  console.log('');

  // Test 3: Try to signup with same email twice
  console.log('Test 3: Testing duplicate signup...');
  const testEmail3 = 'testduplication@example.com';
  const testPassword = 'TestPassword123!';

  // First signup
  console.log('First signup attempt...');
  const { data: signup1, error: signupError1 } = await supabase.auth.signUp({
    email: testEmail3,
    password: testPassword,
  });

  console.log('First signup result:', signupError1?.message || 'Success');

  // Second signup (should fail if email check works)
  console.log('Second signup attempt (same email)...');
  const { data: signup2, error: signupError2 } = await supabase.auth.signUp({
    email: testEmail3,
    password: testPassword,
  });

  console.log('Second signup result:', signupError2?.message || 'Success');
  console.log('');

  console.log('🎯 ANALYSIS:');
  console.log('If both signup attempts succeed → Email check is NOT working');
  console.log('If second signup fails → Email check IS working');
}

testEmailCheck();
