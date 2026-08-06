import {
  D1Database,
  LicenseRow,
  DeviceRow,
  AuditLogRow,
  AdminUserRow,
  CreateLicensePayload,
  UpdateLicensePayload,
  SystemStats,
  LicenseStatus,
  DeviceStatus
} from '../types';
import { generateSalt, hashPassword } from '../services/crypto';

async function ensureColumnExists(db: D1Database, tableName: string, columnName: string, columnDef: string) {
  try {
    const tableInfo = await db.prepare(`PRAGMA table_info(${tableName})`).all<{ name: string }>();
    const exists = (tableInfo.results || []).some(col => col.name === columnName);
    if (!exists) {
      await db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`).run();
    }
  } catch (e) {
    console.error(`Error ensuring column ${columnName} on ${tableName}:`, e);
  }
}

/**
 * Initialize Database Tables and Default Admin User if not exist
 */
export async function initDbSchema(db: D1Database): Promise<void> {
  // Create Licenses
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS licenses (
      id TEXT PRIMARY KEY,
      license_key TEXT UNIQUE NOT NULL,
      client_name TEXT NOT NULL,
      client_phone TEXT,
      max_devices INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      expires_at TEXT,
      notes TEXT
    )
  `).run();

  // Migrations: ensure columns exist if database was initialized with an old schema
  await ensureColumnExists(db, 'licenses', 'client_name', "TEXT NOT NULL DEFAULT ''");
  await ensureColumnExists(db, 'licenses', 'client_phone', "TEXT");
  await ensureColumnExists(db, 'licenses', 'max_devices', "INTEGER NOT NULL DEFAULT 1");
  await ensureColumnExists(db, 'licenses', 'status', "TEXT NOT NULL DEFAULT 'active'");
  await ensureColumnExists(db, 'licenses', 'created_at', "TEXT NOT NULL DEFAULT ''");
  await ensureColumnExists(db, 'licenses', 'expires_at', "TEXT");
  await ensureColumnExists(db, 'licenses', 'notes', "TEXT");

  // Create Devices
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      license_id TEXT NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
      hardware_id TEXT NOT NULL,
      device_name TEXT,
      ip_address TEXT,
      registered_at TEXT NOT NULL,
      last_active_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      UNIQUE(license_id, hardware_id)
    )
  `).run();

  await ensureColumnExists(db, 'devices', 'device_name', "TEXT");
  await ensureColumnExists(db, 'devices', 'ip_address', "TEXT");

  // Create Audit Logs
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      log_type TEXT NOT NULL,
      license_key TEXT,
      client_name TEXT,
      hardware_id TEXT,
      device_name TEXT,
      ip_address TEXT,
      action TEXT NOT NULL,
      details TEXT,
      allowed INTEGER DEFAULT 1
    )
  `).run();

  await ensureColumnExists(db, 'logs', 'client_name', "TEXT");
  await ensureColumnExists(db, 'logs', 'license_key', "TEXT");
  await ensureColumnExists(db, 'logs', 'hardware_id', "TEXT");

  // Create Admin Users
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_login TEXT
    )
  `).run();

  // Seed or update default admin 'admin' / '54635463m.M'
  const admin = await db.prepare('SELECT * FROM admin_users WHERE username = ?').bind('admin').first<AdminUserRow>();
  const salt = generateSalt(16);
  const password_hash = await hashPassword('54635463m.M', salt);
  if (!admin) {
    await db.prepare(`
      INSERT OR IGNORE INTO admin_users (id, username, password_hash, salt, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind('admin-1', 'admin', password_hash, salt, new Date().toISOString()).run();
  } else {
    // Ensure admin user password is updated to 54635463m.M
    await db.prepare(`
      UPDATE admin_users SET password_hash = ?, salt = ? WHERE username = 'admin'
    `).bind(password_hash, salt).run();
  }
}

// -------------------------------------------------------------
// LICENSE OPERATIONS
// -------------------------------------------------------------

export async function getAllLicenses(db: D1Database) {
  const licensesRes = await db.prepare('SELECT * FROM licenses ORDER BY created_at DESC').all<LicenseRow>();
  const licenses = licensesRes.results || [];

  const devicesRes = await db.prepare('SELECT * FROM devices ORDER BY registered_at ASC').all<DeviceRow>();
  const devices = devicesRes.results || [];

  // Auto-check and mark expired licenses
  const nowStr = new Date().toISOString();
  const updatedLicenses = licenses.map(lic => {
    let status = lic.status;
    if (status === 'active' && lic.expires_at && lic.expires_at < nowStr) {
      status = 'expired';
    }
    const licDevices = devices.filter(d => d.license_id === lic.id);
    return {
      ...lic,
      status,
      devices: licDevices
    };
  });

  return updatedLicenses;
}

