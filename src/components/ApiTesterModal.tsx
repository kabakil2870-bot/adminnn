import React, { useState } from 'react';
import { X, Terminal, Play, CheckCircle2, AlertCircle, Phone, Monitor, ShieldAlert } from 'lucide-react';
import { LicenseVerificationResponse } from '../types';

interface ApiTesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const ApiTesterModal: React.FC<ApiTesterModalProps> = ({ isOpen, onClose, showToast }) => {
  const [licenseKey, setLicenseKey] = useState('PROPOS-1PC-A8B9-99F1-2026');
  const [hardwareId, setHardwareId] = useState('PC-PROPOS-88A2-99F1');
  const [deviceName, setDeviceName] = useState('Kasa 1 Windows PC');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<LicenseVerificationResponse | null>(null);

  if (!isOpen) return null;

  const handleTestVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch('/api/license/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: licenseKey.trim(),
          hardware_id: hardwareId.trim(),
          device_name: deviceName.trim()
        })
      });

      const data: LicenseVerificationResponse = await res.json();
      setResponse(data);

      if (data.allowed) {
        showToast('success', 'Lisans Onaylandı!', data.message || 'Cihaz lisanslandı.');
      } else {
        showToast('error', 'Lisans Reddedildi!', data.reason || 'Doğrulama başarısız.');
      }
    } catch (err: any) {
      showToast('error', 'Bağlantı Hatası', 'Lisans sunucusuna erişilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">ProPOS İstemci API Test Simülatörü</h3>
              <p className="text-xs text-slate-400">Müşteri bilgisayarının sunucuya atacağı doğrulamayı test edin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Request Form */}
          <form onSubmit={handleTestVerify} className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-xs font-mono font-bold text-indigo-400">POST /api/license/verify</span>
                <span className="text-[11px] text-slate-500 font-mono">Content-Type: application/json</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Lisans Anahtarı (license_key)
                  </label>
                  <input
                    type="text"
                    required
                    value={licenseKey}
                    onChange={e => setLicenseKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Donanım Kimliği (hardware_id)
                  </label>
                  <input
                    type="text"
                    required
                    value={hardwareId}
                    onChange={e => setHardwareId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cihaz Adı (device_name)
                </label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={e => setDeviceName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 text-sm"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>{loading ? 'Sorgulanıyor...' : 'İsteği Gönder & Test Et'}</span>
              </button>
            </div>
          </form>

          {/* Response Viewer */}
          {response && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Müşteri Ekranında Görünecek Yanıt (JSON & UI Mock)
              </h4>

              {/* Visual Mock Window */}
              <div
                className={`p-5 rounded-2xl border shadow-xl ${
                  response.allowed
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {response.allowed ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-8 h-8 text-rose-400 animate-bounce" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-white">
                        {response.allowed ? 'ProPOS Lisansı Doğrulandı' : 'ProPOS Lisans Hatası / Kilitli'}
                      </h4>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800">
                        allowed: {String(response.allowed)}
                      </span>
                    </div>

                    {response.client_name && (
                      <p className="text-xs font-semibold text-slate-300">
                        Firma: <span className="text-white">{response.client_name}</span>
                      </p>
                    )}

                    {!response.allowed && response.reason && (
                      <p className="text-xs bg-slate-950/80 p-3 rounded-lg border border-rose-500/30 text-rose-300 font-medium leading-relaxed">
                        ⚠️ {response.reason}
                      </p>
                    )}

                    <div className="pt-2 flex flex-wrap items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 gap-2">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        Destek Hattı: <strong className="text-white">0543 403 35 73</strong>
                      </span>
                      {response.max_devices !== undefined && (
                        <span>
                          Kullanılan Cihaz: {response.current_devices} / {response.max_devices} PC
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw JSON viewer */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto">
                <pre>{JSON.stringify(response, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
