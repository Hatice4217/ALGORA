/**
 * Jest Global Setup File
 *
 * This file runs once before all test suites.
 */

export default async function globalSetup() {
  console.log('🧪 Starting ALGORA API Tests...');
  console.log('📋 Test Environment:', process.env.NODE_ENV || 'test');
  console.log('🔗 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...');

  // Add any global test setup here
  // For example: database seeding, test server startup, etc.
}
