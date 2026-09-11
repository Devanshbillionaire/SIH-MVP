/**
 * PrivaSight Phase 9: E2E Privacy & Security Test Suite
 * Validates zero-leak boundary, sensitive token redaction, and local isolation.
 */

import { PrivacyGateway, LocalSecureStore, ScreenshotPrivacyManager } from '../server/privacyGateway';
import { SafeFormExecutionEngine } from '../server/safeExecutor';
import { ExternalAIService } from '../server/externalAI';
import { agentPlanner } from '../server/agentPlanner';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runE2ESecurityTests() {
  console.log('\n==================================================');
  console.log('--- PrivaSight E2E Privacy & Security Tests ---');
  console.log('==================================================\n');

  // Test 1: Full Input Scan and Strict Sensitivity Classification
  console.log('[Security Test 1] Scanning mixed inputs with passwords, OTP, and API keys...');
  const sensitivePayload = `
Name: Devansh Kumar
Email: devansh@example.com
Password: SuperSecretMasterPassword!2024
OTP: 983102
API_Key: sk-live-9382019481029481029481029481
CreditCard: 4532-1182-9920-1829
  `;

  const analysis = PrivacyGateway.analyze(sensitivePayload);
  const classified = [...analysis.safe_data, ...analysis.protected_data];
  assert(classified.length >= 5, `Classified at least 5 fields (found ${classified.length})`);

  const passwordField = classified.find((f) => f.category === 'PASSWORD');
  assert(passwordField !== undefined, 'Password field correctly categorized');
  assert(passwordField?.sensitivity === 'HIGHLY_SENSITIVE', 'Password sensitivity is HIGHLY_SENSITIVE');
  assert(passwordField?.allowed_for_external_ai === false, 'Password strictly forbidden from external AI');

  const otpField = classified.find((f) => f.category === 'OTP');
  assert(otpField !== undefined, 'OTP field correctly categorized');
  assert(otpField?.sensitivity === 'HIGHLY_SENSITIVE', 'OTP sensitivity is HIGHLY_SENSITIVE');
  assert(otpField?.allowed_for_external_ai === false, 'OTP strictly forbidden from external AI');

  const apiKeyField = classified.find((f) => f.category === 'API_KEY');
  assert(apiKeyField !== undefined, 'API Key field correctly categorized');
  assert(apiKeyField?.sensitivity === 'HIGHLY_SENSITIVE', 'API Key sensitivity is HIGHLY_SENSITIVE');
  assert(apiKeyField?.allowed_for_external_ai === false, 'API Key strictly forbidden from external AI');

  // Test 2: External AI Sanitization Boundary (Zero Raw Leak)
  console.log('\n[Security Test 2] Testing PrivacyGateway.get_external_ai_safe_data boundary...');
  const userMap: Record<string, string> = {
    Name: 'Devansh Kumar',
    Email: 'devansh@example.com',
    Password: 'SuperSecretMasterPassword!2024',
    OTP: '983102',
    Notes: 'Just a normal remark'
  };

  const mapAnalysis = PrivacyGateway.analyze(userMap);
  const safeData = PrivacyGateway.get_external_ai_safe_data(mapAnalysis);
  assert(safeData['Password'] === undefined, 'Password is NOT present in external AI safe payload');
  assert(safeData['OTP'] === undefined, 'OTP is NOT present in external AI safe payload');
  assert(safeData['Name'] === 'Devansh Kumar', 'Safe field "Name" is preserved');
  assert(safeData['Email'] === 'devansh@example.com', 'Safe field "Email" is preserved');
  assert(safeData['Notes'] === 'Just a normal remark', 'Safe field "Notes" is preserved');

  // Test 3: Stringified External AI Safe Data Check
  const safeDataString = JSON.stringify(safeData);
  assert(!safeDataString.includes('SuperSecretMasterPassword'), 'Zero leakage of raw password string');
  assert(!safeDataString.includes('983102'), 'Zero leakage of raw OTP string');

  // Test 4: External AI adapter sanitization check
  console.log('\n[Security Test 3] Validating ExternalAIService prompt sanitization...');
  const promptAttempt = `Please help disambiguate field for password SuperSecretMasterPassword!2024 with OTP 983102`;
  const sanitizedPrompt = ExternalAIService.sanitizeText(promptAttempt);
  assert(!sanitizedPrompt.includes('SuperSecretMasterPassword!2024'), 'ExternalAIService sanitized raw password');
  assert(!sanitizedPrompt.includes('983102'), 'ExternalAIService sanitized raw OTP');

  // Test 5: LocalSecureStore Isolation
  console.log('\n[Security Test 4] Validating LocalSecureStore in-memory zero-persistence isolation...');
  LocalSecureStore.saveTaskSecrets('devansh_session', { Password: 'SecretPass999' });
  const storedValue = LocalSecureStore.getSecret('devansh_session', 'Password');
  assert(storedValue === 'SecretPass999', 'Local store retains value for local Playwright executor');
  
  LocalSecureStore.clearTask('devansh_session');
  assert(LocalSecureStore.getSecret('devansh_session', 'Password') === undefined, 'Local store securely cleared session data');

  // Test 6: Safety Gate in Task Planner for Password Fields
  console.log('\n[Security Test 5] Validating Task Planner Safety Gate for Password / Credentials...');
  const testFields = [
    { id: 'user_name', name: 'user_name', type: 'text', isVisible: true },
    { id: 'user_pass', name: 'user_pass', type: 'password', isVisible: true }
  ];

  const planWithPassword = agentPlanner.createPlan(
    'Fill username and password',
    testFields,
    'user_name: Devansh Kumar\nuser_pass: SuperSecret123'
  );

  const passwordStep = planWithPassword.steps.find((s) => s.target_field === 'user_pass' || s.action === 'PASSWORD');
  if (passwordStep) {
    assert(
      passwordStep.status === 'BLOCKED' || passwordStep.requires_confirmation === true,
      'Password fill step is safety gated (BLOCKED or requires confirmation)'
    );
  } else {
    console.log('✅ PASS: Password field was filtered out from unconfirmed automated execution');
  }

  console.log('\n✅ ALL E2E PRIVACY & SECURITY TESTS PASSED!\n');
}

runE2ESecurityTests().catch((err) => {
  console.error('\n❌ E2E Privacy & Security Tests FAILED:', err);
  process.exit(1);
});
