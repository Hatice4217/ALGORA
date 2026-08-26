import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔧 Supabase Environment Check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlPrefix: supabaseUrl?.substring(0, 30) + '...',
  keyPrefix: supabaseAnonKey?.substring(0, 20) + '...'
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables missing. Some features will not work.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null; // Mock client yerine null kullan

// Generic connection check wrapper
const withConnectionCheck = async <T,>(
  operation: () => Promise<T>,
  defaultValue: T,
  context: string
): Promise<T> => {
  if (!supabase) {
    console.log(`Supabase bağlantısı yok, ${context} atlanıyor`);
    return defaultValue;
  }
  return operation();
};

// Error handler wrapper
interface DbError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

const handleDbError = (error: DbError | unknown, context: string) => {
  console.error(`Database error in ${context}:`, error);
  const err = error as DbError;
  return {
    error: err?.message || 'Database operation failed',
    code: err?.code,
    details: err?.details,
    hint: err?.hint,
  };
};

// Auth Helpers
export const authHelpers = {
  signUp: async (email: string, password: string, name: string) => {
    try {
      if (!supabase) {
        return { data: null, error: { message: 'Supabase bağlantısı yok' } };
      }

      console.log('🔄 SignUp başlatılıyor:', { email, name });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          // Email confirmation disabled for demo - auto confirm
          emailRedirectTo: undefined,
        },
      });

      console.log('📊 SignUp sonucu:', { data, error });

      // Hata kontrolü
      if (error) {
        console.error('❌ Supabase signUp error:', error);

        // Hata mesajını normalize et
        const errorMessage = (error.message || error.toString()).toLowerCase();

        if (errorMessage.includes('already') ||
            errorMessage.includes('registered') ||
            errorMessage.includes('exists') ||
            errorMessage.includes('taken') ||
            errorMessage.includes('duplicate') ||
            errorMessage.includes('user already')) {

          return {
            data: null,
            error: { message: 'Bu e-posta adresi zaten kullanımda. Giriş yapmayı deneyin.' }
          };
        }

        return {
          data: null,
          error: { message: error.message || 'Kayıt başarısız oldu' }
        };
      }

      // 🚨 EMAIL ENUMERATION PROTECTION KONTROLÜ
      // Supabase Email Enumeration Protection nedeniyle duplicate kontrolü
      // Eğer user var ama identities boş ise, email zaten kayıtlı demektir
      if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
        console.error('🚨 Email Enumeration Protection: Email zaten kayıtlı');
        return {
          data: null,
          error: { message: 'Bu e-posta adresi zaten kullanımda. Giriş yapmayı deneyin.' }
        };
      }

      // Başarılı kayıt
      console.log('✅ Kayıt başarılı!');
      return { data, error: null };

    } catch (err) {
      console.error('❌ SignUp exception:', err);
      return {
        data: null,
        error: { message: 'Kayıt işlemi sırasında bir hata oluştu' }
      };
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      if (!supabase) {
        return { data: null, error: 'Supabase bağlantısı yok' };
      }

      console.log('🔄 SignIn başlatılıyor:', { email });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('📊 SignIn sonucu:', { data: !!data, error });

      if (error) {
        console.error('❌ SignIn error:', error);

        // Daha spesifik hata mesajları
        const errorMessage = error.message || '';

        if (errorMessage.includes('Invalid login credentials')) {
          return { data: null, error: 'E-posta veya şifre hatalı' };
        }

        if (errorMessage.includes('Email not confirmed')) {
          return { data: null, error: 'EMAIL_NOT_CONFIRMED' };
        }

        return { data: null, error: errorMessage };
      }

      console.log('✅ SignIn başarılı!');
      return { data, error: null };

    } catch (error) {
      console.error('❌ SignIn exception:', error);
      return { data: null, error: 'Giriş işlemi başarısız' };
    }
  },

  signInWithGoogle: async () => {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return { data: null, error: 'Supabase bağlantısı kurulamadı. Lütfen sayfayı yenileyin.' };
    }

    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      console.log('Google OAuth redirect:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account', // Her zaman hesap seçimi göster
          },
        },
      });

      if (error) {
        console.error('Google OAuth Error:', error);
        return { data: null, error: error.message };
      }

      if (data?.url) {
        console.log('Google OAuth URL:', data.url.substring(0, 50) + '...');
      }

      return { data, error: null };
    } catch (err) {
      console.error('Google OAuth Exception:', err);
      return { data: null, error: 'Google ile giriş sırasında bir hata oluştu.' };
    }
  },

  signOut: async () => {
    if (!supabase) {
      return { error: 'Supabase not initialized' };
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: async () => {
    if (!supabase) {
      return { user: null, error: 'Supabase not initialized' };
    }

    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    if (!supabase) {
      return () => {}; // Return empty unsubscribe function
    }

    return supabase.auth.onAuthStateChange(callback);
  },
};

// Database Helpers
export const dbHelpers = {
  // User Profile
  getUserProfile: async (userId: string) => {
    return withConnectionCheck(
      async () => {
        try {
          const { data, error } = await supabase!
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (error) {
            console.log('getUserProfile hatası (normal durum):', error.message);
            return { data: null, error: null };
          }
          return { data, error: null };
        } catch (error) {
          console.log('getUserProfile istisnası (normal durum):', error);
          return { data: null, error: null };
        }
      },
      { data: null, error: null },
      'getUserProfile'
    );
  },

  createUserProfile: async (profile: {
    user_id: string;
    exam_type: string;
    target_score: number;
    subjects: string[];
    study_hours_per_day: number;
    exam_date?: string;
  }) => {
    if (!supabase) {
      return { data: null, error: 'Supabase not initialized' };
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .insert(profile)
      .select()
      .single();
    return { data, error };
  },

  updateUserProfile: async (userId: string, updates: Record<string, unknown>) => {
    try {
      if (!supabase) {
        return { data: null, error: 'Supabase bağlantısı yok' };
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return { data: null, ...handleDbError(error, 'updateUserProfile') };
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Profil güncellenirken hata oluştu' };
    }
  },

  // Study Sessions
  createStudySession: async (session: {
    user_id: string;
    subject: string;
  }) => {
    try {
      if (!supabase) {
        return { data: null, error: 'Supabase bağlantısı yok' };
      }

      const { data, error } = await supabase
        .from('study_sessions')
        .insert({
          ...session,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { data: null, ...handleDbError(error, 'createStudySession') };
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Çalışma oturumu başlatılamadı' };
    }
  },

  completeStudySession: async (sessionId: string, stats: {
    questions_answered: number;
    correct_answers: number;
    duration_seconds: number;
  }) => {
    try {
      if (!supabase) {
        return { data: null, error: 'Supabase bağlantısı yok' };
      }

      const { data, error } = await supabase
        .from('study_sessions')
        .update({
          ...stats,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        return { data: null, ...handleDbError(error, 'completeStudySession') };
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Oturum tamamlanamadı' };
    }
  },

  getUserStudySessions: async (userId: string, limit = 10) => {
    try {
      if (!supabase) {
        return { data: null, error: 'Supabase bağlantısı yok' };
      }

      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { data: null, ...handleDbError(error, 'getUserStudySessions') };
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Oturumlar alınamadı' };
    }
  },

  // Subject breakdown stats
  getSubjectBreakdown: async (userId: string) => {
    return withConnectionCheck(
      async () => {
        try {
          const { data, error } = await supabase!
            .from('subject_breakdown')
            .select('*')
            .eq('user_id', userId);

          if (error) {
            console.log('getSubjectBreakdown hatası (normal durum):', error.message);
            return { data: [], error: null };
          }
          return { data: data || [], error: null };
        } catch (error) {
          console.log('getSubjectBreakdown istisnası (normal durum):', error);
          return { data: [], error: null };
        }
      },
      { data: [], error: null },
      'getSubjectBreakdown'
    );
  },

  // Questions
  saveGeneratedQuestion: async (question: Record<string, unknown>) => {
    if (!supabase) {
      return { data: null, error: 'Supabase bağlantısı yok' };
    }

    const { data, error } = await supabase
      .from('questions')
      .insert(question)
      .select()
      .single();
    return { data, error };
  },

  getQuestions: async (filters?: {
    subject?: string;
    difficulty?: string;
    exam_type?: string;
    limit?: number;
  }) => {
    if (!supabase) {
      return { data: null, error: 'Supabase bağlantısı yok' };
    }

    let query = supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.subject) {
      query = query.eq('subject', filters.subject);
    }
    if (filters?.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }
    if (filters?.exam_type) {
      query = query.eq('exam_type', filters.exam_type);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // Answers
  saveAnswer: async (answer: {
    user_id: string;
    question_id: string;
    selected_answer: number;
    is_correct: boolean;
    time_spent: number;
  }) => {
    return withConnectionCheck(
      async () => {
        try {
          const { data, error } = await supabase!
            .from('answers')
            .insert({
              ...answer,
              answered_at: new Date().toISOString(),
            })
            .select()
            .maybeSingle();

          if (error) {
            console.log('saveAnswer hatası:', error.message);
            return { data: null, error: error.message };
          }
          return { data, error: null };
        } catch (error) {
          console.log('saveAnswer istisnası:', error);
          return { data: null, error: 'Cevap kaydedilemedi' };
        }
      },
      { data: null, error: 'Bağlantı yok' },
      'saveAnswer'
    );
  },

  getUserStats: async (userId: string) => {
    return withConnectionCheck(
      async () => {
        try {
          const { data, error } = await supabase!
            .from('user_stats')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (error) {
            console.log('getUserStats hatası (normal durum):', error.message);
            return { data: null, error: null };
          }
          return { data, error: null };
        } catch (error) {
          console.log('getUserStats istisnası (normal durum):', error);
          return { data: null, error: null };
        }
      },
      { data: null, error: null },
      'getUserStats'
    );
  },

  // Settings Helpers
  updateUserSettings: async (userId: string, settings: {
    name?: string;
    exam_type?: string;
    target_score?: number;
    exam_date?: string;
    study_hours_per_day?: number;
    email_notifications?: boolean;
    theme?: string;
    language?: string;
  }) => {
    if (!supabase) {
      return { data: null, error: 'Supabase not initialized' };
    }

    try {
      // Update user_profiles table
      const profileData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (settings.exam_type !== undefined) profileData.exam_type = settings.exam_type;
      if (settings.target_score !== undefined) profileData.target_score = settings.target_score;
      if (settings.exam_date !== undefined) profileData.exam_date = settings.exam_date;
      if (settings.study_hours_per_day !== undefined) profileData.study_hours_per_day = settings.study_hours_per_day;
      if (settings.email_notifications !== undefined) profileData.email_notifications = settings.email_notifications;
      if (settings.theme !== undefined) profileData.theme = settings.theme;
      if (settings.language !== undefined) profileData.language = settings.language;

      // Update profile
      const { data: profileDataResult, error: profileError } = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      // Update user metadata name if provided
      if (settings.name && supabase.auth) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.auth.updateUser({
            data: { name: settings.name }
          });
        }
      }

      if (profileError) {
        return { data: null, error: profileError.message };
      }

      return { data: profileDataResult, error: null };
    } catch (error) {
      console.error('updateUserSettings error:', error);
      return { data: null, error: 'Ayarlar güncellenirken bir hata oluştu' };
    }
  },

  hasCompletedOnboarding: async (userId: string) => {
    try {
      if (!supabase) {
        return { completed: false, error: 'Supabase bağlantısı yok' };
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error) {
        return { completed: false, error: error.message };
      }
      return { completed: !!data, error: null };
    } catch (error) {
      return { completed: false, error: 'Onboarding durumu kontrol edilemedi' };
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    if (!supabase) {
      return { data: null, error: 'Supabase not initialized' };
    }

    try {
      // First verify current password by trying to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        return { data: null, error: 'Kullanıcı bulunamadı' };
      }

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        return { data: null, error: 'Mevcut şifre hatalı' };
      }

      // Update password
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      console.error('changePassword error:', error);
      return { data: null, error: 'Şifre değiştirilirken bir hata oluştu' };
    }
  },

  deleteAccount: async (userId: string, password: string) => {
    if (!supabase) {
      return { data: null, error: 'Supabase not initialized' };
    }

    try {
      // Verify password first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        return { data: null, error: 'Kullanıcı bulunamadı' };
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (signInError) {
        return { data: null, error: 'Şifre hatalı' };
      }

      // Delete user data from user_profiles
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) {
        console.log('Profile delete warning (may not exist):', profileError.message);
      }

      // Delete the auth user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

      if (deleteError) {
        // Fallback: sign out the user
        await supabase.auth.signOut();
        return { data: null, error: 'Kullanıcı silinemedi, oturum kapatıldı' };
      }

      // Sign out after deletion
      await supabase.auth.signOut();

      return { data: { success: true }, error: null };
    } catch (error) {
      console.error('deleteAccount error:', error);
      return { data: null, error: 'Hesap silinirken bir hata oluştu' };
    }
  },
};
