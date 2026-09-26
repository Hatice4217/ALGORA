import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { verifyEmailVerificationToken } from '@/lib/email-token';

// GET /api/auth/verify-email/confirm?token=...
// Maildeki onay linkinin hedefi: imza + süre doğrular, kullanıcıyı bulur ve
// auth kaydında email_confirm=true yazar, sonra sonuç sayfasına yönlendirir.
export async function GET(request: NextRequest) {
  const pageUrl = (status: string, email?: string) => {
    const url = new URL('/auth/verify-email', request.url);
    url.searchParams.set('status', status);
    if (email) url.searchParams.set('email', email);
    return NextResponse.redirect(url);
  };

  // Hafif IP limiti — link'e flood atılmasını engeller (token zaten imzalı, brute force anlamsız)
  const rl = rateLimit(`verify-confirm-ip:${getClientIp(request)}`, 10, 10 * 60_000);
  if (!rl.ok) return pageUrl('error');

  const token = request.nextUrl.searchParams.get('token') || '';
  const result = verifyEmailVerificationToken(token);
  if (!result.ok) {
    return pageUrl(result.reason === 'expired' ? 'expired' : 'invalid');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('verify-email/confirm: SUPABASE_SERVICE_ROLE_KEY tanımlı değil');
    return pageUrl('error');
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Kullanıcıyı e-postadan bul (admin API'de e-posta filtresi yok; sayfalı tarama)
  let userId: string | null = null;
  let alreadyConfirmed = false;
  const PER_PAGE = 200;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) {
      console.error('verify-email/confirm: listUsers hatası:', error.message);
      return pageUrl('error');
    }
    const found = data.users.find(
      (u) => (u.email || '').toLowerCase() === result.email
    );
    if (found) {
      userId = found.id;
      alreadyConfirmed = Boolean(found.email_confirmed_at);
      break;
    }
    if (data.users.length < PER_PAGE) break;
  }

  if (!userId) {
    // Token geçerli ama bu adreste kullanıcı yok (silinmiş olabilir)
    return pageUrl('invalid');
  }

  if (!alreadyConfirmed) {
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    if (updateError) {
      console.error('verify-email/confirm: email_confirm hatası:', updateError.message);
      return pageUrl('error');
    }
  }

  return pageUrl('success', result.email);
}
