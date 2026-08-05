import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Phone, ArrowRight, Sparkles } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (token: string, username: string) => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, showToast }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('propos2026');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess(data.token, data.username);
        showToast('success', 'Giriş Başarılı', 'ProPOS Lisans Yönetim Paneline hoş geldiniz.');
      } else {
        showToast('error', 'Giriş Başarısız', data.message || 'Kullanıcı adı veya şifre yanlış.');
      }
    } catch (err) {
      showToast('error', 'Hata', 'Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const quickDemoLogin = () => {
    setUsername('admin');
    setPassword('propos2026');
    setTimeout(() => {
      onLoginSuccess('demo-token-123', 'admin');
      showToast('success', 'Hızlı Giriş Yapıldı', 'Super Admin paneline erişildi.');
    }, 200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-indigo-500/25">
            <ShieldCheck className="w-9 h-9" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">ProPOS</h1>
            <p className="text-xs text-indigo-400 font-bold tracking-wider uppercase mt-0.5">
              Merkezi Lisans Yönetim Paneli
            </p>
          </div>

          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Satış otomasyonu müşteri lisanslarını, bilgisayar limitlerini ve doğrulama anahtarlarını yönetin.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Yönetici Kullanıcı Adı</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Kullanıcı adınız"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Şifre</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Şifreniz"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 text-sm mt-2"
          >
            <span>{loading ? 'Giriş Yapılıyor...' : 'Yönetim Paneline Giriş Yap'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Access & Support Banner */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3 text-center">
          <button
            onClick={quickDemoLogin}
            className="w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 text-xs font-semibold py-2.5 rounded-xl transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tek Tıkla Hızlı Giriş Yap (Admin)</span>
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Teknik Destek & Lisans İşlemleri:</span>
            <a href="tel:05434033573" className="font-mono text-emerald-300 font-bold hover:underline">
              0543 403 35 73
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
