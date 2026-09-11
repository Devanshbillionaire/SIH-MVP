/**
 * Browser Security Configuration for Playwright Headless Automation.
 * 
 * Container vs Production Environment Facts:
 * 1. Chromium Sandboxing requires Linux kernel user namespace or SUID capabilities.
 *    In standard sandboxed Docker / Cloud Run environments running as root or constrained users,
 *    Chromium cannot create a setuid sandbox and crashes immediately without `--no-sandbox`.
 * 2. In production with dedicated user namespaces, sandboxing can be enabled by setting
 *    `PLAYWRIGHT_SANDBOX=true`.
 * 3. In production, HTTPS certificate errors must NOT be ignored (ignoreHTTPSErrors: false),
 *    enforcing strict TLS validation, unless explicitly set via `ALLOW_INSECURE_CERTS=true`.
 * 4. In development and testing, permissive certificate handling enables local test fixtures.
 */

export interface BrowserSecurityLaunchOptions {
  headless?: boolean;
  args: string[];
}

export interface BrowserSecurityContextOptions {
  ignoreHTTPSErrors: boolean;
}

/**
 * Returns safe Playwright Chromium launch arguments based on environment.
 */
export function getBrowserSecurityLaunchArgs(): string[] {
  const isProd = process.env.NODE_ENV === 'production';
  const forceSandbox = process.env.PLAYWRIGHT_SANDBOX === 'true';

  const baseArgs = [
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--disable-gpu'
  ];

  // If running in production with explicit sandboxing support, do not pass --no-sandbox
  if (isProd && forceSandbox) {
    return baseArgs;
  }

  // Development, test suites, or standard containerized runtimes (where sandbox SUID is disabled):
  return ['--no-sandbox', '--disable-setuid-sandbox', ...baseArgs];
}

/**
 * Returns security-hardened browser context options.
 */
export function getBrowserContextSecurityOptions(): BrowserSecurityContextOptions {
  const isProd = process.env.NODE_ENV === 'production';
  const allowInsecure = process.env.ALLOW_INSECURE_CERTS === 'true';

  // In production, enforce TLS certificate verification by default.
  // In development/test mode, allow local self-signed or test certificates for fixtures.
  const ignoreHTTPSErrors = !isProd || allowInsecure;

  return {
    ignoreHTTPSErrors
  };
}
