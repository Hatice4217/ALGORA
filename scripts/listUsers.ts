#!/usr/bin/env tsx
/**
 * ALGORA - User Listing Script
 * Lists all registered users from Supabase
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration from .env.local
const supabaseUrl = 'https://nfdjxwmhvalwokzyyvre.supabase.co';
const supabaseKey = 'sb_publishable_8itghQE6NQSX2acTpo7Iqg_3CcnSb3j';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
  console.log('🔍 Fetching users from Supabase...\n');

  try {
    // Fetch user profiles with stats
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError.message);
      return;
    }

    console.log('📊 User Profiles:\n');

    if (!profiles || profiles.length === 0) {
      console.log('No user profiles found.\n');
    } else {
      profiles.forEach((profile, index) => {
        console.log(`${index + 1}. User ID: ${profile.user_id}`);
        console.log(`   Email: [Need to check auth.users]`);
        console.log(`   Exam Type: ${profile.exam_type}`);
        console.log(`   Target Score: ${profile.target_score}`);
        console.log(`   Subjects: ${profile.subjects.join(', ')}`);
        console.log(`   Study Hours/Day: ${profile.study_hours_per_day}`);
        console.log(`   Current Streak: ${profile.current_streak} days`);
        console.log(`   Total Study Time: ${Math.round(profile.total_study_time)} minutes`);
        console.log(`   Created At: ${new Date(profile.created_at).toLocaleString('tr-TR')}`);
        console.log(`   Updated At: ${new Date(profile.updated_at).toLocaleString('tr-TR')}`);
        console.log('');
      });
    }

    // Also try to get basic auth user info (note: this may be limited with anon key)
    console.log('🔐 Auth Users (limited access with anon key):\n');
    console.log('Note: To see email addresses, you need to use the service_role key or check Supabase dashboard');
    console.log('URL: https://nfdjxwmhvalwokzyyvre.supabase.co/dashboard/auth/users\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the function
listUsers();
