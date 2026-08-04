import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables missing. Some features will not work.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null; // Mock client yerine null kullan

// Error handler wrapper
const handleDbError = (error: any, context: string) => {
  console.error(`Database error in ${context}:`, error);
  return {
    error: error?.message || 'Database operation failed',
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  };
};

// Auth Helpers
export const authHelpers = {
  signUp: async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        return { data: null, error: error.message };
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Giriş işlemi başarısız' };
    }
  },

  signInWithGoogle: async () => {
    if (!supabase) {
      return { data: null, error: 'Supabase not initialized' };
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account', // Her zaman hesap seçimi göster
        },
      },
    });
    return { data, error };
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
    if (!supabase) {
      console.log('Supabase bağlantısı yok, getUserProfile atlanıyor');
      return { data: null, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // .single() yerine .maybeSingle()

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

  updateUserProfile: async (userId: string, updates: any) => {
    try {
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
    if (!supabase) {
      console.log('Supabase bağlantısı yok, getSubjectBreakdown atlanıyor');
      return { data: [], error: null };
    }

    try {
      const { data, error } = await supabase
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

  // Questions
  saveGeneratedQuestion: async (question: any) => {
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
    if (!supabase) {
      console.log('Supabase bağlantısı yok, saveAnswer atlanıyor');
      return { data: null, error: 'Bağlantı yok' };
    }

    try {
      const { data, error } = await supabase
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

  getUserStats: async (userId: string) => {
    if (!supabase) {
      console.log('Supabase bağlantısı yok, getUserStats atlanıyor');
      return { data: null, error: null };
    }

    try {
      const { data, error } = await supabase
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

  // Helper function to check if user has completed onboarding
  hasCompletedOnboarding: async (userId: string) => {
    try {
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
};
