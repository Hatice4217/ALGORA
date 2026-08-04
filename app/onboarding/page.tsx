'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { dbHelpers, authHelpers } from '../../lib/supabase';

const EXAM_TYPES = [
  { value: 'LGS', label: 'LGS', fullName: 'Lise Geçiş Sınavı (LGS)', emoji: '🎓' },
  { value: 'TYT', label: 'TYT', fullName: 'Temel Yeterlilik Testi (TYT)', emoji: '📝' },
  { value: 'AYT', label: 'AYT', fullName: 'Alan Yeterlilik Testleri (AYT)', emoji: '🎯' },
];

const SUBJECTS_BY_EXAM = {
  TYT: [
    'Matematik',
    'Türkçe',
    'Fizik',
    'Kimya',
    'Biyoloji',
    'Tarih',
    'Coğrafya',
    'Felsefe',
    'Din Kültürü',
  ],
  AYT: [
    'Matematik',
    'Fizik',
    'Kimya',
    'Biyoloji',
    'Tarih',
    'Coğrafya',
    'Edebiyat',
  ],
  LGS: ['Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce'],
};

const TARGET_SCORES = Array.from({ length: 41 }, (_, i) => ({
  value: 100 + i * 10,
  label: `${100 + i * 10}`,
}));

const STUDY_HOURS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1} saat`,
}));

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    exam_type: '',
    subjects: [] as string[],
    target_score: 300,
    study_hours: 4,
  });

  const handleExamTypeSelect = (examType: string) => {
    setFormData((prev) => ({
      ...prev,
      exam_type: examType,
      subjects: [], // Reset subjects when exam type changes
    }));
  };

  const handleSubjectToggle = (subject: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const handleNext = () => {
    if (step === 1 && formData.exam_type) {
      setStep(2);
    } else if (step === 2 && formData.subjects.length > 0) {
      setStep(3);
    } else if (step === 3) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    try {
      // Get current user from Supabase
      const { user } = await authHelpers.getCurrentUser();

      if (!user) {
        console.error('No user logged in');
        router.push('/auth/login');
        return;
      }

      // Save user profile to Supabase
      await dbHelpers.createUserProfile({
        user_id: user.id,
        exam_type: formData.exam_type,
        target_score: formData.target_score,
        subjects: formData.subjects,
        study_hours_per_day: formData.study_hours,
      });

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving profile:', error);
      // Handle error - could add error state and display to user
    }
  };

  const availableSubjects = formData.exam_type
    ? SUBJECTS_BY_EXAM[formData.exam_type as keyof typeof SUBJECTS_BY_EXAM] || []
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto w-full px-6 py-12">
        {/* Header with Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Sınav Hazırlığına Başla 🚀
            </h1>
            <div className="text-sm text-gray-500">
              Adım {step} / 3
            </div>
          </div>

          {/* Compact Progress Bar */}
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-purple-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          <p className="text-gray-600 mt-2">
            Size kişiselleştirilmiş bir deneyim sunmak için birkaç soru soracağız
          </p>
        </div>

        {/* Step 1: Exam Type */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Hangi sınava hazırlanıyorsun?
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {EXAM_TYPES.map((exam) => (
                <button
                  key={exam.value}
                  onClick={() => handleExamTypeSelect(exam.value)}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    formData.exam_type === exam.value
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-purple-300'
                  }`}
                >
                  <div className="text-4xl mb-3">
                    {exam.emoji}
                  </div>
                  <div className="font-bold text-2xl text-gray-900 mb-1">
                    {exam.label}
                  </div>
                  <div className="text-sm text-gray-500">
                    {exam.fullName}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Subjects */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Hangi derslerle çalışmak istersin?
            </h2>
            <p className="text-gray-600 mb-6">
              İstediğiniz kadar ders seçebilirsiniz
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {availableSubjects.map((subject) => (
                <button
                  key={subject}
                  onClick={() => handleSubjectToggle(subject)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    formData.subjects.includes(subject)
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{subject}</span>
                    {formData.subjects.includes(subject) && (
                      <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Goals */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Hedeflerin
            </h2>
            <p className="text-gray-600 mb-8">
              Size uygun çalışma programı hazırlamamıza yardımcı olun
            </p>

            {/* Two Column Grid Layout - Optimized */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              {/* Left Column (md:col-span-3): Form Fields */}
              <div className="md:col-span-3 space-y-6">
                {/* Target Score */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ulaşmak İstediğin Puan / Sıralama Bandı
                  </label>
                  <select
                    value={formData.target_score.toString()}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        target_score: parseInt(e.target.value),
                      }))
                    }
                    className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-gray-900 font-medium"
                  >
                    {TARGET_SCORES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Study Hours */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Algora ile Günlük Çalışma Temposu
                  </label>
                  <select
                    value={formData.study_hours.toString()}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        study_hours: parseInt(e.target.value),
                      }))
                    }
                    className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-gray-900 font-medium"
                  >
                    {STUDY_HOURS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right Column (md:col-span-2): Summary Widget */}
              <div className="md:col-span-2">
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Özet
                  </h3>

                  {/* Summary Items with Dividers */}
                  <div className="divide-y divide-gray-100">
                    {/* Exam Type */}
                    <div className="flex justify-between py-3">
                      <span className="text-sm text-gray-500">Sınav Tipi</span>
                      <span className="text-sm font-medium text-gray-900">{formData.exam_type}</span>
                    </div>

                    {/* Subjects */}
                    <div className="flex justify-between py-3">
                      <span className="text-sm text-gray-500">Dersler</span>
                      <span className="text-sm font-medium text-gray-900 text-right max-w-[120px] truncate">
                        {formData.subjects.join(', ')}
                      </span>
                    </div>

                    {/* Target Score */}
                    <div className="flex justify-between py-3">
                      <span className="text-sm text-gray-500">Hedef Puan</span>
                      <span className="text-sm font-medium text-gray-900">{formData.target_score}</span>
                    </div>

                    {/* Study Hours */}
                    <div className="flex justify-between py-3">
                      <span className="text-sm text-gray-500">Çalışma Temposu</span>
                      <span className="text-sm font-medium text-gray-900">{formData.study_hours} saat</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t border-gray-100 mt-8">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setStep((prev) => Math.max(1, prev - 1))}
            disabled={step === 1}
          >
            Geri
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleNext}
            disabled={
              (step === 1 && !formData.exam_type) ||
              (step === 2 && formData.subjects.length === 0)
            }
          >
            {step === 3 ? 'Bitir' : 'İleri'}
          </Button>
        </div>
      </div>
    </div>
  );
}
