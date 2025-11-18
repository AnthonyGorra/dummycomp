/**
 * VPN Connection Validator
 *
 * Validates that admin requests are coming through VPN
 * for enhanced security on production environments.
 */

import { NextRequest } from 'next/server';

export class VPNValidator {
  // VPN subnet ranges (configure based on your VPN setup)
  private static vpnRanges = [
    { start: '10.8.0.0', end: '10.8.0.255', name: 'WireGuard' },     // WireGuard default
    { start: '10.9.0.0', end: '10.9.0.255', name: 'OpenVPN' },       // OpenVPN default
  ];

  /**
   * Check if an IP address is within a VPN range
   */
  static isVPNConnection(ip: string | null): boolean {
    if (!ip) return false;

    // Normalize IPv6-mapped IPv4 addresses
    let normalizedIP = ip;
    if (ip.startsWith('::ffff:')) {
      normalizedIP = ip.substring(7);
    }

    // Convert IP to number for comparison
    const ipNum = this.ipToNumber(normalizedIP);
    if (ipNum === null) return false;

    // Check if IP is in any VPN range
    return this.vpnRanges.some(range => {
      const startNum = this.ipToNumber(range.start);
      const endNum = this.ipToNumber(range.end);
      return startNum !== null && endNum !== null && ipNum >= startNum && ipNum <= endNum;
    });
  }

  /**
   * Convert IP address to number for comparison
   */
  private static ipToNumber(ip: string): number | null {
    const parts = ip.split('.');
    if (parts.length !== 4) return null;

    const isValid = parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255 && part === num.toString();
    });

    if (!isValid) return null;

    return parts.reduce((acc, part, index) => {
      return acc + parseInt(part, 10) * Math.pow(256, 3 - index);
    }, 0);
  }

  /**
   * Get client IP from request
   */
  static getClientIP(request: NextRequest): string | null {
    // Check X-Forwarded-For header
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    // Check X-Real-IP header
    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP.trim();
    }

    // Fallback to request IP
    return request.ip || null;
  }

  /**
   * Validate that request is coming through VPN
   */
  static requireVPN(request: NextRequest): {
    valid: boolean;
    ip: string | null;
    reason?: string;
  } {
    const clientIP = this.getClientIP(request);

    if (!clientIP) {
      return {
        valid: false,
        ip: null,
        reason: 'Unable to determine client IP address'
      };
    }

    const isVPN = this.isVPNConnection(clientIP);

    if (!isVPN) {
      return {
        valid: false,
        ip: clientIP,
        reason: `IP ${clientIP} is not connected through VPN`
      };
    }

    return {
      valid: true,
      ip: clientIP
    };
  }

  /**
   * Get VPN network information
   */
  static getVPNInfo(ip: string): { inVPN: boolean; network?: string } {
    const ipNum = this.ipToNumber(ip);
    if (ipNum === null) return { inVPN: false };

    for (const range of this.vpnRanges) {
      const startNum = this.ipToNumber(range.start);
      const endNum = this.ipToNumber(range.end);

      if (startNum !== null && endNum !== null && ipNum >= startNum && ipNum <= endNum) {
        return {
          inVPN: true,
          network: range.name
        };
      }
    }

    return { inVPN: false };
  }

  /**
   * Add custom VPN range
   */
  static addVPNRange(start: string, end: string, name: string) {
    this.vpnRanges.push({ start, end, name });
  }
}

/**
 * Middleware helper for VPN validation
 */
export function requireVPNConnection(request: NextRequest): Response | null {
  // Skip VPN check in development
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  // Skip if VPN requirement is disabled
  if (process.env.REQUIRE_VPN !== 'true') {
    return null;
  }

  const validation = VPNValidator.requireVPN(request);

  if (!validation.valid) {
    console.warn(`[Security] Non-VPN access attempt from ${validation.ip}: ${validation.reason}`);

    return new Response(
      JSON.stringify({
        error: 'VPN Required',
        message: 'This resource requires a VPN connection. Please connect to the company VPN and try again.'
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Log VPN connection info
  const vpnInfo = VPNValidator.getVPNInfo(validation.ip!);
  console.log(`[Security] VPN access from ${validation.ip} (${vpnInfo.network})`);

  return null;
}
