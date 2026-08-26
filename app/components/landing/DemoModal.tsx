'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/app/components/ui/Modal';
import { ChevronRight, CheckCircle2, XCircle, Target, TrendingUp, Sparkles, ArrowRight, RotateCcw } from 'lucide-react';

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
    description: 'Sana ALGORA\'nın nasıl çalıştığını gösterelim. Gerçek bir soru çözecek ve yapay zeka destekli geri bildirim alacaksın.',
    type: 'intro'
  },
  {
    id: 'question',
    title: 'Soru 1: Matematik',
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
    description: 'ALGORA ile YKS ve LGS sınavlarına en iyi şekilde hazırlan. 500+ öğrenci arasına katıl!',
    type: 'final'
  }
];

const demoQuestion = {
  subject: 'Matematik',
  topic: 'Türev',
  difficulty: 'Orta',
  question: 'f(x) = 2x² - 3x + 1 fonksiyonunun x = 2 noktasındaki türev değeri kaçtır?',
  choices: [
    { id: 'A', text: '3' },
    { id: 'B', text: '5' },
    { id: 'C', text: '7' },
    { id: 'D', text: '9' }
  ],
  correctAnswer: 'B',
  explanation: `f(x) = 2x² - 3x + 1 fonksiyonunun türevini alalım:

f'(x) = 4x - 3

x = 2 için:
f'(2) = 4(2) - 3 = 8 - 3 = 5

Cevap: 5 (B şıkkı) ✅`
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

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setIsAnimating(false);
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
  };

  const currentStepData = demoSteps[currentStep];

  const isCorrect = selectedAnswer === demoQuestion.correctAnswer;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / demoSteps.length) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600">
            {currentStep + 1}/{demoSteps.length}
          </span>
        </div>

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
              {/* Question Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {demoQuestion.subject} - {demoQuestion.topic}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Zorluk: {demoQuestion.difficulty}
                  </p>
                </div>
                <div className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium text-sm">
                  Soru 1/1
                </div>
              </div>

              {/* Question Text */}
              <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200">
                <p className="text-lg font-medium text-gray-800 leading-relaxed">
                  {demoQuestion.question}
                </p>
              </div>

              {/* Choices */}
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
                  <p className={`
                    text-sm mt-1
                    {isCorrect ? 'text-green-700' : 'text-red-700'}
                  `}>
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

              <button
                onClick={handleNextStep}
                className="w-full py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all"
              >
                Sonraki Adıma Geç
                <ArrowRight className="w-5 h-5 inline ml-2" />
              </button>
            </div>
          )}

          {/* Stats Step */}
          {currentStepData.type === 'stats' && (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <TrendingUp className="w-16 h-16 text-blue-600 mx-auto" />
                <h3 className="text-2xl font-bold text-gray-900">
                  İlerlemenizi Takip Edin
                </h3>
                <p className="text-gray-600">
                  ALGORA, her sorunu analiz eder ve sana detaylı istatistikler sunar
                </p>
              </div>

              {/* Mock Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="text-3xl font-bold text-purple-600">1</div>
                  <div className="text-sm text-gray-600">Çözülen Soru</div>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                  <div className="text-3xl font-bold text-green-600">{isCorrect ? '100' : '0'}%</div>
                  <div className="text-sm text-gray-600">Başarı Oranı</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="text-3xl font-bold text-blue-600">{isCorrect ? '15' : '20'}</div>
                  <div className="text-sm text-gray-600">Saniye/Soru</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-xl">
                  <div className="text-3xl font-bold text-orange-600">+{isCorrect ? '10' : '0'}</div>
                  <div className="text-sm text-gray-600">XP Puanı</div>
                </div>
              </div>

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
