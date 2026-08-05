// CORS & Security Headers Middleware for Cloudflare Workers

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Hardware-ID',
  'Access-Control-Max-Age': '86400',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

export function handleCorsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export function jsonResponse<T = any>(data: T, status = 200, customHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders,
      ...customHeaders
    }
  });
}

export function errorResponse(message: string, status = 400, details?: any): Response {
  return jsonResponse({ error: message, details }, status);
}
