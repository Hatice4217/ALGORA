'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { dbHelpers, authHelpers } from '@/lib/supabase';

const EXAM_TYPES = [
  { value: 'TYT', label: 'Temel Yeterlilik Testi (TYT)' },
  { value: 'AYT', label: 'Alan Yeterlilik Testleri (AYT)' },
  { value: 'LGS', label: 'Lise Geçiş Sınavı (LGS)' },
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
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-1">
        <div
          className="bg-purple-600 h-1 transition-all duration-300"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="max-w-2xl mx-auto mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sınav Hazırlığına Başla 🚀
          </h1>
          <p className="text-gray-600">
            Size kişiselleştirilmiş bir deneyim sunmak için birkaç soru soracağız
          </p>
        </div>

        {/* Step 1: Exam Type */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto">
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
                  <div className="text-3xl mb-2">
                    {exam.value === 'TYT' && '📝'}
                    {exam.value === 'AYT' && '🎯'}
                    {exam.value === 'LGS' && '🎓'}
                  </div>
                  <div className="font-semibold text-gray-900">{exam.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Subjects */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto">
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
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Hedeflerin
            </h2>
            <p className="text-gray-600 mb-6">
              Size uygun çalışma programı hazırlamamıza yardımcı olun
            </p>

            <div className="space-y-8 bg-white rounded-xl p-8 shadow-sm">
              {/* Target Score */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Hedef Puan
                </label>
                <Select
                  options={TARGET_SCORES}
                  value={formData.target_score.toString()}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      target_score: parseInt(e.target.value),
                    }))
                  }
                />
              </div>

              {/* Study Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Günlük Çalışma Saati
                </label>
                <Select
                  options={STUDY_HOURS}
                  value={formData.study_hours.toString()}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      study_hours: parseInt(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            {/* Summary */}
            <div className="mt-6 bg-purple-50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                Özet
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sınav Tipi:</span>
                  <span className="font-medium text-gray-900">{formData.exam_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dersler:</span>
                  <span className="font-medium text-gray-900">
                    {formData.subjects.join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hedef Puan:</span>
                  <span className="font-medium text-gray-900">{formData.target_score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Günlük Çalışma:</span>
                  <span className="font-medium text-gray-900">{formData.study_hours} saat</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="max-w-2xl mx-auto mt-8 flex justify-between">
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
