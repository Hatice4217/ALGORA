import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { verifyAdminKey } from '../../../../../lib/admin-auth';

// ===================================
// ÇİFT-AI — İNSAN İNCELEME KUYRUĞU (admin)
// ===================================
// kismi_uyum (şüpheli) bantındaki sorular inceleme_kuyrugu view'ında birikir;
// bu route karar verilen tek kapıdır (v1 UI'sız — admin API; UI sonraki faz).
//
// GET  /api/questions/admin/inceleme?limit=50
//   → kuyruk listesi (inceleme_kuyrugu view — yalnız service-role SELECT)
// POST /api/questions/admin/inceleme  Body: { question_id, karar }
//   karar: 'onayla' → verification_status='tam_uyum' + verification.insan_onayi
//          'red'    → status='suspended' + insan_onayi + KLON KASKADI (FLAT graf)
//
// Desen (admin standartları): x-admin-key + 404 maskesi (yanlış/eksik key
// endpoint'in VARLIĞINI gizler). Karar yazımı F4 atomik kapısıyla: UPDATE ...
// .eq('status','active').eq('verification_status','kismi_uyum') — yarışta
// çift-tetikleme/eklenen eski karara yazma 0 satır → 409 ile reddedilir.
// ===================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMIT_VARSAYILAN = 50;
const LIMIT_TAVAN = 200;

// insan_onayi kaydı — verification jsonb'sine gömülür (kayıt sayısal, denetlenebilir)
interface InsanOnayi {
  karar: 'onaylandi' | 'reddedildi';
  onceki_bant: 'kismi_uyum';
  tarih: string;
}

