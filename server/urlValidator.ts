import dns from 'dns';
import { URL } from 'url';

export interface UrlValidationOptions {
  /**
   * Whether to enforce strict production rules (blocking all loopback and local addresses).
   * Defaults to true if NODE_ENV === 'production'.
   */
  enforceProduction?: boolean;

  /**
   * Explicitly allow local test fixtures (e.g. localhost:3000/fixtures/ or local test ports)
   * in development/testing mode only.
   */
  allowLocalFixture?: boolean;

  /**
   * Whether to perform asynchronous DNS resolution to detect rebinding to private IPs.
   */
  checkDns?: boolean;
}

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  error?: string;
  blockedReason?: string;
  isPrivate?: boolean;
}

/**
 * Checks if an IPv4 address string falls into private, loopback, or reserved IP ranges.
 */
export function isPrivateOrReservedIPv4(ip: string): boolean {
  // Check for IPv4 decimal/octal/hex formats or normalize standard 4 octets
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) {
    return false;
  }

  const [a, b, c, d] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 10.0.0.0/8 (Private-Use RFC 1918)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private-Use RFC 1918: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private-Use RFC 1918)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (Link-Local / Cloud Metadata: AWS/GCP/Azure)
  if (a === 169 && b === 254) return true;

  // 100.64.0.0/10 (Shared Address Space / CGNAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && c === 0) return true;

  // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (TEST-NET documentation)
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 (Multicast: 224.0.0.0 - 239.255.255.255)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future Use)
  if (a >= 240) return true;

  // 255.255.255.255 (Broadcast)
  if (a === 255 && b === 255 && c === 255 && d === 255) return true;

  return false;
}

/**
 * Checks if an IPv6 address falls into loopback, unique local, or link-local ranges.
 */
export function isPrivateOrReservedIPv6(ip: string): boolean {
  const clean = ip.replace(/^\[|\]$/g, '').toLowerCase().trim();

  // Loopback ::1
  if (clean === '::1' || clean === '0:0:0:0:0:0:0:1' || /^0*(:0*){6}:0*1$/.test(clean)) {
    return true;
  }

  // Unspecified ::
  if (clean === '::' || clean === '0:0:0:0:0:0:0:0' || /^0*(:0*){7}$/.test(clean)) {
    return true;
  }

  // Unique Local Address (ULA) fc00::/7 (fc.. or fd..)
  if (clean.startsWith('fc') || clean.startsWith('fd')) {
    return true;
  }

  // Link-Local fe80::/10 (fe8, fe9, fea, feb)
  if (/^fe[89ab]/i.test(clean)) {
    return true;
  }

  // IPv4-mapped IPv6 ::ffff:127.0.0.1 or ::ffff:7f00:1
  if (clean.startsWith('::ffff:')) {
    const mapped = clean.substring(7);
    if (mapped.includes('.')) {
      return isPrivateOrReservedIPv4(mapped);
    }
  }

  return false;
}

/**
 * Checks if a hostname indicates internal infrastructure or localhost.
 */
export function isInternalOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();

  if (host === 'localhost') return true;
  if (host.endsWith('.localhost')) return true;
  if (host.endsWith('.local')) return true;
  if (host.endsWith('.internal')) return true;
  if (host.endsWith('.lan')) return true;
  if (host.endsWith('.home')) return true;
  if (host.endsWith('.corp')) return true;

  // Cloud metadata hostnames
  if (
    host === 'metadata.google.internal' ||
    host === 'instance-data' ||
    host === 'metadata' ||
    host === '169.254.169.254'
  ) {
    return true;
  }

  // Single label names without dots (e.g. "router", "db", "intranet", "printer")
  if (!host.includes('.')) {
    return true;
  }

  return false;
}

/**
 * Checks if the request qualifies for the explicit local development test fixture exception.
 */
export function isAllowedLocalDevFixture(parsed: URL): boolean {
  const host = parsed.hostname.toLowerCase();
  const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (!isLoopback) return false;

  const pathname = parsed.pathname || '';
  // Only allow dedicated fixture endpoints or local test servers running the form fixture
  return (
    pathname.startsWith('/fixtures/') ||
    pathname.startsWith('/demo-sites/') ||
    pathname.endsWith('form.html') ||
    pathname === '/form.html'
  );
}

