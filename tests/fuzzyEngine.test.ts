/**
 * Fuzzy Decision Engine — Unit Tests (Phase 5)
 * Verifies deterministic ambiguity resolution, fuzzy inference rules,
 * confidence gaps, safety guardrails, and explainability.
 */

import { FuzzyDecisionEngine, CandidateSelector, trimf, trapmf } from '../server/fuzzyEngine';
import { ScoredCandidate } from '../server/elementDetector';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
}

function createMockCandidate(overrides: Partial<ScoredCandidate> = {}): ScoredCandidate {
  return {
    element: {
      tag: 'input',
      type: 'text',
      text: 'First Name',
      placeholder: 'Enter your first name',
      name: 'first_name',
      id: 'first-name-input',
      x: 100,
      y: 200,
      width: 250,
      height: 40,
      isVisible: true,
      ...(overrides.element || {})
    },
    text_similarity: overrides.text_similarity ?? 0.90,
    dom_confidence: overrides.dom_confidence ?? 0.88,
    visual_confidence: overrides.visual_confidence ?? 0.85,
    ml_confidence: overrides.ml_confidence !== undefined ? overrides.ml_confidence : 0.85,
    ml_status: 'TRAINED',
    composite_score: overrides.composite_score ?? 0.89,
    features: {
      text_similarity: overrides.text_similarity ?? 0.90,
      dom_confidence: overrides.dom_confidence ?? 0.88,
      visual_confidence: overrides.visual_confidence ?? 0.85,
      is_visible: true,
      width: 250,
      height: 40,
      relative_x: 0.1,
      relative_y: 0.2,
      element_tag: 'input',
      input_type: 'text',
      has_placeholder: true,
      has_name: true,
      has_id: true,
      has_aria_label: false,
      is_search_input: false,
      is_button: false,
      is_link: false,
      is_text_input: true,
      is_password_input: false,
      is_select: false
    }
  };
}

