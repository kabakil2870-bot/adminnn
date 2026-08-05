import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { LicenseTable } from './components/LicenseTable';
import { LicenseGeneratorModal } from './components/LicenseGeneratorModal';
import { EditLicenseModal } from './components/EditLicenseModal';
import { ApiTesterModal } from './components/ApiTesterModal';
import { AuditLogsModal } from './components/AuditLogsModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { SettingsModal } from './components/SettingsModal';
import { LoginScreen } from './components/LoginScreen';
import { ToastContainer, ToastMessage } from './components/Toast';
import { License, LicenseStats } from './types';
import { ShieldCheck, Phone, Plus, RefreshCw, Terminal, Activity } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('propos_admin_token') !== null;
  });
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('propos_admin_user') || 'admin';
  });

  const [stats, setStats] = useState<LicenseStats | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isApiTesterOpen, setIsApiTesterOpen] = useState(false);
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = 'toast-' + Date.now() + '-' + Math.random();
    const newToast: ToastMessage = { id, type, title, description };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Fetch stats from backend
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  // Fetch licenses list from backend
  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/admin/licenses?q=${encodeURIComponent(searchQuery)}&status=${encodeURIComponent(
        statusFilter
      )}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLicenses(data);
      }
    } catch (err) {
      console.error('Error fetching licenses:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  const refreshAll = useCallback(() => {
    fetchStats();
    fetchLicenses();
  }, [fetchStats, fetchLicenses]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshAll();
    }
  }, [isAuthenticated, refreshAll]);

  const handleLoginSuccess = (token: string, user: string) => {
    localStorage.setItem('propos_admin_token', token);
    localStorage.setItem('propos_admin_user', user);
    setUsername(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('propos_admin_token');
    localStorage.removeItem('propos_admin_user');
    setIsAuthenticated(false);
    showToast('info', 'Çıkış Yapıldı', 'Oturum kapatıldı.');
  };

  // Actions
  const handleDeleteLicense = async (licenseId: string) => {
    try {
      const res = await fetch(`/api/admin/licenses/${licenseId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('success', 'Lisans Silindi', 'Müşteri lisansı ve kayıtlı cihazlar silindi.');
        refreshAll();
      } else {
        showToast('error', 'Hata', 'Lisans silinemedi.');
      }
    } catch (err) {
      showToast('error', 'Hata', 'Sunucu bağlantı hatası.');
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    try {
      const res = await fetch(`/api/admin/devices/${deviceId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('success', 'Cihaz Kaldırıldı', 'Bilgisayar bağlantısı koparıldı. Yeni PC yeri açıldı.');
        refreshAll();
      } else {
        showToast('error', 'Hata', 'Cihaz kaydı silinemedi.');
      }
    } catch (err) {
      showToast('error', 'Hata', 'Sunucu hatası.');
    }
  };

  const handleToggleStatus = async (license: License) => {
    const nextStatus = license.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/admin/licenses/${license.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        const title = nextStatus === 'suspended' ? 'Lisans Donduruldu / Kilitlendi' : 'Lisans Aktifleştirildi';
        const desc =
          nextStatus === 'suspended'
            ? `${license.client_name} lisansı kilitlendi. Program açıldığında 0543 403 35 73 bilgisi verilecektir.`
            : `${license.client_name} lisansı tekrar aktif edildi.`;

        showToast(nextStatus === 'suspended' ? 'error' : 'success', title, desc);
        refreshAll();
      }
    } catch (err) {
      showToast('error', 'Hata', 'İşlem gerçekleştirilemedi.');
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen onLoginSuccess={handleLoginSuccess} showToast={showToast} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        username={username}
        onOpenGenerator={() => setIsGeneratorOpen(true)}
        onOpenApiTester={() => setIsApiTesterOpen(true)}
        onOpenAuditLogs={() => setIsAuditLogsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Support Callout Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>ProPOS Lisans Sunucusu Çalışıyor</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Müşterilerin bilgisayarlarındaki ProPOS programları bu sunucuya bağlanarak doğrulanır.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-semibold">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Lisans & Destek Tel:</span>
              <a href="tel:05434033573" className="font-mono text-emerald-300 font-bold hover:underline">
                0543 403 35 73
              </a>
            </div>

            <button
              onClick={() => setIsGeneratorOpen(true)}
              className="hidden sm:flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tek Tıkla Key Üret</span>
            </button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <StatsOverview
          stats={stats}
          activeFilter={statusFilter}
          onFilterChange={f => setStatusFilter(f)}
        />

        {/* License Table */}
        <LicenseTable
          licenses={licenses}
          searchQuery={searchQuery}
          onSearchChange={q => setSearchQuery(q)}
          statusFilter={statusFilter}
          onStatusFilterChange={s => setStatusFilter(s)}
          onOpenEdit={lic => setEditingLicense(lic)}
          onDeleteLicense={handleDeleteLicense}
          onDeleteDevice={handleDeleteDevice}
          onToggleStatus={handleToggleStatus}
          showToast={showToast}
          onRefresh={refreshAll}
          loading={loading}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ProPOS Satış Otomasyonu © 2026 Merkezi Lisans Doğrulama Sunucusu</span>
          <div className="flex items-center gap-2">
            <span>Teknik Destek:</span>
            <a href="tel:05434033573" className="font-mono text-emerald-400 font-semibold hover:underline">
              0543 403 35 73
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <LicenseGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onCreated={() => {
          refreshAll();
        }}
        showToast={showToast}
      />

      <EditLicenseModal
        license={editingLicense}
        isOpen={!!editingLicense}
        onClose={() => setEditingLicense(null)}
        onUpdated={() => {
          refreshAll();
        }}
        showToast={showToast}
      />

      <ApiTesterModal
        isOpen={isApiTesterOpen}
        onClose={() => setIsApiTesterOpen(false)}
        showToast={showToast}
      />

      <AuditLogsModal
        isOpen={isAuditLogsOpen}
        onClose={() => setIsAuditLogsOpen(false)}
        showToast={showToast}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        showToast={showToast}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        showToast={showToast}
        onRefreshAll={refreshAll}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
