import { License, Device } from '../types';

// Standart üretim veritabanı boş olarak başlar (Kullanıma Hazır)
export const INITIAL_LICENSES: License[] = [];
export const INITIAL_DEVICES: Device[] = [];

// İsteğe bağlı yükleme için örnek veriler
export const SAMPLE_DEMO_LICENSES: License[] = [
  {
    id: 'lic-1',
    license_key: 'PROPOS-1PC-A8B9-99F1-2026',
    client_name: 'Marketim Süpermarket (Ahmet Bey)',
    client_phone: '0532 111 22 33',
    max_devices: 1,
    status: 'active',
    created_at: '2026-01-15T09:00:00.000Z',
    expires_at: '2027-01-15T23:59:59.000Z',
    notes: 'Kasa 1 için 1 yıllık standart paket satıldı.',
  },
  {
    id: 'lic-2',
    license_key: 'PROPOS-2PC-C3D4-55E6-2026',
    client_name: 'Özkan Gıda & Şarküteri',
    client_phone: '0533 222 33 44',
    max_devices: 2,
    status: 'active',
    created_at: '2026-02-01T10:30:00.000Z',
    expires_at: '2027-02-01T23:59:59.000Z',
    notes: 'Kasa ve Arka Ofis Stok Takibi. 2 PC Lisansı.',
  }
];

export const SAMPLE_DEMO_DEVICES: Device[] = [
  {
    id: 'dev-101',
    license_id: 'lic-1',
    hardware_id: 'PC-PROPOS-88A2-99F1',
    device_name: 'Ana Kasa PC (Windows 11)',
    registered_at: '2026-01-15T09:15:00.000Z',
    last_active_at: new Date().toISOString(),
    status: 'active',
  }
];
