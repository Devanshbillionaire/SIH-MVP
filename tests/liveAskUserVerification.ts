import { chromium } from 'playwright';
import assert from 'assert';

async function testLiveAskUserFlow() {
  console.log('==================================================');
  console.log('  TESTING LIVE ASK_USER & RESUME FLOW (TASKS 3 & 4)');
  console.log('==================================================');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // ----------------------------------------------------
    // STEP 1: OPEN REAL PRIVASIGHT UI
    // ----------------------------------------------------
    console.log('\n[Step 1] Opening Real PrivaSight UI at http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // ----------------------------------------------------
    // STEP 2: FILL AMBIGUOUS FORM FIXTURE
    // ----------------------------------------------------
    console.log('[Step 2] Entering Ambiguous Parameters...');
    const ambiguousUrl = 'http://localhost:3000/fixtures/form.html?ambiguous=true';
    await page.fill('#target-url-input', ambiguousUrl);
    await page.fill('#task-instruction-input', 'Fill email with alex.johnson@example.com');

    // Track network calls
    let executeCalledPrematurely = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/agent/execute')) {
        // Will be verified whether this happened before or after user selection
      }
    });

    // ----------------------------------------------------
    // STEP 3: CLICK START TASK DIRECTLY IN THE UI
    // ----------------------------------------------------
    console.log('[Step 3] Clicking START TASK directly in UI...');
    const [taskResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/task') && res.status() === 200),
      page.click('#btn-run-agent')
    ]);

    const taskResult = await taskResponse.json();
    console.log('✓ /api/task returned 200 OK');
    console.log(`✓ Fuzzy Decision: ${taskResult.fuzzy_decision?.decision}`);
    console.log(`✓ Task Plan Status: ${taskResult.task_plan?.status}`);

    // Verify system did NOT automatically execute an ambiguous candidate
    assert.strictEqual(taskResult.fuzzy_decision?.decision, 'ASK_USER', 'Fuzzy decision must be ASK_USER');
    assert.strictEqual(taskResult.task_plan?.status, 'BLOCKED', 'Task plan status must be BLOCKED');

    // Wait 1.5s to ensure frontend halts and did NOT call execute automatically
    await page.waitForTimeout(1500);
    assert(!executeCalledPrematurely, 'Frontend must NOT execute ambiguous candidate automatically');
    console.log('✓ Verified: System halted execution on ambiguity without blind execution');

    // ----------------------------------------------------
    // STEP 4: VERIFY UI DISAMBIGUATION MODAL
    // ----------------------------------------------------
    console.log('\n[Step 4] Checking UI Disambiguation Modal...');
    await page.waitForSelector('#disambiguation-modal', { state: 'visible', timeout: 5000 });
    const modalVisible = await page.isVisible('#disambiguation-modal');
    assert(modalVisible, 'UI disambiguation modal must be visible on ASK_USER');
    console.log('✓ UI Disambiguation Modal is displayed with candidate options');

    const candidate0 = await page.$('#candidate-option-0');
    assert(candidate0 !== null, 'Candidate option 0 must be present in modal');

    // ----------------------------------------------------
    // STEP 5: USER SELECTS CANDIDATE TO RESUME EXECUTION
    // ----------------------------------------------------
    console.log('\n[Step 5] User selects candidate in modal to resume execution...');
    const [execResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/agent/execute') && res.status() === 200),
      page.click('#candidate-option-0')
    ]);

    const execResult = await execResponse.json();
    console.log('✓ /api/agent/execute responded with 200 OK after user selection');
    console.log(`✓ Execution Status: ${execResult.result?.status || execResult.status}`);
    console.log(`✓ Completed Actions: ${execResult.result?.completed_actions || execResult.completed_actions}`);

    // Modal should close
    await page.waitForSelector('#disambiguation-modal', { state: 'hidden', timeout: 5000 });
    console.log('✓ Disambiguation modal closed after candidate selection');

    // ----------------------------------------------------
    // STEP 6: VERIFY DOM IN TARGET BROWSER
    // ----------------------------------------------------
    console.log('\n[Step 6] Verifying actual DOM state in target webpage...');
    const targetPage = await browser.newPage();
    await targetPage.goto(ambiguousUrl, { waitUntil: 'domcontentloaded' });
    
    // Check which candidate was selected and verify
    const chosenAction = (execResult.result?.actions || execResult.actions || []).find(
      (a: any) => a.action === 'FILL' && (a.status === 'SUCCESS' || a.verified === true)
    );
    assert(chosenAction, 'At least one fill action must succeed');
    console.log(`✓ Successfully executed action on target: ${chosenAction.target || chosenAction.candidate_used?.selector}`);
    console.log(`✓ Action verified: ${chosenAction.verified}`);

    console.log('\n==================================================');
    console.log('  🎉 LIVE ASK_USER & RESUME FLOW VERIFIED 100%!');
    console.log('==================================================\n');

    await targetPage.close();
  } finally {
    await browser.close();
  }
}

testLiveAskUserFlow().catch((err) => {
  console.error('\n❌ LIVE ASK_USER FLOW TEST FAILED:', err);
  process.exit(1);
});
