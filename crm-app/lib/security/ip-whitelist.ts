/**
 * IP Whitelisting Security Module
 *
 * Provides IP address validation and whitelisting functionality
 * for admin routes and sensitive operations.
 */

import { NextRequest } from 'next/server';

// IP address validation utilities
export class IPWhitelist {
  private static allowedIPs: Set<string> = new Set();
  private static allowedRanges: Array<{ start: bigint; end: bigint }> = [];

  /**
   * Initialize IP whitelist from environment variables
   */
  static initialize() {
    const ipList = process.env.ADMIN_IP_WHITELIST || '';
    const ips = ipList.split(',').map(ip => ip.trim()).filter(Boolean);

    ips.forEach(ip => {
      if (ip.includes('/')) {
        // CIDR notation
        this.addCIDRRange(ip);
      } else if (ip.includes('-')) {
        // IP range (e.g., 192.168.1.1-192.168.1.255)
        this.addIPRange(ip);
      } else {
        // Single IP
        this.allowedIPs.add(ip);
      }
    });

    // Always allow localhost in development
    if (process.env.NODE_ENV === 'development') {
      this.allowedIPs.add('127.0.0.1');
      this.allowedIPs.add('::1');
      this.allowedIPs.add('::ffff:127.0.0.1');
    }
  }

  /**
   * Add a CIDR range to the whitelist
   */
  private static addCIDRRange(cidr: string) {
    const [ip, bits] = cidr.split('/');
    const mask = BigInt(bits);
    const ipInt = this.ipToInt(ip);

    if (ipInt === null) return;

    const start = ipInt & (BigInt(0xFFFFFFFF) << (BigInt(32) - mask));
    const end = start | ((BigInt(1) << (BigInt(32) - mask)) - BigInt(1));

    this.allowedRanges.push({ start, end });
  }

  /**
   * Add an IP range to the whitelist
   */
  private static addIPRange(range: string) {
    const [startIP, endIP] = range.split('-').map(s => s.trim());
    const start = this.ipToInt(startIP);
    const end = this.ipToInt(endIP);

    if (start !== null && end !== null) {
      this.allowedRanges.push({ start, end });
    }
  }

  /**
   * Convert IP address to integer
   */
  private static ipToInt(ip: string): bigint | null {
    // Handle IPv6 mapped IPv4
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }

    // IPv4 conversion
    const parts = ip.split('.');
    if (parts.length === 4) {
      const isValid = parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255 && part === num.toString();
      });

      if (isValid) {
        return parts.reduce((acc, part) => (acc << BigInt(8)) | BigInt(parseInt(part, 10)), BigInt(0));
      }
    }

    return null;
  }

  /**
   * Check if an IP address is whitelisted
   */
  static isAllowed(ip: string | null): boolean {
    if (!ip) return false;

    // Normalize IPv6-mapped IPv4 addresses
    let normalizedIP = ip;
    if (ip.startsWith('::ffff:')) {
      normalizedIP = ip.substring(7);
    }

    // Check exact match
    if (this.allowedIPs.has(normalizedIP) || this.allowedIPs.has(ip)) {
      return true;
    }

    // Check ranges
    const ipInt = this.ipToInt(normalizedIP);
    if (ipInt !== null) {
      return this.allowedRanges.some(
        range => ipInt >= range.start && ipInt <= range.end
      );
    }

    return false;
  }

  /**
   * Extract client IP from request
   */
  static getClientIP(request: NextRequest): string | null {
    // Check X-Forwarded-For header (proxy/load balancer)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      // Take the first IP in the chain
      return forwarded.split(',')[0].trim();
    }

    // Check X-Real-IP header
    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP.trim();
    }

    // Check CF-Connecting-IP (Cloudflare)
    const cfIP = request.headers.get('cf-connecting-ip');
    if (cfIP) {
      return cfIP.trim();
    }

    // Check True-Client-IP (Akamai, Cloudflare Enterprise)
    const trueClientIP = request.headers.get('true-client-ip');
    if (trueClientIP) {
      return trueClientIP.trim();
    }

    // Fallback to connection IP (may not be available in all environments)
    return request.ip || null;
  }

  /**
   * Validate request against IP whitelist
   */
  static validateRequest(request: NextRequest): {
    allowed: boolean;
    ip: string | null;
    reason?: string;
  } {
    const clientIP = this.getClientIP(request);

    if (!clientIP) {
      return {
        allowed: false,
        ip: null,
        reason: 'Unable to determine client IP address'
      };
    }

    const allowed = this.isAllowed(clientIP);

    return {
      allowed,
      ip: clientIP,
      reason: allowed ? undefined : `IP ${clientIP} is not whitelisted`
    };
  }

  /**
   * Get whitelist statistics
   */
  static getStats() {
    return {
      totalIPs: this.allowedIPs.size,
      totalRanges: this.allowedRanges.length,
      ips: Array.from(this.allowedIPs),
    };
  }
}

// Initialize on module load
IPWhitelist.initialize();

/**
 * Middleware helper for IP whitelisting
 */
export function requireIPWhitelist(request: NextRequest): Response | null {
  const validation = IPWhitelist.validateRequest(request);

  if (!validation.allowed) {
    console.warn(`[Security] Blocked request from ${validation.ip}: ${validation.reason}`);

    return new Response(
      JSON.stringify({
        error: 'Access denied',
        message: 'Your IP address is not authorized to access this resource'
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  return null;
}

/**
 * Check if current environment requires IP whitelisting
 */
export function isIPWhitelistEnabled(): boolean {
  return process.env.ENABLE_IP_WHITELIST === 'true' || process.env.NODE_ENV === 'production';
}