function adminClientKur(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// inceleme_kuyrugu view satırı (view kolonları cift_ai_dogrulama.sql Bölüm 5)
interface IncelemeKuyrukSatiri {
  id: string;
  subject: string;
  topic: string;
  difficulty: string;
  exam_type: string;
  question_text: string;
  choices: string[];
  correct_answer: number;
  tags: string[] | null;
  verification: Record<string, unknown> | null;
  created_at: string;
}

// POST öncesi okunan questions satırı
interface IncelemeHedefSatiri {
  id: string;
  status: string;
  verification_status: string | null;
  verification: Record<string, unknown> | null;
  clone_of: string | null;
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminKey(request.headers.get('x-admin-key'))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const adminClient = adminClientKur();
    if (!adminClient) {
      return NextResponse.json({ error: 'Sunucu yapılandırması eksik' }, { status: 500 });
    }

    const limitHam = Number(request.nextUrl.searchParams.get('limit') || LIMIT_VARSAYILAN);
    const limit = Number.isFinite(limitHam) && limitHam > 0
      ? Math.min(Math.floor(limitHam), LIMIT_TAVAN)
      : LIMIT_VARSAYILAN;

    const { data, error } = await adminClient
      .from('inceleme_kuyrugu')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) {
      // View yoksa (migration çalıştırılmadıysa) net mesaj
      console.error('admin inceleme GET hatası:', error.message);
      return NextResponse.json(
        { error: 'Kuyruk okunamadı — database/cift_ai_dogrulama.sql çalıştırılmalı' },
        { status: 500 }
      );
    }

    const kuyruk = (data ?? []) as unknown as IncelemeKuyrukSatiri[];
    return NextResponse.json({ success: true, data: kuyruk, toplam: kuyruk.length });
  } catch (error) {
    console.error('admin inceleme GET istisnası:', error);
    return NextResponse.json({ error: 'İşlem tamamlanamadı' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminKey(request.headers.get('x-admin-key'))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const adminClient = adminClientKur();
    if (!adminClient) {
      return NextResponse.json({ error: 'Sunucu yapılandırması eksik' }, { status: 500 });
    }

    const body = await request.json().catch(() => null);
    const questionId = typeof body?.question_id === 'string' ? body.question_id : '';
    const karar = body?.karar;

    if (!UUID_RE.test(questionId) || (karar !== 'onayla' && karar !== 'red')) {
      return NextResponse.json(
        { error: 'Geçersiz istek: question_id (uuid) ve karar (onayla|red) gereklidir.' },
        { status: 400 }
      );
    }

    // 1. Mevcut satırı oku — verification jsonb'sini insan_onayi ile birleştirmek
    //    ve klon kaskadının kökünü bulmak için
    const { data: hamSatir, error: okumaError } = await adminClient
      .from('questions')
      .select('id, status, verification_status, verification, clone_of')
      .eq('id', questionId)
      .maybeSingle();
    if (okumaError) {
      console.error('admin inceleme POST okuma hatası:', okumaError.message);
      return NextResponse.json({ error: 'Soru okunamadı' }, { status: 500 });
    }
    const satir = hamSatir as unknown as IncelemeHedefSatiri | null;
    if (!satir) {
      return NextResponse.json({ error: 'Soru bulunamadı' }, { status: 404 });
    }

    const insanOnayi: InsanOnayi = {
      karar: karar === 'onayla' ? 'onaylandi' : 'reddedildi',
      onceki_bant: 'kismi_uyum',
      tarih: new Date().toISOString(),
    };
    const yeniVerification = {
      ...(typeof satir.verification === 'object' && satir.verification !== null ? satir.verification : {}),
      insan_onayi: insanOnayi,
    };

    // 2. ATOMİK KAPI (F4 deseni): yalnız hâlâ active + kismi_uyum satıra yazar.
    //    0 satır = bu arada işlenmiş/durumu değişmiş → 409.
    const guncelleme = karar === 'onayla'
      ? { verification_status: 'tam_uyum', verification: yeniVerification }
      : { status: 'suspended', verification: yeniVerification };

    const { data: guncellenenHam, error: guncellemeError } = await adminClient
      .from('questions')
      .update(guncelleme)
      .eq('id', questionId)
      .eq('status', 'active')
      .eq('verification_status', 'kismi_uyum')
      .select('id');
    if (guncellemeError) {
      console.error('admin inceleme POST güncelleme hatası:', guncellemeError.message);
      return NextResponse.json({ error: 'Karar yazılamadı' }, { status: 500 });
    }
    const guncellenen = (guncellenenHam ?? []) as unknown as Array<{ id: string }>;
    if (guncellenen.length === 0) {
      return NextResponse.json(
        { error: 'Soru karar için uygun değil (zaten işlenmiş ya da durumu değişmiş).' },
        { status: 409 }
      );
    }

    // 3. RED → klon kaskadı (Çift-AI Karar 5): graf FLAT (clone_of = kök, tek hop).
    //    Rapor tarafındaki report_question kaskadıyla aynı kural; route'tan
    //    service-role ile uygulanır. Kuyruk satırı clone_of IS NULL'dur (view),
    //    COALESCE yine de savunmacı tutulur.
    let kaskadAdet = 0;
    if (karar === 'red') {
      const kok = satir.clone_of ?? satir.id;
      const { data: kaskadHam, error: kaskadError } = await adminClient
        .from('questions')
        .update({ status: 'suspended' })
        .eq('status', 'active')
        .or(`id.eq.${kok},clone_of.eq.${kok}`)
        .neq('id', questionId)
        .select('id');
      if (kaskadError) {
        // Ana karar yazıldı; kaskad hatası loglanır (idempotent — yeniden çağrı işlemez, 409 döner)
        console.error('admin inceleme klon kaskadı hatası:', kaskadError.message);
      } else {
        kaskadAdet = ((kaskadHam ?? []) as unknown as Array<{ id: string }>).length;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        question_id: questionId,
        karar: insanOnayi.karar,
        yeni_durum: karar === 'onayla' ? 'active (tam_uyum)' : 'suspended',
        klon_kaskadi: kaskadAdet,
      },
    });
  } catch (error) {
    console.error('admin inceleme POST istisnası:', error);
    return NextResponse.json({ error: 'İşlem tamamlanamadı' }, { status: 500 });
  }
}
