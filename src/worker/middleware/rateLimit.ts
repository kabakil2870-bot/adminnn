// In-Memory Rate Limiting for Worker runtime
// Protects against brute-force license verification attacks

const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

export function checkRateLimit(key: string, maxRequests = 30, windowMs = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.expiresAt) {
    rateLimitMap.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count };
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap.entries()) {
    if (now > v.expiresAt) rateLimitMap.delete(k);
  }
}, 300000);
