'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../app/components/ui/Button';
import { Input } from '../../app/components/ui/Input';
import { Select } from '../../app/components/ui/Select';
import { Toggle } from '../../app/components/ui/Toggle';
import { Modal } from '../../app/components/ui/Modal';
import { Toast, useToast } from '../../app/components/ui/Toast';
import { authHelpers, dbHelpers } from '../../lib/supabase';
import {
  validateSettingsSection,
  hasSectionErrors,
} from '../../lib/validation';
import type { SettingsFormState, SettingsValidationErrors } from '../../types/question';

const EXAM_TYPES = [
  { value: 'TYT', label: 'TYT (Temel Yeterlilik Testi)' },
  { value: 'AYT', label: 'AYT (Alan Yeterlilik Testi)' },
  { value: 'LGS', label: 'LGS (Liseye Geçiş Sistemi)' },
];

const THEMES = [
  { value: 'light', label: 'Açık' },
  { value: 'dark', label: 'Koyu' },
];

const LANGUAGES = [
  { value: 'tr', label: 'Türkçe' },
  { value: 'en', label: 'English' },
];

// Section card definitions
const SECTIONS = [
  {
    id: 'profile' as const,
    title: 'Profil Bilgileri',
    description: 'Adınızı ve iletişim bilgilerinizi düzenleyin',
    icon: '👤',
    color: 'bg-purple-500',
  },
  {
    id: 'exam' as const,
    title: 'Sınav Hedefleri',
    description: 'Sınav hedeflerinizi ve çalışma planınızı belirleyin',
    icon: '🎯',
    color: 'bg-blue-500',
  },
  {
    id: 'notifications' as const,
    title: 'Bildirimler & Tercihler',
    description: 'Bildirim ve görünüm tercihlerinizi yönetin',
    icon: '🔔',
    color: 'bg-green-500',
  },
  {
    id: 'account' as const,
    title: 'Hesap Yönetimi',
    description: 'Şifrenizi değiştirin veya hesabınızı yönetin',
    icon: '⚙️',
    color: 'bg-orange-500',
  },
];

