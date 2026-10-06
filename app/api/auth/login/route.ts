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

const LOGIN_LIMIT = 15;        // deneme (IP bazlı katman — NAT dostu)
const LOGIN_WINDOW_MS = 5 * 60_000; // 5 dakika
const MAX_LOGIN_ATTEMPTS = 3;  // hesap bazlı yanlış deneme eşiği (DB'deki RPC default ile aynı)

export async function POST(request: NextRequest) {
  // 1) Sunucu-taraflı IP limiti (F1 fix'li getClientIp: sahte XFF ilk hop'u okunmaz)
  const ip = getClientIp(request);
  const limit = await rateLimit(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
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

  // Service-role client: login_lockouts RPC'leri yalnızca service_role'a açıktır.
  // Migration henüz çalıştırılmamışsa RPC yok demektir → fail-open (kilit özelliği
  // sessizce kapalı kalır, giriş akışı bozulmaz; IP limiti + Supabase limiti çalışır).
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminClient = url && serviceRoleKey
    ? createClient(url, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

  // 3a) Hesap bazlı kilit kontrolü — kilitliyse daha şifreye bakılmadan reddedilir
  if (adminClient) {
    const { data: lockData, error: lockError } = await adminClient.rpc('check_login_lock', {
      p_email: email,
    });
    if (!lockError && lockData) {
      const lockedUntilMs = new Date(lockData as string).getTime();
      const retryAfterSec = Math.max(1, Math.ceil((lockedUntilMs - Date.now()) / 1000));
      return NextResponse.json(
        {
          error: 'Hesabınız çok fazla hatalı deneme nedeniyle geçici olarak kilitlendi.',
          lockedUntil: lockData as string,
        },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
      );
    }
    // lockError → RPC yok/hata: fail-open, aşağıda normal akış
  }

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

    // 4) Hatalı kimlik → hesap bazlı sayacı ilerlet (olmayan e-postalar dahil —
    //    kalanHak alanı var/yok hesap arasında aynı kalır, enumerasyon sızıntısı olmaz)
    let kalanHak: number | undefined;
    if (adminClient) {
      const { data: failData, error: failError } = await adminClient.rpc('record_failed_login', {
        p_email: email,
        p_max_attempts: MAX_LOGIN_ATTEMPTS,
      });
      if (!failError && failData) {
        const info = failData as { locked?: boolean; locked_until?: string | null; attempts_left?: number };
        if (info.locked) {
          const lockedUntilMs = info.locked_until ? new Date(info.locked_until).getTime() : Date.now();
          const retryAfterSec = Math.max(1, Math.ceil((lockedUntilMs - Date.now()) / 1000));
          return NextResponse.json(
            {
              error: 'Hesabınız 3 hatalı deneme nedeniyle 1 saatliğine kilitlendi. Şifrenizi unuttuysanız "Şifremi Unuttum" akışını kullanabilirsiniz.',
              lockedUntil: info.locked_until,
            },
            { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
          );
        }
        // 1. hatada 2, 2. hatada 1 kalan hak; RPC'den hazır geliyor
        if (typeof info.attempts_left === 'number') {
          kalanHak = info.attempts_left;
        }
      } else if (failError) {
        // RPC yok (migration çalışmadı) veya hata → kilit özelliği fail-open
        console.error('login: record_failed_login hatası:', failError.message);
      }
    }

    return NextResponse.json(
      kalanHak !== undefined
        ? { error: 'E-posta veya şifre hatalı', kalanHak }
        : { error: 'E-posta veya şifre hatalı' },
      { status: 401 }
    );
  }

  // 5) Başarılı giriş: IP sayacını affet + hesap kilit sayacını temizle
  await resetRateLimit(`login:${ip}`);
  if (adminClient) {
    const { error: resetError } = await adminClient.rpc('reset_failed_login', { p_email: email });
    if (resetError) {
      console.error('login: reset_failed_login hatası:', resetError.message);
    }
  }

  // 6) Token'ları istemciye ver — supabase.auth.setSession ile oturum kurulur
  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: { id: data.user.id, email: data.user.email },
  });
}
