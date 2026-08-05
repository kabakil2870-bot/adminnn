import React, { useState, useEffect } from 'react';
import { X, Save, ShieldAlert, Monitor, Calendar, Lock, Unlock, RefreshCw } from 'lucide-react';
import { License, LicenseStatus } from '../types';

interface EditLicenseModalProps {
  license: License | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedLicense: License) => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const EditLicenseModal: React.FC<EditLicenseModalProps> = ({
  license,
  isOpen,
  onClose,
  onUpdated,
  showToast
}) => {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [maxDevices, setMaxDevices] = useState(1);
  const [status, setStatus] = useState<LicenseStatus>('active');
  const [notes, setNotes] = useState('');

  // Extension helper
  const [extendOption, setExtendOption] = useState<string>('none');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (license) {
      setClientName(license.client_name);
      setClientPhone(license.client_phone);
      setMaxDevices(license.max_devices);
      setStatus(license.status);
      setNotes(license.notes || '');
      setExtendOption('none');
    }
  }, [license]);

  if (!isOpen || !license) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculate expires_at if extension option selected
      let updatedExpiresAt = license.expires_at;

      if (extendOption === 'lifetime') {
        updatedExpiresAt = null;
      } else if (extendOption !== 'none') {
        const addMonths = parseInt(extendOption, 10);
        let baseDate = license.expires_at ? new Date(license.expires_at) : new Date();
        if (baseDate < new Date()) {
          baseDate = new Date();
        }
        baseDate.setMonth(baseDate.getMonth() + addMonths);
        updatedExpiresAt = baseDate.toISOString();
      }

      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/api/admin/licenses/${license.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          client_name: clientName.trim(),
          client_phone: clientPhone.trim(),
          max_devices: Number(maxDevices),
          status,
          expires_at: updatedExpiresAt,
          notes: notes.trim()
        })
      });

      if (!res.ok) {
        throw new Error('Lisans güncellenemedi.');
      }

      const updated: License = await res.json();
      onUpdated(updated);
      showToast('success', 'Lisans Güncellendi', `${updated.client_name} lisansı güncellendi.`);
      onClose();
    } catch (err: any) {
      showToast('error', 'Hata', err.message || 'Güncelleme başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h3 className="text-lg font-bold text-white">Lisans & PC Limiti Düzenle</h3>
            <p className="font-mono text-xs text-indigo-400 mt-0.5">{license.license_key}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Müşteri / Firma Adı
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Telefon Numarası
              </label>
              <input
                type="text"
                required
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* PC Limit */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                <span>İzin Verilen PC Limiti</span>
              </label>
              <select
                value={maxDevices}
                onChange={e => setMaxDevices(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>1 PC (Tek Kasa)</option>
                <option value={2}>2 PC (Kasa + Depo)</option>
                <option value={3}>3 PC</option>
                <option value={5}>5 PC</option>
                <option value={10}>10 PC</option>
                <option value={999}>999 PC (Sınırsız)</option>
              </select>
            </div>

            {/* License Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                {status === 'active' ? (
                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span>Lisans Durumu</span>
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as LicenseStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="active">Aktif (Kullanılabilir)</option>
                <option value="suspended">Dondurulmuş / Kilitli (Askıda)</option>
                <option value="expired">Süresi Dolan (Pasif)</option>
              </select>
            </div>
          </div>

          {/* Duration Extension Helper */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Süre Uzatma / Süre Değiştirme</span>
            </label>
            <p className="text-[11px] text-slate-400">
              Mevcut Bitiş Tarihi:{' '}
              <strong className="text-slate-200">
                {license.expires_at
                  ? new Date(license.expires_at).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })
                  : 'Ömür Boyu (Sınırsız)'}
              </strong>
            </p>

            <select
              value={extendOption}
              onChange={e => setExtendOption(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 mt-1"
            >
              <option value="none">Süreyi Değiştirme (Aynen Kalsın)</option>
              <option value="1">+ 1 Ay Ekle</option>
              <option value="3">+ 3 Ay Ekle</option>
              <option value="6">+ 6 Ay Ekle</option>
              <option value="12">+ 1 Yıl Ekle</option>
              <option value="24">+ 2 Yıl Ekle</option>
              <option value="lifetime">Ömür Boyu (Sınırsız Süre Yap)</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Özel Notlar
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ödemeler, özel müşteri istekleri vb."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2 rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 text-sm"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
