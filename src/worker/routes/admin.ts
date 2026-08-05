import { Env, CreateLicensePayload, UpdateLicensePayload, ExtendLicensePayload } from '../types';
import { jsonResponse, errorResponse } from '../middleware/cors';
import { authenticateAdmin } from '../middleware/auth';
import {
  getAdminUser,
  updateAdminPassword,
  updateAdminLastLogin,
  getSystemStats,
  getAllLicenses,
  getLicenseById,
  createLicense,
  updateLicense,
  extendLicense,
  deleteLicense,
  updateDeviceStatus,
  deleteDevice,
  getAuditLogs,
  clearAuditLogs,
  addAuditLog,
  loadSampleDemoData,
  clearAllDemoData
} from '../database/d1';
import { verifyPassword, hashPassword, generateSalt, signJwtToken } from '../services/crypto';

export async function handleAdminRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  const ipAddress = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';

  // POST /api/admin/login
  if (path === '/api/admin/login' && request.method === 'POST') {
    try {
      const body = await request.json() as { username?: string; password?: string };
      const { username, password } = body || {};

      if (!username || !password) {
        return errorResponse('Kullanıcı adı ve şifre gereklidir.', 400);
      }

      const admin = await getAdminUser(env.DB, username.trim());
      if (!admin) {
        await addAuditLog(env.DB, {
          log_type: 'admin_login_failed',
          action: 'Yönetici Girişi Başarısız',
          details: `'${username}' adıyla geçersiz giriş denemesi.`,
          ip_address: ipAddress,
          allowed: 0
        });
        return errorResponse('Kullanıcı adı veya şifre hatalı.', 401);
      }

      const isValid = await verifyPassword(password.trim(), admin.password_hash, admin.salt);
      if (!isValid) {
        await addAuditLog(env.DB, {
          log_type: 'admin_login_failed',
          action: 'Yönetici Girişi Başarısız',
          details: `'${username}' kullanıcısı için hatalı şifre girildi.`,
          ip_address: ipAddress,
          allowed: 0
        });
        return errorResponse('Kullanıcı adı veya şifre hatalı.', 401);
      }

      await updateAdminLastLogin(env.DB, admin.username);

      const secret = env.JWT_SECRET || 'PROPOS_SECURE_WORKER_SECRET_KEY_2026';
      const token = await signJwtToken({ id: admin.id, username: admin.username }, secret);

      await addAuditLog(env.DB, {
        log_type: 'admin_login_success',
        action: 'Yönetici Girişi Başarılı',
        details: `'${admin.username}' paneline oturum açtı.`,
        ip_address: ipAddress,
        allowed: 1
      });

      return jsonResponse({
        success: true,
        token,
        admin: { id: admin.id, username: admin.username }
      });
    } catch (err: any) {
      return errorResponse('Giriş yapılırken hata oluştu: ' + err.message, 500);
    }
  }

  // All other /api/admin/* routes require authentication
  if (path.startsWith('/api/admin/')) {
    const auth = await authenticateAdmin(request, env);
    if (!auth.authorized) {
      return auth.response!;
    }

    // GET /api/admin/stats
    if (path === '/api/admin/stats' && request.method === 'GET') {
      const stats = await getSystemStats(env.DB);
      return jsonResponse(stats);
    }

    // GET /api/admin/licenses
    if (path === '/api/admin/licenses' && request.method === 'GET') {
      const licenses = await getAllLicenses(env.DB);
      return jsonResponse(licenses);
    }

    // POST /api/admin/licenses
    if (path === '/api/admin/licenses' && request.method === 'POST') {
      try {
        const body = await request.json() as CreateLicensePayload;
        if (!body.client_name || !body.client_name.trim()) {
          return errorResponse('Müşteri / Firma adı gereklidir.', 400);
        }

        const newLic = await createLicense(env.DB, body);

        await addAuditLog(env.DB, {
          log_type: 'license_created',
          license_key: newLic?.license_key,
          client_name: newLic?.client_name,
          action: 'Yeni Lisans Oluşturuldu',
          details: `Müşteri: ${newLic?.client_name}, PC Limiti: ${newLic?.max_devices}, Bitiş: ${newLic?.expires_at || 'Süresiz'}`,
          ip_address: ipAddress
        });

        return jsonResponse(newLic, 201);
      } catch (err: any) {
        return errorResponse('Lisans oluşturma hatası: ' + err.message, 500);
      }
    }

    // PATCH /api/admin/licenses/:id
    const patchLicMatch = path.match(/^\/api\/admin\/licenses\/([^/]+)$/);
    if (patchLicMatch && request.method === 'PATCH') {
      const id = patchLicMatch[1];
      try {
        const body = await request.json() as UpdateLicensePayload;
        const updated = await updateLicense(env.DB, id, body);
        if (!updated) return errorResponse('Lisans bulunamadı.', 404);

        await addAuditLog(env.DB, {
          log_type: 'license_updated',
          license_key: updated.license_key,
          client_name: updated.client_name,
          action: 'Lisans Bilgileri Güncellendi',
          details: `Durum: ${updated.status}, Cihaz Limiti: ${updated.max_devices}`,
          ip_address: ipAddress
        });

        return jsonResponse(updated);
      } catch (err: any) {
        return errorResponse('Güncelleme hatası: ' + err.message, 500);
      }
    }

    // DELETE /api/admin/licenses/:id
    const deleteLicMatch = path.match(/^\/api\/admin\/licenses\/([^/]+)$/);
    if (deleteLicMatch && request.method === 'DELETE') {
      const id = deleteLicMatch[1];
      const existing = await getLicenseById(env.DB, id);
      if (!existing) return errorResponse('Lisans bulunamadı.', 404);

      await deleteLicense(env.DB, id);

      await addAuditLog(env.DB, {
        log_type: 'license_deleted',
        license_key: existing.license_key,
        client_name: existing.client_name,
        action: 'Lisans Silindi',
        details: `'${existing.client_name}' firmasına ait lisans silindi.`,
        ip_address: ipAddress
      });

      return jsonResponse({ success: true, message: 'Lisans silindi.' });
    }

    // POST /api/admin/licenses/:id/extend
    const extendLicMatch = path.match(/^\/api\/admin\/licenses\/([^/]+)\/extend$/);
    if (extendLicMatch && request.method === 'POST') {
      const id = extendLicMatch[1];
      try {
        const body = await request.json() as ExtendLicensePayload;
        const updated = await extendLicense(env.DB, id, body.extend_type, body.new_expires_at);
        if (!updated) return errorResponse('Lisans bulunamadı.', 404);

        await addAuditLog(env.DB, {
          log_type: 'license_extended',
          license_key: updated.license_key,
          client_name: updated.client_name,
          action: 'Lisans Süresi Uzatıldı',
          details: `Yeni Bitiş Tarihi: ${updated.expires_at || 'Süresiz (Ömür Boyu)'}`,
          ip_address: ipAddress
        });

        return jsonResponse(updated);
      } catch (err: any) {
        return errorResponse('Lisans süresi uzatılamadı: ' + err.message, 500);
      }
    }

    // PATCH /api/admin/devices/:deviceId/status
    const patchDevMatch = path.match(/^\/api\/admin\/devices\/([^/]+)\/status$/);
    if (patchDevMatch && request.method === 'PATCH') {
      const deviceId = patchDevMatch[1];
      try {
        const body = await request.json() as { status?: 'active' | 'blocked' };
        if (!body.status || !['active', 'blocked'].includes(body.status)) {
          return errorResponse('Geçersiz cihaz durumu.', 400);
        }

        const updatedDev = await updateDeviceStatus(env.DB, deviceId, body.status);
        if (!updatedDev) return errorResponse('Cihaz bulunamadı.', 404);

        await addAuditLog(env.DB, {
          log_type: 'device_status_changed',
          hardware_id: updatedDev.hardware_id,
          device_name: updatedDev.device_name,
          action: `Cihaz Durumu Değiştirildi (${body.status === 'blocked' ? 'Engellendi' : 'Aktifleştirildi'})`,
          details: `Cihaz ID: ${deviceId}, Durum: ${body.status}`,
          ip_address: ipAddress
        });

        return jsonResponse(updatedDev);
      } catch (err: any) {
        return errorResponse('Cihaz durumu güncellenemedi: ' + err.message, 500);
      }
    }

    // DELETE /api/admin/devices/:deviceId
    const deleteDevMatch = path.match(/^\/api\/admin\/devices\/([^/]+)$/);
    if (deleteDevMatch && request.method === 'DELETE') {
      const deviceId = deleteDevMatch[1];
      await deleteDevice(env.DB, deviceId);

      await addAuditLog(env.DB, {
        log_type: 'device_deleted',
        action: 'Cihaz Kaydı Silindi',
        details: `Cihaz ID: ${deviceId} sistemden silindi.`,
        ip_address: ipAddress
      });

      return jsonResponse({ success: true, message: 'Cihaz kaydı silindi.' });
    }

    // GET /api/admin/logs
    if (path === '/api/admin/logs' && request.method === 'GET') {
      const logs = await getAuditLogs(env.DB, 200);
      return jsonResponse(logs);
    }

    // DELETE /api/admin/logs
    if (path === '/api/admin/logs' && request.method === 'DELETE') {
      await clearAuditLogs(env.DB);
      await addAuditLog(env.DB, {
        log_type: 'logs_cleared',
        action: 'Sistem Logları Temizlendi',
        details: 'Tüm geçmiş audit ve doğrulama logları silindi.',
        ip_address: ipAddress
      });
      return jsonResponse({ success: true, message: 'Tüm loglar temizlendi.' });
    }

    // POST /api/admin/change-password
    if (path === '/api/admin/change-password' && request.method === 'POST') {
      try {
        const body = await request.json() as { current_password?: string; new_password?: string };
        const { current_password, new_password } = body || {};

        if (!new_password || new_password.trim().length < 4) {
          return errorResponse('Yeni şifre en az 4 karakter olmalıdır.', 400);
        }

        const username = auth.user?.username || 'admin';
        const admin = await getAdminUser(env.DB, username);
        if (!admin) return errorResponse('Admin kullanıcısı bulunamadı.', 404);

        if (current_password) {
          const isValid = await verifyPassword(current_password.trim(), admin.password_hash, admin.salt);
          if (!isValid) {
            return errorResponse('Mevcut şifreniz hatalı.', 400);
          }
        }

        const newSalt = generateSalt(16);
        const newHash = await hashPassword(new_password.trim(), newSalt);

        await updateAdminPassword(env.DB, username, newHash, newSalt);

        await addAuditLog(env.DB, {
          log_type: 'password_changed',
          action: 'Admin Şifresi Güncellendi',
          details: `'${username}' hesabı için şifre güvenli bir şekilde değiştirildi.`,
          ip_address: ipAddress
        });

        return jsonResponse({ success: true, message: 'Yönetici şifresi başarıyla güncellendi.' });
      } catch (err: any) {
        return errorResponse('Şifre değiştirme hatası: ' + err.message, 500);
      }
    }

    // POST /api/admin/clear-demo-data
    if (path === '/api/admin/clear-demo-data' && request.method === 'POST') {
      await clearAllDemoData(env.DB);
      await addAuditLog(env.DB, {
        log_type: 'demo_data_cleared',
        action: 'Örnek Veriler Temizlendi',
        details: 'Tüm test ve demo lisansları temizlendi. Sistem canlıya hazır.',
        ip_address: ipAddress
      });

      return jsonResponse({ success: true, message: 'Tüm örnek veriler temizlendi. Sistem kullanıma hazır.' });
    }

    // POST /api/admin/load-demo-data
    if (path === '/api/admin/load-demo-data' && request.method === 'POST') {
      await loadSampleDemoData(env.DB);
      return jsonResponse({ success: true, message: 'Örnek demo lisans verileri yüklendi.' });
    }
  }

  return null;
}
