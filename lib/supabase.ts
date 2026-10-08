import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type { PendingClone } from '../types/question';

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

// O2 fix: duplicate/boş-mesaj dallarına düşmeyen ham İngilizce Supabase mesajlarını
// Türkçe'ye eşler. Bilinmeyen mesajlar ayrıntı kaybı olmadan genel Türkçe uyarıya
// iner (ham mesaj zaten yukarıda console.error ile loglanıyor — kullanıcıya sızmaz).
export function signUpMesajEsle(ham: string): string {
  const m = (ham || '').toLowerCase();
  const az = m.match(/password should be at least (\d+)/);
  if (az) return `Şifre en az ${az[1]} karakter olmalıdır.`;
  const cok = m.match(/password should be at most (\d+)/);
  if (cok) return `Şifre en fazla ${cok[1]} karakter olabilir.`;
  if (m.includes('invalid format') || (m.includes('email') && m.includes('invalid'))) {
    return 'Geçerli bir e-posta adresi girin (Türkçe karakter kullanmadan, örn. ornek@gmail.com).';
  }
  if (m.includes('password')) return 'Geçerli bir şifre girin.';
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin.';
  }
  if (m.includes('captcha')) return 'Güvenlik doğrulaması başarısız oldu. Sayfayı yenileyip tekrar deneyin.';
  return 'Kayıt tamamlanamadı. Lütfen bilgileri kontrol edip tekrar deneyin.';
}

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
          // Onay linkine tıklayınca Supabase oturumu hash'le /auth/callback'e taşır
          // (implicit flow; callback dashboard'a yönlendirir) — Google ile aynı desen
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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

        // Boş/"{}" gibi bilgi vermeyen mesajları yakala: sunucu 500 dönerse
        // (örn. SMTP bozuksa onay maili gönderilemez) supabase-js
        // AuthRetryableFetchError fırlatır ve message boş/kod-objesi olur.
        // Kullanıcıya ham teknık değer yerine anlaşılır Türkçe uyarı göster.
        const hamMesaj = (error.message || '').trim();
        const mesajBilgiVeriyor =
          hamMesaj !== '' && hamMesaj !== '{}' && !hamMesaj.includes('fetch');
        if (!mesajBilgiVeriyor) {
          return {
            data: null,
            error: {
              message:
                'Kayıt sırasında beklenmeyen bir sorun oluştu. Lütfen birkaç dakika sonra tekrar deneyin; sorun sürerse bize ulaşın.'
            }
          };
        }

        return {
          data: null,
          error: { message: signUpMesajEsle(error.message || error.toString()) }
        };
      }

      // ⚠️ identities-tabanlı duplicate kontrolü BİLİNÇLİ YOK: "Confirm email"
      // açıkken YENİ kullanıcının identities'i de boş gelir (kimlik onaylanınca
      // bağlanır) — bunu "zaten kayıtlı" sanmak tüm yeni kayıtları bloklardı.
      // Duplicate durumları: EEP kapalıyken error ('already registered' → yukarıda
      // yakalanır); açıkken hatasız sahte-user yanıtı → kullanıcı "mailini kontrol
      // et" mesajı görür, kayıt durumu sızdırılmaz.
      // Başarılı kayıt — onay mailini Supabase kendisi gönderir, data.session null'dır
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

  // NOT: signIn helper'ı KALDIRILDI (S2 sunucu login proxy) — şifreli giriş
  // artık /api/auth/login route'undan geçer (sunucu-taraflı IP rate limit);
  // istemci dönen token'ları supabase.auth.setSession ile işler.

  // Kayıt onay mailini yeniden gönder (Supabase native resend — tek mail kaynağı artık o)
  resendSignUp: async (email: string): Promise<{ error: string | null }> => {
    try {
      if (!supabase) {
        return { error: 'Supabase bağlantısı yok' };
      }
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) {
        const msg = (error.message || '').toLowerCase();
        // "You can request this after 55 seconds" gibi limit yanıtları
        if (msg.includes('rate limit') || msg.includes('request this after') || msg.includes('too many')) {
          return { error: 'Çok sık istek gönderildi. Bir dakika bekleyip tekrar deneyin.' };
        }
        return { error: 'Mail gönderilemedi. Lütfen bir süre sonra tekrar deneyin.' };
      }
      return { error: null };
    } catch {
      return { error: 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.' };
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
// user_goals satırı (Bugünün Hedefleri — hesaba bağlı)
export interface GoalRow {
  id: string;
  goal_text: string;
  is_completed: boolean;
  date: string; // yerel 'YYYY-MM-DD'
  created_at?: string;
}

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

  // Dashboard "Son Çözülenler" paneli: kullanıcının en son cevapladığı sorular
  // (RLS "Users can view own answers" ile kendi satırlarını görür; questions herkese açık)
  getRecentAnswers: async (userId: string, limit: number = 20, client?: SupabaseClient) => {
    const db = client || supabase!;
    return withConnectionCheck(
      async () => {
        try {
          const { data, error } = await db
            .from('answers')
            .select(
              'id, answered_at, selected_answer, question:questions(id, subject, topic, difficulty, exam_type, question_text, choices, correct_answer, explanation)'
            )
            .eq('user_id', userId)
            .order('answered_at', { ascending: false })
            .limit(limit);

          if (error) {
            console.log('getRecentAnswers hatası:', error.message);
            return { data: null, error: error.message };
          }
          return { data, error: null };
        } catch (error) {
          console.log('getRecentAnswers istisnası:', error);
          return { data: null, error: 'Son çözülenler alınamadı' };
        }
      },
      { data: null, error: 'Bağlantı yok' },
      'getRecentAnswers'
    );
  },

  // V2 Faz 1b "Eksiklerini Kapat": kullanıcının BEKLEYEN kişisel klonları
  // (intended_for = kullanıcı, clone_of dolu, aktif). RLS questions SELECT
  // USING(true) olduğundan yeni politika GEREKMEZ; cevaplanan klonlar JS'te
  // elenir (getRecentAnswers deseni — answers RLS zaten kendi satırları).
  getPendingClones: async (userId: string, limit: number = 10, client?: SupabaseClient) => {
    const db = client || supabase!;
    return withConnectionCheck(
      async (): Promise<{ data: PendingClone[] | null; error: string | null }> => {
        try {
          const { data: klonlar, error: klonError } = await db
            .from('questions')
            .select('id, subject, topic, difficulty, exam_type, question_text, choices, correct_answer, explanation, hints, created_at')
            .eq('intended_for', userId)
            .not('clone_of', 'is', null)
            .eq('status', 'active')
            .order('created_at', { ascending: true })
            .limit(limit);

          if (klonError) {
            console.log('getPendingClones hatası:', klonError.message);
            return { data: null, error: klonError.message };
          }
          if (!klonlar || klonlar.length === 0) {
            return { data: [], error: null };
          }

          // Klon ancak DOĞRU cevaplanınca sepetten düşer (telafi = doğru).
          // Yanlış cevaplayan öğrenci soruyu KAYBETMESİN — sepetinde kalır,
          // tekrar deneyene dek listelenir. answers yalnız kendi satırlarımızı
          // döndürür, question_id kontrolü JS'te.
          const klonIdler = klonlar.map((k: { id: string }) => k.id);
          const { data: cevaplar, error: cevapError } = await db
            .from('answers')
            .select('question_id, is_correct')
            .eq('user_id', userId)
            .in('question_id', klonIdler);
          if (cevapError) {
            console.log('getPendingClones cevap sorgusu hatası:', cevapError.message);
            // Cevaplanamayanı varsay: klonları göster (yanlış eksiltme daha güvenli)
            return { data: klonlar as unknown as PendingClone[], error: null };
          }
          const dogruCevaplananlar = new Set(
            ((cevaplar ?? []) as { question_id: string; is_correct: boolean }[])
              .filter((c) => c.is_correct)
              .map((c) => c.question_id)
          );
          const bekleyenler = (klonlar as unknown as PendingClone[]).filter(
            (k) => !dogruCevaplananlar.has(k.id)
          );
          return { data: bekleyenler, error: null };
        } catch (error) {
          console.log('getPendingClones istisnası:', error);
          return { data: null, error: 'Bekleyen klonlar alınamadı' };
        }
      },
      { data: null, error: 'Bağlantı yok' },
      'getPendingClones'
    );
  },

  // "Günlük Seri" kartı: kullanıcının son N gündeki cevap zamanları (ISO string listesi).
  // Seri hesabı istemcide yerel tarihe göre yapılır (lib/utils hesaplaGunlukSeri).
  getAnswerDates: async (userId: string, sonGunSayisi: number = 60, client?: SupabaseClient) => {
    const db = client || supabase!;
    return withConnectionCheck(
      async () => {
        try {
          const since = new Date();
          since.setDate(since.getDate() - sonGunSayisi);
          const { data, error } = await db
            .from('answers')
            .select('answered_at')
            .eq('user_id', userId)
            .gte('answered_at', since.toISOString())
            .order('answered_at', { ascending: false });

          if (error) {
            console.log('getAnswerDates hatası:', error.message);
            return { data: null, error: error.message };
          }
          const tarihler = ((data ?? []) as { answered_at: string }[]).map((r) => r.answered_at);
          return { data: tarihler, error: null };
        } catch (error) {
          console.log('getAnswerDates istisnası:', error);
          return { data: null, error: 'Cevap tarihleri alınamadı' };
        }
      },
      { data: null, error: 'Bağlantı yok' },
      'getAnswerDates'
    );
  },

  // Analizler "Zorluk Analizi" kartı: kullanıcının tüm cevaplarını zorluk kırılımında,
  // üstelik sınav ve ders bazında da toplar. Tipler: 'beginner' | 'intermediate' | 'advanced'.
  // Dönüş: genel (tümü), sinav (sınav → zorluk), dersBazli (sınav → ders → zorluk).
  // (RLS "Users can view own answers" — istemci oturumuyla kendi satırlarını görür)
  getDifficultyStats: async (userId: string) => {
    return withConnectionCheck(
      async () => {
        try {
          const { data, error } = await supabase!
            .from('answers')
            .select('is_correct, question:questions(subject, difficulty, exam_type)')
            .eq('user_id', userId);

          if (error) {
            console.log('getDifficultyStats hatası:', error.message);
            return { data: null, error: error.message };
          }

          type Sayac = { toplam: number; dogru: number };
          const bos = (): Sayac => ({ toplam: 0, dogru: 0 });
          const genel: Record<string, Sayac> = {};
          const sinav: Record<string, Record<string, Sayac>> = {};
          const dersBazli: Record<string, Record<string, Record<string, Sayac>>> = {};

          for (const raw of (data || []) as unknown as Array<{
            is_correct: boolean;
            question: { subject: string; difficulty: string; exam_type: string } | null;
          }>) {
            const q = raw.question;
            if (!q) continue;

            genel[q.difficulty] ??= bos();
            genel[q.difficulty].toplam += 1;
            if (raw.is_correct) genel[q.difficulty].dogru += 1;

            sinav[q.exam_type] ??= {};
            sinav[q.exam_type][q.difficulty] ??= bos();
            sinav[q.exam_type][q.difficulty].toplam += 1;
            if (raw.is_correct) sinav[q.exam_type][q.difficulty].dogru += 1;

            dersBazli[q.exam_type] ??= {};
            dersBazli[q.exam_type][q.subject] ??= {};
            dersBazli[q.exam_type][q.subject][q.difficulty] ??= bos();
            dersBazli[q.exam_type][q.subject][q.difficulty].toplam += 1;
            if (raw.is_correct) dersBazli[q.exam_type][q.subject][q.difficulty].dogru += 1;
          }

          return { data: { genel, sinav, dersBazli }, error: null };
        } catch (error) {
          console.log('getDifficultyStats istisnası:', error);
          return { data: null, error: 'Zorluk istatistikleri alınamadı' };
        }
      },
      { data: null, error: 'Bağlantı yok' },
      'getDifficultyStats'
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
    // Günlük soru hedefi — null = Koç otomatik hesaplar (user_profiles.daily_question_target)
    daily_question_target?: number | null;
    // Hedef üniversite/bölüm — motivasyon rozetini besler (hesaba bağlı)
    target_university?: string;
    target_major?: string;
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

      // name user_profiles'a da yazılır — dashboard ismi profilden okur; yalnız
      // auth metadata'ya yazsaydı çık-gir'de profildeki eski isim geri dönerdi
      if (settings.name !== undefined) profileData.name = settings.name;
      if (settings.exam_type !== undefined) profileData.exam_type = settings.exam_type;
      if (settings.target_score !== undefined) profileData.target_score = settings.target_score;
      if (settings.exam_date !== undefined) profileData.exam_date = settings.exam_date;
      if (settings.study_hours_per_day !== undefined) profileData.study_hours_per_day = settings.study_hours_per_day;
      if (settings.daily_question_target !== undefined) profileData.daily_question_target = settings.daily_question_target;
      if (settings.target_university !== undefined) profileData.target_university = settings.target_university;
      if (settings.target_major !== undefined) profileData.target_major = settings.target_major;
      if (settings.email_notifications !== undefined) profileData.email_notifications = settings.email_notifications;
      if (settings.theme !== undefined) profileData.theme = settings.theme;
      if (settings.language !== undefined) profileData.language = settings.language;

      // Update profile (RLS: kendi satırı). UPDATE 0 satır dönerse profil satırı yok
      // demektir — onboarding kaldırıldığından yeni kullanıcıların user_profiles satırı
      // hiç oluşmuyor; ilk kayıtta NOT NULL kolonlara varsayılanlarla oluşturulur.
      const { data: updatedRows, error: profileError } = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('user_id', userId)
        .select();

      if (profileError) {
        return { data: null, error: profileError.message };
      }

      let sonucSatir = updatedRows && updatedRows.length > 0 ? updatedRows[0] : null;

      if (!sonucSatir) {
        const { data: insertedRow, error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            subjects: [] as string[],
            exam_type: 'TYT',
            target_score: 0,
            study_hours_per_day: 0,
            ...profileData,
          })
          .select()
          .maybeSingle();
        if (insertError) {
          return { data: null, error: insertError.message };
        }
        sonucSatir = insertedRow;
      }

      // Update user metadata name if provided
      if (settings.name && supabase.auth) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.auth.updateUser({
            data: { name: settings.name }
          });
        }
      }

      return { data: sonucSatir, error: null };
    } catch (error) {
      console.error('updateUserSettings error:', error);
      return { data: null, error: 'Ayarlar güncellenirken bir hata oluştu' };
    }
  },

  // ===== Bugünün Hedefleri (user_goals — hesaba bağlı; RLS yalnız kendi satırlarına izin verir) =====

  // Kullanıcının tüm hedefleri; bugüne düşenleri client'ta date'e göre filtrelenir
  getGoals: async (userId: string): Promise<{ data: GoalRow[] | null; error: string | null }> => {
    if (!supabase) {
      return { data: null, error: 'Supabase bağlantısı yok' };
    }
    return withConnectionCheck(
      async (): Promise<{ data: GoalRow[] | null; error: string | null }> => {
        try {
          const { data, error } = await supabase!
            .from('user_goals')
            .select('id, goal_text, is_completed, date, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });
          if (error) {
            return { data: null, error: error.message };
          }
          return { data, error: null };
        } catch (error) {
          console.log('getGoals istisnası:', error);
          return { data: null, error: 'Hedefler alınamadı' };
        }
      },
      { data: null, error: null },
      'getGoals'
    );
  },

  addGoalDb: async (userId: string, goalText: string, date: string): Promise<{ data: GoalRow | null; error: string | null }> => {
    if (!supabase) {
      return { data: null, error: 'Supabase bağlantısı yok' };
    }
    return withConnectionCheck(
      async (): Promise<{ data: GoalRow | null; error: string | null }> => {
        try {
          const { data, error } = await supabase!
            .from('user_goals')
            .insert({ user_id: userId, goal_text: goalText, date })
            .select('id, goal_text, is_completed, date, created_at')
            .single();
          if (error) {
            return { data: null, error: error.message };
          }
          return { data, error: null };
        } catch (error) {
          console.log('addGoalDb istisnası:', error);
          return { data: null, error: 'Hedef eklenemedi' };
        }
      },
      { data: null, error: null },
      'addGoalDb'
    );
  },

  // Derin savunma: sorguya da user_id filtresi (RLS zaten kısıtlar)
  setGoalCompleted: async (userId: string, goalId: string, isCompleted: boolean): Promise<{ data: GoalRow | null; error: string | null }> => {
    if (!supabase) {
      return { data: null, error: 'Supabase bağlantısı yok' };
    }
    return withConnectionCheck(
      async (): Promise<{ data: GoalRow | null; error: string | null }> => {
        try {
          const { data, error } = await supabase!
            .from('user_goals')
            .update({ is_completed: isCompleted })
            .eq('id', goalId)
            .eq('user_id', userId)
            .select('id, goal_text, is_completed, date, created_at')
            .maybeSingle();
          if (error) {
            return { data: null, error: error.message };
          }
          return { data, error: null };
        } catch (error) {
          console.log('setGoalCompleted istisnası:', error);
          return { data: null, error: 'Hedef güncellenemedi' };
        }
      },
      { data: null, error: null },
      'setGoalCompleted'
    );
  },

  deleteGoalDb: async (userId: string, goalId: string): Promise<{ data: null; error: string | null }> => {
    if (!supabase) {
      return { data: null, error: 'Supabase bağlantısı yok' };
    }
    return withConnectionCheck(
      async (): Promise<{ data: null; error: string | null }> => {
        try {
          const { error } = await supabase!
            .from('user_goals')
            .delete()
            .eq('id', goalId)
            .eq('user_id', userId);
          if (error) {
            return { data: null, error: error.message };
          }
          return { data: null, error: null };
        } catch (error) {
          console.log('deleteGoalDb istisnası:', error);
          return { data: null, error: 'Hedef silinemedi' };
        }
      },
      { data: null, error: null },
      'deleteGoalDb'
    );
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

  // PKCE kurtarma kodunu oturuma çevir (detectSessionInUrl kaçırırsa yedek);
  // kod zaten tüketilmişse hata döner ama oturum kurulmuş olabilir — çağıran taraf
  // sonucu getCurrentUser ile teyit etmeli
  exchangeRecoveryCode: async (code: string) => {
    if (!supabase) {
      return { data: null, error: 'Supabase not initialized' };
    }

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return { data: null, error: error.message };
      }
      return { data, error: null };
    } catch (error) {
      console.error('exchangeRecoveryCode error:', error);
      return { data: null, error: 'Oturum kurulamadı' };
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
