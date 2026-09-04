/**
 * Jest Test Setup File
 *
 * This file runs before each test file and sets up the test environment.
 */

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_TEST_KEY || 'test-anon-key';
process.env.OPENAI_API_KEY = process.env.OPENAI_TEST_KEY || 'test-openai-key';
// Ortam değişkeni verilirse onu kullan (ör. production'a karşı test),
// verilmezse localhost'a düş
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock fetch if needed
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({}),
    text: async () => '',
    status: 200,
    headers: new Headers(),
  } as Response)
);

// Setup test timeout
jest.setTimeout(30000);