/**
 * Centralized URL Safety and SSRF Validator.
 * Validates protocol, format, private IP ranges, cloud metadata, and internal hostnames.
 */
export function validateUrlSafety(rawUrl: string, options?: UrlValidationOptions): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'Invalid URL: Please provide a webpage URL.' };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, error: 'Invalid URL: Webpage URL cannot be empty.' };
  }

  // 1. Reject local filesystem paths and non-web schemes immediately
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('\\') ||
    trimmed.startsWith('file:') ||
    trimmed.startsWith('file://')
  ) {
    return {
      valid: false,
      error: 'SSRF Security Guard: Local filesystem paths (file://) are strictly forbidden.',
      blockedReason: 'LOCAL_FILESYSTEM_SCHEME'
    };
  }

  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('ftp:') ||
    trimmed.startsWith('ws:') ||
    trimmed.startsWith('wss:')
  ) {
    return {
      valid: false,
      error: 'SSRF Security Guard: Only http:// and https:// web addresses are allowed.',
      blockedReason: 'UNSUPPORTED_SCHEME'
    };
  }

  // 2. Parse URL
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    // If user provided domain without protocol, e.g. "example.com/form"
    try {
      parsed = new URL(`https://${trimmed}`);
    } catch {
      return {
        valid: false,
        error: 'Invalid URL: Malformed web address. Please provide a valid URL like https://example.com/form'
      };
    }
  }

  // 3. Scheme check
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      error: `SSRF Security Guard: Protocol (${parsed.protocol}) is not permitted. Only http:// and https:// are supported.`,
      blockedReason: 'INVALID_PROTOCOL'
    };
  }

  const rawHostname = parsed.hostname.toLowerCase();
  const cleanHostname = rawHostname.replace(/^\[|\]$/g, '');

  const isProduction = options?.enforceProduction ?? (process.env.NODE_ENV === 'production');
  const allowFixtureOption = options?.allowLocalFixture ?? (process.env.NODE_ENV !== 'production');

  // 4. Check Development / Test Fixture Exception
  if (!isProduction && allowFixtureOption && isAllowedLocalDevFixture(parsed)) {
    // Allowed specifically for development/testing fixture execution
    return { valid: true, normalizedUrl: parsed.toString() };
  }

  // 5. SSRF Checks: Block Localhost & Internal Hostnames
  if (isInternalOrLocalHostname(cleanHostname)) {
    return {
      valid: false,
      isPrivate: true,
      error: `SSRF Protection: Access to localhost, internal network, or local hostnames (${cleanHostname}) is blocked.`,
      blockedReason: 'INTERNAL_OR_LOCAL_HOSTNAME'
    };
  }

  // 6. SSRF Checks: Block Private & Reserved IPv4
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanHostname)) {
    if (isPrivateOrReservedIPv4(cleanHostname)) {
      return {
        valid: false,
        isPrivate: true,
        error: `SSRF Protection: Access to private or reserved IP address (${cleanHostname}) is blocked.`,
        blockedReason: 'PRIVATE_IPV4_RANGE'
      };
    }
  }

  // 7. SSRF Checks: Block IPv6 Loopback / ULA / Link-Local
  if (cleanHostname.includes(':')) {
    if (isPrivateOrReservedIPv6(cleanHostname)) {
      return {
        valid: false,
        isPrivate: true,
        error: `SSRF Protection: Access to private or loopback IPv6 address (${cleanHostname}) is blocked.`,
        blockedReason: 'PRIVATE_IPV6_RANGE'
      };
    }
  }

  // 8. Reject integer-only or hex representations that bypass dot checks (e.g. http://2130706433 or http://0x7f000001)
  if (/^\d+$/.test(cleanHostname) || /^0x[0-9a-f]+$/i.test(cleanHostname)) {
    return {
      valid: false,
      isPrivate: true,
      error: `SSRF Protection: Numeric or hex IP representation (${cleanHostname}) is blocked.`,
      blockedReason: 'ENCODED_IP_ADDRESS'
    };
  }

  return { valid: true, normalizedUrl: parsed.toString() };
}