export function SettingsPanel() {
  const { toast, showToast, hideToast } = useToast();

  // Active section state
  const [activeSection, setActiveSection] = useState<'profile' | 'exam' | 'notifications' | 'account' | null>(null);

  // Form state
  const [formData, setFormData] = useState<SettingsFormState>({
    name: '',
    email: '',
    exam_type: 'TYT',
    target_score: '',
    exam_date: '',
    study_hours_per_day: '',
    email_notifications: true,
    theme: 'light',
    language: 'tr',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Original data for cancel functionality
  const [originalData, setOriginalData] = useState<SettingsFormState>({ ...formData });

  // Validation errors
  const [errors, setErrors] = useState<SettingsValidationErrors>({});

  // Loading states per section
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  // Google ile giriş yapan kullanıcının şifresi yoktur; silme modalı şifre yerine
  // "son 10 dk içinde giriş" bilgisi gösterir (backend aynı kontrolü yapar)
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load user data on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { user } = await authHelpers.getCurrentUser();
        if (user) {
          const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Öğrenci';
          const email = user.email || '';

          // Fetch profile data
          const profile = await dbHelpers.getUserProfile(user.id);
          const profileData = profile?.data || {};

          const newFormData: SettingsFormState = {
            name,
            email,
            exam_type: profileData.exam_type || 'TYT',
            target_score: profileData.target_score?.toString() || '',
            exam_date: profileData.exam_date || '',
            study_hours_per_day: profileData.study_hours_per_day?.toString() || '',
            email_notifications: profileData.email_notifications ?? true,
            theme: profileData.theme || 'light',
            language: profileData.language || 'tr',
            current_password: '',
            new_password: '',
            confirm_password: '',
          };

          setFormData(newFormData);
          setOriginalData(newFormData);
        }
      } catch (error) {
        console.error('Could not load user data:', error);
      }
    };

    loadUserData();
  }, []);

  const handleInputChange = (
    field: keyof SettingsFormState,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    if (errors[field as keyof SettingsValidationErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSectionBlur = (
    section: 'profile' | 'exam' | 'notifications' | 'account'
  ) => {
    const sectionErrors = validateSettingsSection(section, formData);
    setErrors(sectionErrors);
  };

  const handleSaveSection = async (
    section: 'profile' | 'exam' | 'notifications' | 'account'
  ) => {
    // Validate section
    const sectionErrors = validateSettingsSection(section, formData);
    setErrors(sectionErrors);

    if (hasSectionErrors(section, sectionErrors)) {
      showToast('Lütfen hataları düzeltin', 'error');
      return;
    }

    setSavingSection(section);

    try {
      const { user } = await authHelpers.getCurrentUser();
      if (!user) {
        showToast('Kullanıcı bulunamadı', 'error');
        setSavingSection(null);
        return;
      }

      switch (section) {
        case 'profile':
          await dbHelpers.updateUserSettings(user.id, {
            name: formData.name,
          });
          setOriginalData((prev) => ({ ...prev, name: formData.name }));
          showToast('Profil güncellendi', 'success');
          setActiveSection(null);
          break;

        case 'exam':
          await dbHelpers.updateUserSettings(user.id, {
            exam_type: formData.exam_type,
            target_score: parseFloat(formData.target_score) || 0,
            exam_date: formData.exam_date || undefined,
            study_hours_per_day: parseFloat(formData.study_hours_per_day) || 0,
          });
          setOriginalData((prev) => ({
            ...prev,
            exam_type: formData.exam_type,
            target_score: formData.target_score,
            exam_date: formData.exam_date,
            study_hours_per_day: formData.study_hours_per_day,
          }));
          showToast('Sınav hedefleri güncellendi', 'success');
          setActiveSection(null);
          break;

        case 'notifications':
          await dbHelpers.updateUserSettings(user.id, {
            email_notifications: formData.email_notifications,
            theme: formData.theme,
            language: formData.language,
          });
          setOriginalData((prev) => ({
            ...prev,
            email_notifications: formData.email_notifications,
            theme: formData.theme,
            language: formData.language,
          }));
          showToast('Tercihler güncellendi', 'success');
          setActiveSection(null);
          break;

        case 'account':
          if (formData.current_password && formData.new_password) {
            const result = await dbHelpers.changePassword(
              formData.current_password,
              formData.new_password
            );
            if (result.error) {
              showToast(result.error, 'error');
              setSavingSection(null);
              return;
            }
            // Clear password fields
            setFormData((prev) => ({
              ...prev,
              current_password: '',
              new_password: '',
              confirm_password: '',
            }));
            setOriginalData((prev) => ({
              ...prev,
              current_password: '',
              new_password: '',
              confirm_password: '',
            }));
            showToast('Şifre başarıyla değiştirildi', 'success');
            setActiveSection(null);
          }
          break;
      }
    } catch (error) {
      console.error('Save error:', error);
      showToast('Kaydedilirken bir hata oluştu', 'error');
    } finally {
      setSavingSection(null);
    }
  };

  const handleCancelSection = () => {
    setActiveSection(null);
    setErrors({});
  };

  const handleSignOut = async () => {
    try {
      await authHelpers.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
      showToast('Çıkış yapılamadı', 'error');
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
    // Giriş sağlayıcısını belirle (Google kullanıcıları şifre girmeden silme akışını görür)
    authHelpers.getCurrentUser().then(({ user }) => {
      setIsGoogleUser(user?.app_metadata?.provider === 'google');
    });
  };

  const handleCloseDeleteModal = () => {
    if (isDeleting) return;
    setShowDeleteModal(false);
    setDeletePassword('');
    setDeleteConfirmed(false);
  };

  const handleConfirmDeleteAccount = async () => {
    if (!deleteConfirmed || (!isGoogleUser && !deletePassword)) return;

    setIsDeleting(true);

    try {
      const { user } = await authHelpers.getCurrentUser();
      if (!user) {
        showToast('Kullanıcı bulunamadı', 'error');
        return;
      }

      // Google kullanıcıları şifresiz siler (backend "yakın oturum" kontrolü yapar)
      const result = await dbHelpers.deleteAccount(user.id, isGoogleUser ? '' : deletePassword);
      if (result.error) {
        showToast(result.error, 'error');
        return;
      }

      setShowDeleteModal(false);
      showToast('Hesabınız kalıcı olarak silindi', 'success');
      window.location.href = '/';
    } catch (error) {
      console.error('Delete account error:', error);
      showToast('Hesap silinirken bir hata oluştu', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // If a section is active, show its form
  if (activeSection) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancelSection}
          className="mb-4"
        >
          ← Geri
        </Button>

        {/* Section Form */}
        {activeSection === 'profile' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-xl">
                  👤
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Profil Bilgileri</h2>
              </div>
              <p className="text-gray-600">Adınızı ve iletişim bilgilerinizi düzenleyin</p>
            </div>

            <div className="space-y-4">
              <Input
                label="İsim"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                onBlur={() => handleSectionBlur('profile')}
                error={errors.name}
                placeholder="Adınız"
              />

              <Input
                label="E-posta"
                value={formData.email}
                disabled
                helperText="E-posta değiştirilemez"
                placeholder="email@example.com"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={() => handleSaveSection('profile')}
                isLoading={savingSection === 'profile'}
              >
                Kaydet
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelSection}
                disabled={savingSection === 'profile'}
              >
                İptal
              </Button>
            </div>
          </div>
        )}

        {activeSection === 'exam' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl">
                  🎯
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Sınav Hedefleri</h2>
              </div>
              <p className="text-gray-600">Sınav hedeflerinizi ve çalışma planınızı belirleyin</p>
            </div>

            <div className="space-y-4">
              <Select
                label="Sınav Tipi"
                options={EXAM_TYPES}
                value={formData.exam_type}
                onChange={(e) => handleInputChange('exam_type', e.target.value)}
                placeholder="Sınav seçin"
              />

              <Input
                label="Hedef Puan"
                type="number"
                min="0"
                max="500"
                value={formData.target_score}
                onChange={(e) => handleInputChange('target_score', e.target.value)}
                onBlur={() => handleSectionBlur('exam')}
                error={errors.target_score}
                placeholder="0-500"
                helperText="TYT için 500, AYT için 600 üzerinden"
              />

              <Input
                label="Sınav Tarihi"
                type="date"
                value={formData.exam_date}
                onChange={(e) => handleInputChange('exam_date', e.target.value)}
                onBlur={() => handleSectionBlur('exam')}
                error={errors.exam_date}
                min={new Date().toISOString().split('T')[0]}
              />

              <Input
                label="Günlük Çalışma Saati"
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={formData.study_hours_per_day}
                onChange={(e) => handleInputChange('study_hours_per_day', e.target.value)}
                onBlur={() => handleSectionBlur('exam')}
                error={errors.study_hours_per_day}
                placeholder="0-24"
                helperText="Günde kaç saat çalışmayı planlıyorsunuz?"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={() => handleSaveSection('exam')}
                isLoading={savingSection === 'exam'}
              >
                Kaydet
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelSection}
                disabled={savingSection === 'exam'}
              >
                İptal
              </Button>
            </div>
          </div>
        )}

        {activeSection === 'notifications' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">
                  🔔
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Bildirimler & Tercihler</h2>
              </div>
              <p className="text-gray-600">Bildirim ve görünüm tercihlerinizi yönetin</p>
            </div>

            <div className="space-y-6">
              <Toggle
                id="email-notifications"
                label="E-posta Bildirimleri"
                checked={formData.email_notifications}
                onChange={(checked) => handleInputChange('email_notifications', checked)}
                helperText="İlerleme raporları ve hatırlatmalar için e-posta alın"
              />

              <div className="space-y-4">
                <Select
                  label="Tema"
                  options={THEMES}
                  value={formData.theme}
                  onChange={(e) => handleInputChange('theme', e.target.value)}
                  placeholder="Tema seçin"
                />

                <Select
                  label="Dil"
                  options={LANGUAGES}
                  value={formData.language}
                  onChange={(e) => handleInputChange('language', e.target.value)}
                  placeholder="Dil seçin"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={() => handleSaveSection('notifications')}
                isLoading={savingSection === 'notifications'}
              >
                Kaydet
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelSection}
                disabled={savingSection === 'notifications'}
              >
                İptal
              </Button>
            </div>
          </div>
        )}

        {activeSection === 'account' && (
          <div>
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-xl">
                  ⚙️
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Hesap Yönetimi</h2>
              </div>
              <p className="text-gray-600">Şifrenizi değiştirin veya hesabınızı yönetin</p>
            </div>

            {/* İki kart yan yana */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Şifre Değiştir Kartı */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Şifre Değiştir</h3>

                <div className="space-y-4">
                  <Input
                    label="Mevcut Şifre"
                    type="password"
                    value={formData.current_password}
                    onChange={(e) => handleInputChange('current_password', e.target.value)}
                    onBlur={() => handleSectionBlur('account')}
                    error={errors.current_password}
                    placeholder="••••••••"
                  />

                  <Input
                    label="Yeni Şifre"
                    type="password"
                    value={formData.new_password}
                    onChange={(e) => handleInputChange('new_password', e.target.value)}
                    onBlur={() => handleSectionBlur('account')}
                    error={errors.new_password}
                    placeholder="En az 8 karakter"
                  />

                  <Input
                    label="Yeni Şifre (Tekrar)"
                    type="password"
                    value={formData.confirm_password}
                    onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                    onBlur={() => handleSectionBlur('account')}
                    error={errors.confirm_password}
                    placeholder="••••••••"
                  />

                  <Button
                    variant="danger"
                    size="sm"
                    fullWidth
                    onClick={() => handleSaveSection('account')}
                    isLoading={savingSection === 'account'}
                    disabled={!formData.current_password || !formData.new_password || !formData.confirm_password}
                  >
                    Şifreyi Değiştir
                  </Button>
                </div>
              </div>

              {/* Hesap İşlemleri Kartı */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Hesap İşlemleri</h3>

                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Hesabınızdan güvenli bir şekilde çıkış yapın veya hesabınızı kalıcı olarak silin.
                  </p>

                  <Button
                    variant="outline"
                    fullWidth
                    onClick={handleSignOut}
                  >
                    Çıkış Yap
                  </Button>

                  <Button
                    variant="danger"
                    fullWidth
                    onClick={handleDeleteAccount}
                  >
                    Hesabı Sil
                  </Button>
                </div>
              </div>
            </div>

            {/* Hesap Silme Onay Modalı */}
            <Modal
              isOpen={showDeleteModal}
              onClose={handleCloseDeleteModal}
              title="Hesabınızı Silmek İstiyor Musunuz?"
              size="sm"
            >
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-red-800">
                    ⚠️ Bu işlem geri alınamaz:
                  </p>
                  <ul className="text-sm text-red-700 space-y-1.5 list-disc list-inside">
                    <li>
                      Tüm verileriniz (profil, istatistikler, çalışma geçmişi){' '}
                      <strong>kalıcı olarak silinir</strong>.
                    </li>
                    <li>
                      Paketlerimize yaptığınız ödemeler için{' '}
                      <strong>geri ödeme (iade) yapılmaz</strong>.
                    </li>
                    <li>
                      Paket süreniz henüz dolmamış olsa bile hesabınız silinir; yeniden
                      yararlanmak isterseniz paketi <strong>tekrar satın almanız gerekir</strong>.
                    </li>
                  </ul>
                </div>

                {isGoogleUser ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-800">
                      Hesabın <strong>Google</strong> ile korunduğu için şifre girmen
                      gerekmiyor. Güvenlik için hesabını silmeden hemen önce giriş yapmış
                      olman yeterli. Sorun yaşarsan çıkış yapıp tekrar giriş yap ve tekrar dene.
                    </p>
                  </div>
                ) : (
                  <Input
                    label="Onaylamak için şifrenizi girin"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="••••••••"
                  />
                )}

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteConfirmed}
                    onChange={(e) => setDeleteConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-red-600 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700">
                    Yukarıdaki uyarıları okudum ve anladım. Hesabımın{' '}
                    <strong>kalıcı olarak</strong> silinmesini onaylıyorum.
                  </span>
                </label>

                <div className="flex gap-3 pt-1">
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={handleCloseDeleteModal}
                    disabled={isDeleting}
                  >
                    Vazgeç
                  </Button>
                  <Button
                    variant="danger"
                    fullWidth
                    onClick={handleConfirmDeleteAccount}
                    isLoading={isDeleting}
                    disabled={(!isGoogleUser && !deletePassword) || !deleteConfirmed}
                  >
                    Hesabımı Sil
                  </Button>
                </div>
              </div>
            </Modal>
          </div>
        )}

        {/* Toast Notifications */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            isVisible={true}
            onClose={hideToast}
          />
        )}
      </div>
    );
  }

  // Show grid of section cards
  return (
    <div className="max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Ayarlar</h1>
        <p className="text-gray-600">Profil bilgilerinizi ve tercihlerinizi yönetin</p>
      </div>

      {/* Section Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className="bg-white rounded-2xl border border-gray-200 p-6 text-left hover:border-purple-300 hover:shadow-lg transition-all duration-200 group"
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl ${section.color} flex items-center justify-center text-2xl flex-shrink-0`}>
                {section.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                  {section.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {section.description}
                </p>
              </div>
              <svg
                className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={true}
          onClose={hideToast}
        />
      )}
    </div>
  );
}
