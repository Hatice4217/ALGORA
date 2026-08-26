'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { MobileMenu, HamburgerButton } from '../../components/MobileMenu';
import { getSubjectColor } from '../../lib/utils';
import { authHelpers, dbHelpers } from '../../lib/supabase';
import { StatisticsCards } from '../../components/dashboard/StatisticsCards';
import { WorkRecords } from '../../components/dashboard/WorkRecords';
import { AnalysisPanel } from '../../components/dashboard/AnalysisPanel';
import { QuestionPractice } from '../../components/dashboard/QuestionPractice';
import { SettingsPanel } from '../../components/dashboard/SettingsPanel';

import type { Question, StudyRecord, Statistics, NewRecord, WeeklyStats } from '../../types/question';

// Type definitions for dashboard
interface SubjectStat {
  ders: string;
  toplam: number;
  dogru: number;
  basari: number;
}

interface DailyProgress {
  tarih: string;
  sorular: number;
  basari: number;
}

interface DashboardStatistics {
  toplamSoru: number;
  dogruCevap: number;
  basariOrani: number;
  ortalamaSüre: number;
  dersler: SubjectStat[];
  haftalıkIlerleme: DailyProgress[];
  gelisimGerekenler: string[];
  gucluAlanlar: string[];
}

const SUBJECTS = [
  'Matematik',
  'Türkçe',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Tarih',
  'Coğrafya',
  'Felsefe',
  'Din Kültürü',
];

