'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getSubjectColor } from '@/lib/utils';

// Mock data - will be replaced with API calls
const mockStats = {
  total_questions_answered: 156,
  correct_answers: 124,
  accuracy_rate: 79,
  average_time_per_question: 45,
  subject_breakdown: [
    { subject: 'Matematik', total: 50, correct: 35, accuracy: 70 },
    { subject: 'Türkçe', total: 40, correct: 36, accuracy: 90 },
    { subject: 'Fizik', total: 30, correct: 22, accuracy: 73 },
    { subject: 'Kimya', total: 20, correct: 15, accuracy: 75 },
    { subject: 'Biyoloji', total: 16, correct: 16, accuracy: 100 },
  ],
  weekly_progress: [
    { date: '2026-07-07', questions: 20, accuracy: 75 },
    { date: '2026-07-08', questions: 25, accuracy: 78 },
    { date: '2026-07-09', questions: 18, accuracy: 72 },
    { date: '2026-07-10', questions: 30, accuracy: 80 },
    { date: '2026-07-11', questions: 22, accuracy: 76 },
    { date: '2026-07-12', questions: 28, accuracy: 82 },
    { date: '2026-07-13', questions: 13, accuracy: 79 },
  ],
  weak_areas: ['Matematik', 'Fizik'],
  strong_areas: ['Türkçe', 'Biyoloji'],
};

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
  { value: 'beginner', label: 'Başlangıç' },
  { value: 'intermediate', label: 'Orta' },
  { value: 'advanced', label: 'İleri' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState(mockStats);
  const [selectedSubject, setSelectedSubject] = useState('Matematik');
  const [selectedDifficulty, setSelectedDifficulty] = useState('beginner');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const handleGenerateQuestion = async () => {
    setIsGenerating(true);
    setShowAnswer(false);
    setSelectedAnswer(null);

    try {
      const response = await fetch('/api/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject,
          topic: 'Genel', // This will be dynamic
          difficulty: selectedDifficulty,
          exam_type: 'TYT', // This will come from user profile
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCurrentQuestion(data.data);
      }
    } catch (error) {
      console.error('Error generating question:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (showAnswer) return;
    setSelectedAnswer(index);
    setShowAnswer(true);

    // Save answer to database (will be implemented)
    const isCorrect = index === currentQuestion.correctAnswer;
    console.log('Answer saved:', { isCorrect, timeSpent: 30 }); // Mock time
  };

  const statsCards = [
    {
      label: 'Toplam Soru',
      value: stats.total_questions_answered,
      icon: '📝',
      color: 'bg-blue-500',
    },
    {
      label: 'Doğru Cevap',
      value: stats.correct_answers,
      icon: '✅',
      color: 'bg-green-500',
    },
    {
      label: 'Başarı Oranı',
      value: `%${stats.accuracy_rate}`,
      icon: '🎯',
      color: 'bg-purple-500',
    },
    {
      label: 'Ortalama Süre',
      value: `${stats.average_time_per_question}s`,
      icon: '⏱️',
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">ALGORA</span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a className="text-purple-600 font-medium">Dashboard</a>
              <a className="text-gray-600 hover:text-purple-600">Raporlar</a>
              <a className="text-gray-600 hover:text-purple-600">Ayarlar</a>
            </nav>
            <Button variant="outline" size="md">
              Çıkış Yap
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Merhaba, Öğrenci! 👋
          </h1>
          <p className="text-gray-600">
            Bugün sınav hazırlığına devam etmeye hazır mısın?
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((card, index) => (
            <Card key={index}>
              <CardBody className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">{card.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  </div>
                  <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-2xl`}>
                    {card.icon}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Question Practice Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Soru Pratiği
                  </h2>
                  <div className="flex gap-4">
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {SUBJECTS.map((subject) => (
                        <option key={subject} value={subject}>
                          {subject}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {DIFFICULTIES.map((diff) => (
                        <option key={diff.value} value={diff.value}>
                          {diff.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                {!currentQuestion ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Soru Çözmeye Başla
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {selectedSubject} dersinden {selectedDifficulty === 'beginner' ? 'kolay' : selectedDifficulty === 'intermediate' ? 'orta' : 'zor'} seviyede soru üret
                    </p>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleGenerateQuestion}
                      isLoading={isGenerating}
                    >
                      Soru Üret
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSubjectColor(selectedSubject)} text-white`}>
                          {selectedSubject}
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700">
                          {selectedDifficulty === 'beginner' ? 'Kolay' : selectedDifficulty === 'intermediate' ? 'Orta' : 'Zor'}
                        </span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {currentQuestion.question}
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {currentQuestion.choices.map((choice: string, index: number) => {
                        let buttonClass = 'border-gray-200 hover:border-purple-300';

                        if (showAnswer) {
                          if (index === currentQuestion.correctAnswer) {
                            buttonClass = 'border-green-500 bg-green-50';
                          } else if (index === selectedAnswer && index !== currentQuestion.correctAnswer) {
                            buttonClass = 'border-red-500 bg-red-50';
                          }
                        } else if (selectedAnswer === index) {
                          buttonClass = 'border-purple-600 bg-purple-50';
                        }

                        return (
                          <button
                            key={index}
                            onClick={() => handleAnswerSelect(index)}
                            disabled={showAnswer}
                            className={`w-full p-4 text-left border-2 rounded-lg transition-all ${buttonClass}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                                showAnswer && index === currentQuestion.correctAnswer
                                  ? 'bg-green-500 text-white'
                                  : showAnswer && index === selectedAnswer && index !== currentQuestion.correctAnswer
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-200 text-gray-700'
                              }`}>
                                {String.fromCharCode(65 + index)}
                              </div>
                              <span className="flex-1">{choice}</span>
                              {showAnswer && index === currentQuestion.correctAnswer && (
                                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                              {showAnswer && index === selectedAnswer && index !== currentQuestion.correctAnswer && (
                                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {showAnswer && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Açıklama</h4>
                        <p className="text-gray-700">{currentQuestion.explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
              {currentQuestion && (
                <CardFooter>
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handleGenerateQuestion}
                    isLoading={isGenerating}
                  >
                    Sıradaki Soru
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Weak Areas */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-900">Gelişim Gereken Alanlar</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {stats.weak_areas.map((area) => (
                    <div key={area} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getSubjectColor(area)}`}></div>
                      <span className="text-gray-700">{area}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Strong Areas */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-900">Güçlü Olduğun Alanlar</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {stats.strong_areas.map((area) => (
                    <div key={area} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getSubjectColor(area)}`}></div>
                      <span className="text-gray-700">{area}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Weekly Progress */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-900">Haftalık İlerleme</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {stats.weekly_progress.slice(-7).map((day) => (
                    <div key={day.date} className="flex items-center gap-3">
                      <div className="w-20 text-sm text-gray-600">
                        {new Date(day.date).toLocaleDateString('tr-TR', { weekday: 'short' })}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${day.accuracy}%` }}
                        />
                      </div>
                      <div className="w-12 text-sm text-gray-600 text-right">
                        %{day.accuracy}
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
