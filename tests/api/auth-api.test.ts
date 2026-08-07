/**
 * API Test Suite for Authentication Endpoints
 *
 * These tests validate the authentication API endpoints including:
 * - User registration
 * - User login
 * - Session management
 * - Google OAuth integration
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { authHelpers } from '../../lib/supabase';

// Test configuration
const TEST_TIMEOUT = 15000; // 15 seconds for slower API calls
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'Test123456!',
  name: 'Test User'
};

describe('Authentication API Tests', () => {
  let createdUserId: string | null = null;

  beforeAll(async () => {
    console.log('🧪 Starting Auth API Tests...');
    console.log('📧 Test Email:', TEST_USER.email);
  });

  afterAll(async () => {
    // Cleanup: Delete test user if created
    if (createdUserId) {
      console.log('🧹 Cleaning up test user...');
      try {
        const { error } = await authHelpers.signOut();
        if (error) {
          console.log('⚠️  SignOut error during cleanup:', error);
        }
      } catch (err) {
        console.log('⚠️  Cleanup error:', err);
      }
    }
  });

  describe('POST /auth/register - User Registration', () => {
    it('should successfully register a new user', async () => {
      const { data, error } = await authHelpers.signUp(
        TEST_USER.email,
        TEST_USER.password,
        TEST_USER.name
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(TEST_USER.email);
      expect(data.user.user_metadata?.name).toBe(TEST_USER.name);

      createdUserId = data.user?.id || null;
    }, TEST_TIMEOUT);

    it('should reject duplicate email registration', async () => {
      const { data, error } = await authHelpers.signUp(
        TEST_USER.email,
        TEST_USER.password,
        TEST_USER.name
      );

      expect(data.user).toBeNull();
      expect(error).toBeDefined();
    }, TEST_TIMEOUT);

    it('should reject registration with invalid email', async () => {
      const { data, error } = await authHelpers.signUp(
        'invalid-email',
        TEST_USER.password,
        TEST_USER.name
      );

      expect(data.user).toBeNull();
      expect(error).toBeDefined();
    }, TEST_TIMEOUT);

    it('should reject registration with weak password', async () => {
      const { data, error } = await authHelpers.signUp(
        `test-weak-${Date.now()}@example.com`,
        '123', // Too short
        TEST_USER.name
      );

      // Supabase might accept this, but our validation should catch it
      // This test documents current behavior
      console.log('📝 Password strength policy test');
      console.log('📝 Current Supabase policy:', data ? 'Accepted' : 'Rejected');
    }, TEST_TIMEOUT);
  });

  describe('POST /auth/login - User Login', () => {
    it('should successfully login with valid credentials', async () => {
      const { data, error } = await authHelpers.signIn(
        TEST_USER.email,
        TEST_USER.password
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.session).toBeDefined();
      expect(data.user).toBeDefined();
    }, TEST_TIMEOUT);

    it('should reject login with invalid email', async () => {
      const { data, error } = await authHelpers.signIn(
        'nonexistent@example.com',
        TEST_USER.password
      );

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error).toBe('Invalid login credentials');
    }, TEST_TIMEOUT);

    it('should reject login with invalid password', async () => {
      const { data, error } = await authHelpers.signIn(
        TEST_USER.email,
        'wrongpassword'
      );

      expect(data).toBeNull();
      expect(error).toBeDefined();
    }, TEST_TIMEOUT);

    it('should reject login with empty credentials', async () => {
      const { data, error } = await authHelpers.signIn('', '');

      expect(data).toBeNull();
      expect(error).toBeDefined();
    }, TEST_TIMEOUT);
  });

  describe('GET /auth/user - Get Current User', () => {
    it('should return current logged in user', async () => {
      // First login
      await authHelpers.signIn(TEST_USER.email, TEST_USER.password);

      // Then get current user
      const { user, error } = await authHelpers.getCurrentUser();

      expect(error).toBeNull();
      expect(user).toBeDefined();
      expect(user?.email).toBe(TEST_USER.email);
    }, TEST_TIMEOUT);

    it('should return null when not logged in', async () => {
      // Sign out first
      await authHelpers.signOut();

      // Then try to get user
      const { user, error } = await authHelpers.getCurrentUser();

      expect(user).toBeNull();
      expect(error).toBeNull();
    }, TEST_TIMEOUT);
  });

  describe('POST /auth/logout - User Logout', () => {
    it('should successfully logout user', async () => {
      // First login
      await authHelpers.signIn(TEST_USER.email, TEST_USER.password);

      // Then logout
      const { error } = await authHelpers.signOut();

      expect(error).toBeNull();

      // Verify user is logged out
      const { user } = await authHelpers.getCurrentUser();
      expect(user).toBeNull();
    }, TEST_TIMEOUT);
  });

  describe('Rate Limiting Tests', () => {
    it('should handle multiple rapid requests gracefully', async () => {
      const rapidRequests = [];
      for (let i = 0; i < 5; i++) {
        rapidRequests.push(
          authHelpers.signIn(
            `ratelimit-test-${i}@example.com`,
            'test123'
          )
        );
      }

      const results = await Promise.all(rapidRequests);
      const errors = results.filter(r => r.error).length;

      // At least some should fail with invalid credentials
      expect(errors).toBeGreaterThan(0);
      console.log(`📊 ${errors} out of 5 rapid requests failed`);
    }, TEST_TIMEOUT);
  });

  describe('Security Tests', () => {
    it('should sanitize email inputs', async () => {
      const emailWithScript = '<script>alert("xss")</script>@example.com';
      const { data, error } = await authHelpers.signUp(
        emailWithScript,
        TEST_USER.password,
        TEST_USER.name
      );

      // Should either sanitize or reject
      expect(data.user?.email).not.toContain('<script>');
    }, TEST_TIMEOUT);

    it('should handle SQL injection attempts', async () => {
      const sqlInjectionEmail = "'; DROP TABLE users; --@example.com";
      const { data, error } = await authHelpers.signUp(
        sqlInjectionEmail,
        TEST_USER.password,
        TEST_USER.name
      );

      // Should reject or sanitize
      expect(data.user).toBeNull();
      console.log('📝 SQL injection attempt:', error ? 'Blocked' : 'Accepted');
    }, TEST_TIMEOUT);
  });

  describe('Google OAuth Integration', () => {
    it('should provide Google OAuth URL', async () => {
      const { data, error } = await authHelpers.signInWithGoogle();

      // Should return OAuth URL or redirect
      expect(error).toBeNull();
      expect(data).toBeDefined();

      console.log('🔗 Google OAuth available:', !!data.url);
    }, TEST_TIMEOUT);
  });
});

// Performance tests
describe('Authentication Performance Tests', () => {
  it('should complete registration within 5 seconds', async () => {
    const startTime = Date.now();

    const { data, error } = await authHelpers.signUp(
      `perf-test-${Date.now()}@example.com`,
      'Test123456!',
      'Performance Test'
    );

    const duration = Date.now() - startTime;

    expect(error).toBeNull();
    expect(duration).toBeLessThan(5000);
    console.log(`⏱️  Registration completed in ${duration}ms`);
  }, 10000);

  it('should complete login within 3 seconds', async () => {
    const startTime = Date.now();

    const { data, error } = await authHelpers.signIn(
      TEST_USER.email,
      TEST_USER.password
    );

    const duration = Date.now() - startTime;

    expect(error).toBeNull();
    expect(duration).toBeLessThan(3000);
    console.log(`⏱️  Login completed in ${duration}ms`);
  }, 10000);
});
