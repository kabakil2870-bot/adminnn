import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { INITIAL_LICENSES, INITIAL_DEVICES, SAMPLE_DEMO_LICENSES, SAMPLE_DEMO_DEVICES } from './src/data/initialData';
import { License, Device, VerificationLog, LicenseStatus } from './src/types';

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

app.use(express.json());

interface DBData {
  licenses: License[];
  devices: Device[];
  logs: VerificationLog[];
  admin: {
    username: string;
    password_hash: string;
  };
}

// Ensure database file exists
function initDB(): DBData {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData: DBData = {
      licenses: INITIAL_LICENSES,
      devices: INITIAL_DEVICES,
      logs: [],
      admin: {
        username: 'admin',
        password_hash: 'propos2026'
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }

  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading DB_FILE, fallback to initial data:', err);
    return {
      licenses: INITIAL_LICENSES,
      devices: INITIAL_DEVICES,
      logs: [],
      admin: { username: 'admin', password_hash: 'propos2026' }
    };
  }
}

function saveData(data: DBData) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving data to DB:', err);
  }
}

let db = initDB();

// Helper to log client verification attempts
function addAuditLog(
  license_key: string,
  client_name: string,
  hardware_id: string,
  device_name: string,
  allowed: boolean,
  reason?: string,
  reqIp?: string
) {
  const log: VerificationLog = {
    id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    license_key,
    client_name: client_name || 'Bilinmeyen Müşteri',
    hardware_id,
    device_name: device_name || 'Bilinmeyen Cihaz',
    allowed,
    reason,
    ip_address: reqIp || '127.0.0.1'
  };
  db.logs.unshift(log);
  if (db.logs.length > 200) {
    db.logs = db.logs.slice(0, 200);
  }
  saveData(db);
}

// -------------------------------------------------------------
// PUBLIC REST API ENDPOINTS FOR CLIENT PROPOS DESKTOP APP
// -------------------------------------------------------------

// GET /api/public/info
app.get('/api/public/info', (_req, res) => {
  res.json({
    app: 'ProPOS Merkezi Lisans Sunucusu',
    version: '2.4.0',
    support_phone: '0543 403 35 73',
    support_formatted: '0543 403 35 73',
    status: 'online',
    system_time: new Date().toISOString()
  });
});

