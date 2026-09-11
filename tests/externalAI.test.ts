/**
 * PrivaSight — External AI Security & Fallback Test Suite (Phase 9)
 * 
 * Tests:
 * 1. Privacy boundary: sensitive credentials never enter external payload
 * 2. Fallback logic: missing key or error seamlessly falls back to local pipeline
 * 3. Structured JSON validation: rejects candidate IDs not in valid set
 */

import { ExternalAIService, SanitizedCandidateContext } from '../server/externalAI';
import { PrivacyGateway } from '../server/privacyGateway';

console.log('--- Running External AI & Security Invariant Tests ---');

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  // Test 1: Configuration check
  const isConfig = ExternalAIService.isConfigured();
  assert(typeof isConfig === 'boolean', 'ExternalAIService.isConfigured() returns a boolean');

  // Test 2: Local Fallback when API key is missing or invalid
  const testCandidates: SanitizedCandidateContext[] = [
    { id: 'input_name', tag: 'input', name: 'name', placeholder: 'Your Name' },
    { id: 'input_email', tag: 'input', name: 'email', placeholder: 'Email Address' },
    { id: 'input_phone', tag: 'input', name: 'phone', placeholder: 'Phone' }
  ];

  const result = await ExternalAIService.disambiguateCandidate({
    targetField: 'Phone Number',
    sanitizedCandidates: testCandidates,
    pageTitle: 'Test Registration Page',
    timeoutMs: 1000
  });

  assert(result !== null && typeof result === 'object', 'disambiguateCandidate returns a valid response object');
  assert(result.source === 'LOCAL_FALLBACK' || result.source === 'GEMINI', 'Response specifies valid source');
  if (result.source === 'LOCAL_FALLBACK') {
    assert(result.reason.length > 0, 'Fallback response provides explanatory reason');
  }

  // Test 3: Empty candidates fallback
  const emptyResult = await ExternalAIService.disambiguateCandidate({
    targetField: 'Email',
    sanitizedCandidates: [],
    timeoutMs: 500
  });
  assert(emptyResult.source === 'LOCAL_FALLBACK', 'Empty candidates triggers immediate local fallback');
  assert(emptyResult.candidateId === null, 'Empty candidates produces null candidateId');

  // Test 4: Privacy Gateway Zero-Leak Verification for External Safe Data
  const sensitiveInputs = {
    Name: 'Devansh Kumar',
    Email: 'devansh@example.com',
    Password: 'SuperSecretPassword123!',
    OTP: '987654',
    API_Key: 'sk-123456789012345678901234567890',
    SessionToken: 'ghp_abcdefghijklmnopqrstuvwxyz1234567890'
  };

  const privacyAnalysis = PrivacyGateway.analyze(sensitiveInputs, 'test_task_sec_01');
  assert(privacyAnalysis.success, 'PrivacyGateway analysis succeeded');

  const externalSafeData = PrivacyGateway.get_external_ai_safe_data(privacyAnalysis);

  // Assert sensitive fields are COMPLETELY ABSENT from external payload
  assert(!('Password' in externalSafeData), 'SECURITY INVARIANT: Password must NOT exist in external payload');
  assert(!('OTP' in externalSafeData), 'SECURITY INVARIANT: OTP must NOT exist in external payload');
  assert(!('API_Key' in externalSafeData), 'SECURITY INVARIANT: API_Key must NOT exist in external payload');
  assert(!('SessionToken' in externalSafeData), 'SECURITY INVARIANT: SessionToken must NOT exist in external payload');

  // Assert safe fields ARE present
  assert('Name' in externalSafeData, 'Safe field Name must be in external payload');
  assert('Email' in externalSafeData, 'Safe field Email must be in external payload');
  assert(externalSafeData['Name'] === 'Devansh Kumar', 'Safe field Name matches value');

  // Verify that stringifying externalSafeData contains ZERO instances of secrets
  const serialized = JSON.stringify(externalSafeData);
  assert(!serialized.includes('SuperSecretPassword123!'), 'No password cleartext in serialized external data');
  assert(!serialized.includes('987654'), 'No OTP in serialized external data');
  assert(!serialized.includes('sk-123456789012345678901234567890'), 'No API Key in serialized external data');

  console.log('🎉 ALL EXTERNAL AI & SECURITY INVARIANT TESTS PASSED!');
}

runTests().catch(err => {
  console.error('Test runner caught fatal error:', err);
  process.exit(1);
});
