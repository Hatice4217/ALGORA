import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { dbHelpers } from '../../../../lib/supabase';

const VALID_PLANS = ['pro', 'premium'] as const;

// POST /api/subscription/claim — manuel ödeme (havale/EFT) talebi oluştur.
// Tek pending kuralı: uygulama kontrolü + DB partial unique index (23505 → 409).
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Sunucu yapılandırması eksik' }, { status: 500 });
    }

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    const user = userData.user;
    if (userError || !user) {
      return NextResponse.json({ error: 'Oturum doğrulanamadı' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const plan = body?.plan;
    if (typeof plan !== 'string' || !VALID_PLANS.includes(plan as (typeof VALID_PLANS)[number])) {
      return NextResponse.json({ error: 'Geçersiz paket' }, { status: 400 });
    }

    // Girdi uzunluk sınırları (sistem sınırı doğrulaması)
    const sender_name =
      typeof body?.sender_name === 'string' ? body.sender_name.trim().slice(0, 200) : undefined;
    const reference_note =
      typeof body?.reference_note === 'string' ? body.reference_note.trim().slice(0, 500) : undefined;

    // Kullanıcının token'ıyla kimlikli client — sunucudaki global client anon
    // çalıştığından RLS INSERT'i reddederdi
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await dbHelpers.createPaymentClaim(
      user.id,
      {
        plan: plan as 'pro' | 'premium',
        sender_name,
        reference_note,
      },
      userClient
    );

    if (error) {
      const status = error.code === 'PENDING_EXISTS' ? 409 : 500;
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('subscription claim API hatası:', error);
    return NextResponse.json({ error: 'Talep oluşturulamadı' }, { status: 500 });
  }
}
