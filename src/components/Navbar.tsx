import React from 'react';
import { ShieldCheck, Phone, Terminal, Activity, KeyRound, Settings, LogOut, PlusCircle } from 'lucide-react';

interface NavbarProps {
  username: string;
  onOpenGenerator: () => void;
  onOpenApiTester: () => void;
  onOpenAuditLogs: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  username,
  onOpenGenerator,
  onOpenApiTester,
  onOpenAuditLogs,
  onOpenSettings,
  onLogout
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">ProPOS</h1>
                <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-indigo-500/20">
                  v2.4 Lisans Sunucusu
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Merkezi Lisans Yönetim Paneli</p>
            </div>
          </div>

          {/* Support Banner & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Support Phone Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <Phone className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Teknik Destek:</span>
              <a href="tel:05434033573" className="font-mono text-emerald-200 hover:underline">
                0543 403 35 73
              </a>
            </div>

            {/* Quick Action: New License Button */}
            <button
              onClick={onOpenGenerator}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg transition-all shadow-md shadow-indigo-600/30 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Yeni Lisans Üret</span>
            </button>

            {/* API Simulator Button */}
            <button
              onClick={onOpenApiTester}
              title="ProPOS Masaüstü İstemci API Test Simülatörü"
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium px-2.5 py-2 rounded-lg transition-colors"
            >
              <Terminal className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">API Testi</span>
            </button>

            {/* Audit Logs Button */}
            <button
              onClick={onOpenAuditLogs}
              title="Gelen İstek Günlüğü"
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium px-2.5 py-2 rounded-lg transition-colors"
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">İstek Logları</span>
            </button>

            {/* Settings & Password Change Button */}
            <button
              onClick={onOpenSettings}
              title="Ayarlar & Şifre Değiştirme"
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Ayarlar</span>
            </button>

            {/* Admin User Menu */}
            <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
              <button
                onClick={onLogout}
                title="Çıkış Yap"
                className="p-2 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-950/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
