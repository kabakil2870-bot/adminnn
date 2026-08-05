import React, { useState } from 'react';
import { X, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { License } from '../types';

interface ExtendLicenseModalProps {
  isOpen: boolean;
  license: License | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const ExtendLicenseModal: React.FC<ExtendLicenseModalProps> = ({
  isOpen,
  license,
  onClose,
  onSuccess,
  showToast
}) => {
  const [extendType, setExtendType] = useState('1_year');
  const [customDate, setCustomDate] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !license) return null;

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/api/admin/licenses/${license.id}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          extend_type: extendType,
          new_expires_at: extendType === 'custom' ? customDate : undefined
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lisans süresi uzatılamadı.');
      }

      showToast('success', 'Süre Uzatıldı', `${license.client_name} için lisans kullanım süresi başarıyla güncellendi.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast('error', 'Hata', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Lisans Süresi Uzat</h3>
              <p className="text-xs text-slate-400">{license.client_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleExtend} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Uzatma Süresi Seçin
            </label>
            <select
              value={extendType}
              onChange={e => setExtendType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="1_month">+ 1 Ay Ekle</option>
              <option value="3_months">+ 3 Ay Ekle</option>
              <option value="6_months">+ 6 Ay Ekle</option>
              <option value="1_year">+ 1 Yıl Ekle (Standart)</option>
              <option value="2_years">+ 2 Yıl Ekle</option>
              <option value="lifetime">Süresiz (Ömür Boyu Yap)</option>
              <option value="custom">Özel Bitiş Tarihi Girin</option>
            </select>
          </div>

          {extendType === 'custom' && (
            <div>
              <label className="block text-xs font-semibold text-amber-300 mb-1.5">
                Yeni Bitiş Tarihi
              </label>
              <input
                type="date"
                required
                value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                className="w-full bg-slate-950 border border-amber-500/40 rounded-xl p-2.5 text-sm text-amber-200 focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Mevcut Bitiş Tarihi:</p>
            <p className="font-mono text-indigo-300">
              {license.expires_at
                ? new Date(license.expires_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
                : 'Süresiz (Ömür Boyu)'}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-lg shadow-indigo-600/30"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{loading ? 'Uzatılıyor...' : 'Süreyi Güncelle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
