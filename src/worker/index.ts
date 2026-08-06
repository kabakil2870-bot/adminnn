import { Env } from './types';
import { handleCorsPreflight, jsonResponse, errorResponse } from './middleware/cors';
import { handlePublicRoutes } from './routes/public';
import { handleAdminRoutes } from './routes/admin';
import { initDbSchema } from './database/d1';

let schemaInitialized = false;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 1. Handle CORS OPTIONS Preflight
    if (request.method === 'OPTIONS') {
      return handleCorsPreflight();
    }

    try {
      // 2. Ensure Database Schema & Tables exist on first request
      if (!schemaInitialized && env.DB) {
        await initDbSchema(env.DB);
        schemaInitialized = true;
      }

      const url = new URL(request.url);

      // 3. Route Public Endpoints
      const publicResponse = await handlePublicRoutes(request, env, url);
      if (publicResponse) return publicResponse;

      // 4. Route Admin Endpoints
      const adminResponse = await handleAdminRoutes(request, env, url);
      if (adminResponse) return adminResponse;

      // 5. Unhandled API endpoint
      if (url.pathname.startsWith('/api/')) {
        return errorResponse(`Endpoint '${url.pathname}' bulunamadı.`, 404);
      }

      // 6. Serve static frontend assets (Cloudflare Workers Assets)
      if (env.ASSETS) {
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status !== 404) {
          return assetResponse;
        }
        // SPA Fallback: Return index.html for non-asset routes
        const indexRequest = new Request(new URL('/', request.url).toString(), request);
        return await env.ASSETS.fetch(indexRequest);
      }

      return jsonResponse({ message: 'ProPOS License Worker Active' });
    } catch (err: any) {
      console.error('Worker fetch error:', err);
      return errorResponse('Sunucu hatası: ' + (err.message || 'Bilinmeyen hata'), 500);
    }
  }
};
