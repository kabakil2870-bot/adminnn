import React from 'react';
import { Users, Monitor, Clock, ShieldAlert, CheckCircle2, AlertOctagon, Activity, Cpu } from 'lucide-react';
import { SystemStats } from '../worker/types';

interface StatsOverviewProps {
  stats: SystemStats | null;
  activeFilter: string;
  onFilterChange: (filterStatus: string) => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  stats,
  activeFilter,
  onFilterChange
}) => {
  if (!stats) return null;

  const totalLic = stats.total_licenses || 1;
  const activePercent = Math.round((stats.active_licenses / totalLic) * 100);

  return (
    <div className="space-y-4 mb-6">
      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Customers */}
        <div
          onClick={() => onFilterChange('all')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-950/50'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Toplam Müşteri
              </p>
              <p className="text-2xl font-bold text-white mt-1">{stats.total_licenses}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-indigo-300 font-medium">
            <span>{stats.active_licenses} Aktif Lisanslı Firma</span>
            <span className="text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded-md font-bold">{activePercent}% Active</span>
          </div>
        </div>

        {/* 2. Active Registered PCs */}
        <div
          onClick={() => onFilterChange('active')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'active'
              ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-950/50'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Aktif Cihazlar (PC)
              </p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.total_active_devices}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Monitor className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-emerald-300 font-medium">
            <span>Aktif Bağlı Terminal</span>
            {stats.total_blocked_devices > 0 && (
              <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-md font-bold">
                {stats.total_blocked_devices} Engelli
              </span>
            )}
          </div>
        </div>

        {/* 3. Expiring Soon (30 Days) */}
        <div
          onClick={() => onFilterChange('expiring')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'expiring'
              ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-950/50'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Süresi Yaklaşanlar
              </p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{stats.expiring_soon_licenses}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs text-amber-300 font-medium">
            <span>30 Gün İçinde Dolacak</span>
          </div>
        </div>

        {/* 4. Suspended / Expired / Locked */}
        <div
          onClick={() => onFilterChange('suspended')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'suspended' || activeFilter === 'expired'
              ? 'bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-950/50'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Pasif / Kilitli
              </p>
              <p className="text-2xl font-bold text-rose-400 mt-1">
                {stats.suspended_licenses + stats.expired_licenses}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs text-rose-300 font-medium gap-2">
            <span>{stats.suspended_licenses} Askıda</span>
            <span>•</span>
            <span>{stats.expired_licenses} Süresi Dolan</span>
          </div>
        </div>
      </div>

      {/* Secondary Quick Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2.5 px-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">24s Doğrulama</p>
            <p className="text-sm font-bold text-slate-100">{stats.total_verifications_24h} İstek</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2 border-l border-slate-800">
          <AlertOctagon className="w-4 h-4 text-amber-400" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">24s Doğrulama Hataları</p>
            <p className="text-sm font-bold text-amber-300">{stats.failed_verifications_24h} Hata</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2 border-l border-slate-800">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Altyapı Runtime</p>
            <p className="text-sm font-bold text-indigo-300">Cloudflare Worker + D1</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2 border-l border-slate-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Veritabanı Durumu</p>
            <p className="text-sm font-bold text-emerald-300">Hazır & Aktif</p>
          </div>
        </div>
      </div>
    </div>
  );
};