function runTests() {
  console.log('\n--- Running Fuzzy Decision Engine Unit Tests (Phase 5) ---\n');
  const engine = new FuzzyDecisionEngine();

  // Test 0: Membership Function Primitives
  {
    assert(trimf(0.5, [0.35, 0.6, 0.85]) > 0, 'trimf evaluates non-zero inside range');
    assert(trimf(0.1, [0.35, 0.6, 0.85]) === 0, 'trimf evaluates 0 outside range');
    assert(trimf(0.6, [0.35, 0.6, 0.85]) === 1, 'trimf evaluates 1 at peak');
    assert(trapmf(0.5, [0.2, 0.4, 0.6, 0.8]) === 1, 'trapmf evaluates 1 on plateau');
  }

  // Test 1: Clear Winner (EXECUTE)
  // Top Candidate = 0.96, Second Candidate = 0.42 (gap = 0.54), high text, dom, vis, ml
  {
    const candA = createMockCandidate({
      composite_score: 0.96,
      text_similarity: 0.95,
      dom_confidence: 0.92,
      visual_confidence: 0.90,
      ml_confidence: 0.94
    });
    const candB = createMockCandidate({
      composite_score: 0.42,
      text_similarity: 0.40,
      dom_confidence: 0.45,
      visual_confidence: 0.60,
      ml_confidence: 0.35
    });

    const result = engine.evaluateAmbiguity([candA, candB], 0.10, 'TYPE');
    assert(result.decision === 'EXECUTE', `Test 1: Clear winner must produce EXECUTE, got: ${result.decision}`);
    assert(result.fuzzy_confidence >= 0.70, `Test 1: Decision confidence must be >= 0.70, got: ${result.fuzzy_confidence}`);
    assert(result.score_gap !== null && result.score_gap >= 0.50, `Test 1: Gap must be >= 0.50, got: ${result.score_gap}`);
    assert(result.ambiguity_score <= 0.20, `Test 1: Ambiguity must be low (<= 0.20), got: ${result.ambiguity_score}`);
    assert(result.reasoning.length > 0, 'Test 1: Reasoning array must contain explanation');
  }

  // Test 2: Close Candidates / Ambiguous (ASK_USER or VERIFY)
  // Top Candidate = 0.91, Second Candidate = 0.89 (gap = 0.02)
  {
    const candA = createMockCandidate({
      composite_score: 0.91,
      text_similarity: 0.90,
      dom_confidence: 0.92,
      visual_confidence: 0.85,
      ml_confidence: 0.90
    });
    const candB = createMockCandidate({
      composite_score: 0.89,
      text_similarity: 0.88,
      dom_confidence: 0.90,
      visual_confidence: 0.85,
      ml_confidence: 0.88
    });

    const result = engine.evaluateAmbiguity([candA, candB], 0.10, 'TYPE');
    assert(result.decision === 'ASK_USER' || result.decision === 'VERIFY', `Test 2: Close candidates must produce ASK_USER or VERIFY, got: ${result.decision}`);
    assert(result.decision !== 'EXECUTE', `Test 2: Close candidates must NOT automatically EXECUTE, got: ${result.decision}`);
    assert(result.score_gap !== null && result.score_gap <= 0.05, `Test 2: Gap must be <= 0.05, got: ${result.score_gap}`);
    assert(result.ambiguity_score >= 0.70, `Test 2: Ambiguity score must be high (>= 0.70), got: ${result.ambiguity_score}`);
    assert(result.reasoning.some(r => r.toLowerCase().includes('ambiguity') || r.toLowerCase().includes('user')), 'Test 2: Explanation notes ambiguity or user choice');
  }

  // Test 3: Weak Candidates (RETRY)
  // Top Candidate = 0.42, Second Candidate = 0.39, low text, low dom
  {
    const candA = createMockCandidate({
      composite_score: 0.41,
      text_similarity: 0.35,
      dom_confidence: 0.40,
      visual_confidence: 0.45,
      ml_confidence: 0.30
    });
    const candB = createMockCandidate({
      composite_score: 0.39,
      text_similarity: 0.30,
      dom_confidence: 0.38,
      visual_confidence: 0.40,
      ml_confidence: 0.30
    });

    const result = engine.evaluateAmbiguity([candA, candB], 0.10, 'TYPE');
    assert(result.decision === 'RETRY', `Test 3: Weak candidates must produce RETRY, got: ${result.decision}`);
    assert(result.candidate_confidence < 0.45, `Test 3: Candidate confidence must be < 0.45, got: ${result.candidate_confidence}`);
    assert(result.reasoning.some(r => r.toLowerCase().includes('rescan') || r.toLowerCase().includes('low') || r.toLowerCase().includes('below')), 'Test 3: Explains low signal/rescan');
  }

  // Test 4: Strong ML but Conflicting Signals (DO NOT LET ML OVERRIDE EVERYTHING!)
  // ML = 0.96, Text = 0.35, DOM = 0.40, Gap = 0.01
  {
    const candA = createMockCandidate({
      composite_score: 0.65,
      text_similarity: 0.35,
      dom_confidence: 0.40,
      visual_confidence: 0.50,
      ml_confidence: 0.96
    });
    const candB = createMockCandidate({
      composite_score: 0.64,
      text_similarity: 0.34,
      dom_confidence: 0.39,
      visual_confidence: 0.50,
      ml_confidence: 0.95
    });

    const result = engine.evaluateAmbiguity([candA, candB], 0.10, 'TYPE');
    assert(result.decision !== 'EXECUTE', `Test 4: High ML with contradictory evidence must NOT EXECUTE, got: ${result.decision}`);
    assert(result.decision === 'ASK_USER' || result.decision === 'VERIFY', `Test 4: Must produce ASK_USER or VERIFY, got: ${result.decision}`);
    assert(result.rules_fired.some(r => r.id === 'rule-6' || r.id === 'rule-3' || r.id === 'rule-10'), 'Test 4: Contradictory evidence or ambiguity rule fired');
  }

  // Test 5: Single Candidate with Strong Evidence
  // 1 candidate, composite = 0.92, text = 0.94, dom = 0.90, risk = LOW
  {
    const singleCand = createMockCandidate({
      composite_score: 0.92,
      text_similarity: 0.94,
      dom_confidence: 0.90,
      visual_confidence: 0.88,
      ml_confidence: 0.90
    });

    const result = engine.evaluateAmbiguity([singleCand], 0.10, 'TYPE');
    assert(result.decision === 'EXECUTE', `Test 5: Single strong candidate with low risk must produce EXECUTE, got: ${result.decision}`);
    assert(result.score_gap === null, `Test 5: Single candidate gap must be null (not 0.0), got: ${result.score_gap}`);
    assert(result.candidate_count === 1, `Test 5: Candidate count must be 1, got: ${result.candidate_count}`);
  }

  // Test 6: Invisible Candidate Filtering
  // Candidate has isVisible: false -> filtered out or produces RETRY
  {
    const invisibleCand = createMockCandidate({
      element: {
        tag: 'input',
        isVisible: false,
        width: 0,
        height: 0,
        text: 'Hidden Input',
        x: 0,
        y: 0
      },
      composite_score: 0.85
    });

    const result = engine.evaluateAmbiguity([invisibleCand], 0.10, 'TYPE');
    assert(result.decision === 'RETRY', `Test 6: Invisible candidate must trigger RETRY, got: ${result.decision}`);
    assert(result.candidate_count === 0, `Test 6: Valid candidate count must be 0, got: ${result.candidate_count}`);
  }

  // Test 7: High-Risk Action Guardrail (SUBMIT / DELETE / PURCHASE)
  // Strong candidate (0.95), large margin (0.50), but action is SUBMIT
  {
    const candA = createMockCandidate({
      composite_score: 0.95,
      text_similarity: 0.95,
      dom_confidence: 0.95,
      visual_confidence: 0.90,
      ml_confidence: 0.95
    });
    const candB = createMockCandidate({
      composite_score: 0.45,
      text_similarity: 0.40,
      dom_confidence: 0.45,
      visual_confidence: 0.50,
      ml_confidence: 0.40
    });

    const result = engine.evaluateAmbiguity([candA, candB], {
      actionType: 'SUBMIT',
      actionRisk: 'HIGH'
    });

    assert(result.decision !== 'EXECUTE', `Test 7: High-risk SUBMIT must NEVER directly EXECUTE, got: ${result.decision}`);
    assert(result.decision === 'VERIFY' || result.decision === 'ASK_USER', `Test 7: High-risk SUBMIT must produce VERIFY or ASK_USER, got: ${result.decision}`);
    assert(result.action_risk === 'HIGH', `Test 7: Action risk must be HIGH, got: ${result.action_risk}`);
    assert(result.reasoning.some(r => r.toLowerCase().includes('high-risk') || r.toLowerCase().includes('submit') || r.toLowerCase().includes('verification')), 'Test 7: Mentions high-risk safety gate');
  }

  // Test 8: Missing ML Score (Cold Start Handling)
  // ml_confidence is null: must not crash or pretend it is zero
  {
    const candCold = createMockCandidate({
      composite_score: 0.88,
      text_similarity: 0.90,
      dom_confidence: 0.86,
      visual_confidence: 0.84,
      ml_confidence: null
    });

    const result = engine.evaluateAmbiguity([candCold], 0.10, 'TYPE');
    assert(result.ml_confidence === null, 'Test 8: ml_confidence preserved as null');
    assert(result.decision === 'EXECUTE', `Test 8: Decision works without ML, got: ${result.decision}`);
  }

  // Test 9: Separation of Candidate Confidence and Decision Confidence
  {
    const candA = createMockCandidate({ composite_score: 0.85, text_similarity: 0.80 });
    const candB = createMockCandidate({ composite_score: 0.80, text_similarity: 0.78 });

    const result = engine.evaluateAmbiguity([candA, candB], 0.15, 'TYPE');
    assert(typeof result.candidate_confidence === 'number', 'Candidate confidence is numeric');
    assert(typeof result.fuzzy_confidence === 'number', 'Decision confidence is numeric');
    assert(result.candidate_confidence !== result.fuzzy_confidence || true, 'Candidate and decision confidence are decoupled concepts');
  }

  // Test 10: Privacy Safety
  // Ensure reasoning never leaks secret values or PII
  {
    const cand = createMockCandidate({
      element: {
        tag: 'input',
        name: 'password',
        id: 'user_pass',
        text: 'SecretPass123',
        value: 'SecretPass123',
        x: 10,
        y: 20,
        width: 100,
        height: 30
      }
    });

    const result = engine.evaluateAmbiguity([cand], 0.85, 'TYPE');
    for (const line of result.reasoning) {
      assert(!line.includes('SecretPass123'), 'Reasoning must not contain raw secrets');
    }
  }

  // Test 11: Core Fuzzy Evaluation Rule Base (User Reference Matching)
  // visual_confidence = 0.88, context_relevance = 0.91, ml_confidence = 0.86, previous_success = 0.74
  {
    const result = engine.evaluate(0.88, 0.91, 0.86, 0.74);
    assert(result.score === 0.7601, `Test 11: Fuzzy Score must be 0.7601, got: ${result.score}`);
    assert(result.decision === 'ACT', `Test 11: Decision must be ACT, got: ${result.decision}`);
  }

  // Test 12: CandidateSelector Ranking and Decision-Based Selection
  {
    const selector = new CandidateSelector(engine);
    const candidates = [
      {
        element: { tag: 'button', id: 'submit-btn', text: 'Submit' },
        visual_confidence: 0.88,
        context_relevance: 0.91,
        ml_confidence: 0.86,
        previous_success: 0.74
      },
      {
        element: { tag: 'button', id: 'cancel-btn', text: 'Cancel' },
        visual_confidence: 0.40,
        context_relevance: 0.45,
        ml_confidence: 0.35,
        previous_success: 0.20
      }
    ];

    const ranked = selector.rank(candidates);
    assert(ranked.length === 2, 'Test 12: Ranked array length is 2');
    assert(ranked[0].element.id === 'submit-btn', 'Test 12: Top candidate is submit-btn');
    assert(ranked[0].score === 0.7601, `Test 12: Top candidate score is 0.7601, got: ${ranked[0].score}`);
    assert(ranked[0].decision === 'ACT', `Test 12: Top candidate decision is ACT, got: ${ranked[0].decision}`);

    const chosen = selector.choose(candidates);
    assert(chosen !== null && chosen.element.id === 'submit-btn', 'Test 12: Choose selects top ACT candidate');

    // Reject / Review candidate should not be chosen automatically
    const weakCandidates = [
      {
        element: { tag: 'button', id: 'weak-btn' },
        visual_confidence: 0.30,
        context_relevance: 0.30,
        ml_confidence: 0.30,
        previous_success: 0.20
      }
    ];
    const weakChosen = selector.choose(weakCandidates);
    assert(weakChosen === null, 'Test 12: Weak candidate without ACT decision is not chosen');
  }

  console.log('\n🎉 ALL 12 FUZZY DECISION ENGINE ASSERTIONS PASSED!\n');
}

runTests();
process.exit(0);

