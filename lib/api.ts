import { supabase, authHelpers } from './supabase';

// API Base URL
const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Token management for client-side API calls
let authToken: string | null = null;

// Authentication functions
export const login = async (email: string, password: string) => {
  const { data, error } = await authHelpers.signIn(email, password);
  if (error) {
    return { success: false, error: error as string };
  }

  // Store token for subsequent requests
  if (data?.session) {
    authToken = data.session.access_token;
  }

  return { success: true, data };
};

export const register = async (email: string, password: string, name: string) => {
  const { data, error } = await authHelpers.signUp(email, password, name);
  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
};

export const logout = async () => {
  const { error } = await authHelpers.signOut();
  authToken = null;
  return { success: !error, error: typeof error === 'string' ? error : error?.message };
};

export const getToken = async () => {
  if (authToken) {
    return authToken;
  }

  // Check if supabase is available
  if (!supabase) {
    return null;
  }

  // Get current session if no token stored
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }

  authToken = data.session?.access_token || null;
  return authToken;
};

// Authenticated fetch wrapper
export const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized
  if (response.status === 401) {
    // Try to refresh token or redirect to login
    authToken = null;
    // You might want to redirect to login page here
    console.warn('Unauthorized access - token may be expired');
  }

  return response;
};

// User profile functions
export const getUserProfile = async () => {
  if (!supabase) {
    return { success: false, error: 'Supabase not available' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const response = await authFetch(`${API_BASE}/api/users/profile`);
  const data = await response.json();

  return data;
};

export const updateUserProfile = async (updates: Record<string, unknown>) => {
  const response = await authFetch(`${API_BASE}/api/users/profile`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

  const data = await response.json();
  return data;
};

// Question generation API
export const generateQuestion = async (params: {
  subject: string;
  topic: string;
  difficulty: string;
  exam_type: string;
}) => {
  const response = await authFetch(`${API_BASE}/api/questions/generate`, {
    method: 'POST',
    body: JSON.stringify(params),
  });

  const data = await response.json();
  return data;
};

// User statistics API
export const getUserStats = async () => {
  const response = await authFetch(`${API_BASE}/api/users/stats`);
  const data = await response.json();
  return data;
};

// Submit answer API
export const submitAnswer = async (answer: {
  question_id: string;
  selected_answer: number;
  is_correct: boolean;
  time_spent: number;
}) => {
  const response = await authFetch(`${API_BASE}/api/answers`, {
    method: 'POST',
    body: JSON.stringify(answer),
  });

  const data = await response.json();
  return data;
};

// Google OAuth
export const signInWithGoogle = async () => {
  const { data, error } = await authHelpers.signInWithGoogle();
  return { data, error };
};

// Check if user is authenticated
export const isAuthenticated = async () => {
  const token = await getToken();
  return !!token;
};

// Get current user
export const getCurrentUser = async () => {
  const { user, error } = await authHelpers.getCurrentUser();
  if (error) {
    return { user: null, error: typeof error === 'string' ? error : error.message };
  }
  return { user, error: null };
};