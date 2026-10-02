'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/app/components/ui/Modal';
import { CheckCircle2, XCircle, TrendingUp, Sparkles, ArrowRight, RotateCcw, Lightbulb } from 'lucide-react';

interface DemoStep {
  id: string;
  title: string;
  description: string;
  type: 'intro' | 'question' | 'stats' | 'final';
}

const demoSteps: DemoStep[] = [
  {
    id: 'intro',
    title: 'ALGORA\'ya Hoş Geldin! 👋',
    description: 'Ders kartına dokun, soru anında açılır — üstelik sınırsız ve ücretsiz. Şimdi gerçek deneyimi kısaca göstelim.',
    type: 'intro'
  },
  {
    id: 'question',
    title: 'Soru: TYT Matematik',
    description: '',
    type: 'question'
  },
  {
    id: 'stats',
    title: 'İlerlemenizi Takip Edin',
    description: '',
    type: 'stats'
  },
  {
    id: 'final',
    title: 'Harika! 🎉',
    description: 'ALGORA ile YKS sınavına en iyi şekilde hazırlan. Ücretsiz hesabını oluştur, ders kartına dokun ve ilk sorunu anında çöz!',
    type: 'final'
  }
];

// Demo sorusu gerçek ürün formatını yansıtır: ÖSYM standardı 5 şık (A-E) +
// çözümü ifşa etmeyen 3 Sokratik ipucu
const demoQuestion = {
  examType: 'TYT',
  subject: 'Matematik',
  topic: 'Oran-Orantı ve Problemler',
  difficulty: 'Orta',
  question: 'Bir sınıftaki öğrencilerin 3/5\'i kız, geri kalan 12 öğrenci erkektir. Buna göre sınıftaki toplam öğrenci sayısı kaçtır?',
  choices: [
    { id: 'A', text: '24' },
    { id: 'B', text: '27' },
    { id: 'C', text: '30' },
    { id: 'D', text: '32' },
    { id: 'E', text: '36' }
  ],
  correctAnswer: 'C',
  explanation: `Sınıfı kesimlere ayıralım:

Kızlar toplamın 3/5'i ise erkekler "geri kalan" kesimdir:
1 - 3/5 = 2/5

Bu kesim 12 öğrenciye eşit:
(2/5) × toplam = 12
toplam = 12 × 5/2 = 30

Cevap: 30 (C şıkkı) ✅`,
  // Sokratik ipuçları: çözümü ifşa ETMEZ, yön gösterir (ücretsiz)
  hints: [
    'Öğrencileri kesimlere ayır: kızlar bir kesim, erkekler "geri kalan" kesim. Erkeklerin kesimi toplamın kaçta kaçı olur?',
    'Bir kesimin gerçek sayısını biliyorsan, bu bilgiyi toplamı bulmak için nasıl kullanabilirsin?',
    'Kesim ile kesim sayısı arasındaki çarpanı oran olarak düşün: hangi sayıyı hangiyle eşleştireceğin önemli.'
  ]
};

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  // Kademeli ipucu: 0 = hiç açılmamış, her basışta bir sonraki açılır (max 3)
  const [acilanIpucu, setAcilanIpucu] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setIsAnimating(false);
      setAcilanIpucu(0);
    }
  }, [isOpen]);

  const handleNextStep = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep((prev) => Math.min(prev + 1, demoSteps.length - 1));
      setIsAnimating(false);
    }, 300);
  };

  const handleAnswerSelect = (answerId: string) => {
    setSelectedAnswer(answerId);
    setShowResult(true);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setIsAnimating(false);
    setAcilanIpucu(0);
  };

  const currentStepData = demoSteps[currentStep];

  const isCorrect = selectedAnswer === demoQuestion.correctAnswer;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Content */}
        <div className={`
          transition-all duration-300
          ${isAnimating ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
        `}>
          {/* Intro Step */}
          {currentStepData.type === 'intro' && (
            <div className="text-center space-y-6 py-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-full animate-bounce">
                <Sparkles className="w-10 h-10 text-purple-600" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-gray-900">
                  {currentStepData.title}
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  {currentStepData.description}
                </p>
              </div>
              <button
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-8 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all hover:scale-105"
              >
                Demo Başla
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Question Step */}
          {currentStepData.type === 'question' && !showResult && (
            <div className="space-y-6">
              {/* Question Header — gerçek soru modalındaki rozet düzeniyle uyumlu */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-lg text-sm font-bold bg-purple-100 text-purple-700">
                      {demoQuestion.examType}
                    </span>
                    <span className="px-3 py-1 rounded-lg text-sm font-medium bg-blue-500 text-white">
                      {demoQuestion.subject}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {demoQuestion.topic} · Zorluk: {demoQuestion.difficulty}
                  </p>
                </div>
                <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-medium text-sm">
                  📚 Havuz
                </div>
              </div>

              {/* Question Text */}
              <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200">
                <p className="text-lg font-medium text-gray-800 leading-relaxed">
                  {demoQuestion.question}
                </p>
              </div>

              {/* Choices — ÖSYM standardı 5 şık */}
              <div className="space-y-3">
                {demoQuestion.choices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => handleAnswerSelect(choice.id)}
                    className={`
                      w-full p-4 rounded-xl border-2 transition-all text-left
                      ${selectedAnswer === choice.id
                        ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-600'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                      }
                      ${selectedAnswer && selectedAnswer !== choice.id ? 'opacity-50' : ''}
                    `}
                    disabled={!!selectedAnswer}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`
                        w-8 h-8 rounded-lg flex items-center justify-center font-bold
                        ${selectedAnswer === choice.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                        }
                      `}>
                        {choice.id}
                      </div>
                      <span className="text-lg font-medium text-gray-800">
                        {choice.text}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Sokratik ipuçları — ücretsiz, kademeli, çözümü ifşa etmez */}
              <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-sky-600" />
                    Takıldın mı?
                  </h4>
                  <span className="text-xs text-gray-500">Ücretsizdir — çözümü ifşa etmez, yön gösterir.</span>
                </div>
                {acilanIpucu > 0 && (
                  <ol className="mt-3 space-y-2 list-decimal list-inside">
                    {demoQuestion.hints.slice(0, acilanIpucu).map((ipucu, i) => (
                      <li key={i} className="text-sm text-gray-700">{ipucu}</li>
                    ))}
                  </ol>
                )}
                {acilanIpucu < demoQuestion.hints.length && (
                  <button
                    onClick={() => setAcilanIpucu((n) => n + 1)}
                    className="mt-3 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors"
                  >
                    💡 {acilanIpucu + 1}. İpucu Al (ücretsiz)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Result Step */}
          {currentStepData.type === 'question' && showResult && (
            <div className="space-y-6">
              {/* Result Header */}
              <div className={`
                flex items-center gap-4 p-6 rounded-xl
                ${isCorrect ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}
              `}>
                {isCorrect ? (
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                ) : (
                  <XCircle className="w-12 h-12 text-red-600" />
                )}
                <div>
                  <h3 className={`
                    text-xl font-bold
                    ${isCorrect ? 'text-green-900' : 'text-red-900'}
                  `}>
                    {isCorrect ? 'Tebrikler! Doğru Cevap 🎉' : 'Yanlış Cevap 😔'}
                  </h3>
                  <p className={`text-sm mt-1 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                    {isCorrect
                      ? 'Harika gidiyorsun! Bu konuyu iyi anlamışsın.'
                      : `Doğru cevap: ${demoQuestion.correctAnswer} şıkkı (${demoQuestion.choices.find(c => c.id === demoQuestion.correctAnswer)?.text})`
                    }
                  </p>
                </div>
              </div>

              {/* Explanation */}
              <div className="p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">📚 Çözüm:</h4>
                <pre className="text-sm text-blue-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {demoQuestion.explanation}
                </pre>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Üyelere özel: 🧠 Üst Beyin anlatımı soruyu adım adım, konunun mantığıyla anlatır.
              </p>

              <button
                onClick={handleNextStep}
                className="w-full py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all"
              >
                Sonraki Adıma Geç
                <ArrowRight className="w-5 h-5 inline ml-2" />
              </button>
            </div>
          )}

          {/* Stats Step — gerçek dashboard metrikleri (XP gibi var olmayan ölçüm yok) */}
          {currentStepData.type === 'stats' && (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <TrendingUp className="w-16 h-16 text-blue-600 mx-auto" />
                <h3 className="text-2xl font-bold text-gray-900">
                  İlerlemenizi Takip Edin
                </h3>
                <p className="text-gray-600">
                  ALGORA her çözümü analiz eder; branş bazlı başarı, günlük seri ve eksiklerini tek ekranda takip edersin
                </p>
              </div>

              {/* Demo Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="text-3xl font-bold text-purple-600">1</div>
                  <div className="text-sm text-gray-600">Çözülen Soru</div>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                  <div className="text-3xl font-bold text-green-600">{isCorrect ? '100' : '0'}%</div>
                  <div className="text-sm text-gray-600">Başarı Oranı</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-xl">
                  <div className="text-3xl font-bold text-orange-600">1 gün</div>
                  <div className="text-sm text-gray-600">Günlük Seri</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="text-3xl font-bold text-blue-600">∞</div>
                  <div className="text-sm text-gray-600">Soru Hakkı</div>
                </div>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Soru çözmek sınırsız ve ücretsizdir; günlük krediler yalnızca 🧠 Üst Beyin anlatımlarında kullanılır.
              </p>

              <button
                onClick={handleNextStep}
                className="w-full py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all"
              >
                Devam Et
                <ArrowRight className="w-5 h-5 inline ml-2" />
              </button>
            </div>
          )}

          {/* Final Step */}
          {currentStepData.type === 'final' && (
            <div className="text-center space-y-6 py-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-gray-900">
                  {currentStepData.title}
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  {currentStepData.description}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <a
                  href="/auth/register"
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all hover:scale-105"
                >
                  Ücretsiz Başla
                  <ArrowRight className="w-5 h-5" />
                </a>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
                >
                  <RotateCcw className="w-5 h-5" />
                  Tekrar Dene
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
