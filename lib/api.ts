import { supabase } from './supabase';

// OTURUMLU istek sarmalayıcı. Kullanıcıları (PackagePanel, dashboard) yalnızca
// authFetch içeriyor — login/register/logout ölü sarmalayıcıları silindi
// (S2/F5 temizliği: signIn artık /api/auth/login proxy'sinde, logout ise
// dashboard'da authHelpers.signOut ile doğrudan yapılıyor).

const getSessionToken = async (): Promise<string | null> => {
  if (!supabase) {
    return null;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  return data.session?.access_token || null;
};

// Authenticated fetch wrapper
export const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = await getSessionToken();

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
    console.warn('Unauthorized access - token may be expired');
  }

  return response;
};
