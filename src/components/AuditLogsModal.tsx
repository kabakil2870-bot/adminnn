import React, { useState, useEffect } from 'react';
import { X, Activity, RefreshCw, Trash2, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { AuditLogRow } from '../worker/types';

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({ isOpen, onClose, showToast }) => {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/logs', {
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Audit logs fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearLogs = async () => {
    if (!confirm('Tüm sistem ve doğrulama kayıt günlüğünü silmek istediğinize emin misiniz?')) return;
    try {
      const token = localStorage.getItem('admin_token');
      await fetch('/api/admin/logs', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });
      setLogs([]);
      showToast('success', 'Temizlendi', 'Denetim ve doğrulama günlüğü başarıyla sıfırlandı.');
    } catch (err) {
      showToast('error', 'Hata', 'Günlük temizlenemedi.');
    }
  };

  const filteredLogs = logs.filter(l => {
    if (filterType === 'all') return true;
    if (filterType === 'verifications') return l.log_type.startsWith('verification_');
    if (filterType === 'failed') return l.log_type === 'verification_failed' || l.allowed === 0;
    if (filterType === 'admin') return l.log_type.startsWith('admin_') || l.log_type.includes('license_') || l.log_type.includes('device_');
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Cloudflare D1 Audit & Doğrulama Günlüğü</h3>
              <p className="text-xs text-slate-400">Tüm lisans, cihaz, admin giriş ve doğrulama hareketleri kayıt altındadır</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleClearLogs}
              className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
              title="Günlüğü Temizle"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex items-center gap-2 text-xs">
          {[
            { id: 'all', label: 'Tüm Kayıtlar' },
            { id: 'verifications', label: 'Doğrulamalar' },
            { id: 'failed', label: 'Başarısız / Hatalar' },
            { id: 'admin', label: 'Yönetim İşlemleri' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                filterType === f.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Content Table */}
        <div className="p-6">
          <div className="max-h-[480px] overflow-y-auto border border-slate-800 rounded-xl bg-slate-950">
            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                Henüz hiç kayıt bulunmuyor veya seçili filtrede kayıt yok.
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-3 px-4">Tarih / Saat</th>
                    <th className="py-3 px-4">İşlem / Eylem</th>
                    <th className="py-3 px-4">Firma / Key / HWID</th>
                    <th className="py-3 px-4">Açıklama & Detay</th>
                    <th className="py-3 px-4">IP Adresi</th>
                    <th className="py-3 px-4">Sonuç</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('tr-TR')}
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-sans font-bold">
                        {log.action}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {log.client_name && <p className="font-sans text-slate-200 font-semibold">{log.client_name}</p>}
                          {log.license_key && <p className="text-indigo-300 font-bold">{log.license_key}</p>}
                          {log.hardware_id && <p className="text-amber-300 text-[11px]">{log.hardware_id}</p>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-sans max-w-xs truncate" title={log.details || ''}>
                        {log.details || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                      <td className="py-3 px-4">
                        {log.allowed ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold font-sans">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Başarılı
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-semibold font-sans">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Engellendi
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
