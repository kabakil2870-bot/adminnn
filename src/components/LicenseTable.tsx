import React, { useState } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Lock,
  Unlock,
  Edit,
  Trash2,
  Monitor,
  Phone,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  Plus,
  ShieldAlert,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { License, Device, LicenseStatus } from '../types';

interface LicenseTableProps {
  licenses: License[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  onOpenEdit: (license: License) => void;
  onDeleteLicense: (licenseId: string) => void;
  onDeleteDevice: (deviceId: string) => void;
  onToggleStatus: (license: License) => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export const LicenseTable: React.FC<LicenseTableProps> = ({
  licenses,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onOpenEdit,
  onDeleteLicense,
  onDeleteDevice,
  onToggleStatus,
  showToast,
  onRefresh,
  loading
}) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedRow(prev => (prev === id ? null : id));
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    showToast('success', 'Key Kopyalandı', key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sendWhatsApp = (lic: License) => {
    const rawPhone = lic.client_phone.replace(/\D/g, '');
    let cleanPhone = rawPhone;
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '90' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('90')) {
      cleanPhone = '90' + cleanPhone;
    }

    const deviceText = lic.max_devices >= 99 ? 'Sınırsız PC' : `${lic.max_devices} Bilgisayar (PC)`;
    const expireText = lic.expires_at
      ? new Date(lic.expires_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'Ömür Boyu (Sınırsız Lisans)';

    const msg = `Sayın *${lic.client_name}*,

ProPOS Satış Otomasyonu lisans bilgileriniz:

🔑 *Lisans Anahtarı:* \`${lic.license_key}\`
🖥️ *İzin Verilen PC Limiti:* ${deviceText}
📅 *Geçerlilik Tarihi:* ${expireText}

Destek ve Teknik İşlemler:
📞 *0543 403 35 73*
ProPOS Otomasyon`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Search & Filter Header */}
      <div className="p-4 sm:p-6 border-b border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Müşteri Adı, Telefon, Key veya PC Kimliği (Hardware ID) Ara..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Quick Refresh */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors self-end sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {[
            { id: 'all', label: 'Tüm Müşteriler' },
            { id: 'active', label: 'Aktif Lisanslar' },
            { id: 'suspended', label: 'Dondurulmuş / Kilitli' },
            { id: 'expired', label: 'Süresi Dolanlar' },
            { id: 'expiring', label: '30 Gün İçinde Dolacak' }
          ].map(tab => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onStatusFilterChange(tab.id)}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4 sm:px-6">Müşteri / Firma</th>
              <th className="py-3.5 px-4">Lisans Anahtarı</th>
              <th className="py-3.5 px-4">PC Limiti & Kullanım</th>
              <th className="py-3.5 px-4">Durum</th>
              <th className="py-3.5 px-4">Son Kullanma</th>
              <th className="py-3.5 px-4 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {licenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-200">
                      {loading ? 'Lisanslar yükleniyor...' : 'Henüz Kayıtlı Müşteri Lisansı Bulunmuyor'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Veritabanı canlı kullanıma hazır. 'Yeni Lisans Üret' butonunu kullanarak ilk müşteri lisansınızı tanımlayabilirsiniz.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              licenses.map(lic => {
                const isExpanded = expandedRow === lic.id;
                const devices = lic.devices || [];
                const activeDevCount = devices.filter(d => d.status === 'active').length;
                const isLimitReached = activeDevCount >= lic.max_devices && lic.max_devices < 99;

                return (
                  <React.Fragment key={lic.id}>
                    <tr className="hover:bg-slate-800/40 transition-colors group">
                      {/* Customer Name & Phone */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleExpand(lic.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                            title="Kayıtlı Cihazları Göster/Gizle"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-indigo-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <div>
                            <p className="font-bold text-slate-100 flex items-center gap-2">
                              <span>{lic.client_name}</span>
                            </p>
                            <p className="text-xs font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <a href={`tel:${lic.client_phone}`} className="hover:underline">
                                {lic.client_phone}
                              </a>
                            </p>
                            {lic.notes && (
                              <p className="text-[11px] text-slate-500 italic mt-1 max-w-xs truncate">
                                Not: {lic.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* License Key */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 select-all">
                            {lic.license_key}
                          </span>
                          <button
                            onClick={() => copyKey(lic.license_key)}
                            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                            title="Key Kopyala"
                          >
                            {copiedKey === lic.license_key ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* PC Limit & Usage */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                              isLimitReached
                                ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                                : 'bg-slate-950 text-slate-300 border-slate-800'
                            }`}
                          >
                            <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                            <span>
                              {activeDevCount} / {lic.max_devices >= 99 ? 'Sınırsız' : `${lic.max_devices} PC`}
                            </span>
                          </span>

                          <button
                            onClick={() => toggleExpand(lic.id)}
                            className="text-[11px] text-indigo-400 hover:underline font-medium"
                          >
                            ({devices.length} Cihaz)
                          </button>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4">
                        {lic.status === 'active' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Aktif</span>
                          </span>
                        )}
                        {lic.status === 'suspended' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Donduruldu / Kilitli</span>
                          </span>
                        )}
                        {lic.status === 'expired' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Süresi Dolan</span>
                          </span>
                        )}
                      </td>

                      {/* Expiry Date */}
                      <td className="py-4 px-4 text-xs font-mono text-slate-300">
                        {lic.expires_at ? (
                          <span>
                            {new Date(lic.expires_at).toLocaleDateString('tr-TR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-semibold font-sans">Ömür Boyu</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Lock / Freeze */}
                          <button
                            onClick={() => onToggleStatus(lic)}
                            title={lic.status === 'active' ? 'Lisansı Dondur / Kilit Yap' : 'Lisansı Aktif Et'}
                            className={`p-2 rounded-lg border transition-colors ${
                              lic.status === 'active'
                                ? 'bg-slate-800 hover:bg-rose-950/50 border-slate-700 text-rose-400'
                                : 'bg-emerald-950/50 hover:bg-emerald-900 border-emerald-500/30 text-emerald-300'
                            }`}
                          >
                            {lic.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>

                          {/* WhatsApp */}
                          <button
                            onClick={() => sendWhatsApp(lic)}
                            title="WhatsApp İletişim Metni Gönder"
                            className="p-2 rounded-lg bg-slate-800 hover:bg-emerald-950/50 border border-slate-700 text-emerald-400 transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {/* Edit / Increase Limit */}
                          <button
                            onClick={() => onOpenEdit(lic)}
                            title="Düzenle & Limit Yükselt"
                            className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-950/50 border border-slate-700 text-indigo-400 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (confirm(`${lic.client_name} için tanımlı lisansı silmek istediğinize emin misiniz?`)) {
                                onDeleteLicense(lic.id);
                              }
                            }}
                            title="Lisansı Sil"
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Collapsible Registered Devices Sub-Table */}
                    {isExpanded && (
                      <tr className="bg-slate-950/80 border-b border-slate-800">
                        <td colSpan={6} className="p-4 sm:p-6">
                          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                <Monitor className="w-4 h-4 text-indigo-400" />
                                <span>Kayıtlı Bilgisayarlar (Hardware ID Listesi)</span>
                              </h4>
                              <span className="text-xs text-slate-400">
                                Kayıtlı PC Sayısı: <strong className="text-white">{devices.length}</strong> / Limit:{' '}
                                <strong className="text-white">
                                  {lic.max_devices >= 99 ? 'Sınırsız' : lic.max_devices}
                                </strong>
                              </span>
                            </div>

                            {devices.length === 0 ? (
                              <p className="text-xs text-slate-500 py-3 italic">
                                Bu lisansa henüz hiç bir bilgisayar bağlanmamış. Müşteri ProPOS programında key'i girdiğinde cihaz otomatik kaydedilecektir.
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                                    <tr>
                                      <th className="py-2.5 px-3">Cihaz Adı</th>
                                      <th className="py-2.5 px-3">Hardware ID (Donanım Kimliği)</th>
                                      <th className="py-2.5 px-3">İlk Kayıt Tarihi</th>
                                      <th className="py-2.5 px-3">Son Aktiflik</th>
                                      <th className="py-2.5 px-3 text-right">Cihazı Sil / Yer Aç</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/40 font-mono">
                                    {devices.map(dev => (
                                      <tr key={dev.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="py-2.5 px-3 font-sans text-slate-200 font-medium">
                                          {dev.device_name}
                                        </td>
                                        <td className="py-2.5 px-3 text-indigo-300 font-bold select-all">
                                          {dev.hardware_id}
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-400">
                                          {new Date(dev.registered_at).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-300">
                                          {new Date(dev.last_active_at).toLocaleString('tr-TR')}
                                        </td>
                                        <td className="py-2.5 px-3 text-right">
                                          <button
                                            onClick={() => {
                                              if (
                                                confirm(
                                                  `"${dev.device_name}" (${dev.hardware_id}) cihazının kaydını silmek istediğinize emin misiniz? Bu işlem lisans için yeni bir PC slotu açacaktır.`
                                                )
                                              ) {
                                                onDeleteDevice(dev.id);
                                              }
                                            }}
                                            className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-md transition-colors"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                            <span>Cihazı Sil / Bağlantıyı Kopar</span>
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
