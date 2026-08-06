export type LicenseStatus = 'active' | 'suspended' | 'expired';
export type DeviceStatus = 'active' | 'blocked';

export interface Device {
  id: string;
  license_id: string;
  hardware_id: string;
  device_name: string;
  registered_at: string;
  last_active_at: string;
  status: DeviceStatus;
}

export interface License {
  id: string;
  license_key: string;
  client_name: string;
  client_phone: string;
  max_devices: number;
  status: LicenseStatus;
  created_at: string;
  expires_at: string | null; // ISO Date string or null for lifetime (Ömür Boyu)
  notes?: string;
  devices?: Device[];
}

export interface AdminUser {
  id: string;
  username: string;
  last_login?: string;
}

export interface LicenseVerificationRequest {
  license_key: string;
  hardware_id: string;
  device_name?: string;
}

export interface LicenseVerificationResponse {
  allowed: boolean;
  client_name?: string;
  reason?: string;
  expires_at?: string | null;
  max_devices?: number;
  current_devices?: number;
  support_phone: string;
  message?: string;
}

export interface LicenseStats {
  total_licenses: number;
  active_licenses: number;
  suspended_licenses: number;
  expired_licenses: number;
  total_active_devices: number;
  expiring_soon_licenses: number; // Expires in next 30 days
}

export interface VerificationLog {
  id: string;
  timestamp: string;
  license_key: string;
  client_name: string;
  hardware_id: string;
  device_name: string;
  allowed: boolean;
  reason?: string;
  ip_address?: string;
}
