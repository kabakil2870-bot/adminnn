import React, { useState, useEffect } from 'react';
import { X, Activity, RefreshCw, Trash2, CheckCircle2, AlertCircle, Phone, Globe } from 'lucide-react';
import { VerificationLog } from '../types';

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({ isOpen, onClose, showToast }) => {
  const [logs, setLogs] = useState<VerificationLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Logs fetch failed:', err);
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
    if (!confirm('Tüm doğrulama kayıt günlüğünü temizlemek istediğinize emin misiniz?')) return;
    try {
      await fetch('/api/admin/logs', { method: 'DELETE' });
      setLogs([]);
      showToast('success', 'Temizlendi', 'İstek günlüğü başarıyla sıfırlandı.');
    } catch (err) {
      showToast('error', 'Hata', 'Günlük temizlenemedi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Canlı Doğrulama İstek Günlüğü</h3>
              <p className="text-xs text-slate-400">ProPOS masaüstü istemcilerinden sunucuya gelen API pings</p>
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

        {/* Content */}
        <div className="p-6">
          <div className="max-h-[500px] overflow-y-auto border border-slate-800 rounded-xl bg-slate-950">
            {logs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                Henüz hiç doğrulama isteği kaydedilmedi veya günlük temizlendi.
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-3 px-4">Tarih / Saat</th>
                    <th className="py-3 px-4">Firma / Müşteri</th>
                    <th className="py-3 px-4">Lisans Key</th>
                    <th className="py-3 px-4">Hardware ID</th>
                    <th className="py-3 px-4">Sonuç</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('tr-TR')}
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-sans font-semibold">{log.client_name}</td>
                      <td className="py-3 px-4 text-indigo-300 font-bold">{log.license_key}</td>
                      <td className="py-3 px-4 text-amber-300">{log.hardware_id}</td>
                      <td className="py-3 px-4">
                        {log.allowed ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold font-sans">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Onaylandı
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-semibold font-sans">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {log.reason || 'Reddedildi'}
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
