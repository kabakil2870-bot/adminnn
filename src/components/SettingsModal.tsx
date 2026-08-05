import React, { useState } from 'react';
import { X, KeyRound, Settings, Trash2, Database, ShieldCheck, Phone, Check, RefreshCw, AlertTriangle, Lock } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
  onRefreshAll: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  showToast,
  onRefreshAll
}) => {
  const [activeTab, setActiveTab] = useState<'password' | 'data' | 'info'>('password');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  // Data action loading
  const [dataLoading, setDataLoading] = useState(false);

  if (!isOpen) return null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.trim().length < 4) {
      showToast('error', 'Hata', 'Yeni şifre en az 4 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Şifre Uyuşmazlığı', 'Girdiğiniz yeni şifreler eşleşmiyor.');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword.trim(),
          new_password: newPassword.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Şifre Güncellendi', 'Yönetici giriş şifreniz başarıyla değiştirildi.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      } else {
        showToast('error', 'Hata', data.error || 'Şifre değiştirilemedi.');
      }
    } catch (err) {
      showToast('error', 'Hata', 'Sunucu bağlantı hatası.');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleClearDemoData = async () => {
    if (!window.confirm('Tüm örnek veriler ve lisanslar silinecektir. Sistem temiz ve kullanıma hazır duruma gelecektir. Onaylıyor musunuz?')) {
      return;
    }

    setDataLoading(true);
    try {
      const res = await fetch('/api/admin/clear-demo-data', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Veritabanı Temizlendi', 'Örnek kayıtlar kaldırıldı. Sistem canlı kullanıma hazır.');
        onRefreshAll();
        onClose();
      } else {
        showToast('error', 'Hata', data.message || 'Veriler temizlenemedi.');
      }
    } catch (err) {
      showToast('error', 'Hata', 'Sunucu hatası.');
    } finally {
      setDataLoading(false);
    }
  };

  const handleLoadDemoData = async () => {
    setDataLoading(true);
    try {
      const res = await fetch('/api/admin/load-demo-data', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('info', 'Demo Verileri Yüklendi', 'Örnek lisans ve cihaz verileri yüklendi.');
        onRefreshAll();
        onClose();
      } else {
        showToast('error', 'Hata', 'Demo verileri yüklenemedi.');
      }
    } catch (err) {
      showToast('error', 'Hata', 'Sunucu hatası.');
    } finally {
      setDataLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Sistem & Hesap Ayarları</h3>
              <p className="text-xs text-slate-400">Giriş şifresi, veritabanı temizliği ve sistem tercihleri</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6">
          <button
            onClick={() => setActiveTab('password')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold transition-colors ${
              activeTab === 'password'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Şifre Değiştir</span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold transition-colors ${
              activeTab === 'data'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Veri Temizliği & Yönetim</span>
          </button>

          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold transition-colors ${
              activeTab === 'info'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Sunucu & Destek</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: Change Password */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Güvenliğiniz için admin paneli giriş şifrenizi düzenli aralıklarla değiştirin.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mevcut Şifre (İsteğe Bağlı)</label>
                <input
                  type="password"
                  placeholder="Mevcut yönetici şifreniz"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Yeni Şifre *</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  placeholder="En az 4 karakter yeni şifre"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Yeni Şifre (Tekrar) *</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  placeholder="Yeni şifrenizi tekrar yazın"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 text-sm disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{pwdLoading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Data Cleaning & Production Prep */}
          {activeTab === 'data' && (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Check className="w-5 h-5" />
                  <span>Canlı Kullanıma Hazırlama (Örnek Verileri Temizle)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sistemi gerçek müşterilerinize açmadan önce test verilerini tamamen temizleyerek veritabanını boş ve kullanıma hazır hale getirebilirsiniz.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleClearDemoData}
                    disabled={dataLoading}
                    className="flex items-center gap-2 bg-rose-600/90 hover:bg-rose-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-md shadow-rose-600/20 active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{dataLoading ? 'Temizleniyor...' : 'Örnek Verileri Sil & Sistemi Sıfırla'}</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                  <RefreshCw className="w-4 h-4 text-indigo-400" />
                  <span>Test İçin Örnek Lisans Verisi Yükle</span>
                </div>
                <p className="text-xs text-slate-400">
                  Gerektiğinde deneme yapmak için sisteme otomatik 2 adet örnek lisans ve 1 adet kayıtlı cihaz ekler.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleLoadDemoData}
                    disabled={dataLoading}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Database className="w-4 h-4 text-indigo-400" />
                    <span>Örnek Demo Verisi Yükle</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: System & Support Info */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Teknik Destek & İletişim</h4>
                <div className="flex items-center gap-3 bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/30">
                  <Phone className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs text-slate-400">Merkezi Destek Hattı</p>
                    <p className="text-base font-bold font-mono text-emerald-300">0543 403 35 73</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Yazılım Sürümü:</span>
                  <span className="text-indigo-400 font-semibold">ProPOS Central v2.4.0 (Stable)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Veritabanı Durumu:</span>
                  <span className="text-emerald-400 font-semibold">Aktif & Korumalı</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Sistem Bağlantı Portu:</span>
                  <span className="font-mono text-slate-200">3000 (HTTP JSON REST)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs text-slate-500">
          <span>ProPOS Admin Panel</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