// POST /api/license/verify
app.post('/api/license/verify', (req, res) => {
  const { license_key, hardware_id, device_name } = req.body || {};
  const reqIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;

  if (!license_key || !hardware_id) {
    return res.status(400).json({
      allowed: false,
      reason: 'Lisans anahtarı (license_key) ve Donanım Kimliği (hardware_id) zorunludur.',
      support_phone: '0543 403 35 73'
    });
  }

  const cleanKey = String(license_key).trim().toUpperCase();
  const cleanHwId = String(hardware_id).trim().toUpperCase();
  const cleanDevName = String(device_name || 'Windows PC').trim();

  // 1. Check if license exists
  const license = db.licenses.find(l => l.license_key.toUpperCase() === cleanKey);

  if (!license) {
    addAuditLog(cleanKey, 'Tanımsız Müşteri', cleanHwId, cleanDevName, false, 'Geçersiz Lisans Anahtarı', reqIp);
    return res.status(200).json({
      allowed: false,
      reason: 'Girdiğiniz lisans anahtarı sistemde bulunamadı. Lütfen kontrol ediniz veya 0543 403 35 73 ile iletişime geçiniz.',
      support_phone: '0543 403 35 73'
    });
  }

  // Check if status is suspended
  if (license.status === 'suspended') {
    addAuditLog(cleanKey, license.client_name, cleanHwId, cleanDevName, false, 'Lisans Askıda / Kilitli', reqIp);
    return res.status(200).json({
      allowed: false,
      client_name: license.client_name,
      reason: 'Lisansınız geçici olarak dondurulmuştur. Lütfen ödeme veya bilgi için 0543 403 35 73 destek numaramız ile iletişime geçiniz.',
      support_phone: '0543 403 35 73'
    });
  }

  // Check if expired
  if (license.expires_at) {
    const expireDate = new Date(license.expires_at);
    if (expireDate < new Date()) {
      if (license.status !== 'expired') {
        license.status = 'expired';
        saveData(db);
      }
      addAuditLog(cleanKey, license.client_name, cleanHwId, cleanDevName, false, 'Lisans Süresi Dolmuş', reqIp);
      return res.status(200).json({
        allowed: false,
        client_name: license.client_name,
        expires_at: license.expires_at,
        reason: `Lisans kullanım süreniz dolmuştur (Son Tarih: ${expireDate.toLocaleDateString('tr-TR')}). Lisansınızı uzatmak için 0543 403 35 73'ü arayabilirsiniz.`,
        support_phone: '0543 403 35 73'
      });
    }
  }

  // 2. Check if device is already registered under this license
  let existingDevice = db.devices.find(
    d => d.license_id === license.id && d.hardware_id.toUpperCase() === cleanHwId
  );

  if (existingDevice) {
    if (existingDevice.status === 'blocked') {
      addAuditLog(cleanKey, license.client_name, cleanHwId, cleanDevName, false, 'Cihaz Kilitli / Engelli', reqIp);
      return res.status(200).json({
        allowed: false,
        client_name: license.client_name,
        reason: 'Bu bilgisayar yöneticiniz tarafından engellenmiştir. Destek: 0543 403 35 73',
        support_phone: '0543 403 35 73'
      });
    }

    // Update last_active_at and device_name
    existingDevice.last_active_at = new Date().toISOString();
    if (device_name) {
      existingDevice.device_name = cleanDevName;
    }
    saveData(db);

    const activeDevicesCount = db.devices.filter(d => d.license_id === license.id && d.status === 'active').length;

    addAuditLog(cleanKey, license.client_name, cleanHwId, cleanDevName, true, 'Başarılı Doğrulama', reqIp);
    return res.status(200).json({
      allowed: true,
      client_name: license.client_name,
      expires_at: license.expires_at,
      max_devices: license.max_devices,
      current_devices: activeDevicesCount,
      support_phone: '0543 403 35 73',
      message: 'ProPOS Lisans doğrulaması başarılı.'
    });
  }

  // 3. New device registration
  const activeDevices = db.devices.filter(d => d.license_id === license.id && d.status === 'active');

  if (activeDevices.length >= license.max_devices) {
    addAuditLog(
      cleanKey,
      license.client_name,
      cleanHwId,
      cleanDevName,
      false,
      `Cihaz Limiti Aşıldı (${activeDevices.length}/${license.max_devices})`,
      reqIp
    );

    return res.status(200).json({
      allowed: false,
      client_name: license.client_name,
      max_devices: license.max_devices,
      current_devices: activeDevices.length,
      reason: `Lisansınıza tanımlı cihaz limiti aşıldı! (${activeDevices.length}/${license.max_devices} PC kullanımda). Eski bilgisayarınızı kaldırmak veya limit yükseltmek için: 0543 403 35 73`,
      support_phone: '0543 403 35 73'
    });
  }

  // Auto register new device
  const newDevice: Device = {
    id: 'dev-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    license_id: license.id,
    hardware_id: cleanHwId,
    device_name: cleanDevName,
    registered_at: new Date().toISOString(),
    last_active_at: new Date().toISOString(),
    status: 'active'
  };

  db.devices.push(newDevice);
  saveData(db);

  addAuditLog(cleanKey, license.client_name, cleanHwId, cleanDevName, true, 'Yeni Cihaz Otomatik Kaydedildi', reqIp);

  return res.status(200).json({
    allowed: true,
    client_name: license.client_name,
    expires_at: license.expires_at,
    max_devices: license.max_devices,
    current_devices: activeDevices.length + 1,
    support_phone: '0543 403 35 73',
    message: 'Yeni bilgisayar lisansınıza başarıyla tanımlandı.'
  });
});

// POST /api/license/activate (Alias for verify/activation)
app.post('/api/license/activate', (req, res) => {
  // Delegate to verify endpoint
  return app._router.handle({ ...req, url: '/api/license/verify' }, res);
});

// -------------------------------------------------------------
// SUPER ADMIN DASHBOARD API ENDPOINTS
// -------------------------------------------------------------

// POST /api/admin/login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === db.admin.username && password === db.admin.password_hash) {
    return res.json({
      success: true,
      token: 'admin-propos-token-' + Date.now(),
      username: db.admin.username
    });
  }
  return res.status(401).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı!' });
});

// GET /api/admin/stats
app.get('/api/admin/stats', (_req, res) => {
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const total_licenses = db.licenses.length;
  const active_licenses = db.licenses.filter(l => l.status === 'active').length;
  const suspended_licenses = db.licenses.filter(l => l.status === 'suspended').length;
  const expired_licenses = db.licenses.filter(l => l.status === 'expired').length;

  const total_active_devices = db.devices.filter(d => d.status === 'active').length;

  const expiring_soon_licenses = db.licenses.filter(l => {
    if (l.status !== 'active' || !l.expires_at) return false;
    const exp = new Date(l.expires_at);
    return exp > now && exp <= thirtyDaysLater;
  }).length;

  res.json({
    total_licenses,
    active_licenses,
    suspended_licenses,
    expired_licenses,
    total_active_devices,
    expiring_soon_licenses
  });
});

