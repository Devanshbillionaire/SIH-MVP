/**
 * PrivaSight Phase 9.5 Security Regression & Invariant Test Suite
 * 
 * Validates:
 * 1. SSRF & Private-network URL protection (Cloud metadata, RFC 1918, loopbacks, non-web schemes)
 * 2. Screenshot privacy enforcement (sensitive data storage gating, fail-closed policy)
 * 3. Browser security configuration (strict TLS in prod, sandbox policies)
 * 4. External AI privacy boundary & local fallback
 * 5. ML training accuracy metrics
 * 6. Fixture handling & production environment isolation
 */

import { validateUrlSafety, isAllowedLocalDevFixture } from '../server/urlValidator';
import { ScreenshotPrivacyManager, PrivacyGateway } from '../server/privacyGateway';
import { getBrowserContextSecurityOptions, getBrowserSecurityLaunchArgs } from '../server/browserSecurity';
import { ExternalAIService, SanitizedCandidateContext } from '../server/externalAI';
import { AgentMLModel } from '../server/mlPredictor';

console.log('\n======================================================');
console.log('   PrivaSight Phase 9.5 Security Regression Suite');
console.log('======================================================\n');

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Security Regression Test Failed: ${message}`);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runSecurityRegressionTests() {
  // --------------------------------------------------------------------------
  // SECTION 1: SSRF & URL Safety Invariants
  // --------------------------------------------------------------------------
  console.log('--- [1/6] Testing SSRF & URL Protection Invariants ---');

  // 1.1 Non-web schemes
  const fileScheme = validateUrlSafety('file:///etc/passwd');
  assert(!fileScheme.valid && fileScheme.blockedReason === 'LOCAL_FILESYSTEM_SCHEME', 'Blocks file:/// scheme');

  const jsScheme = validateUrlSafety('javascript:alert(document.cookie)');
  assert(!jsScheme.valid && jsScheme.blockedReason === 'UNSUPPORTED_SCHEME', 'Blocks javascript: scheme');

  const dataScheme = validateUrlSafety('data:text/html,<script>alert(1)</script>');
  assert(!dataScheme.valid && dataScheme.blockedReason === 'UNSUPPORTED_SCHEME', 'Blocks data: scheme');

  // 1.2 Cloud Metadata Services (AWS, GCP, Azure, DigitalOcean)
  const awsMetadata = validateUrlSafety('http://169.254.169.254/latest/meta-data/');
  assert(!awsMetadata.valid && (awsMetadata.isPrivate || awsMetadata.blockedReason === 'PRIVATE_IPV4_RANGE'), 'Blocks AWS/Azure link-local metadata (169.254.169.254)');

  const gcpMetadata = validateUrlSafety('http://metadata.google.internal/computeMetadata/v1/');
  assert(!gcpMetadata.valid && (awsMetadata.isPrivate || gcpMetadata.blockedReason === 'INTERNAL_OR_LOCAL_HOSTNAME'), 'Blocks GCP metadata hostname (metadata.google.internal)');

  // 1.3 RFC 1918 Private IPv4 addresses
  const rfc10 = validateUrlSafety('http://10.0.1.50:8080/admin');
  assert(!rfc10.valid && rfc10.isPrivate && rfc10.blockedReason === 'PRIVATE_IPV4_RANGE', 'Blocks 10.0.0.0/8 private network');

  const rfc172 = validateUrlSafety('http://172.20.10.2/status');
  assert(!rfc172.valid && rfc172.isPrivate && rfc172.blockedReason === 'PRIVATE_IPV4_RANGE', 'Blocks 172.16.0.0/12 private network');

  const rfc192 = validateUrlSafety('http://192.168.1.1/router-login');
  assert(!rfc192.valid && rfc192.isPrivate && rfc192.blockedReason === 'PRIVATE_IPV4_RANGE', 'Blocks 192.168.0.0/16 private network');

  // 1.4 Loopback IPv4 and IPv6
  const loopback4 = validateUrlSafety('http://127.0.0.1:8000/internal', { enforceProduction: true });
  assert(!loopback4.valid && loopback4.isPrivate && loopback4.blockedReason === 'PRIVATE_IPV4_RANGE', 'Blocks IPv4 loopback (127.0.0.1) in production');

  const loopbackHost = validateUrlSafety('http://localhost:3000/api', { enforceProduction: true });
  assert(!loopbackHost.valid && loopbackHost.isPrivate && loopbackHost.blockedReason === 'INTERNAL_OR_LOCAL_HOSTNAME', 'Blocks localhost hostname in production');

  const loopback6 = validateUrlSafety('http://[::1]:3000/dashboard', { enforceProduction: true });
  assert(!loopback6.valid && loopback6.isPrivate && (loopback6.blockedReason === 'PRIVATE_IPV6_RANGE' || loopback6.blockedReason === 'INTERNAL_OR_LOCAL_HOSTNAME'), 'Blocks IPv6 loopback ([::1]) in production');

  // 1.5 Encoded integer IP representation (e.g. 2130706433 = 127.0.0.1)
  const encodedIp = validateUrlSafety('http://2130706433/admin', { enforceProduction: true });
  assert(!encodedIp.valid && encodedIp.isPrivate, 'Blocks decimal integer encoded IP (2130706433)');

  // 1.6 Legitimate Public URLs
  const publicHttps = validateUrlSafety('https://example.com/checkout');
  assert(publicHttps.valid && publicHttps.normalizedUrl === 'https://example.com/checkout', 'Allows legitimate public HTTPS URL');

  // 1.7 Fixture Exception handling
  const fixtureDev = validateUrlSafety('http://localhost:3000/fixtures/form.html', {
    enforceProduction: false,
    allowLocalFixture: true
  });
  assert(fixtureDev.valid, 'Allows local fixture in dev/test environment');

  const fixtureProd = validateUrlSafety('http://localhost:3000/fixtures/form.html', {
    enforceProduction: true,
    allowLocalFixture: false
  });
  assert(!fixtureProd.valid, 'Strictly blocks local fixture in production environment');

  // --------------------------------------------------------------------------
  // SECTION 2: Screenshot Privacy & Fail-Closed Storage Gating
  // --------------------------------------------------------------------------
  console.log('\n--- [2/6] Testing Screenshot Privacy Enforcement ---');

  // 2.1 Sensitive context with passwords / OTP
  const sensitiveContext = {
    has_sensitive_data: true,
    detected_fields: [
      { name: 'username', type: 'text' },
      { name: 'password', type: 'password' },
      { name: 'otp_code', type: 'text' }
    ]
  };
  const sensitiveSafety = ScreenshotPrivacyManager.evaluateScreenshotSafety(
    Buffer.from('fake-screenshot-bytes'),
    true,
    sensitiveContext
  );
  assert(!sensitiveSafety.allowed_to_persist, 'Screenshots with sensitive credentials MUST NOT be persisted to disk');
  assert(!sensitiveSafety.allowed_for_external_ai, 'Screenshots with sensitive credentials MUST NOT be sent to external AI');
  assert(sensitiveSafety.is_sensitive, 'Screenshot marked as sensitive');

  // 2.2 Empty or missing screenshot payload (fail-closed test)
  const emptySafety = ScreenshotPrivacyManager.evaluateScreenshotSafety(Buffer.alloc(0), false);
  assert(!emptySafety.allowed_to_persist, 'Fail-closed: empty screenshot payload must not be persisted');

  // 2.3 Non-sensitive context
  const benignContext = {
    has_sensitive_data: false,
    detected_fields: [
      { name: 'search_query', type: 'text' },
      { name: 'category', type: 'select' }
    ]
  };
  const benignSafety = ScreenshotPrivacyManager.evaluateScreenshotSafety(
    Buffer.from('fake-benign-screenshot'),
    false,
    benignContext
  );
  assert(benignSafety.allowed_to_persist, 'Benign, non-sensitive screenshot allowed to persist');

  // --------------------------------------------------------------------------
  // SECTION 3: Browser Security Configuration
  // --------------------------------------------------------------------------
  console.log('\n--- [3/6] Testing Browser Security Options & Arguments ---');

  // Test TLS certificate verification in production
  const origEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_INSECURE_CERTS;
    const prodOpts = getBrowserContextSecurityOptions();
    assert(prodOpts.ignoreHTTPSErrors === false, 'Production enforces strict TLS (ignoreHTTPSErrors: false)');

    process.env.NODE_ENV = 'development';
    const devOpts = getBrowserContextSecurityOptions();
    assert(devOpts.ignoreHTTPSErrors === true, 'Development allows local certificates for fixtures');

    // Test launch args
    const devArgs = getBrowserSecurityLaunchArgs();
    assert(devArgs.includes('--no-sandbox'), 'Launch args include --no-sandbox in container/dev environment');
  } finally {
    process.env.NODE_ENV = origEnv;
  }

  // --------------------------------------------------------------------------
  // SECTION 4: External AI Boundary & Fallback
  // --------------------------------------------------------------------------
  console.log('\n--- [4/6] Testing External AI Boundary & Local Fallback ---');

  const sensitiveForm = {
    Full_Name: 'Alex Mercer',
    Master_Password: 'UltraSecretPassword456!',
    TwoFactorCode: '882910',
    Credit_Card: '4111-2222-3333-4444'
  };
  const analysis = PrivacyGateway.analyze(sensitiveForm, 'sec_test_task');
  const safeData = PrivacyGateway.get_external_ai_safe_data(analysis);

  assert(!('Master_Password' in safeData), 'Zero-leak: Master_Password stripped from external AI payload');
  assert(!('TwoFactorCode' in safeData), 'Zero-leak: TwoFactorCode stripped from external AI payload');
  assert(!('Credit_Card' in safeData), 'Zero-leak: Credit_Card stripped from external AI payload');
  assert('Full_Name' in safeData, 'Permitted non-sensitive field Full_Name preserved');

  // Local fallback on missing key or timeout
  const mockCandidates: SanitizedCandidateContext[] = [
    { id: 'c1', tag: 'input', name: 'first_name', placeholder: 'First Name' },
    { id: 'c2', tag: 'input', name: 'last_name', placeholder: 'Last Name' }
  ];
  const disambiguation = await ExternalAIService.disambiguateCandidate({
    targetField: 'First Name',
    sanitizedCandidates: mockCandidates,
    timeoutMs: 800
  });
  assert(
    disambiguation.source === 'LOCAL_FALLBACK' || disambiguation.source === 'GEMINI',
    'Disambiguation completes with valid execution source'
  );

  // --------------------------------------------------------------------------
  // SECTION 5: ML Model Validation Metrics
  // --------------------------------------------------------------------------
  console.log('\n--- [5/6] Testing ML Model Validation Metric Correctness ---');

  const ml = new AgentMLModel();
  const meta = ml.getMetadata();
  assert(meta.status === 'COLD_START' || meta.status === 'TRAINED', 'ML model has valid status');
  assert(meta.training_accuracy === meta.validation_score, 'validation_score is a valid alias for training_accuracy');

  // Verify feature names
  assert(meta.features_used.length >= 3, `Model tracks features (found ${meta.features_used.length})`);
  assert(meta.features_used.includes('visual_confidence'), 'Tracks visual confidence');
  assert(meta.features_used.includes('dom_confidence'), 'Tracks DOM confidence');
  assert(meta.features_used.includes('text_similarity'), 'Tracks text similarity');

  // --------------------------------------------------------------------------
  // SECTION 6: Fixture Route Safety
  // --------------------------------------------------------------------------
  console.log('\n--- [6/6] Testing Fixture Isolation Invariants ---');

  const devFixtureUrl = new URL('http://localhost:3000/fixtures/form.html');
  assert(isAllowedLocalDevFixture(devFixtureUrl), 'isAllowedLocalDevFixture recognizes /fixtures/ on localhost');

  const externalFixtureUrl = new URL('http://malicious-site.com/fixtures/form.html');
  assert(!isAllowedLocalDevFixture(externalFixtureUrl), 'isAllowedLocalDevFixture blocks non-localhost hosts');

  const nonFixtureUrl = new URL('http://localhost:3000/admin/secrets');
  assert(!isAllowedLocalDevFixture(nonFixtureUrl), 'isAllowedLocalDevFixture blocks non-fixture endpoints on localhost');

  console.log('\n======================================================');
  console.log('   🎉 ALL PHASE 9.5 SECURITY REGRESSION TESTS PASSED!');
  console.log('======================================================\n');
}

runSecurityRegressionTests().catch((err) => {
  console.error('\n❌ Security Regression Test Failure:', err);
  process.exit(1);
});
