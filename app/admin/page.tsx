'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '../components/ui/Logo';
import { PAYMENT_INFO } from '../../lib/subscription-config';
import type { PaymentClaim } from '../../types/subscription';

// Ödeme talepleri yönetim sayfası.
// Erişim: x-admin-key header (ADMIN_SECRET_KEY). Yanlış key → API 404 döner.

type AdminClaim = PaymentClaim & { user_email: string | null };

const STATUS_STYLES: Record<PaymentClaim['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<PaymentClaim['status'], string> = {
  pending: 'Bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
};

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [claims, setClaims] = useState<AdminClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const fetchClaims = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/subscription/admin/claims', {
        headers: { 'x-admin-key': key },
      });
      if (response.status === 404) {
        setAuthed(false);
        setError('Yönetici anahtarı hatalı');
        return false;
      }
      if (!response.ok) {
        setError('Talepler alınamadı');
        return false;
      }
      const result = await response.json();
      setClaims(result.data ?? []);
      setAuthed(true);
      return true;
    } catch {
      setError('Sunucuya ulaşılamadı');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Key sessionStorage'da varsa otomatik giriş dene (sekme kapanınca silinir;
  // localStorage kalıcı saklamayı güvenlik gereği kaldırdık — eski kayıtları da temizle)
  useEffect(() => {
    localStorage.removeItem('adminKey');
    const saved = sessionStorage.getItem('adminKey');
    if (saved) {
      setAdminKey(saved);
      fetchClaims(saved);
    }
  }, [fetchClaims]);

  const handleLogin = async () => {
    const ok = await fetchClaims(adminKey);
    if (ok) {
      sessionStorage.setItem('adminKey', adminKey);
    }
  };

  const review = async (claimId: string, action: 'approve' | 'reject') => {
    setActionBusy(claimId);
    setError(null);
    try {
      const response = await fetch('/api/subscription/admin/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ claim_id: claimId, action }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || 'İşlem başarısız');
        return;
      }
      // Listeyi tazele
      await fetchClaims(adminKey);
    } catch {
      setError('Sunucuya ulaşılamadı');
    } finally {
      setActionBusy(null);
    }
  };

  const pendingCount = claims.filter((c) => c.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200">
        <div className="w-full px-4 md:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo size="lg" />
          </Link>
          <span className="text-sm font-semibold text-gray-500">Yönetim Paneli</span>
        </div>
      </header>

      <main className="w-full px-4 md:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
        {!authed ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md mx-auto mt-12">
            <h1 className="text-xl font-bold text-gray-900 mb-4">Yönetici Girişi</h1>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yönetici Anahtarı
            </label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adminKey && handleLogin()}
              placeholder="ADMIN_SECRET_KEY"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button
              onClick={handleLogin}
              disabled={!adminKey || loading}
              className="mt-4 w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
            >
              {loading ? 'Kontrol ediliyor...' : 'Giriş Yap'}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Ödeme Talepleri</h1>
                <p className="text-sm text-gray-600">
                  {pendingCount} bekleyen · {claims.length} toplam
                </p>
              </div>
              <button
                onClick={() => fetchClaims(adminKey)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Yenileniyor...' : 'Yenile'}
              </button>
            </div>

            {error && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            {claims.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">
                Henüz ödeme talebi yok.
              </div>
            ) : (
              <div className="space-y-3">
                {claims.map((claim) => (
                  <div
                    key={claim.id}
                    className="bg-white rounded-2xl shadow-sm p-5 flex flex-wrap items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {claim.plan === 'pro' ? 'Pro Öğrenci' : 'Premium AI Koçluk'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[claim.status]}`}
                        >
                          {STATUS_LABELS[claim.status]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1 break-all">
                        {claim.user_email ?? claim.user_id}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Gönderen: {claim.sender_name || '—'}
                        {claim.reference_note && ` · Not: ${claim.reference_note}`}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {claim.created_at && new Date(claim.created_at).toLocaleString('tr-TR')}
                        {claim.reviewed_at &&
                          ` · Değerlendirme: ${new Date(claim.reviewed_at).toLocaleString('tr-TR')}`}
                      </p>
                    </div>

                    {claim.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => review(claim.id!, 'approve')}
                          disabled={actionBusy === claim.id}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          {actionBusy === claim.id ? '...' : 'Onayla'}
                        </button>
                        <button
                          onClick={() => review(claim.id!, 'reject')}
                          disabled={actionBusy === claim.id}
                          className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
                        >
                          Reddet
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="mt-8 text-xs text-gray-400 text-center">
              Ödemeler {PAYMENT_INFO.bankName} hesabına manuel (havale/EFT) alınır.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
