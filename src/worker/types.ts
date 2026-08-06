// Cloudflare D1 & Worker Types

export interface Env {
  DB: D1Database;
  ASSETS?: { fetch(request: Request | string): Promise<Response> };
  JWT_SECRET?: string;
  ENVIRONMENT?: string;
}

// Cloudflare D1 Standard Type Declarations
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: {
    duration?: number;
    rows_read?: number;
    rows_written?: number;
    last_row_id?: number;
    changes?: number;
  };
}

// Domain Model Types
export type LicenseStatus = 'active' | 'suspended' | 'expired';
export type DeviceStatus = 'active' | 'blocked';

export interface LicenseRow {
  id: string;
  license_key: string;
  client_name: string;
  client_phone: string | null;
  max_devices: number;
  status: LicenseStatus;
  created_at: string;
  expires_at: string | null;
  notes: string | null;
}

export interface DeviceRow {
  id: string;
  license_id: string;
  hardware_id: string;
  device_name: string | null;
  ip_address: string | null;
  registered_at: string;
  last_active_at: string;
  status: DeviceStatus;
}

export interface AuditLogRow {
  id: string;
  timestamp: string;
  log_type: string;
  license_key: string | null;
  client_name: string | null;
  hardware_id: string | null;
  device_name: string | null;
  ip_address: string | null;
  action: string;
  details: string | null;
  allowed: number;
}

export interface AdminUserRow {
  id: string;
  username: string;
  password_hash: string;
  salt: string;
  created_at: string;
  last_login: string | null;
}

// Request & Response Types
export interface VerifyRequest {
  license_key: string;
  hardware_id: string;
  device_name?: string;
}

export interface ActivateRequest {
  license_key: string;
  hardware_id: string;
  device_name?: string;
}

export interface VerifyResponse {
  allowed: boolean;
  client_name?: string;
  reason?: string;
  expires_at?: string | null;
  max_devices?: number;
  current_devices?: number;
  support_phone: string;
  message?: string;
}

export interface CreateLicensePayload {
  license_key?: string;
  client_name: string;
  client_phone?: string;
  max_devices: number;
  duration_type: '1_month' | '3_months' | '6_months' | '1_year' | '2_years' | 'lifetime' | 'custom';
  expires_at_custom?: string;
  notes?: string;
}

export interface UpdateLicensePayload {
  client_name?: string;
  client_phone?: string;
  max_devices?: number;
  status?: LicenseStatus;
  notes?: string;
  expires_at?: string | null;
}

export interface ExtendLicensePayload {
  extend_type: '1_month' | '3_months' | '6_months' | '1_year' | '2_years' | 'custom';
  new_expires_at?: string;
}

export interface SystemStats {
  total_licenses: number;
  active_licenses: number;
  suspended_licenses: number;
  expired_licenses: number;
  expiring_soon_licenses: number;
  total_active_devices: number;
  total_blocked_devices: number;
  total_verifications_24h: number;
  failed_verifications_24h: number;
}
