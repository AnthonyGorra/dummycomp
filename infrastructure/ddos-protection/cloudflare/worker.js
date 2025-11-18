/**
 * Cloudflare Worker for DDoS Protection and Rate Limiting
 *
 * This worker provides advanced DDoS protection features:
 * - Rate limiting per IP
 * - Bot detection and blocking
 * - Geographic restrictions
 * - Custom security rules
 */

// Rate limiting configuration
const RATE_LIMITS = {
  api: { requests: 100, window: 60 },      // 100 requests per minute
  auth: { requests: 5, window: 900 },       // 5 requests per 15 minutes
  admin: { requests: 50, window: 900 },     // 50 requests per 15 minutes
  general: { requests: 300, window: 60 },   // 300 requests per minute
};

// Blocked countries (ISO 3166-1 alpha-2 codes)
const BLOCKED_COUNTRIES = [
  // Add country codes to block, e.g., 'CN', 'RU'
];

// Allowed countries (if set, only these are allowed)
const ALLOWED_COUNTRIES = [
  // Leave empty to allow all, or specify: 'US', 'CA', 'GB', etc.
];

// IP whitelist (bypass all checks)
const IP_WHITELIST = [
  // Add trusted IPs, e.g., '1.2.3.4', '5.6.7.8'
];

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const clientIP = request.headers.get('CF-Connecting-IP');
  const country = request.headers.get('CF-IPCountry');
  const url = new URL(request.url);

  // Bypass whitelist
  if (IP_WHITELIST.includes(clientIP)) {
    return fetch(request);
  }

  // Geographic restrictions
  if (BLOCKED_COUNTRIES.includes(country)) {
    return new Response('Access denied from your location', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  if (ALLOWED_COUNTRIES.length > 0 && !ALLOWED_COUNTRIES.includes(country)) {
    return new Response('Access restricted to specific regions', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // Bot detection
  const botScore = request.cf?.botManagement?.score || 100;
  if (botScore < 30) {  // Lower score = more likely bot
    return new Response('Bot detected', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // Determine rate limit category
  let rateLimitKey = 'general';
  if (url.pathname.startsWith('/api/auth')) {
    rateLimitKey = 'auth';
  } else if (url.pathname.startsWith('/api/')) {
    rateLimitKey = 'api';
  } else if (url.pathname.includes('/admin') || url.pathname.startsWith('/settings')) {
    rateLimitKey = 'admin';
  }

  // Rate limiting check
  const rateLimit = RATE_LIMITS[rateLimitKey];
  const rateLimitResult = await checkRateLimit(clientIP, rateLimitKey, rateLimit);

  if (!rateLimitResult.allowed) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: {
        'Content-Type': 'text/plain',
        'Retry-After': rateLimitResult.retryAfter.toString(),
        'X-RateLimit-Limit': rateLimit.requests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
      }
    });
  }

  // Add security headers to response
  const response = await fetch(request);
  const newResponse = new Response(response.body, response);

  newResponse.headers.set('X-Content-Type-Options', 'nosniff');
  newResponse.headers.set('X-Frame-Options', 'DENY');
  newResponse.headers.set('X-XSS-Protection', '1; mode=block');
  newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Rate limit headers
  newResponse.headers.set('X-RateLimit-Limit', rateLimit.requests.toString());
  newResponse.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  newResponse.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

  return newResponse;
}

/**
 * Check rate limit using Cloudflare KV or Durable Objects
 * For simplicity, this example uses a basic in-memory approach
 * In production, use Cloudflare KV or Durable Objects
 */
async function checkRateLimit(identifier, category, config) {
  // In production, replace with KV or Durable Objects
  // For now, this is a placeholder that always allows
  const now = Math.floor(Date.now() / 1000);

  return {
    allowed: true,
    remaining: config.requests,
    resetTime: now + config.window,
    retryAfter: 0
  };
}
