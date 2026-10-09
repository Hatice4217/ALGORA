import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminKey } from '../../../../../lib/admin-auth';

// GET /api/subscription/admin/claims — tüm ödeme taleplerini listeler.
// Auth: x-admin-key header (ADMIN_SECRET_KEY). Yanlışsa 404 (varlığı gizlemek için).
export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminKey(request.headers.get('x-admin-key'))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Sunucu yapılandırması eksik' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: claims, error } = await adminClient
      .from('payment_claims')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('admin claims okuma hatası:', error.message);
      return NextResponse.json({ error: 'Talepler alınamadı' }, { status: 500 });
    }

    // Kullanıcı e-postalarını eşle (admin özet görünümü için).
    // F9 onarımı (güvenlik taraması 9 Eki): tek seferlik 1000'lik çağrı yerine
    // sayfa döngüsü — 1000+ kullanıcıda e-posta eşlemesi sessiz eksik kalmasın.
    let emailMap: Record<string, string> = {};
    try {
      const PER_PAGE = 1000;
      const MAX_SAYFA = 20; // 20k kullanıcı tavanı — ötesi bilinçli kesim
      const eslesmeler: [string, string][] = [];
      for (let sayfa = 1; sayfa <= MAX_SAYFA; sayfa++) {
        const { data: usersData } = await adminClient.auth.admin.listUsers({
          page: sayfa,
          perPage: PER_PAGE,
        });
        const liste = usersData?.users ?? [];
        eslesmeler.push(...liste.map((u) => [u.id, u.email ?? ''] as [string, string]));
        if (liste.length < PER_PAGE) break;
      }
      emailMap = Object.fromEntries(eslesmeler);
    } catch (e) {
      console.error('admin claims: kullanıcı listesi alınamadı:', e);
    }

    const enriched = (claims ?? []).map((claim) => ({
      ...claim,
      user_email: emailMap[claim.user_id] ?? null,
    }));

    return NextResponse.json({ data: enriched });
  } catch (error) {
    console.error('admin claims API hatası:', error);
    return NextResponse.json({ error: 'Talepler alınamadı' }, { status: 500 });
  }
}
