// ===================================
// ALGORA V2 — Hatalı Soru Bildirimi (kitle kaynaklı kalite kontrolü)
// ===================================
// Öğrenci soruda hata görürse bildirir. report_question RPC'si:
//   • kullanıcı başına soru başına TEK bildirim (unique constraint)
//   • FARKLI 2. kullanıcının bildirimiyle soru OTOMATİK askıya alınır
//     (havuz sorguları status='active' filtrelediği için askıdaki soru
//     bir daha hiçbir öğrenciye gelmez) — admin incelemesine gerek kalmadan.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../../lib/supabase';
import { rateLimit } from '../../../../lib/rate-limit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    // 0. AUTH
    if (!supabase) {
      return NextResponse.json({ error: 'Veritabanı bağlantısı kurulamadı' }, { status: 500 });
    }
    const token = request.headers.get('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 0.1 SPAM LİMİTİ — bildirim bedava olduğundan saatlik üst sınır şart
    const burst = rateLimit(`report:${user.id}`, 10, 3_600_000);
    if (!burst.ok) {
      return NextResponse.json(
        { error: 'Çok fazla bildirim gönderildi. Lütfen bir saat sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(burst.retryAfterSec) } }
      );
    }

    // 0.5 Service-role client (RPC service_role-only)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Sunucu yapılandırması eksik' }, { status: 500 });
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. İstek gövdesi
    const body = await request.json().catch(() => ({}));
    const { question_id, reason } = body as { question_id?: unknown; reason?: unknown };

    if (typeof question_id !== 'string' || !UUID_RE.test(question_id)) {
      return NextResponse.json({ error: 'Geçersiz soru kimliği.' }, { status: 400 });
    }

    // 2. RPC: tek bildirim → 'active'; 2. FARKLI kullanıcı → 'suspended'
    // Dönüş jsonb nesnesidir: { success, question_status } veya { success:false, error }
    const { data, error: rpcError } = await adminClient.rpc('report_question', {
      p_question_id: question_id,
      p_user_id: user.id,
      p_reason: typeof reason === 'string' ? reason.trim().slice(0, 500) : null,
    });
    if (rpcError) {
      console.error('report: report_question RPC hatası:', rpcError.message);
      return NextResponse.json(
        { error: 'Bildiriminiz kaydedilemedi. Lütfen tekrar deneyin.' },
        { status: 500 }
      );
    }

    const rpcSonuc = data as { success?: boolean; question_status?: string; error?: string } | null;

    if (!rpcSonuc?.success) {
      // Aynı kullanıcı 2. bildirimi: DB tek-bildirim kuralı dedupe'ler —
      // kullanıcının soru durumunu okuyup doğru mesajla "başarılı" dön
      if (rpcSonuc?.error === 'ALREADY_REPORTED') {
        const { data: q } = await adminClient
          .from('questions')
          .select('status')
          .eq('id', question_id)
          .maybeSingle();
        return NextResponse.json({
          success: true,
          data: { status: q?.status === 'suspended' ? 'suspended' : 'active', already_reported: true },
        });
      }
      // QUESTION_NOT_FOUND ve diğerleri
      return NextResponse.json({ error: 'Soru bulunamadı.' }, { status: 404 });
    }

    const status = rpcSonuc.question_status ?? 'active';
    console.log(`report: ${user.id} → ${question_id} yeni durum: ${status}`);

    return NextResponse.json({ success: true, data: { status } });
  } catch (error) {
    console.error('❌ /api/questions/report hatası:', error);
    return NextResponse.json(
      { error: 'Bildiriminiz kaydedilemedi. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
