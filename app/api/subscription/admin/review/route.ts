import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminKey } from '../../../../../lib/admin-auth';
import { PLAN_LIMITS } from '../../../../../lib/subscription-config';

// POST /api/subscription/admin/review — ödeme talebini onayla/reddet.
// Body: { claim_id, action: 'approve' | 'reject' }
// Approve (V2 günlük kota modeli — credit_pivot_gunluk.sql):
//   paid_until = onay + 1 AY (satın alma süresi — plan bitişi budur)
//   period_end = onay + 1 GÜN (günlük kota dönemi; rollover her gün yeniler)
//   credits = günlük plan limiti (PLAN_LIMITS — pro/premium 20) + 'plan_change' tx.
export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminKey(request.headers.get('x-admin-key'))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Sunucu yapılandırması eksik' }, { status: 500 });
    }

    const body = await request.json().catch(() => null);
    const claimId = body?.claim_id;
    const action = body?.action;
    if (typeof claimId !== 'string' || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Talebi çek — pending olmalı
    const { data: claim, error: claimError } = await adminClient
      .from('payment_claims')
      .select('*')
      .eq('id', claimId)
      .maybeSingle();

    if (claimError || !claim) {
      return NextResponse.json({ error: 'Talep bulunamadı' }, { status: 404 });
    }
    if (claim.status !== 'pending') {
      return NextResponse.json(
        { error: 'Bu talep zaten değerlendirilmiş' },
        { status: 409 }
      );
    }

    const now = new Date();

    if (action === 'reject') {
      const { error: updateError } = await adminClient
        .from('payment_claims')
        .update({ status: 'rejected', reviewed_at: now.toISOString() })
        .eq('id', claimId);
      if (updateError) {
        console.error('admin review reject hatası:', updateError.message);
        return NextResponse.json({ error: 'Talep güncellenemedi' }, { status: 500 });
      }
      return NextResponse.json({ success: true, status: 'rejected' });
    }

    // 2) Approve: satın alma süresi (paid_until) +1 ay; kota dönemi günlük (+1 gün)
    const plan = claim.plan as 'pro' | 'premium';
    const limit = PLAN_LIMITS[plan]; // günlük kredi (pro/premium: 20)
    const paidUntil = new Date(now);
    paidUntil.setMonth(paidUntil.getMonth() + 1);
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 1);

    const { data: subscription, error: subError } = await adminClient
      .from('subscriptions')
      .upsert({
        user_id: claim.user_id,
        plan,
        status: 'active',
        credits_remaining: limit,
        credits_limit: limit,
        period_start: now.toISOString(),
        period_end: periodEnd.toISOString(),
        paid_until: paidUntil.toISOString(),
      })
      .select()
      .single();

    if (subError) {
      console.error('admin review approve hatası (subscription):', subError.message);
      return NextResponse.json({ error: 'Abonelik güncellenemedi' }, { status: 500 });
    }

    // 3) plan_change transaction kaydı (+limit)
    const { error: txError } = await adminClient.from('credit_transactions').insert({
      user_id: claim.user_id,
      amount: limit,
      reason: 'plan_change',
    });
    if (txError) {
      // Kritik değil — logla, akışı engelleme
      console.error('admin review: plan_change kaydı yazılamadı:', txError.message);
    }

    // 4) Talebi onaylandı işaretle
    const { error: updateError } = await adminClient
      .from('payment_claims')
      .update({ status: 'approved', reviewed_at: now.toISOString() })
      .eq('id', claimId);
    if (updateError) {
      console.error('admin review approve hatası (claim):', updateError.message);
      return NextResponse.json({ error: 'Talep güncellenemedi' }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: 'approved', data: { subscription } });
  } catch (error) {
    console.error('admin review API hatası:', error);
    return NextResponse.json({ error: 'İşlem tamamlanamadı' }, { status: 500 });
  }
}
