import { NextRequest, NextResponse } from 'next/server';
import { supabase, dbHelpers } from '../../../../lib/supabase';
import { calculateAccuracy } from '../../../../lib/utils';

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Veritabanı bağlantısı kurulamadı' },
        { status: 500 }
      );
    }

    // Authorization header'dan Bearer token'ı al
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Oturum bulunamadı' },
        { status: 401 }
      );
    }

    const token = authHeader.substring('Bearer '.length);

    // Token'ı Supabase ile doğrula - kullanıcı kimliği istemciden alınmaz,
    // doğrulanmış token'dan çıkarılır (spoofing engellenir)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Oturum geçersiz veya süresi dolmuş' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Get user's answers from database
    const { data: answers, error: answersError } = await dbHelpers.getUserStats(userId);

    if (answersError) {
      console.error('Error fetching user stats:', answersError);
      return NextResponse.json(
        { error: 'İstatistikler alınamadı' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const stats = calculateUserStats(answers);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error in user stats API:', error);
    return NextResponse.json(
      { error: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}

interface UserAnswers {
  user_id?: string;
  total_answered?: number;
  correct_answers?: number;
  average_time?: number;
  subjects_breakdown?: Array<{
    subject: string;
    total: number;
    correct: number;
    accuracy_rate?: number;
  }>;
  weekly_progress?: Array<{
    date: string;
    total: number;
    correct: number;
  }>;
}

function calculateUserStats(answers: UserAnswers) {
  // Calculate total questions answered
  const totalQuestions = answers?.total_answered || 0;
  const correctAnswers = answers?.correct_answers || 0;
  const incorrectAnswers = totalQuestions - correctAnswers;

  // Calculate accuracy
  const accuracyRate = calculateAccuracy(correctAnswers, totalQuestions);

  // Calculate average time per question
  const averageTime = answers?.average_time || 0;

  // Subject breakdown (mock data - will be replaced with actual DB query)
  const subjectBreakdown = answers?.subjects_breakdown || [];

  // Weekly progress (last 7 days)
  const weeklyProgress = generateWeeklyProgress();

  // Identify weak and strong areas
  const weakAreas = subjectBreakdown
    .filter((s) => s.accuracy_rate !== undefined && s.accuracy_rate < 50)
    .map((s) => s.subject);

  const strongAreas = subjectBreakdown
    .filter((s) => s.accuracy_rate !== undefined && s.accuracy_rate >= 70)
    .map((s) => s.subject);

  return {
    user_id: answers?.user_id || '',
    total_questions_answered: totalQuestions,
    correct_answers: correctAnswers,
    incorrect_answers: incorrectAnswers,
    accuracy_rate: accuracyRate,
    average_time_per_question: Math.round(averageTime),
    subject_breakdown: subjectBreakdown,
    weekly_progress: weeklyProgress,
    weak_areas: weakAreas,
    strong_areas: strongAreas,
  };
}

function generateWeeklyProgress() {
  const progress = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    progress.push({
      date: date.toISOString().split('T')[0],
      questions_answered: Math.floor(Math.random() * 50) + 10, // Mock data
      accuracy_rate: Math.floor(Math.random() * 30) + 50, // Mock data
    });
  }

  return progress;
}
