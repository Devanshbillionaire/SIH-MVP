/**
 * Phase 7: Safe Form Execution Engine Test Suite
 * Validates deterministic execution, element compatibility, verification,
 * retry bounds, safety gates, and privacy leak prevention.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { SafeFormExecutionEngine } from '../server/safeExecutor';
import { TaskPlan, TaskStep } from '../src/types';
import { agentPlanner } from '../server/agentPlanner';
import { PagePerceptionService } from '../server/perception';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
}

// 1. Setup local fixture HTTP server
let testServer: http.Server;
let testBaseUrl: string;

async function startFixtureServer(): Promise<string> {
  // Check if controlled dev server fixture is already responding on port 3000
  try {
    const res = await fetch('http://localhost:3000/fixtures/form.html');
    if (res.ok) {
      testBaseUrl = 'http://localhost:3000/fixtures/form.html';
      console.log(`[Test Server] Using active dev server fixture at ${testBaseUrl}`);
      return testBaseUrl;
    }
  } catch {}

  return new Promise((resolve, reject) => {
    testServer = http.createServer((req, res) => {
      const urlPath = req.url?.split('?')[0] || '';
      if (urlPath === '/' || urlPath === '/form.html' || urlPath.startsWith('/fixtures/')) {
        const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'form.html');
        const content = fs.readFileSync(fixturePath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    testServer.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // Port 3000 is occupied, assume server is serving fixtures
        testBaseUrl = 'http://localhost:3000/fixtures/form.html';
        resolve(testBaseUrl);
      } else {
        reject(err);
      }
    });

    testServer.listen(3000, 'localhost', () => {
      testBaseUrl = 'http://localhost:3000/fixtures/form.html';
      console.log(`[Test Server] Running fixture server at ${testBaseUrl}`);
      resolve(testBaseUrl);
    });
  });
}

async function stopFixtureServer() {
  return new Promise<void>((resolve) => {
    if (testServer) {
      testServer.close(() => {
        console.log('[Test Server] Fixture server closed.');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   PHASE 7: SAFE FORM EXECUTION ENGINE TEST SUITE    ');
  console.log('======================================================\n');

  await startFixtureServer();

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Fill Name -> SUCCESS & VERIFIED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Fill Name Field ---');
    const namePlan: TaskPlan = {
      status: 'READY',
      task_id: 'test_1_name',
      target_url: testBaseUrl,
      intent_action: 'FILL_FORM',
      confidence: 0.95,
      steps: [
        {
          step_id: 'step_1',
          field_name: 'full_name',
          action: 'FILL',
          target_element: {
            tag: 'input',
            id: 'name',
            name: 'name',
            placeholder: 'e.g. Alex Johnson'
          },
          target_description: 'Full Name Input',
          value: 'Alex Johnson',
          sensitivity: 'SAFE',
          status: 'PENDING',
          required_confidence: 0.70
        }
      ],
      created_at: Date.now()
    };

    const res1 = await SafeFormExecutionEngine.executePlan(testBaseUrl, namePlan);
    assert(res1.status === 'SUCCESS', `Test 1 status should be SUCCESS, got ${res1.status}`);
    assert(res1.completed_actions === 1, `Should complete 1 action, got ${res1.completed_actions}`);
    assert(res1.verified_count === 1, `Should verify 1 action, got ${res1.verified_count}`);
    assert(res1.actions[0].verified === true, 'Action should have verified=true');

    // -------------------------------------------------------------------------
    // TEST 2: Fill Email -> SUCCESS & VERIFIED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Fill Email Field ---');
    const emailPlan: TaskPlan = {
      status: 'READY',
      task_id: 'test_2_email',
      target_url: testBaseUrl,
      intent_action: 'FILL_FORM',
      confidence: 0.95,
      steps: [
        {
          step_id: 'step_2',
          field_name: 'email',
          action: 'FILL',
          target_element: {
            tag: 'input',
            id: 'email',
            name: 'email',
            placeholder: 'alex@example.com'
          },
          target_description: 'Email Input',
          value: 'alex@example.com',
          sensitivity: 'SAFE',
          status: 'PENDING',
          required_confidence: 0.70
        }
      ],
      created_at: Date.now()
    };

    const res2 = await SafeFormExecutionEngine.executePlan(testBaseUrl, emailPlan);
    assert(res2.status === 'SUCCESS', `Test 2 status should be SUCCESS, got ${res2.status}`);
    assert(res2.verified_count === 1, 'Email fill should be verified in live DOM');

    // -------------------------------------------------------------------------
    // TEST 3: Select Dropdown (Country) -> SUCCESS & VERIFIED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Select Dropdown Option ---');
    const selectPlan: TaskPlan = {
      status: 'READY',
      task_id: 'test_3_select',
      target_url: testBaseUrl,
      intent_action: 'FILL_FORM',
      confidence: 0.95,
      steps: [
        {
          step_id: 'step_3',
          field_name: 'country',
          action: 'SELECT',
          target_element: {
            tag: 'select',
            id: 'country',
            name: 'country'
          },
          target_description: 'Country Dropdown',
          value: 'Canada',
          sensitivity: 'SAFE',
          status: 'PENDING',
          required_confidence: 0.70
        }
      ],
      created_at: Date.now()
    };

    const res3 = await SafeFormExecutionEngine.executePlan(testBaseUrl, selectPlan);
    assert(res3.status === 'SUCCESS', `Test 3 select status should be SUCCESS, got ${res3.status}`);
    assert(res3.verified_count === 1, 'Select action should be verified in live DOM');

    // -------------------------------------------------------------------------
    // TEST 4: Check Checkbox -> SUCCESS & VERIFIED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Check Checkbox ---');
    const checkPlan: TaskPlan = {
      status: 'READY',
      task_id: 'test_4_check',
      target_url: testBaseUrl,
      intent_action: 'FILL_FORM',
      confidence: 0.95,
      steps: [
        {
          step_id: 'step_4',
          field_name: 'terms',
          action: 'CHECK',
          target_element: {
            tag: 'input',
            id: 'terms',
            name: 'terms'
          },
          target_description: 'Terms Checkbox',
          value: 'true',
          sensitivity: 'SAFE',
          status: 'PENDING',
          required_confidence: 0.70
        }
      ],
      created_at: Date.now()
    };

    const res4 = await SafeFormExecutionEngine.executePlan(testBaseUrl, checkPlan);
    assert(res4.status === 'SUCCESS', `Test 4 check status should be SUCCESS, got ${res4.status}`);
    assert(res4.verified_count === 1, 'Checkbox check should be verified in live DOM');

    // -------------------------------------------------------------------------
    // TEST 5: Ambiguous Fields -> NEEDS_USER / ASK_USER
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Ambiguous Fields Trigger ASK_USER ---');
    const ambiguousUrl = `${testBaseUrl}?ambiguous=true`;
    const ambiguousPlan: TaskPlan = {
      status: 'READY',
      task_id: 'test_5_ambig',
      target_url: ambiguousUrl,
      intent_action: 'FILL_FORM',
      confidence: 0.85,
      steps: [
        {
          step_id: 'step_5',
          field_name: 'email',
          action: 'FILL',
          target_element: {
            tag: 'input',
            text: 'Email',
            placeholder: 'email'
          },
          target_description: 'Ambiguous Email Input (billing-email vs contact-email)',
          value: 'test@example.com',
          sensitivity: 'SAFE',
          status: 'PENDING',
          required_confidence: 0.70
        }
      ],
      created_at: Date.now()
    };

    const res5 = await SafeFormExecutionEngine.executePlan(ambiguousUrl, ambiguousPlan);
    assert(
      res5.status === 'NEEDS_USER' || res5.status === 'PARTIAL_SUCCESS' || res5.actions.some(a => a.status === 'NEEDS_USER'),
      `Ambiguous field should halt or request user selection, got ${res5.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Element Disappears / Stale Element -> Re-Perception & Retry
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Stale Element Re-perception Handling ---');
    const stalePlan: TaskPlan = {
      status: 'READY',
      task_id: 'test_6_stale',
      target_url: testBaseUrl,
      intent_action: 'FILL_FORM',
      confidence: 0.95,
      steps: [
        {
          step_id: 'step_6',
          field_name: 'phone',
          action: 'FILL',
          // Deliberately provide a non-existent ID, but correct description and placeholder
          target_element: {
            tag: 'input',
            id: 'stale_random_id_99999',
            placeholder: '+1-555-0199',
            name: 'phone'
          },
          target_description: 'Phone Input',
          value: '+1-555-0199',
          sensitivity: 'SAFE',
          status: 'PENDING',
          required_confidence: 0.70
        }
      ],
      created_at: Date.now()
    };

    const res6 = await SafeFormExecutionEngine.executePlan(testBaseUrl, stalePlan);
    // Should recover via re-perception of placeholder/name or fail gracefully within bounds
    assert(res6.actions[0].retries <= 2, 'Retries should never exceed MAX_RETRIES = 2');
    console.log(`Test 6 outcome: ${res6.status} with ${res6.actions[0].retries} retries.`);

    // -------------------------------------------------------------------------
    // TEST 7: Incompatible Element Type -> Caught and Handled Gracefully
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Incompatible Input Type Verification ---');
    const incompatPlan: TaskPlan = {
      status: 'READY',
      task_id: 'test_7_incompat',
      target_url: testBaseUrl,
      intent_action: 'FILL_FORM',
      confidence: 0.90,
      steps: [
        {
          step_id: 'step_7',
          field_name: 'country_incompat',
          action: 'FILL', // Trying to 'FILL' text into a <select>
          target_element: {
            tag: 'select',
            id: 'country'
          },
          target_description: 'Country Dropdown',
          value: 'Some Random Text',
          sensitivity: 'SAFE',
          status: 'PENDING',
          required_confidence: 0.70
        }
      ],
      created_at: Date.now()
    };

    const res7 = await SafeFormExecutionEngine.executePlan(testBaseUrl, incompatPlan);
    assert(
      res7.status === 'FAILED' || res7.actions[0].status === 'FAILED',
      'Incompatible action should fail validation'
    );
    assert(
      res7.actions[0].reason.includes('Incompatible') || res7.actions[0].reason.includes('select'),
      'Failure reason should mention incompatibility'
    );

    // -------------------------------------------------------------------------
    // TEST 8: Sensitive Password Field -> LOCAL ONLY, No Cleartext Leak
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Password Field Protected Locally ---');
    const passSecret = 'SuperSecretVault123!';
    const passwordPlan: TaskPlan = {
      status: 'READY',
      task_id: 'test_8_pass',
      target_url: testBaseUrl,
      intent_action: 'FILL_FORM',
      confidence: 0.95,
      steps: [
        {
          step_id: 'step_8',
          field_name: 'password',
          action: 'FILL',
          target_element: {
            tag: 'input',
            id: 'password',
            name: 'password',
            type: 'password'
          },
          target_description: 'Password Field',
          value: passSecret,
          sensitivity: 'HIGHLY_SENSITIVE',
          status: 'PENDING',
          required_confidence: 0.70
        }
      ],
      created_at: Date.now()
    };

    const res8 = await SafeFormExecutionEngine.executePlan(testBaseUrl, passwordPlan);
    assert(res8.status === 'SUCCESS', `Password execution status should be SUCCESS, got ${res8.status}`);
    assert(res8.actions[0].verified === true, 'Password fill verified in DOM');

    // SECURITY CHECK: Ensure the secret does NOT appear in res8 string representation
    const res8Json = JSON.stringify(res8);
    assert(!res8Json.includes(passSecret), 'SECURITY INVARIANT: Cleartext password MUST NOT appear in execution result JSON!');
    console.log('✅ Secret leakage check passed: Password successfully masked in output payload.');

    // -------------------------------------------------------------------------
    // TEST 9: CAPTCHA Detected -> BLOCKED, No Bypass
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: CAPTCHA Gate Stops Safely ---');
    const captchaUrl = `${testBaseUrl}?captcha=true`;
    const captchaPlan: TaskPlan = {
      status: 'READY',
      task_id: 'test_9_captcha',
      target_url: captchaUrl,
      intent_action: 'FILL_FORM',
      confidence: 0.95,
      steps: [
        {
          step_id: 'step_9',
          field_name: 'full_name',
          action: 'FILL',
          target_element: {
            tag: 'input',
            id: 'name'
          },
          target_description: 'Name',
          value: 'Alex',
          sensitivity: 'SAFE',
          status: 'PENDING',
          required_confidence: 0.70
        }
      ],
      created_at: Date.now()
    };

    const res9 = await SafeFormExecutionEngine.executePlan(captchaUrl, captchaPlan);
    assert(res9.status === 'BLOCKED', `CAPTCHA page should result in BLOCKED status, got ${res9.status}`);
    assert(res9.summary.includes('CAPTCHA') || res9.summary.includes('challenge'), 'Summary should mention CAPTCHA challenge');
    assert(res9.completed_actions === 0, 'No actions should be executed when CAPTCHA is active');

    // -------------------------------------------------------------------------
    // TEST 10: High-Risk Action / Submit Button -> Blocked Without User Confirmation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Submit / High-Risk Gate ---');
    const submitPlan: TaskPlan = {
      status: 'READY',
      task_id: 'test_10_submit',
      target_url: testBaseUrl,
      intent_action: 'FILL_FORM',
      confidence: 0.95,
      steps: [
        {
          step_id: 'step_10',
          field_name: 'submit_btn',
          action: 'CLICK',
          target_element: {
            tag: 'button',
            id: 'submit-btn',
            text: 'Submit Registration'
          },
          target_description: 'Submit Registration Button',
          value: '',
          sensitivity: 'SAFE',
          status: 'PENDING',
          required_confidence: 0.70
        }
      ],
      created_at: Date.now()
    };

    const res10 = await SafeFormExecutionEngine.executePlan(testBaseUrl, submitPlan, { confirmed_high_risk: false });
    assert(
      res10.status === 'BLOCKED' || res10.actions[0].status === 'BLOCKED',
      'Submit action must be BLOCKED without explicit user confirmation'
    );
    assert(
      res10.actions[0].error_category === 'HIGH_RISK_BLOCKED',
      'Error category should be HIGH_RISK_BLOCKED'
    );

    // -------------------------------------------------------------------------
    // SECURITY TESTS: Invariants Verification
    // -------------------------------------------------------------------------
    console.log('\n--- SECURITY INVARIANT CHECKS ---');
    // Check 1: Max retries guarantee
    assert(SafeFormExecutionEngine['MAX_RETRIES'] <= 2, 'Max retries must be <= 2 to prevent infinite loops');
    // Check 2: High risk keywords
    assert(SafeFormExecutionEngine.isHighRisk('Pay Now', 'CLICK'), 'Pay Now must be detected as high risk');
    assert(SafeFormExecutionEngine.isHighRisk('Delete Account', 'CLICK'), 'Delete Account must be detected as high risk');
    assert(SafeFormExecutionEngine.isHighRisk('Submit Application', 'CLICK'), 'Submit Application must be detected as high risk');
    assert(SafeFormExecutionEngine.isHighRisk('Purchase Order', 'CLICK'), 'Purchase Order must be detected as high risk');
    console.log('✅ All high risk keywords accurately blocked.');

    console.log('\n======================================================');
    console.log('   🎉 ALL 10 EXECUTION ENGINE TESTS PASSED GREEN!    ');
    console.log('======================================================\n');
  } finally {
    await stopFixtureServer();
  }
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
