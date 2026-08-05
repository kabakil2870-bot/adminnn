import { Env, VerifyRequest, ActivateRequest, VerifyResponse } from '../types';
import { jsonResponse, errorResponse } from '../middleware/cors';
import { checkRateLimit } from '../middleware/rateLimit';
import { getLicenseByKey, registerOrTouchDevice, addAuditLog } from '../database/d1';

export async function handlePublicRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  const ipAddress = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';

  // GET /api/public/info
  if (path === '/api/public/info' && request.method === 'GET') {
    return jsonResponse({
      app: 'ProPOS License Worker',
      status: 'active',
      version: '2.4.0-CF-WORKER',
      runtime: 'Cloudflare Workers + Cloudflare D1',
      support_phone: '0543 403 35 73',
      server_time: new Date().toISOString()
    });
  }

  // POST /api/license/verify
  if (path === '/api/license/verify' && request.method === 'POST') {
    const rateCheck = checkRateLimit(`verify_${ipAddress}`, 40, 60000);
    if (!rateCheck.allowed) {
      return errorResponse('Çok fazla doğrulama isteği gönderildi. Lütfen 1 dakika bekleyin.', 429);
    }

    try {
      const body = await request.json() as VerifyRequest;
      const { license_key, hardware_id, device_name } = body || {};

      if (!license_key || !hardware_id) {
        return jsonResponse<VerifyResponse>({
          allowed: false,
          reason: 'MISSING_FIELDS',
          message: 'Lisans anahtarı ve Donanım ID (Hardware ID) zorunludur.',
          support_phone: '0543 403 35 73'
        }, 400);
      }

      const lic = await getLicenseByKey(env.DB, license_key);

      // Check 1: License Exists
      if (!lic) {
        await addAuditLog(env.DB, {
          log_type: 'verification_failed',
          license_key,
          hardware_id,
          device_name,
          ip_address: ipAddress,
          action: 'Doğrulama Başarısız: Geçersiz Key',
          details: `Sunucuda '${license_key}' kodlu lisans bulunamadı.`,
          allowed: 0
        });

        return jsonResponse<VerifyResponse>({
          allowed: false,
          reason: 'LICENSE_NOT_FOUND',
          message: 'Girdiğiniz lisans anahtarı sistemde bulunamadı.',
          support_phone: '0543 403 35 73'
        }, 200);
      }

      // Check 2: License Suspended
      if (lic.status === 'suspended') {
        await addAuditLog(env.DB, {
          log_type: 'verification_failed',
          license_key: lic.license_key,
          client_name: lic.client_name,
          hardware_id,
          device_name,
          ip_address: ipAddress,
          action: 'Doğrulama Başarısız: Lisans Askıda',
          details: 'Müşteri lisansı yönetici tarafından askıya alınmış.',
          allowed: 0
        });

        return jsonResponse<VerifyResponse>({
          allowed: false,
          reason: 'LICENSE_SUSPENDED',
          message: 'Lisansınız dondurulmuş veya askıya alınmıştır. Lütfen destek ekibi ile iletişime geçin.',
          support_phone: '0543 403 35 73',
          client_name: lic.client_name
        }, 200);
      }

      // Check 3: License Expired
      if (lic.status === 'expired' || (lic.expires_at && lic.expires_at < new Date().toISOString())) {
        await addAuditLog(env.DB, {
          log_type: 'verification_failed',
          license_key: lic.license_key,
          client_name: lic.client_name,
          hardware_id,
          device_name,
          ip_address: ipAddress,
          action: 'Doğrulama Başarısız: Süre Doldu',
          details: `Lisans süresi ${lic.expires_at} tarihinde sona ermiştir.`,
          allowed: 0
        });

        return jsonResponse<VerifyResponse>({
          allowed: false,
          reason: 'LICENSE_EXPIRED',
          message: 'Lisans kullanım süreniz dolmuştur. Yenilemek için lütfen ProPOS Destek ile görüşün.',
          expires_at: lic.expires_at,
          support_phone: '0543 403 35 73',
          client_name: lic.client_name
        }, 200);
      }

      // Check 4: Device registered & status check
      const registeredDevices = lic.devices || [];
      const existingDevice = registeredDevices.find(d => d.hardware_id === hardware_id);

      if (existingDevice && existingDevice.status === 'blocked') {
        await addAuditLog(env.DB, {
          log_type: 'verification_failed',
          license_key: lic.license_key,
          client_name: lic.client_name,
          hardware_id,
          device_name,
          ip_address: ipAddress,
          action: 'Doğrulama Başarısız: Cihaz Engelli',
          details: `Hardware ID (${hardware_id}) bu lisans için engellenmiş.`,
          allowed: 0
        });

        return jsonResponse<VerifyResponse>({
          allowed: false,
          reason: 'DEVICE_BLOCKED',
          message: 'Bu bilgisayar terminali sistem yöneticisi tarafından engellenmiştir.',
          support_phone: '0543 403 35 73',
          client_name: lic.client_name
        }, 200);
      }

      // Check 5: PC Limit for brand new device
      if (!existingDevice && registeredDevices.length >= lic.max_devices) {
        await addAuditLog(env.DB, {
          log_type: 'verification_failed',
          license_key: lic.license_key,
          client_name: lic.client_name,
          hardware_id,
          device_name,
          ip_address: ipAddress,
          action: 'Doğrulama Başarısız: PC Limiti Aşıldı',
          details: `Maksimum ${lic.max_devices} PC limitine ulaşıldı (${registeredDevices.length}/${lic.max_devices}).`,
          allowed: 0
        });

        return jsonResponse<VerifyResponse>({
          allowed: false,
          reason: 'MAX_DEVICES_EXCEEDED',
          message: `Lisansınız maksimum ${lic.max_devices} bilgisayarı desteklemektedir. Bu bilgisayar için limit dolmuştur.`,
          max_devices: lic.max_devices,
          current_devices: registeredDevices.length,
          support_phone: '0543 403 35 73',
          client_name: lic.client_name
        }, 200);
      }

      // Record / update device last active timestamp
      await registerOrTouchDevice(env.DB, lic.id, hardware_id, device_name || 'ProPOS Terminal', ipAddress);

      await addAuditLog(env.DB, {
        log_type: 'verification_success',
        license_key: lic.license_key,
        client_name: lic.client_name,
        hardware_id,
        device_name: device_name || 'ProPOS Terminal',
        ip_address: ipAddress,
        action: 'Lisans Doğrulama Başarılı',
        details: 'Lisans aktif, istemci bağlandı.',
        allowed: 1
      });

      return jsonResponse<VerifyResponse>({
        allowed: true,
        client_name: lic.client_name,
        expires_at: lic.expires_at,
        max_devices: lic.max_devices,
        current_devices: existingDevice ? registeredDevices.length : registeredDevices.length + 1,
        support_phone: '0543 403 35 73',
        message: 'Lisans doğrulandı. ProPOS kullanıma hazır.'
      }, 200);

    } catch (err: any) {
      return errorResponse('Doğrulama sırasında sunucu hatası oluştu: ' + err.message, 500);
    }
  }

  // POST /api/license/activate
  if (path === '/api/license/activate' && request.method === 'POST') {
    try {
      const body = await request.json() as ActivateRequest;
      const { license_key, hardware_id, device_name } = body || {};

      if (!license_key || !hardware_id) {
        return errorResponse('Lisans anahtarı ve Donanım ID zorunludur.', 400);
      }

      const lic = await getLicenseByKey(env.DB, license_key);
      if (!lic) {
        return errorResponse('Lisans anahtarı bulunamadı.', 404);
      }

      if (lic.status !== 'active') {
        return errorResponse('Lisans aktif değil.', 400);
      }

      const registeredDevices = lic.devices || [];
      const existing = registeredDevices.find(d => d.hardware_id === hardware_id);

      if (!existing && registeredDevices.length >= lic.max_devices) {
        return errorResponse(`Lisans cihaz limitine ulaştı (${registeredDevices.length}/${lic.max_devices}).`, 400);
      }

      const device = await registerOrTouchDevice(env.DB, lic.id, hardware_id, device_name || 'ProPOS Cihazı', ipAddress);

      await addAuditLog(env.DB, {
        log_type: 'device_activated',
        license_key: lic.license_key,
        client_name: lic.client_name,
        hardware_id,
        device_name: device_name || 'ProPOS Cihazı',
        ip_address: ipAddress,
        action: 'Yeni Cihaz Aktivasyonu Yapıldı',
        details: 'Cihaz lisansa başarıyla kaydedildi.',
        allowed: 1
      });

      return jsonResponse({
        success: true,
        message: 'Cihaz lisansa başarıyla kaydedildi.',
        license: {
          client_name: lic.client_name,
          expires_at: lic.expires_at,
          max_devices: lic.max_devices
        },
        device
      });
    } catch (err: any) {
      return errorResponse('Aktivasyon hatası: ' + err.message, 500);
    }
  }

  return null;
}
