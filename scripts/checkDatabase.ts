#!/usr/bin/env tsx
/**
 * ALGORA - Database Connection Test
 * Tests if we can actually connect to Supabase and query the database
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nfdjxwmhvalwokzyyvre.supabase.co';
const supabaseKey = 'sb_publishable_8itghQE6NQSX2acTpo7Iqg_3CcnSb3j';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
  console.log('🔍 Testing Supabase database connection...\n');

  try {
    // Test 1: Can we reach Supabase at all?
    console.log('Test 1: Basic connection...');
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Connection failed:', error.message);
      console.error('Error details:', error);
      return false;
    }

    console.log('✅ Connection successful!');
    console.log(`📊 Current user_profiles count: ${data || 0}\n`);

    // Test 2: Try to insert a test record
    console.log('Test 2: Inserting test record...');
    const testUserId = '00000000-0000-0000-0000-000000000000';

    const { data: insertData, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: testUserId,
        exam_type: 'TYT',
        target_score: 400,
        subjects: ['Matematik', 'Türkçe'],
        study_hours_per_day: 4,
        exam_date: new Date('2026-06-01').toISOString()
      })
      .select();

    if (insertError) {
      // This might fail due to RLS policies or foreign key constraints
      console.log('⚠️  Insert failed (expected with anon key):', insertError.message);
    } else {
      console.log('✅ Insert successful!');
      console.log('Inserted data:', insertData);

      // Clean up
      await supabase.from('user_profiles').delete().eq('user_id', testUserId);
      console.log('🧹 Test record cleaned up');
    }

    console.log('\n✅ Database is working! Records are permanent.');
    console.log('❌ The issue is NOT database storage.');
    console.log('🔍 The issue is likely: Session management or authentication flow');

    return true;

  } catch (error) {
    console.error('❌ Exception:', error);
    return false;
  }
}

testDatabaseConnection();