const DIFFICULTIES = [
  { deger: 'baslangic', etiket: 'Başlangıç' },
  { deger: 'orta', etiket: 'Orta' },
  { deger: 'ileri', etiket: 'İleri' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'practiceRoom' | 'analysis' | 'settings'>('overview');
  const [statistics, setStatistics] = useState<DashboardStatistics>({
    toplamSoru: 0,
    dogruCevap: 0,
    basariOrani: 0,
    ortalamaSüre: 0,
    dersler: [],
    haftalıkIlerleme: [],
    gelisimGerekenler: [],
    gucluAlanlar: [],
  }); // Empty state - no mock data
  const [selectedSubject, setSelectedSubject] = useState('Matematik');
  const [selectedDifficulty, setSelectedDifficulty] = useState('baslangic');
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [userName, setUserName] = useState<string | null>(null); // null = not loaded yet
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Loading state for auth check

  // Initialize userName from localStorage immediately (prevents flash)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedName = localStorage.getItem('userName');
      if (cachedName) {
        setUserName(cachedName);
      }
    }
  }, []);

  // Load study records from database
  const [studyRecords, setStudyRecords] = useState<StudyRecord[]>([]); // Empty state - no mock data

  const [newRecord, setNewRecord] = useState<NewRecord>({
    ders: '',
    saat: '',
    soru: ''
  });

  // Weekly statistics state
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    buHaftaToplamSaat: '3.5',
    buHaftaToplamSoru: 35,
    buGunToplam: '2.0'
  });


  // Authentication check and fetch user data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { user } = await authHelpers.getCurrentUser();
        if (!user) {
          // No user found, redirect to login
          router.push('/auth/login');
          return;
        }

        // User found, set name
        const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Öğrenci';
        setUserName(name);
        setIsLoading(false); // Auth check complete

        // Cache userName in localStorage (prevents flash on reload)
        if (typeof window !== 'undefined') {
          localStorage.setItem('userName', name);
        }

        if (user) {
          // Fetch profile data
          try {
            const profile = await dbHelpers.getUserProfile(user.id);
            if (profile && profile.data && profile.data.name) {
              setUserName(profile.data.name);
              // Update localStorage cache
              if (typeof window !== 'undefined') {
                localStorage.setItem('userName', profile.data.name);
              }
            }
          } catch (profileError) {
            console.log('Profile not found, using metadata');
          }

          // Fetch statistics
          try {
            const statsData = await dbHelpers.getUserStats(user.id);
            if (!statsData.error && statsData.data) {
              const stats = statsData.data;
              setStatistics({
                toplamSoru: stats.total_questions || 0,
                dogruCevap: stats.correct_answers || 0,
                basariOrani: stats.total_questions > 0
                  ? Math.round((stats.correct_answers / stats.total_questions) * 100)
                  : 0,
                ortalamaSüre: stats.average_time || 0,
                dersler: [],
                haftalıkIlerleme: [],
                gelisimGerekenler: [],
                gucluAlanlar: [],
              });
            } else {
              console.log('Statistics not found or error, using default values');
            }
          } catch (statsError) {
            console.log('Could not fetch statistics, using default values:', statsError);
            // Continue with empty values if statistics not found
          }

          // Fetch subject-based performance
          try {
            const subjectData = await dbHelpers.getSubjectBreakdown(user.id);
            if (subjectData.data && subjectData.data.length > 0) {
              const subjectBreakdown = subjectData.data.map((subject: any) => ({
                ders: subject.ders,
                toplam: subject.toplam || 0,
                dogru: subject.dogru || 0,
                basari: subject.toplam > 0
                  ? Math.round((subject.dogru / subject.toplam) * 100)
                  : 0,
              }));

              setStatistics((previous: DashboardStatistics) => ({
                ...previous,
                dersler: subjectBreakdown,
              }));
            }
          } catch (subjectError) {
            console.log('Subject-based performance not found, using empty:', subjectError);
            // Continue with empty values if subject breakdown not found
          }
        } // Close if (user) block
      } catch (error) {
        console.error('Could not fetch data:', error);
      }
    };

    fetchData();
  }, []);

  const generateQuestion = async () => {
    setIsGeneratingQuestion(true);
    setShowAnswer(false);
    setSelectedAnswer(null);

    try {
      const response = await fetch('/api/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject,
          topic: 'Genel',
          difficulty: selectedDifficulty,
          exam_type: 'TYT',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Sunucu hatası' }));
        console.error('API Error:', errorData.error);
        alert(`Soru üretilemedi: ${errorData.error || 'Bilinmeyen hata'}`);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setCurrentQuestion(data.data);
      } else {
        console.error('API Error:', data.error);
        alert(`Soru üretilemedi: ${data.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Could not generate question:', error);
      alert('Soru üretirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const selectAnswer = async (index: number) => {
    if (showAnswer) return;
    setSelectedAnswer(index);
    setShowAnswer(true);

    const isCorrect = index === (currentQuestion?.correctAnswer ?? -1);

    try {
      // First get current user
      const { user } = await authHelpers.getCurrentUser();
      if (!user) {
        console.log('User not found');
        return;
      }

      // Save answer to database
      try {
        const answerRecord = await dbHelpers.saveAnswer({
          user_id: user.id,
          question_id: currentQuestion?.id || `temp_${Date.now()}`,
          selected_answer: index,
          is_correct: isCorrect,
          time_spent: 30, // Mock value, real timer needed
        });

        if (answerRecord.error) {
          console.log('Could not save answer:', answerRecord.error);
        } else {
          console.log('Answer saved successfully');
        }
      } catch (recordError) {
        console.log('Could not save answer, but updating statistics:', recordError);
        // Continue to update statistics even if recording fails
      }
    } catch (error) {
      console.error('Could not save answer:', error);
    }

    // Update statistics immediately
    const today = new Date().toISOString().split('T')[0];
    const updatedStatistics = { ...statistics };

    // Update general statistics
    updatedStatistics.toplamSoru += 1;
    if (isCorrect) {
      updatedStatistics.dogruCevap += 1;
    }
    updatedStatistics.basariOrani = Math.round((updatedStatistics.dogruCevap / updatedStatistics.toplamSoru) * 100);

    // Update weekly progress
    const dailyProgress = updatedStatistics.haftalıkIlerleme.find(d => d.tarih === today);
    if (dailyProgress) {
      dailyProgress.sorular += 1;
      if (isCorrect) {
        const newSuccessRate = Math.round(((dailyProgress.sorular - 1) * dailyProgress.basari + 100) / dailyProgress.sorular);
        dailyProgress.basari = newSuccessRate;
      } else {
        const newSuccessRate = Math.round(((dailyProgress.sorular - 1) * dailyProgress.basari + 0) / dailyProgress.sorular);
        dailyProgress.basari = newSuccessRate;
      }
    } else {
      updatedStatistics.haftalıkIlerleme.push({
        tarih: today,
        sorular: 1,
        basari: isCorrect ? 100 : 0
      });
    }

    // Update subject-based statistics
    const subjectStat = updatedStatistics.dersler.find(d => d.ders === selectedSubject);
    if (subjectStat) {
      subjectStat.toplam += 1;
      if (isCorrect) {
        subjectStat.dogru += 1;
      }
      subjectStat.basari = Math.round((subjectStat.dogru / subjectStat.toplam) * 100);
    } else {
      updatedStatistics.dersler.push({
        ders: selectedSubject,
        toplam: 1,
        dogru: isCorrect ? 1 : 0,
        basari: isCorrect ? 100 : 0
      });
    }

    setStatistics(updatedStatistics);
  };

  const statisticCards = [
    {
      title: 'Toplam Soru',
      value: statistics.toplamSoru,
      icon: '📝',
      color: 'bg-blue-500',
    },
    {
      title: 'Doğru Cevap',
      value: statistics.dogruCevap,
      icon: '✅',
      color: 'bg-green-500',
    },
    {
      title: 'Başarı Oranı',
      value: `%${statistics.basariOrani}`,
      icon: '🎯',
      color: 'bg-purple-500',
    },
    {
      title: 'Ortalama Süre',
      value: `${statistics.ortalamaSüre}s`,
      icon: '⏱️',
      color: 'bg-orange-500',
    },
  ];

  const tabs = [
    { id: 'overview' as const, label: 'Genel Bakış' },
    { id: 'practiceRoom' as const, label: 'Soru Laboratuvarı' },
    { id: 'analysis' as const, label: 'Analizler' },
    { id: 'settings' as const, label: 'Ayarlar' },
  ];

  // Add study record function
  const addStudyRecord = () => {
    if (newRecord.ders && newRecord.saat && newRecord.soru) {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();

      const record = {
        id: Date.now(),
        tarih: `${day}.${month}.${year}`,
        ders: newRecord.ders,
        saat: parseFloat(newRecord.saat),
        soru: parseInt(newRecord.soru)
      };

      setStudyRecords([record, ...studyRecords]);
      setNewRecord({ ders: '', saat: '', soru: '' });
    }
  };

  const deleteStudyRecord = (id: number) => {
    setStudyRecords(studyRecords.filter(record => record.id !== id));
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Üst Bar */}
      <header className="bg-white border-b border-gray-200">
        <div className="w-full px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Logo size="lg" />
              </Link>
            </div>

            {/* Masaüstü Çıkış Butonu */}
            <div className="hidden md:block">
              <Button variant="outline" size="md">
                Çıkış Yap
              </Button>
            </div>

            {/* Mobil Hamburger Butonu */}
            <HamburgerButton
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              isOpen={isMobileMenuOpen}
            />
          </div>

          {/* Sekmeler - Üst Barın Altında */}
          <div className="flex gap-2 border-t border-gray-100 pt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium transition-all relative rounded-t-lg ${
                  activeTab === tab.id
                    ? 'text-purple-600 bg-purple-50'
                    : 'text-gray-600 hover:text-purple-600 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Mobil Menü */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="w-full px-4 md:px-6 lg:px-8 py-8 flex-1 overflow-hidden">
        {/* Genel Bakış Sekmesi */}
        {activeTab === 'overview' && (
          <div className="space-y-4 h-full flex flex-col">
            {/* Hoş Geldin Mesajı */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {userName ? `Merhaba, ${userName}! 👋` : 'Yükleniyor...'}
              </h1>
              <p className="text-gray-600 text-sm">
                Bugün sınav hazırlığına devam etmeye hazır mısın?
              </p>
            </div>

            {/* İstatistik Kartları */}
            <StatisticsCards istatistikler={statistics} />

            {/* Çalışma Kayıtları */}
            <WorkRecords
              calismaKayitlari={studyRecords}
              yeniKayit={newRecord}
              haftalikIstatistikleri={weeklyStats}
              setYeniKayit={setNewRecord}
              calismaKaydiEkle={addStudyRecord}
              calismaKaydiSil={deleteStudyRecord}
            />
          </div>
        )}

        {/* Pratik Odası Sekmesi */}
        {activeTab === 'practiceRoom' && (
          <QuestionPractice
            DERSLER={SUBJECTS}
            ZORLUKLER={DIFFICULTIES}
            seciliDers={selectedSubject}
            seciliZorluk={selectedDifficulty}
            soruUretiliyor={isGeneratingQuestion}
            mevcutSoru={currentQuestion}
            cevapGoster={showAnswer}
            seciliCevap={selectedAnswer}
            setSeciliDers={setSelectedSubject}
            setSeciliZorluk={setSelectedDifficulty}
            soruUret={generateQuestion}
            cevapSec={selectAnswer}
            modalKapat={() => {
              setCurrentQuestion(null);
              setShowAnswer(false);
              setSelectedAnswer(null);
            }}
          />
        )}

        {/* Analizler Sekmesi */}
        {activeTab === 'analysis' && <AnalysisPanel istatistikler={statistics} />}

        {/* Ayarlar Sekmesi */}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>
    </div>
  );
}
