import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Değişken varlığı bilgisi - key/url değerleri LOG'LANMAZ (güvenlik)
console.log('🔧 Supabase Environment Check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey
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

      // Token/session içermeyen güvenli log
      console.log('📊 SignUp sonucu:', { userId: data.user?.id, hasSession: !!data.session });

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

  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
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

  getUserStats: async (userId: string, client?: SupabaseClient) => {
    const db = client || supabase!;
    return withConnectionCheck(
      async () => {
        try {
          const { data, error } = await db
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

  resetPassword: async (email: string) => {
    if (!supabase) {
      return { data: null, error: 'Supabase not initialized' };
    }

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      console.error('resetPassword error:', error);
      return { data: null, error: 'Şifre sıfırlama bağlantısı gönderilirken bir hata oluştu' };
    }
  },

  // Kurtarma linkinden gelen oturumla çalışır; mevcut şifre sorulmaz
  setNewPassword: async (newPassword: string) => {
    if (!supabase) {
      return { data: null, error: 'Supabase not initialized' };
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      console.error('setNewPassword error:', error);
      return { data: null, error: 'Şifre güncellenirken bir hata oluştu' };
    }
  },

  deleteAccount: async (userId: string, password: string) => {
    if (!supabase) {
      return { data: null, error: 'Supabase not initialized' };
    }

    try {
      // Oturum token'ını al (API route kimlik doğrulaması için kullanır)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { data: null, error: 'Oturum bulunamadı, lütfen tekrar giriş yapın' };
      }

      // Sunucu tarafı silme: şifre doğrulama + tüm tablolar + auth kaydı
      const response = await fetch('/api/users/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        return { data: null, error: result.error || 'Hesap silinirken bir hata oluştu' };
      }

      // Başarılı: yerel oturumu kapat
      await supabase.auth.signOut();

      return { data: { success: true }, error: null };
    } catch (error) {
      console.error('deleteAccount error:', error);
      return { data: null, error: 'Hesap silinirken bir hata oluştu' };
    }
  },

  // ===== Subscription / Paket Helpers =====

  // Aboneliği SALT-OKUNUR getirir. Seed istemciden YAPILMAZ:
  // - Yeni kullanıcılar DB'deki on_auth_user_created trigger'ı ile free satır alır
  //   (database/subscriptions.sql)
  // - Trigger'dan önce kaydolmuş kullanıcılar subscriptions.sql içindeki backfill ile
  // - Beklenmedik boşlukta service-role fallback app/api/questions/generate içinde
  // Gerekçe: authenticated INSERT politikası YOK — aksi halde kullanıcı kendi
  // plan/credits değerlerini yazıp kendine premium atayabilirdi (yetki yükseltme).
  // NOT: Dönem yenileme (lazy rollover) bir YAZMA işlemi olduğu için kullanıcı tarafından
  // değil, service-role ile API route'larında `rollover_subscription` RPC'si ile yapılır
  // (subscriptions tablosunda bilinçli olarak UPDATE politikası yoktur).
  getSubscription: async (userId: string) => {
    return withConnectionCheck(
      async () => {
        try {
          const { data, error } = await supabase!
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (error) {
            console.log('getSubscription hatası:', error.message);
            return { data: null, error: error.message };
          }

          return { data, error: null };
        } catch (error) {
          console.log('getSubscription istisnası:', error);
          return { data: null, error: 'Abonelik bilgisi alınamadı' };
        }
      },
      { data: null, error: 'Supabase bağlantısı yok' },
      'getSubscription'
    );
  },

  // Paketim sekmesi verisi: abonelik + son 20 kredi hareketi + bekleyen talep
  // client parametresi: API route'lar KULLANICININ token'ıyla oluşturduğu kimlikli
  // client'ı geçmeli. Global `supabase` sunucu tarafında oturumsuz (anon) çalıştığından
  // RLS `auth.uid() = user_id` politikaları tüm satırları gizler → hep boş döner.
  getSubscriptionSummary: async (userId: string, client?: SupabaseClient) => {
    const db = client || supabase!;
    return withConnectionCheck(
      async () => {
        try {
          const [subResult, txResult, claimResult] = await Promise.all([
            db.from('subscriptions').select('*').eq('user_id', userId).maybeSingle(),
            db
              .from('credit_transactions')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(20),
            db
              .from('payment_claims')
              .select('*')
              .eq('user_id', userId)
              .eq('status', 'pending')
              .maybeSingle(),
          ]);

          if (subResult.error) {
            return { data: null, error: subResult.error.message };
          }

          return {
            data: {
              subscription: subResult.data,
              transactions: txResult.error ? [] : txResult.data,
              pending_claim: claimResult.error ? null : claimResult.data,
            },
            error: null,
          };
        } catch (error) {
          console.log('getSubscriptionSummary istisnası:', error);
          return { data: null, error: 'Paket bilgisi alınamadı' };
        }
      },
      { data: null, error: 'Supabase bağlantısı yok' },
      'getSubscriptionSummary'
    );
  },

  // Manuel ödeme talebi oluşturur. Tek pending kuralı: buradaki select kontrolü yalnızca
  // dostane hata mesajı içindir; asıl garanti DB'deki partial unique index'tir
  // (eşzamanlı isteklerde 23505 yakalanıp PENDING_EXISTS'e çevrilir).
  createPaymentClaim: async (
    userId: string,
    claim: { plan: 'pro' | 'premium'; sender_name?: string; reference_note?: string },
    client?: SupabaseClient
  ) => {
    const db = client || supabase!;
    const pendingMessage = 'Zaten onay bekleyen bir talebiniz var. Lütfen yanıtlanmasını bekleyin.';
    return withConnectionCheck(
      async () => {
        try {
          const { data: pending } = await db
            .from('payment_claims')
            .select('id')
            .eq('user_id', userId)
            .eq('status', 'pending')
            .maybeSingle();

          if (pending) {
            return { data: null, error: { code: 'PENDING_EXISTS', message: pendingMessage } };
          }

          const { data, error } = await db
            .from('payment_claims')
            .insert({
              user_id: userId,
              plan: claim.plan,
              sender_name: claim.sender_name?.trim() || null,
              reference_note: claim.reference_note?.trim() || null,
              provider: 'manual',
              status: 'pending',
            })
            .select()
            .single();

          if (error) {
            if (error.code === '23505') {
              return { data: null, error: { code: 'PENDING_EXISTS', message: pendingMessage } };
            }
            return { data: null, error: { code: error.code, message: error.message } };
          }
          return { data, error: null };
        } catch (error) {
          console.log('createPaymentClaim istisnası:', error);
          return { data: null, error: { code: 'UNKNOWN', message: 'Talep oluşturulamadı' } };
        }
      },
      { data: null, error: { code: 'NO_CONNECTION', message: 'Supabase bağlantısı yok' } },
      'createPaymentClaim'
    );
  },
};
