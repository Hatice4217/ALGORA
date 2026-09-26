import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST /api/users/delete-account
// Oturum sahibi kullanıcının şifresini doğrular, tüm verilerini ve auth kaydını kalıcı olarak siler.
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('delete-account: SUPABASE_SERVICE_ROLE_KEY tanımlı değil');
      return NextResponse.json(
        { error: 'Sunucu yapılandırması eksik. Yönetici ile iletişime geçin.' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    const password = typeof body?.password === 'string' ? body.password : '';

    // 1) Çağıranın kimliğini oturum token'ından doğrula
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 });
    }

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: getUserError } = await anonClient.auth.getUser(token);
    const user = userData.user;
    if (getUserError || !user || !user.email) {
      return NextResponse.json({ error: 'Oturum doğrulanamadı' }, { status: 401 });
    }

    // 2) Sağlayıcıya göre kimlik teyidi:
    // - E-posta/şifre kullanıcısı: şifre sunucu tarafında doğrulanır (mevcut kalkan aynen kalır)
    // - Google OAuth kullanıcısının şifresi YOKTUR; çıplak bypass yerine "son 10 dk içinde
    //   giriş yapılmış olması" (re-auth penceresi) kontrol edilir
    const isGoogleUser = user.app_metadata?.provider === 'google';
    if (isGoogleUser) {
      const GOOGLE_REAUTH_WINDOW_MS = 10 * 60_000;
      const lastSignInMs = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
      if (Date.now() - lastSignInMs > GOOGLE_REAUTH_WINDOW_MS) {
        return NextResponse.json(
          {
            error: 'Güvenlik için hesap silme işleminin hemen öncesinde giriş yapmış olmalısın. Çıkış yapıp tekrar giriş yap, ardından tekrar dene.',
            code: 'REAUTH_REQUIRED',
          },
          { status: 403 }
        );
      }
    } else {
      if (!password) {
        return NextResponse.json({ error: 'Şifre gereklidir' }, { status: 400 });
      }
      const { error: signInError } = await anonClient.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (signInError) {
        return NextResponse.json({ error: 'Şifre hatalı' }, { status: 401 });
      }
    }

    // 3) Kullanıcı verilerini tüm tablolardan sil (questions global içeriktir, silinmez)
    // Not: user_stats / subject_breakdown VIEW'dır — DELETE almaz, verileri zaten
    // answers/study_sessions silinince boşalır; bu yüzden listede yoklar
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const userTables = [
      'answers',
      'study_sessions',
      'user_profiles',
      'credit_transactions',
      'payment_claims',
      'subscriptions',
    ] as const;

    const deleteResults = await Promise.all(
      userTables.map((table) =>
        adminClient.from(table).delete().eq('user_id', user.id)
      )
    );

    deleteResults.forEach((result, i) => {
      if (result.error) {
        // Kayıt olmayabilir; silme işlemi engellenmemeli
        console.warn(`delete-account: ${userTables[i]} temizleme uyarısı:`, result.error.message);
      }
    });

    // 3.5) questions satırlarını anonimleştir (deleteUser'dan HEMEN ÖNCE):
    // created_by FK'sı cascade'siz olduğu için bu adım olmadan auth kaydı SİLİNEMEZ
    // (canlıda doğrulandı: FK ihlali → "Hesap silinemedi"). Sorular global içerik
    // havuzunda kalır, kullanıcıya bağlılığı kesilir → tam KVKK uyumlu anonimleşme.
    const { error: anonError } = await adminClient
      .from('questions')
      .update({ created_by: null })
      .eq('created_by', user.id);
    if (anonError) {
      console.error('delete-account: questions anonimleştirilemedi:', anonError.message);
      return NextResponse.json(
        { error: 'Hesap silinemedi. Lütfen tekrar deneyin.' },
        { status: 500 }
      );
    }

    // 4) Auth kullanıcısını kalıcı olarak sil
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteUserError) {
      console.error('delete-account: auth kullanıcı silinemedi:', deleteUserError.message);
      return NextResponse.json(
        { error: 'Hesap silinemedi. Lütfen tekrar deneyin.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('delete-account API hatası:', error);
    return NextResponse.json(
      { error: 'Hesap silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