// GET /api/admin/licenses
app.get('/api/admin/licenses', (req, res) => {
  const search = (req.query.q as string || '').toLowerCase().trim();
  const statusFilter = (req.query.status as string || 'all').toLowerCase();

  let list = db.licenses.map(lic => {
    const licDevices = db.devices.filter(d => d.license_id === lic.id);
    return {
      ...lic,
      devices: licDevices
    };
  });

  // Filter by status if requested
  if (statusFilter !== 'all') {
    if (statusFilter === 'expiring') {
      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      list = list.filter(l => {
        if (!l.expires_at || l.status !== 'active') return false;
        const exp = new Date(l.expires_at);
        return exp > now && exp <= thirtyDaysLater;
      });
    } else {
      list = list.filter(l => l.status === statusFilter);
    }
  }

  // Filter by search query
  if (search) {
    list = list.filter(l => {
      const matchName = l.client_name.toLowerCase().includes(search);
      const matchPhone = l.client_phone.toLowerCase().includes(search);
      const matchKey = l.license_key.toLowerCase().includes(search);
      const matchNotes = (l.notes || '').toLowerCase().includes(search);
      const matchDevHw = l.devices.some(d =>
        d.hardware_id.toLowerCase().includes(search) || d.device_name.toLowerCase().includes(search)
      );
      return matchName || matchPhone || matchKey || matchNotes || matchDevHw;
    });
  }

  // Sort by creation date descending
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json(list);
});

// Helper key generator
function generateLicenseKey(max_devices: number, durationType: string): string {
  const rand1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const rand2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const year = new Date().getFullYear();

  let limitTag = `${max_devices}PC`;
  if (max_devices >= 99) {
    limitTag = 'LIFETIME';
  } else if (durationType === 'lifetime') {
    limitTag = 'LIFETIME';
  }

  return `PROPOS-${limitTag}-${rand1}-${rand2}-${year}`;
}

// POST /api/admin/licenses
app.post('/api/admin/licenses', (req, res) => {
  const { client_name, client_phone, max_devices, duration_type, notes, custom_key } = req.body || {};

  if (!client_name || !client_phone) {
    return res.status(400).json({ error: 'Müşteri adı ve telefon numarası zorunludur.' });
  }

  const deviceCount = Number(max_devices) || 1;
  const duration = duration_type || '1year';

  let expiresAt: string | null = null;
  const now = new Date();

  if (duration === '1month') {
    const d = new Date(now);
    d.setMonth(d.getMonth() + 1);
    expiresAt = d.toISOString();
  } else if (duration === '3months') {
    const d = new Date(now);
    d.setMonth(d.getMonth() + 3);
    expiresAt = d.toISOString();
  } else if (duration === '6months') {
    const d = new Date(now);
    d.setMonth(d.getMonth() + 6);
    expiresAt = d.toISOString();
  } else if (duration === '1year') {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() + 1);
    expiresAt = d.toISOString();
  } else if (duration === '2years') {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() + 2);
    expiresAt = d.toISOString();
  } else if (duration === 'lifetime') {
    expiresAt = null;
  } else if (req.body.custom_expires_at) {
    expiresAt = new Date(req.body.custom_expires_at).toISOString();
  }

  const finalKey = (custom_key && custom_key.trim())
    ? custom_key.trim().toUpperCase()
    : generateLicenseKey(deviceCount, duration);

  const newLicense: License = {
    id: 'lic-' + Date.now(),
    license_key: finalKey,
    client_name: String(client_name).trim(),
    client_phone: String(client_phone).trim(),
    max_devices: deviceCount,
    status: 'active',
    created_at: now.toISOString(),
    expires_at: expiresAt,
    notes: notes ? String(notes).trim() : ''
  };

  db.licenses.unshift(newLicense);
  saveData(db);

  return res.status(201).json({
    ...newLicense,
    devices: []
  });
});

// PATCH /api/admin/licenses/:id
app.patch('/api/admin/licenses/:id', (req, res) => {
  const { id } = req.params;
  const license = db.licenses.find(l => l.id === id);

  if (!license) {
    return res.status(404).json({ error: 'Lisans bulunamadı.' });
  }

  const { status, max_devices, expires_at, client_name, client_phone, notes } = req.body;

  if (status && ['active', 'suspended', 'expired'].includes(status)) {
    license.status = status as LicenseStatus;
  }
  if (typeof max_devices === 'number' && max_devices >= 1) {
    license.max_devices = max_devices;
  }
  if (expires_at !== undefined) {
    license.expires_at = expires_at ? new Date(expires_at).toISOString() : null;
  }
  if (client_name) {
    license.client_name = String(client_name).trim();
  }
  if (client_phone) {
    license.client_phone = String(client_phone).trim();
  }
  if (notes !== undefined) {
    license.notes = String(notes).trim();
  }

  saveData(db);

  const licDevices = db.devices.filter(d => d.license_id === license.id);
  res.json({
    ...license,
    devices: licDevices
  });
});

