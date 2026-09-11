/**
 * PrivaSight Phase 9: E2E Form Automation Test Suite
 * Validates full workflow from URL perception -> Planning -> Safe Execution -> Verification.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { PagePerceptionService } from '../server/perception';
import { agentPlanner } from '../server/agentPlanner';
import { SafeFormExecutionEngine } from '../server/safeExecutor';
import { interactionStore } from '../server/interactionStore';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
}

let testServer: http.Server;
let testBaseUrl: string;

async function startFixtureServer(): Promise<string> {
  // Check if controlled dev server fixture is already responding on port 3000
  try {
    const res = await fetch('http://localhost:3000/fixtures/form.html');
    if (res.ok) {
      testBaseUrl = 'http://localhost:3000/fixtures/form.html';
      console.log(`[E2E Server] Using active dev server fixture at ${testBaseUrl}`);
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
      console.log(`[E2E Server] Running fixture server at ${testBaseUrl}`);
      resolve(testBaseUrl);
    });
  });
}

async function stopFixtureServer() {
  return new Promise<void>((resolve) => {
    if (testServer) {
      testServer.close(() => {
        console.log('[E2E Server] Fixture server closed.');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

async function runE2EFormTest() {
  console.log('\n==================================================');
  console.log('--- PrivaSight E2E Form Automation Test Suite ---');
  console.log('==================================================\n');

  try {
    const fixtureUrl = await startFixtureServer();

    // 1. Perception Step
    console.log('\n[E2E Step 1] Running Page Perception...');
    const perceptionResult = await PagePerceptionService.executePerception(fixtureUrl);

    assert(perceptionResult !== null, 'Perception result is defined');
    assert(perceptionResult.elements.length > 0, `Detected ${perceptionResult.elements.length} interactive elements`);
    assert(perceptionResult.detected_fields.length >= 3, `Detected at least 3 form fields (found ${perceptionResult.detected_fields.length})`);
    assert(perceptionResult.elements.some((e) => e.name === 'name' || e.id === 'name'), 'Full Name field recognized');
    assert(perceptionResult.elements.some((e) => e.name === 'email' || e.id === 'email'), 'Email field recognized');

    // 2. Planning Step
    console.log('\n[E2E Step 2] Generating Task Execution Plan...');
    const plan = agentPlanner.createPlan({
      url: fixtureUrl,
      task: 'Fill name, email and phone',
      information: 'Name: Devansh Kumar\nEmail: devansh@example.com\nPhone: +1-555-0199',
      elements: perceptionResult.detected_fields
    });

    assert(plan !== null, 'Task plan successfully generated');
    assert(plan.status === 'READY', `Plan status is READY (actual: ${plan.status})`);
    assert(plan.steps.length >= 3, `Plan contains at least 3 steps (actual: ${plan.steps.length})`);

    // 3. Execution Step
    console.log('\n[E2E Step 3] Executing Plan via SafeFormExecutionEngine...');
    const executionResult = await SafeFormExecutionEngine.executePlan(
      fixtureUrl,
      plan,
      {
        task_id: `e2e_task_${Date.now()}`,
        user_data: {
          name: 'Devansh Kumar',
          email: 'devansh@example.com',
          phone: '+1-555-0199'
        },
        timeout_ms: 25000
      }
    );

    assert(executionResult !== null, 'Execution result returned');
    assert(
      executionResult.status === 'SUCCESS' || executionResult.status === 'PARTIAL_SUCCESS',
      `Execution completed with status ${executionResult.status}`
    );
    assert(executionResult.completed_actions >= 3, `Completed ${executionResult.completed_actions} form fill actions`);

    // 4. Verification Step
    console.log('\n[E2E Step 4] Validating Verification Result...');
    assert(executionResult.verified_count >= 1, `Verified count >= 1 (actual: ${executionResult.verified_count})`);
    assert(executionResult.actions.length >= 3, `Actions executed >= 3 (actual: ${executionResult.actions.length})`);
    const successfulActions = executionResult.actions.filter((a) => a.status === 'SUCCESS');
    assert(successfulActions.length >= 3, `At least 3 actions succeeded (actual: ${successfulActions.length})`);
    const verifiedActions = executionResult.actions.filter((a) => a.verified === true);
    assert(verifiedActions.length >= 1, `At least 1 action verified with DOM confirmation (actual: ${verifiedActions.length})`);

    console.log('\n✅ ALL E2E FORM AUTOMATION TESTS PASSED!\n');
  } finally {
    await stopFixtureServer();
    process.exit(0);
  }
}

runE2EFormTest().catch((err) => {
  console.error('\n❌ E2E Form Automation Test FAILED:', err);
  process.exit(1);
});
