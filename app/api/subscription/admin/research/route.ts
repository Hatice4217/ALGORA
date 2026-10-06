import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminKey } from '../../../../../lib/admin-auth';
import { validateEmail } from '../../../../../lib/security';

// ===================================
// ARAŞTIRMA MODU — BAP deney/kontrol grubu ataması
// ===================================
// POST /api/subscription/admin/research  Body: { email, group }
//   group: 'deney' | 'kontrol' | null (null = katılımcılıktan çıkar)
// GET  /api/subscription/admin/research?email=...  → mevcut grup sorgusu
//
// Desen: x-admin-key + 404 maskesi (yanlış/eksik key endpoint'in VARLIĞINI
// gizler). Atama user_profiles.research_group'a yazar; kredi baypası
// solution route'undaki if bloğudur. Profil satırı yoksa (kullanıcı henüz
// ilk kaydını yapmadıysa) nötr varsayılanlarla upsert edilir — kullanıcı
// ayarları kaydettiğinde gerçek değerleriyle günceller.
// ===================================

type ResearchGroup = 'deney' | 'kontrol' | null;

function isValidGroup(value: unknown): value is ResearchGroup {
  return value === null || value === 'deney' || value === 'kontrol';
}

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
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const group = body?.group === undefined ? null : body.group;

    if (!validateEmail(email).isValid || !isValidGroup(group)) {
      return NextResponse.json(
        { error: 'Geçersiz istek: email zorunlu, group yalnızca deney/kontrol/null olabilir.' },
        { status: 400 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // E-postadan kullanıcıyı bul — get_user_id_by_email RPC (SECURITY DEFINER,
    // üçlü REVOKE; bu supabase-js sürümünde getUserByEmail yok, listUsers
    // güvenilmez). RPC yoksa (migration öncesi) net mesaj döner.
    const { data: userId, error: userError } = await adminClient.rpc('get_user_id_by_email', {
      p_email: email,
    });
    if (userError) {
      console.error('admin research: get_user_id_by_email hatası:', userError.message);
      return NextResponse.json(
        { error: 'E-posta çözümlemesi yapılamadı — database/arastirma_modu.sql çalıştırılmalı' },
        { status: 500 }
      );
    }
    if (!userId) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    // Grubu yaz: ÖNCE UPDATE (upsert KULLANMA — çakışmada gönderilen TÜM
    // alanları günceller ve kullanıcının gerçek ders/hedef verisini nötr
    // varsayılanlarla ezerdi). 0 satır dönerse profil satırı yoktur → INSERT.
    let profileError: { message: string } | null = null;
    let writtenGroup: ResearchGroup = group;

    const { data: updated, error: updateError } = await adminClient
      .from('user_profiles')
      .update({ research_group: group, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select('research_group')
      .maybeSingle();

    if (updateError) {
      profileError = updateError;
    } else if (!updated) {
      // Profil satırı yok (kullanıcı ilk ayar kaydını yapmamış) — nötr
      // varsayılanlarla oluştur; kullanıcı ayarlarını kaydedince gerçek
      // değerleriyle günceller (dashboard fallback deseni)
      const { error: insertError } = await adminClient.from('user_profiles').insert({
        user_id: userId,
        research_group: group,
        exam_type: 'TYT',
        target_score: 0,
        subjects: [],
        study_hours_per_day: 0,
      });
      if (insertError) {
        profileError = insertError;
      }
    } else {
      writtenGroup = (updated.research_group as ResearchGroup) ?? null;
    }

    if (profileError) {
      // Kolon henüz yoksa (migration çalıştırılmadıysa) net mesaj ver
      if (profileError.message.includes('research_group')) {
        return NextResponse.json(
          { error: 'research_group kolonu yok — database/arastirma_modu.sql çalıştırılmalı' },
          { status: 500 }
        );
      }
      console.error('admin research atama hatası:', profileError.message);
      return NextResponse.json({ error: 'Atama yazılamadı' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        user_id: userId,
        email,
        research_group: writtenGroup,
        assigned: group,
      },
    });
  } catch (error) {
    console.error('admin research API hatası:', error);
    return NextResponse.json({ error: 'İşlem tamamlanamadı' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminKey(request.headers.get('x-admin-key'))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const email = (request.nextUrl.searchParams.get('email') || '').trim().toLowerCase();
    if (!validateEmail(email).isValid) {
      return NextResponse.json({ error: 'Geçerli bir e-posta gerekli' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Sunucu yapılandırması eksik' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userId, error: userError } = await adminClient.rpc('get_user_id_by_email', {
      p_email: email,
    });
    if (userError) {
      console.error('admin research GET: get_user_id_by_email hatası:', userError.message);
      return NextResponse.json(
        { error: 'E-posta çözümlemesi yapılamadı — database/arastirma_modu.sql çalıştırılmalı' },
        { status: 500 }
      );
    }
    if (!userId) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    const { data: profile, error: profileError } = await adminClient
      .from('user_profiles')
      .select('research_group')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('admin research sorgu hatası:', profileError.message);
      return NextResponse.json({ error: 'Profil okunamadı' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        user_id: userId,
        email,
        research_group: profile?.research_group ?? null,
      },
    });
  } catch (error) {
    console.error('admin research GET hatası:', error);
    return NextResponse.json({ error: 'İşlem tamamlanamadı' }, { status: 500 });
  }
}
