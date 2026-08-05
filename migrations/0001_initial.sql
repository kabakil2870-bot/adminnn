-- Cloudflare D1 Initial Migration: ProPOS License Management System Schema

-- 1. Licenses Table
CREATE TABLE IF NOT EXISTS licenses (
    id TEXT PRIMARY KEY,
    license_key TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    max_devices INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active', -- active, suspended, expired
    created_at TEXT NOT NULL,
    expires_at TEXT, -- NULL means lifetime (Ömür Boyu)
    notes TEXT
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);

-- 2. Devices Table
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    license_id TEXT NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    hardware_id TEXT NOT NULL,
    device_name TEXT,
    ip_address TEXT,
    registered_at TEXT NOT NULL,
    last_active_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- active, blocked
    UNIQUE(license_id, hardware_id)
);

CREATE INDEX IF NOT EXISTS idx_devices_license ON devices(license_id);
CREATE INDEX IF NOT EXISTS idx_devices_hwid ON devices(hardware_id);

-- 3. Audit & Verification Logs Table
CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    log_type TEXT NOT NULL, -- verification_success, verification_failed, admin_login, license_created, etc.
    license_key TEXT,
    client_name TEXT,
    hardware_id TEXT,
    device_name TEXT,
    ip_address TEXT,
    action TEXT NOT NULL,
    details TEXT,
    allowed INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_type ON logs(log_type);

-- 4. Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_login TEXT
);
