import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { dbHelpers } from '../../../lib/supabase';

// GET /api/subscription — oturum sahibi kullanıcının paket özeti
// (abonelik + son 20 kredi hareketi + bekleyen talep). Bearer auth (mevcut desen).
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('subscription: servis yapılandırması eksik');
      return NextResponse.json({ error: 'Sunucu yapılandırması eksik' }, { status: 500 });
    }

    // 1) Kimlik doğrulama
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    const user = userData.user;
    if (userError || !user) {
      return NextResponse.json({ error: 'Oturum doğrulanamadı' }, { status: 401 });
    }

    // 2) Lazy rollover — dönem bitmişse service-role ile yeni dönem aç
    //    (subscriptions'ta kullanıcı UPDATE politikası yok; yazımlar yalnızca service-role)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: rolloverError } = await adminClient.rpc('rollover_subscription', {
      p_user_id: user.id,
    });
    if (rolloverError) {
      // Rollover başarısızsa okumayı engelleme — mevcut veriyle devam
      console.error('subscription: rollover hatası:', rolloverError.message);
    }

    // 3) Özet verisi — kullanıcının token'ıyla KİMLİKLİ client üzerinden.
    //    Global `supabase` sunucuda oturumsuz olduğundan RLS satırları gizler;
    //    RLS'i kullanıcının kendisiyle değerlendirmek için token header'da taşınır.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await dbHelpers.getSubscriptionSummary(user.id, userClient);
    if (error || !data?.subscription) {
      return NextResponse.json(
        { error: error || 'Abonelik bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('subscription API hatası:', error);
    return NextResponse.json({ error: 'Paket bilgisi alınamadı' }, { status: 500 });
  }
}
