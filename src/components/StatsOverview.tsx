import React from 'react';
import { Users, Monitor, Clock, ShieldAlert } from 'lucide-react';
import { LicenseStats } from '../types';

interface StatsOverviewProps {
  stats: LicenseStats | null;
  activeFilter: string;
  onFilterChange: (filterStatus: string) => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  stats,
  activeFilter,
  onFilterChange
}) => {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs text-indigo-300 font-medium">
          <span>{stats.active_licenses} Aktif Lisanslı Firma</span>
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
              Aktif Bilgisayarlar (PC)
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.total_active_devices}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Monitor className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs text-emerald-300 font-medium">
          <span>Sistemde Doğrulanmış Cihazlar</span>
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
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-6 h-6" />
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
              Pasif / Kilitli Müşteriler
            </p>
            <p className="text-2xl font-bold text-rose-400 mt-1">
              {stats.suspended_licenses + stats.expired_licenses}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs text-rose-300 font-medium gap-2">
          <span>{stats.suspended_licenses} Askıda</span>
          <span>•</span>
          <span>{stats.expired_licenses} Süresi Dolan</span>
        </div>
      </div>
    </div>
  );
};
