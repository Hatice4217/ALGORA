/**
 * Jest Global Teardown File
 *
 * This file runs once after all test suites.
 */

export default async function globalTeardown() {
  console.log('🧹 Cleaning up after tests...');

  // Add any global cleanup here
  // For example: database cleanup, test server shutdown, etc.

  console.log('✅ Tests completed!');
}