export async function getLicenseByKey(db: D1Database, key: string) {
  const lic = await db.prepare('SELECT * FROM licenses WHERE license_key = ?').bind(key.trim()).first<LicenseRow>();
  if (!lic) return null;

  const devicesRes = await db.prepare('SELECT * FROM devices WHERE license_id = ?').bind(lic.id).all<DeviceRow>();
  const devices = devicesRes.results || [];

  const nowStr = new Date().toISOString();
  let status = lic.status;
  if (status === 'active' && lic.expires_at && lic.expires_at < nowStr) {
    status = 'expired';
  }

  return {
    ...lic,
    status,
    devices
  };
}

export async function getLicenseById(db: D1Database, id: string) {
  const lic = await db.prepare('SELECT * FROM licenses WHERE id = ?').bind(id).first<LicenseRow>();
  if (!lic) return null;

  const devicesRes = await db.prepare('SELECT * FROM devices WHERE license_id = ?').bind(lic.id).all<DeviceRow>();
  return {
    ...lic,
    devices: devicesRes.results || []
  };
}

export async function createLicense(db: D1Database, payload: CreateLicensePayload) {
  const id = 'lic-' + crypto.randomUUID().substring(0, 8);
  const createdAt = new Date().toISOString();

  const maxDevices = typeof payload.max_devices === 'number'
    ? payload.max_devices
    : (parseInt(String(payload.max_devices || 1), 10) || 1);

  let licenseKey = payload.license_key?.trim();
  if (!licenseKey) {
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomHex2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const year = new Date().getFullYear();
    licenseKey = `PROPOS-${maxDevices}PC-${randomHex}-${randomHex2}-${year}`;
  }

  let expiresAt: string | null = null;
  const now = new Date();

  switch (payload.duration_type) {
    case '1_month':
      now.setMonth(now.getMonth() + 1);
      expiresAt = now.toISOString();
      break;
    case '3_months':
      now.setMonth(now.getMonth() + 3);
      expiresAt = now.toISOString();
      break;
    case '6_months':
      now.setMonth(now.getMonth() + 6);
      expiresAt = now.toISOString();
      break;
    case '1_year':
      now.setFullYear(now.getFullYear() + 1);
      expiresAt = now.toISOString();
      break;
    case '2_years':
      now.setFullYear(now.getFullYear() + 2);
      expiresAt = now.toISOString();
      break;
    case 'custom':
      expiresAt = payload.expires_at_custom ? new Date(payload.expires_at_custom).toISOString() : null;
      break;
    case 'lifetime':
    default:
      expiresAt = null;
  }

  const clientName = (payload.client_name || '').trim();
  const clientPhone = payload.client_phone?.trim() || null;
  const notes = payload.notes?.trim() || null;

  await db.prepare(`
    INSERT INTO licenses (id, license_key, client_name, client_phone, max_devices, status, created_at, expires_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    licenseKey,
    clientName,
    clientPhone,
    maxDevices,
    'active',
    createdAt,
    expiresAt,
    notes
  ).run();

  return getLicenseById(db, id);
}

export async function updateLicense(db: D1Database, id: string, payload: UpdateLicensePayload) {
  const existing = await getLicenseById(db, id);
  if (!existing) return null;

  const clientName = payload.client_name !== undefined ? payload.client_name.trim() : existing.client_name;
  const clientPhone = payload.client_phone !== undefined ? (payload.client_phone.trim() || null) : existing.client_phone;
  const maxDevices = payload.max_devices !== undefined
    ? (typeof payload.max_devices === 'number' ? payload.max_devices : (parseInt(String(payload.max_devices), 10) || 1))
    : existing.max_devices;
  const status = payload.status !== undefined ? payload.status : existing.status;
  const notes = payload.notes !== undefined ? (payload.notes.trim() || null) : existing.notes;
  const expiresAt = payload.expires_at !== undefined ? (payload.expires_at || null) : existing.expires_at;

  await db.prepare(`
    UPDATE licenses
    SET client_name = ?, client_phone = ?, max_devices = ?, status = ?, notes = ?, expires_at = ?
    WHERE id = ?
  `).bind(clientName, clientPhone, maxDevices, status, notes, expiresAt, id).run();

  return getLicenseById(db, id);
}

export async function extendLicense(db: D1Database, id: string, extendType: string, customDate?: string) {
  const existing = await getLicenseById(db, id);
  if (!existing) return null;

  let baseDate = existing.expires_at ? new Date(existing.expires_at) : new Date();
  if (baseDate.getTime() < Date.now()) {
    baseDate = new Date();
  }

  let newExpiresAt: string | null = existing.expires_at;

  switch (extendType) {
    case '1_month':
      baseDate.setMonth(baseDate.getMonth() + 1);
      newExpiresAt = baseDate.toISOString();
      break;
    case '3_months':
      baseDate.setMonth(baseDate.getMonth() + 3);
      newExpiresAt = baseDate.toISOString();
      break;
    case '6_months':
      baseDate.setMonth(baseDate.getMonth() + 6);
      newExpiresAt = baseDate.toISOString();
      break;
    case '1_year':
      baseDate.setFullYear(baseDate.getFullYear() + 1);
      newExpiresAt = baseDate.toISOString();
      break;
    case '2_years':
      baseDate.setFullYear(baseDate.getFullYear() + 2);
      newExpiresAt = baseDate.toISOString();
      break;
    case 'custom':
      if (customDate) newExpiresAt = new Date(customDate).toISOString();
      break;
    case 'lifetime':
      newExpiresAt = null;
      break;
  }

  await db.prepare(`
    UPDATE licenses
    SET expires_at = ?, status = 'active'
    WHERE id = ?
  `).bind(newExpiresAt, id).run();

  return getLicenseById(db, id);
}

export async function deleteLicense(db: D1Database, id: string) {
  const lic = (await getLicenseById(db, id)) || (await getLicenseByKey(db, id));
  const licId = lic ? lic.id : id;
  const licKey = lic ? lic.license_key : id;

  await db.prepare('DELETE FROM devices WHERE license_id = ? OR license_id = ?').bind(licId, licKey).run();
  await db.prepare('DELETE FROM licenses WHERE id = ? OR license_key = ?').bind(licId, licKey).run();
}

// -------------------------------------------------------------
// DEVICE OPERATIONS
// -------------------------------------------------------------

export async function getDeviceById(db: D1Database, deviceId: string) {
  return await db.prepare('SELECT * FROM devices WHERE id = ?').bind(deviceId).first<DeviceRow>();
}

export async function updateDeviceStatus(db: D1Database, deviceId: string, status: DeviceStatus) {
  await db.prepare('UPDATE devices SET status = ? WHERE id = ?').bind(status, deviceId).run();
  return getDeviceById(db, deviceId);
}

export async function deleteDevice(db: D1Database, deviceId: string) {
  await db.prepare('DELETE FROM devices WHERE id = ?').bind(deviceId).run();
}

export async function registerOrTouchDevice(
  db: D1Database,
  licenseId: string,
  hardwareId: string,
  deviceName: string,
  ipAddress: string
) {
  const existing = await db.prepare('SELECT * FROM devices WHERE license_id = ? AND hardware_id = ?')
    .bind(licenseId, hardwareId)
    .first<DeviceRow>();

  const nowStr = new Date().toISOString();

  if (existing) {
    await db.prepare(`
      UPDATE devices
      SET last_active_at = ?, device_name = ?, ip_address = ?
      WHERE id = ?
    `).bind(nowStr, deviceName || existing.device_name, ipAddress, existing.id).run();

    return { ...existing, last_active_at: nowStr, ip_address: ipAddress, device_name: deviceName || existing.device_name };
  } else {
    const id = 'dev-' + crypto.randomUUID().substring(0, 8);
    await db.prepare(`
      INSERT INTO devices (id, license_id, hardware_id, device_name, ip_address, registered_at, last_active_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(id, licenseId, hardwareId, deviceName || 'Bilinmeyen Cihaz', ipAddress, nowStr, nowStr).run();

    return getDeviceById(db, id);
  }
}

// -------------------------------------------------------------
// AUDIT LOG OPERATIONS
// -------------------------------------------------------------

export async function addAuditLog(db: D1Database, log: Partial<AuditLogRow>) {
  const id = 'log-' + crypto.randomUUID().substring(0, 8);
  const timestamp = new Date().toISOString();

  await db.prepare(`
    INSERT INTO logs (id, timestamp, log_type, license_key, client_name, hardware_id, device_name, ip_address, action, details, allowed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    timestamp,
    log.log_type || 'system_event',
    log.license_key || null,
    log.client_name || null,
    log.hardware_id || null,
    log.device_name || null,
    log.ip_address || null,
    log.action || 'Sistem İşlemi',
    log.details || null,
    log.allowed !== undefined ? (log.allowed ? 1 : 0) : 1
  ).run();
}

export async function getAuditLogs(db: D1Database, limit = 100) {
  const res = await db.prepare('SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?').bind(limit).all<AuditLogRow>();
  return res.results || [];
}

export async function clearAuditLogs(db: D1Database) {
  await db.prepare('DELETE FROM logs').run();
}

// -------------------------------------------------------------
// ADMIN USER OPERATIONS
// -------------------------------------------------------------

export async function getAdminUser(db: D1Database, username: string) {
  return await db.prepare('SELECT * FROM admin_users WHERE username = ?').bind(username).first<AdminUserRow>();
}

export async function updateAdminPassword(db: D1Database, username: string, newHash: string, newSalt: string) {
  await db.prepare('UPDATE admin_users SET password_hash = ?, salt = ? WHERE username = ?')
    .bind(newHash, newSalt, username).run();
}

export async function updateAdminLastLogin(db: D1Database, username: string) {
  await db.prepare('UPDATE admin_users SET last_login = ? WHERE username = ?')
    .bind(new Date().toISOString(), username).run();
}

// -------------------------------------------------------------
// STATS OVERVIEW & METRICS
// -------------------------------------------------------------

export async function getSystemStats(db: D1Database): Promise<SystemStats> {
  const licenses = await getAllLicenses(db);
  const devicesRes = await db.prepare('SELECT * FROM devices').all<DeviceRow>();
  const devices = devicesRes.results || [];

  const now = new Date();
  const thirtyDaysAhead = new Date();
  thirtyDaysAhead.setDate(now.getDate() + 30);

  const twentyFourHoursAgo = new Date(Date.now() - 86400000).toISOString();

  const logs24hRes = await db.prepare("SELECT * FROM logs WHERE timestamp >= ? AND log_type IN ('verification_success', 'verification_failed')")
    .bind(twentyFourHoursAgo).all<AuditLogRow>();
  const logs24h = logs24hRes.results || [];

  let active_licenses = 0;
  let suspended_licenses = 0;
  let expired_licenses = 0;
  let expiring_soon_licenses = 0;

  for (const lic of licenses) {
    if (lic.status === 'suspended') {
      suspended_licenses++;
    } else if (lic.status === 'expired') {
      expired_licenses++;
    } else if (lic.status === 'active') {
      active_licenses++;
      if (lic.expires_at) {
        const expDate = new Date(lic.expires_at);
        if (expDate > now && expDate <= thirtyDaysAhead) {
          expiring_soon_licenses++;
        }
      }
    }
  }

  const activeDevs = devices.filter(d => d.status === 'active').length;
  const blockedDevs = devices.filter(d => d.status === 'blocked').length;

  const totalVerifications24h = logs24h.length;
  const failedVerifications24h = logs24h.filter(l => l.allowed === 0 || l.log_type === 'verification_failed').length;

  return {
    total_licenses: licenses.length,
    active_licenses,
    suspended_licenses,
    expired_licenses,
    expiring_soon_licenses,
    total_active_devices: activeDevs,
    total_blocked_devices: blockedDevs,
    total_verifications_24h: totalVerifications24h,
    failed_verifications_24h: failedVerifications24h
  };
}

// -------------------------------------------------------------
// DEMO DATA HELPERS
// -------------------------------------------------------------

export async function clearAllDemoData(db: D1Database) {
  await db.prepare('DELETE FROM devices').run();
  await db.prepare('DELETE FROM licenses').run();
  await db.prepare('DELETE FROM logs').run();
}

export async function loadSampleDemoData(db: D1Database) {
  await clearAllDemoData(db);

  const lic1Id = 'lic-demo-1';
  const lic2Id = 'lic-demo-2';

  const year = new Date().getFullYear();
  const expires1 = new Date();
  expires1.setFullYear(expires1.getFullYear() + 1);

  const expires2 = new Date();
  expires2.setMonth(expires2.getMonth() + 6);

  await db.prepare(`
    INSERT INTO licenses (id, license_key, client_name, client_phone, max_devices, status, created_at, expires_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    lic1Id,
    `PROPOS-1PC-A8B9-99F1-${year}`,
    'Akasya Fırın & Kafe (Örnek Müşteri)',
    '0532 999 88 77',
    1,
    'active',
    new Date().toISOString(),
    expires1.toISOString(),
    '1 Yıllık Ana Kasa Lisansı'
  ).run();

  await db.prepare(`
    INSERT INTO licenses (id, license_key, client_name, client_phone, max_devices, status, created_at, expires_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    lic2Id,
    `PROPOS-2PC-X2Y1-88K2-${year}`,
    'Uptown Lounge & Restoran',
    '0541 222 11 00',
    2,
    'active',
    new Date().toISOString(),
    expires2.toISOString(),
    'Restoran Garson ve Mutfak Ekranı'
  ).run();

  const dev1Id = 'dev-demo-1';
  await db.prepare(`
    INSERT INTO devices (id, license_id, hardware_id, device_name, ip_address, registered_at, last_active_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
  `).bind(
    dev1Id,
    lic1Id,
    'PC-PROPOS-A8B9-HWID',
    'Kasa 1 Windows PC',
    '192.168.1.105',
    new Date().toISOString(),
    new Date().toISOString()
  ).run();

  await addAuditLog(db, {
    log_type: 'demo_data_loaded',
    action: 'Demo Veri Yüklendi',
    details: 'Sisteme 2 adet örnek demo lisans ve 1 adet kayıtlı cihaz tanımlandı.'
  });
}
