import { Env } from '../types';
import { verifyJwtToken } from '../services/crypto';
import { errorResponse } from './cors';

export interface AuthenticatedRequest extends Request {
  adminUser?: {
    id: string;
    username: string;
  };
}

export async function authenticateAdmin(request: Request, env: Env): Promise<{ authorized: boolean; response?: Response; user?: { id: string; username: string } }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authorized: false,
      response: errorResponse('Erişim engellendi. Yetkisiz istek (Token eksik).', 401)
    };
  }

  const token = authHeader.substring(7).trim();
  const secret = env.JWT_SECRET || 'PROPOS_SECURE_WORKER_SECRET_KEY_2026';
  const payload = await verifyJwtToken(token, secret);

  if (!payload || !payload.id) {
    return {
      authorized: false,
      response: errorResponse('Oturum süreniz doldu veya geçersiz token. Lütfen tekrar giriş yapın.', 401)
    };
  }

  return {
    authorized: true,
    user: { id: payload.id, username: payload.username }
  };
}
