import React, { useState } from 'react';
import { X, Key, Copy, Check, Send, Sparkles, Phone, ShieldCheck } from 'lucide-react';
import { License } from '../types';

interface LicenseGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (license: License) => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const LicenseGeneratorModal: React.FC<LicenseGeneratorModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  showToast
}) => {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [maxDevices, setMaxDevices] = useState('1');
  const [durationType, setDurationType] = useState('1year');
  const [notes, setNotes] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [loading, setLoading] = useState(false);

  // Result state after generating
  const [generatedLicense, setGeneratedLicense] = useState<License | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim()) {
      showToast('error', 'Hata', 'Lütfen Müşteri/Firma adını ve telefon numarasını giriniz.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: clientName,
          client_phone: clientPhone,
          max_devices: parseInt(maxDevices, 10),
          duration_type: durationType,
          notes,
          custom_key: customKey.trim() || undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lisans oluşturulamadı.');
      }

      const newLic: License = await res.json();
      setGeneratedLicense(newLic);
      onCreated(newLic);
      showToast('success', 'Lisans Üretildi!', `${newLic.client_name} için yeni lisans başarıyla tanımlandı.`);
    } catch (err: any) {
      showToast('error', 'İşlem Başarısız', err.message || 'Sunucu hatası.');
    } finally {
      setLoading(false);
    }
  };

  const buildWhatsAppMessage = (lic: License) => {
    const formattedPhone = lic.client_phone;
    const deviceText = lic.max_devices >= 99 ? 'Sınırsız PC' : `${lic.max_devices} Bilgisayar (PC)`;
    const expireText = lic.expires_at
      ? new Date(lic.expires_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'Ömür Boyu (Sınırsız Lisans)';

    return `Sayın *${lic.client_name}*,

ProPOS Satış Otomasyonu lisans tanımlamanız başarıyla tamamlanmıştır!

🔑 *Lisans Anahtarınız:* \`${lic.license_key}\`
🖥️ *İzin Verilen PC Limiti:* ${deviceText}
📅 *Geçerlilik Tarihi:* ${expireText}

*Kurulum ve Etkinleştirme:*
1. Bilgisayarınızda ProPOS programını çalıştırınız.
2. Açılış ekranında yukarıdaki Lisans Key'i yapıştırıp 'Lisansı Doğrula' butonuna basınız.

Destek, Yedekleme ve Teknik Sorularınız İçin:
📞 *0543 403 35 73*
ProPOS Otomasyon Yazılım Sistemleri`;
  };

  const copyCustomerMessage = () => {
    if (!generatedLicense) return;
    const msg = buildWhatsAppMessage(generatedLicense);
    navigator.clipboard.writeText(msg);
    setCopied(true);
    showToast('success', 'Kopyalandı', 'WhatsApp/SMS müşteri bilgilendirme metni panoya kopyalandı.');
    setTimeout(() => setCopied(false), 2000);
  };

  const openWhatsApp = () => {
    if (!generatedLicense) return;
    const rawPhone = generatedLicense.client_phone.replace(/\D/g, '');
    let cleanPhone = rawPhone;
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '90' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('90')) {
      cleanPhone = '90' + cleanPhone;
    }

    const msg = encodeURIComponent(buildWhatsAppMessage(generatedLicense));
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const handleResetForm = () => {
    setGeneratedLicense(null);
    setClientName('');
    setClientPhone('');
    setMaxDevices('1');
    setDurationType('1year');
    setNotes('');
    setCustomKey('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Tek Tıkla Lisans Key Üretici</h3>
              <p className="text-xs text-slate-400">Müşteri bilgileri ile anında lisans anahtarı oluşturun</p>
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
        <div className="p-6">
          {!generatedLicense ? (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Client Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Müşteri / Firma Adı *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Marketim Süpermarket (Ahmet B.)"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Client Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Telefon Numarası *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 0532 123 45 67"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Max PC Count */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    İzin Verilen Bilgisayar (PC) Limiti
                  </label>
                  <select
                    value={maxDevices}
                    onChange={e => setMaxDevices(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="1">1 PC (Tek Kasa / Masaüstü)</option>
                    <option value="2">2 PC (Kasa + Depo / Arka Ofis)</option>
                    <option value="3">3 PC (3 Terminal)</option>
                    <option value="5">5 PC (Ağ Bağlantılı Zayıf/Güçlü Sistem)</option>
                    <option value="10">10 PC (Geniş Mağaza / Çoklu Kasa)</option>
                    <option value="999">Sınırsız PC (Özel Paket)</option>
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Lisans Kullanım Süresi
                  </label>
                  <select
                    value={durationType}
                    onChange={e => setDurationType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="1month">1 Ay (Deneme / Geçici)</option>
                    <option value="3months">3 Ay</option>
                    <option value="6months">6 Ay</option>
                    <option value="1year">1 Yıl (Standart Paket)</option>
                    <option value="2years">2 Yıl</option>
                    <option value="lifetime">Ömür Boyu (Sınırsız / Sınırsız Süre)</option>
                  </select>
                </div>
              </div>

              {/* Optional Custom Key & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Özel Key Tanımla (İsteğe Bağlı)
                  </label>
                  <input
                    type="text"
                    placeholder="Otomatik oluşturulsun (Boş Bırakın)"
                    value={customKey}
                    onChange={e => setCustomKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-indigo-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 uppercase transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Özel Notlar (İsteğe Bağlı)
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Havale ile ödendi, Fatura kesilecek"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Key className="w-4 h-4" />
                  <span>{loading ? 'Üretiliyor...' : 'Tek Tıkla Key Oluştur'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Result Panel with WhatsApp Copy feature */
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-3 text-emerald-300">
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">Lisans Başarıyla Oluşturuldu!</h4>
                  <p className="text-xs text-emerald-300/80">
                    Aşağıdaki Lisans Key ve WhatsApp metnini müşterinize iletebilirsiniz.
                  </p>
                </div>
              </div>

              {/* Key Display */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Oluşturulan Lisans Key
                </p>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xl font-bold text-indigo-400 select-all">
                    {generatedLicense.license_key}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLicense.license_key);
                      showToast('success', 'Key Kopyalandı', generatedLicense.license_key);
                    }}
                    className="flex items-center gap-1.5 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sadece Key'i Kopyala</span>
                  </button>
                </div>
              </div>

              {/* WhatsApp Message Preview Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Müşteri WhatsApp / SMS Gönderim Metni (Otomatik Hazırlandı)
                </label>
                <textarea
                  readOnly
                  rows={8}
                  value={buildWhatsAppMessage(generatedLicense)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-300 focus:outline-none select-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={openWhatsApp}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>WhatsApp'ta Müşteriye Gönder</span>
                  </button>

                  <button
                    onClick={copyCustomerMessage}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>Metni Kopyala</span>
                  </button>
                </div>

                <button
                  onClick={handleResetForm}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline px-3 py-2"
                >
                  + Başka Lisans Üret
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
