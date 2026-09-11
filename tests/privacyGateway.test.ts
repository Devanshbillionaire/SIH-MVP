/**
 * Privacy Protection Gateway — Unit Tests (Phase 3)
 */

import { PrivacyGateway, LocalSecureStore, ScreenshotPrivacyManager } from '../server/privacyGateway';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
}

function runTests() {
  console.log('\n--- Running Privacy Gateway Unit Tests ---\n');

  // Test 1: Password Detection
  {
    const result = PrivacyGateway.classifyField('Password', 'MySecret123');
    assert(result.sensitivity === 'HIGHLY_SENSITIVE', 'Password field is HIGHLY_SENSITIVE');
    assert(result.category === 'PASSWORD', 'Password field category is PASSWORD');
    assert(result.allowed_for_external_ai === false, 'Password is NOT allowed for external AI');
    assert(result.confidence >= 0.95, 'Password detection confidence is >= 0.95');
  }

  // Test 2: OTP Detection
  {
    const result = PrivacyGateway.classifyField('OTP', '482913');
    assert(result.sensitivity === 'HIGHLY_SENSITIVE', 'OTP field is HIGHLY_SENSITIVE');
    assert(result.category === 'OTP', 'OTP field category is OTP');
    assert(result.allowed_for_external_ai === false, 'OTP is NOT allowed for external AI');
  }

  // Test 3: API Key Detection
  {
    const result = PrivacyGateway.classifyField('API_Key', 'sk-abcdef1234567890abcdef1234567890');
    assert(result.sensitivity === 'HIGHLY_SENSITIVE', 'API Key field is HIGHLY_SENSITIVE');
    assert(result.category === 'API_KEY', 'API Key category is API_KEY');
    assert(result.allowed_for_external_ai === false, 'API Key is NOT allowed for external AI');
  }

  // Test 4: Email Classification
  {
    const result = PrivacyGateway.classifyField('Email', 'john@example.com');
    assert(result.sensitivity === 'PERSONAL', 'Email field is PERSONAL');
    assert(result.category === 'EMAIL', 'Email category is EMAIL');
    assert(result.allowed_for_external_ai === true, 'Email is allowed for external AI');
  }

  // Test 5: Phone Classification
  {
    const result = PrivacyGateway.classifyField('Phone', '+1-555-123-4567');
    assert(result.sensitivity === 'PERSONAL', 'Phone field is PERSONAL');
    assert(result.category === 'PHONE', 'Phone category is PHONE');
    assert(result.allowed_for_external_ai === true, 'Phone is allowed for external AI');
  }

  // Test 6: City Classification
  {
    const result = PrivacyGateway.classifyField('City', 'Kanpur');
    assert(result.sensitivity === 'LOW_SENSITIVITY', 'City field is LOW_SENSITIVITY');
    assert(result.category === 'GENERAL', 'City category is GENERAL');
    assert(result.allowed_for_external_ai === true, 'City is allowed for external AI');
  }

  // Test 7: Mixed Input Comprehensive Analysis
  {
    const mixedInput = `Name: John Doe
City: Kanpur
Email: john@example.com
Password: Secret123
OTP: 123456`;

    const analysis = PrivacyGateway.analyze(mixedInput, 'test-task-1');

    assert(analysis.success === true, 'Mixed input analysis succeeds');
    assert(analysis.analyzed_count === 5, '5 values parsed and analyzed');
    assert(analysis.protected_data.length === 2, 'Exactly 2 fields protected locally (Password, OTP)');
    assert(analysis.safe_data.length === 3, 'Exactly 3 fields marked safe (Name, City, Email)');
    assert(analysis.external_ai_access === 'BLOCKED_FOR_PROTECTED', 'External AI access is blocked for protected values');

    // Verify raw secrets are NOT in protected_data
    for (const item of analysis.protected_data) {
      assert(item.value === undefined, `Protected field ${item.key} does not have raw value exposed`);
      assert(item.redacted_preview === '[PROTECTED]', `Protected field ${item.key} shows [PROTECTED]`);
    }

    // Verify get_external_ai_safe_data returns ONLY safe items
    const safePayload = PrivacyGateway.get_external_ai_safe_data(analysis);
    assert(safePayload['Name'] === 'John Doe', 'Safe payload contains Name');
    assert(safePayload['City'] === 'Kanpur', 'Safe payload contains City');
    assert(safePayload['Email'] === 'john@example.com', 'Safe payload contains Email');
    assert(safePayload['Password'] === undefined, 'Safe payload does NOT contain Password');
    assert(safePayload['OTP'] === undefined, 'Safe payload does NOT contain OTP');

    // Verify LocalSecureStore contains the secret for local browser automation
    const localPass = LocalSecureStore.getSecret('test-task-1', 'Password');
    assert(localPass === 'Secret123', 'Local vault holds password for on-device browser filling');
    LocalSecureStore.clearTask('test-task-1');
    assert(LocalSecureStore.getSecret('test-task-1', 'Password') === undefined, 'Vault cleared after task');
  }

  // Test 8: Adversarial Variations
  {
    const adversarialVariations = [
      { key: 'pass', val: 'Secret123', expectedCategory: 'PASSWORD' },
      { key: 'passwd', val: 'Secret123', expectedCategory: 'PASSWORD' },
      { key: 'password is Secret123', val: 'Secret123', expectedCategory: 'PASSWORD' },
      { key: 'my login password', val: 'Secret123', expectedCategory: 'PASSWORD' },
      { key: 'OTP code is 123456', val: '123456', expectedCategory: 'OTP' },
      { key: 'one time password', val: '123456', expectedCategory: 'OTP' },
      { key: 'security code', val: '123456', expectedCategory: 'PIN' },
      { key: 'api_key', val: 'abc123def456ghi789jkl012mno345', expectedCategory: 'API_KEY' }
    ];

    for (const adv of adversarialVariations) {
      const res = PrivacyGateway.classifyField(adv.key, adv.val);
      assert(res.sensitivity === 'HIGHLY_SENSITIVE', `Adversarial "${adv.key}" classified as HIGHLY_SENSITIVE`);
      assert(res.allowed_for_external_ai === false, `Adversarial "${adv.key}" blocked from external AI`);
    }
  }

  // Test 9: Benign Concept Mentions (Avoiding False Positives)
  {
    const benignCases = [
      { key: 'Feature', val: 'password manager' },
      { key: 'Navigation', val: 'password reset page' },
      { key: 'Workflow', val: 'OTP verification form' }
    ];

    for (const benign of benignCases) {
      const res = PrivacyGateway.classifyField(benign.key, benign.val);
      assert(res.sensitivity !== 'HIGHLY_SENSITIVE', `Benign mention "${benign.val}" is NOT HIGHLY_SENSITIVE`);
      assert(res.allowed_for_external_ai === true, `Benign mention "${benign.val}" is allowed for external AI`);
    }
  }

  // Test 10: Screenshot Privacy Guard
  {
    const safeScreenshot = ScreenshotPrivacyManager.evaluateScreenshotSafety('/static/test.png', false);
    assert(safeScreenshot.allowed_for_external_ai === true, 'Safe screenshot allowed for external transmission');

    const protectedScreenshot = ScreenshotPrivacyManager.evaluateScreenshotSafety('/static/test.png', true);
    assert(protectedScreenshot.allowed_for_external_ai === false, 'Sensitive screenshot blocked from external transmission');
  }

  // Test 11: Fail-Closed Enforcement
  {
    let blocked = false;
    try {
      PrivacyGateway.get_external_ai_safe_data({
        success: false,
        scan_status: 'failed'
      } as any);
    } catch (e) {
      blocked = true;
    }
    assert(blocked === true, 'get_external_ai_safe_data throws under fail-closed when scan failed');
  }

  console.log('\n🎉 ALL 24 PRIVACY GATEWAY ASSERTIONS PASSED!\n');
}

runTests();
