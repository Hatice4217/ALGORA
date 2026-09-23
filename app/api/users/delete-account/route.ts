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
    const password = body?.password;
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Şifre gereklidir' }, { status: 400 });
    }

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

    // 2) Şifreyi sunucu tarafında doğrula
    const { error: signInError } = await anonClient.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (signInError) {
      return NextResponse.json({ error: 'Şifre hatalı' }, { status: 401 });
    }

    // 3) Kullanıcı verilerini tüm tablolardan sil (questions global içeriktir, silinmez)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const userTables = [
      'answers',
      'study_sessions',
      'subject_breakdown',
      'user_stats',
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
