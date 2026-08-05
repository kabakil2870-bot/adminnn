import React, { useState } from 'react';
import { X, KeyRound, Lock, Check } from 'lucide-react';
import { authFetch } from '../utils';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, showToast }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.trim().length < 4) {
      showToast('error', 'Hata', 'Yeni şifre en az 4 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Hata', 'Şifreler uyuşmuyor.');
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword.trim() })
      });

      if (res.ok) {
        showToast('success', 'Şifre Güncellendi', 'Yönetici şifreniz başarıyla değiştirildi.');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      } else {
        const err = await res.json();
        showToast('error', 'Hata', err.error || 'Şifre değiştirilemedi.');
      }
    } catch (err) {
      showToast('error', 'Hata', 'Sunucu hatası.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Admin Şifresini Değiştir</h3>
              <p className="text-xs text-slate-400">Yönetim paneline giriş şifrenizi güncelleyin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Yeni Şifre</label>
            <input
              type="password"
              required
              minLength={4}
              placeholder="En az 4 karakter"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Yeni Şifre (Tekrar)</label>
            <input
              type="password"
              required
              minLength={4}
              placeholder="Şifreyi doğrulayın"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2 rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 text-sm"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
