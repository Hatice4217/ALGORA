import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, resetRateLimit, getClientIp } from '../../../../lib/rate-limit';
import { validateEmail } from '../../../../lib/security';

// S2 (sunucu login proxy): şifreli giriş, istemciden doğrudan Supabase'e gitmek
// yerine BU route üzerinden geçer. Neden:
//  ① lib/security.ts'deki istemci rate limiter'ı istemci-kodunda olduğundan
//    saldırgan singleton'ı bypass edebilir — SUNUCU sayacı bypass edilemez.
//  ② Supabase'in kendi /token limiti (150/5dk/IP) brute-force'a gevşektir;
//    burada daha sıkı bir katman konur.
// Başarılı giriş, o IP'nin başarısız-deneme sayacını sıfırlar (lockout
// success-reset) — NAT arkasındaki sınıfın meşru girişleri kilitlenmez.
// Enumerasyon: hatalı kimlik tek tip 401 döner; EMAIL_NOT_CONFIRMED ayrıca
// bildirilir (UI'da "onay maili" mesajı için; bu bilgi Supabase'in de
// açtığı bir bilgidir, ek sızıntı değildir).

const LOGIN_LIMIT = 15;        // deneme
const LOGIN_WINDOW_MS = 5 * 60_000; // 5 dakika

export async function POST(request: NextRequest) {
  // 1) Sunucu-taraflı IP limiti (F1 fix'li getClientIp: sahte XFF ilk hop'u okunmaz)
  const ip = getClientIp(request);
  const limit = rateLimit(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Çok fazla giriş denemesi yaptınız. ${limit.retryAfterSec} saniye sonra tekrar deneyin.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    );
  }

  // 2) Girdi doğrulama (sistem sınırında — istemciye güvenilmez)
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!validateEmail(email).isValid || !password || password.length > 128) {
    return NextResponse.json({ error: 'Geçerli bir e-posta ve şifre girin.' }, { status: 400 });
  }

  // 3) Supabase'e sunucudan bağlan (anon kimlikle — RLS oturumu istemcide kurulacak)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Sunucu yapılandırması eksik' }, { status: 500 });
  }
  const supa = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supa.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    const msg = error?.message || '';
    if (msg.includes('Email not confirmed')) {
      return NextResponse.json({ error: 'EMAIL_NOT_CONFIRMED' }, { status: 403 });
    }
    if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many')) {
      return NextResponse.json(
        { error: 'Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
    // Invalid login credentials dahil her şey → tek tip yanıt (enumerasyon yok)
    return NextResponse.json({ error: 'E-posta veya şifre hatalı' }, { status: 401 });
  }

  // 4) Başarılı giriş: bu IP'nin başarısız-deneme sayacını affet
  resetRateLimit(`login:${ip}`);

  // 5) Token'ları istemciye ver — supabase.auth.setSession ile oturum kurulur
  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: { id: data.user.id, email: data.user.email },
  });
}