// DELETE /api/admin/licenses/:id
app.delete('/api/admin/licenses/:id', (req, res) => {
  const { id } = req.params;
  const index = db.licenses.findIndex(l => l.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Lisans bulunamadı.' });
  }

  // Remove bound devices
  db.devices = db.devices.filter(d => d.license_id !== id);
  db.licenses.splice(index, 1);
  saveData(db);

  res.json({ success: true, message: 'Lisans ve kayıtlı cihazlar silindi.' });
});

// DELETE /api/admin/devices/:deviceId
app.delete('/api/admin/devices/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const index = db.devices.findIndex(d => d.id === deviceId);

  if (index === -1) {
    return res.status(404).json({ error: 'Cihaz bulunamadı.' });
  }

  const removedDev = db.devices[index];
  db.devices.splice(index, 1);
  saveData(db);

  res.json({ success: true, message: 'Cihaz bağlantısı kaldırıldı.', device: removedDev });
});

// PATCH /api/admin/devices/:deviceId/status
app.patch('/api/admin/devices/:deviceId/status', (req, res) => {
  const { deviceId } = req.params;
  const { status } = req.body;

  const device = db.devices.find(d => d.id === deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Cihaz bulunamadı.' });
  }

  if (['active', 'blocked'].includes(status)) {
    device.status = status;
    saveData(db);
  }

  res.json(device);
});

// POST /api/admin/licenses/:id/extend
app.post('/api/admin/licenses/:id/extend', (req, res) => {
  const { id } = req.params;
  const { months, set_lifetime } = req.body;

  const license = db.licenses.find(l => l.id === id);
  if (!license) {
    return res.status(404).json({ error: 'Lisans bulunamadı.' });
  }

  if (set_lifetime) {
    license.expires_at = null;
    license.status = 'active';
  } else if (months && typeof months === 'number') {
    let baseDate = license.expires_at ? new Date(license.expires_at) : new Date();
    if (baseDate < new Date()) {
      baseDate = new Date();
    }
    baseDate.setMonth(baseDate.getMonth() + months);
    license.expires_at = baseDate.toISOString();
    license.status = 'active';
  }

  saveData(db);

  const licDevices = db.devices.filter(d => d.license_id === license.id);
  res.json({ ...license, devices: licDevices });
});

// GET /api/admin/logs
app.get('/api/admin/logs', (_req, res) => {
  res.json(db.logs);
});

// DELETE /api/admin/logs
app.delete('/api/admin/logs', (_req, res) => {
  db.logs = [];
  saveData(db);
  res.json({ success: true, message: 'Sistem günlüğü temizlendi.' });
});

// POST /api/admin/change-password
app.post('/api/admin/change-password', (req, res) => {
  const { new_password, current_password } = req.body || {};
  if (current_password && current_password !== db.admin.password_hash) {
    return res.status(400).json({ error: 'Mevcut şifreniz hatalı.' });
  }
  if (!new_password || new_password.trim().length < 4) {
    return res.status(400).json({ error: 'Yeni şifre en az 4 karakter olmalıdır.' });
  }
  db.admin.password_hash = String(new_password).trim();
  saveData(db);
  res.json({ success: true, message: 'Yönetici şifresi başarıyla güncellendi.' });
});

// POST /api/admin/clear-demo-data (Remove all sample/test data)
app.post('/api/admin/clear-demo-data', (_req, res) => {
  db.licenses = [];
  db.devices = [];
  db.logs = [];
  saveData(db);
  res.json({ success: true, message: 'Tüm örnek veriler ve lisans kayıtları temizlendi. Sistem kullanıma hazır.' });
});

// POST /api/admin/load-demo-data (Optional test data generator)
app.post('/api/admin/load-demo-data', (_req, res) => {
  db.licenses = [...SAMPLE_DEMO_LICENSES];
  db.devices = [...SAMPLE_DEMO_DEVICES];
  saveData(db);
  res.json({ success: true, message: 'Örnek demo lisans verileri yüklendi.' });
});

// -------------------------------------------------------------
// VITE MIDDLEWARE FOR DEVELOPMENT AND STATIC SERVER IN PROD
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ProPOS Lisans Sunucusu http://localhost:${PORT} üzerinde çalışıyor.`);
  });
}

startServer();
