import { ScoredCandidate } from './elementDetector';

export type FuzzyDecisionOutput = 'EXECUTE' | 'VERIFY' | 'RETRY' | 'ASK_USER' | 'REJECT';
export type ActionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface FuzzyMemberships {
  candidate_confidence: { low: number; medium: number; high: number };
  confidence_gap: { small: number; medium: number; large: number } | null;
  text_similarity: { low: number; medium: number; high: number };
  dom_confidence: { low: number; medium: number; high: number };
  visual_confidence: { low: number; medium: number; high: number };
  ml_confidence: { low: number; medium: number; high: number } | null;
  ambiguity: { low: number; medium: number; high: number };
  risk: { low: number; medium: number; high: number };
}

export interface FuzzyRuleActivation {
  id: string;
  name: string;
  antecedent_strength: number;
  consequent_decision: FuzzyDecisionOutput;
  description: string;
}

export interface FuzzyEvaluationResult {
  decision: FuzzyDecisionOutput;
  fuzzy_confidence: number;       // Decision confidence (0.0 - 1.0)
  candidate_confidence: number;   // Top candidate match score (0.0 - 1.0)
  ambiguity_score: number;        // Calculated ambiguity (0.0 = clear, 1.0 = highly ambiguous)
  score_gap: number | null;       // Gap between top & second candidate (null if only 1 candidate)
  top_candidate?: ScoredCandidate | null;
  second_candidate?: ScoredCandidate | null;
  candidate_count: number;
  action_type: string;
  action_risk: ActionRiskLevel;
  reasoning: string[];            // Deterministic, privacy-safe explanations
  rule_activated: string;         // Summary string of primary rule
  rules_fired: FuzzyRuleActivation[];
  memberships: FuzzyMemberships;
  visual_confidence: number;
  dom_confidence: number;
  text_similarity: number;
  ml_confidence: number | null;
  risk_level: number;
  raw_score: number;              // 0 - 100 defuzzified score
  reason: string;                 // Primary explanation sentence
}

export interface FuzzyEvaluationOptions {
  actionType?: string;
  actionRisk?: ActionRiskLevel;
  riskLevel?: number;
  maxRetries?: number;
  currentAttempt?: number;
}

// Triangular membership function: trimf(x, [a, b, c])
export function trimf(x: number, [a, b, c]: [number, number, number]): number {
  if (x <= a || x >= c) return 0;
  if (x === b) return 1;
  if (x > a && x < b) {
    return b === a ? 1 : (x - a) / (b - a);
  }
  return c === b ? 1 : (c - x) / (c - b);
}

// Trapezoidal membership function: trapmf(x, [a, b, c, d])
export function trapmf(x: number, [a, b, c, d]: [number, number, number, number]): number {
  if (x <= a || x >= d) return 0;
  if (x >= b && x <= c) return 1;
  if (x > a && x < b) {
    return b === a ? 1 : (x - a) / (b - a);
  }
  return d === c ? 1 : (d - x) / (d - c);
}

// Left-shouldered fuzzy membership (for 'LOW' / 'SMALL')
export function fuzzyShoulderLeft(x: number, a: number, b: number): number {
  if (x <= a) return 1.0;
  if (x >= b) return 0.0;
  return (b - x) / (b - a);
}

// Right-shouldered fuzzy membership (for 'HIGH' / 'LARGE')
export function fuzzyShoulderRight(x: number, a: number, b: number): number {
  if (x >= b) return 1.0;
  if (x <= a) return 0.0;
  return (x - a) / (b - a);
}

export class FuzzyDecisionEngine {
  /**
   * Determine action risk level from action name or metadata
   */
  public static classifyActionRisk(actionType: string = 'CLICK', customRisk?: ActionRiskLevel): {
    riskLevel: ActionRiskLevel;
    numericRisk: number;
  } {
    if (customRisk) {
      const numeric = customRisk === 'HIGH' ? 0.85 : customRisk === 'MEDIUM' ? 0.50 : 0.15;
      return { riskLevel: customRisk, numericRisk: numeric };
    }

    const upper = (actionType || 'CLICK').toUpperCase().trim();
    const highRiskActions = ['SUBMIT', 'DELETE', 'PURCHASE', 'SEND', 'CONFIRM', 'CHECKOUT', 'REMOVE'];
    const mediumRiskActions = ['RESET', 'CLEAR', 'TRANSFER', 'AUTHORIZE'];

    if (highRiskActions.includes(upper)) {
      return { riskLevel: 'HIGH', numericRisk: 0.85 };
    }
    if (mediumRiskActions.includes(upper)) {
      return { riskLevel: 'MEDIUM', numericRisk: 0.50 };
    }
    return { riskLevel: 'LOW', numericRisk: 0.15 };
  }

  /**
   * Filter and validate candidate elements before fuzzy evaluation.
   * Removes or heavily penalizes invisible, zero-sized, or non-object candidates.
   */
  public static filterValidCandidates(candidates: ScoredCandidate[]): {
    validCandidates: ScoredCandidate[];
    rejectedCount: number;
  } {
    if (!Array.isArray(candidates)) {
      return { validCandidates: [], rejectedCount: 0 };
    }

    const validCandidates: ScoredCandidate[] = [];
    let rejectedCount = 0;

    for (const cand of candidates) {
      if (!cand || typeof cand !== 'object' || !cand.element) {
        rejectedCount++;
        continue;
      }

      const el = cand.element;
      let isVisible = true;
      if (typeof el.isVisible === 'string') {
        isVisible = ['true', '1', 'yes'].includes(el.isVisible.toLowerCase());
      } else if (el.isVisible !== undefined) {
        isVisible = Boolean(el.isVisible);
      }

      // Check for zero-dimension or invisible elements
      const hasZeroArea = (el.width !== undefined && el.height !== undefined && el.width <= 0 && el.height <= 0);

      if (!isVisible || hasZeroArea) {
        rejectedCount++;
        continue;
      }

      validCandidates.push(cand);
    }

    return { validCandidates, rejectedCount };
  }

  /**
   * Evaluates ambiguity across multiple ranked candidate elements.
   * Implements the full Phase 5 Decision Pipeline.
   */
  public evaluateAmbiguity(
    rawCandidates: ScoredCandidate[],
    riskLevelOrOptions: number | FuzzyEvaluationOptions = 0.10,
    actionType: string = 'TYPE'
  ): FuzzyEvaluationResult {
    let options: FuzzyEvaluationOptions = {};
    if (typeof riskLevelOrOptions === 'number') {
      options = {
        numericRisk: riskLevelOrOptions,
        riskLevel: riskLevelOrOptions >= 0.70 ? 'HIGH' : riskLevelOrOptions >= 0.40 ? 'MEDIUM' : 'LOW',
        actionType
      } as any;
    } else if (riskLevelOrOptions && typeof riskLevelOrOptions === 'object') {
      options = { ...riskLevelOrOptions };
      if (!options.actionType) options.actionType = actionType;
    }

    const resolvedActionType = options.actionType || actionType || 'TYPE';
    let actionRisk: ActionRiskLevel;
    let numericRisk: number;

    if (typeof riskLevelOrOptions === 'number') {
      numericRisk = riskLevelOrOptions;
      actionRisk = numericRisk >= 0.70 ? 'HIGH' : numericRisk >= 0.40 ? 'MEDIUM' : 'LOW';
      const inherent = FuzzyDecisionEngine.classifyActionRisk(resolvedActionType);
      if (inherent.riskLevel === 'HIGH') {
        actionRisk = 'HIGH';
        numericRisk = Math.max(numericRisk, inherent.numericRisk);
      }
    } else {
      const inherent = FuzzyDecisionEngine.classifyActionRisk(resolvedActionType, options.actionRisk);
      actionRisk = options.actionRisk || (options.riskLevel !== undefined && typeof options.riskLevel === 'number'
        ? (options.riskLevel >= 0.70 ? 'HIGH' : options.riskLevel >= 0.40 ? 'MEDIUM' : 'LOW')
        : inherent.riskLevel);
      numericRisk = options.riskLevel !== undefined ? options.riskLevel : inherent.numericRisk;
    }

    // Step 1: Filter invalid candidates
    const { validCandidates } = FuzzyDecisionEngine.filterValidCandidates(rawCandidates || []);

    // Edge Case: Zero valid candidates
    if (validCandidates.length === 0) {
      return this.generateNoCandidateResult(numericRisk, actionRisk, resolvedActionType);
    }

    const topCandidate = validCandidates[0];
    const secondCandidate = validCandidates.length > 1 ? validCandidates[1] : null;

    // Step 2: Calculate confidence gap
    // If only one viable candidate: second_candidate = unavailable, do NOT assume zero!
    let confidenceGap: number | null = null;
    if (secondCandidate) {
      confidenceGap = Math.max(0, Math.round((topCandidate.composite_score - secondCandidate.composite_score) * 10000) / 10000);
    }

    return this.evaluate({
      topCandidate,
      secondCandidate,
      candidateConfidence: topCandidate.composite_score,
      textSimilarity: topCandidate.text_similarity,
      domConfidence: topCandidate.dom_confidence,
      visualConfidence: topCandidate.visual_confidence,
      mlConfidence: topCandidate.ml_confidence,
      confidenceGap,
      candidateCount: validCandidates.length,
      actionType: resolvedActionType,
      actionRisk,
      numericRisk
    });
  }

  /**
   * Main Fuzzy Inference method.
   * Computes linguistic memberships, fires fuzzy inference rules, defuzzifies output,
   * and produces deterministic human-readable explainability.
   */
  public evaluate(input: {
    visualConfidence?: number;
    domConfidence?: number;
    textSimilarity?: number;
    mlConfidence?: number | null;
    candidateConfidence?: number;
    confidenceGap?: number | null;
    candidateCount?: number;
    actionType?: string;
    actionRisk?: ActionRiskLevel;
    numericRisk?: number;
    risk_level?: number;
    score_gap?: number;
    topCandidate?: ScoredCandidate | null;
    secondCandidate?: ScoredCandidate | null;
  } | number, ...legacyArgs: any[]): FuzzyEvaluationResult {
    // Backward-compatible overload handling
    let params: {
      visualConfidence: number;
      domConfidence: number;
      textSimilarity: number;
      mlConfidence: number | null;
      candidateConfidence: number;
      confidenceGap: number | null;
      candidateCount: number;
      actionType: string;
      actionRisk: ActionRiskLevel;
      numericRisk: number;
      topCandidate: ScoredCandidate | null;
      secondCandidate: ScoredCandidate | null;
    };

    if (typeof input === 'number') {
      const [domConf = 0.5, mlConf = null, riskLvl = 0.1, scoreGap = 0.30, candCount = 1, compScore] = legacyArgs;
      const v_c = Math.max(0, Math.min(1, input));
      const d_c = Math.max(0, Math.min(1, domConf));
      const t_s = d_c; // Default fallback for text similarity in legacy call
      const m_c = mlConf !== null && mlConf !== undefined ? Math.max(0, Math.min(1, mlConf)) : null;
      const r_l = Math.max(0, Math.min(1, riskLvl));
      const gap = scoreGap !== undefined ? Math.max(0, Math.min(1, scoreGap)) : null;
      const c_s = compScore !== undefined ? compScore : (v_c * 0.35 + d_c * 0.35 + (m_c ?? 0.5) * 0.30);

      params = {
        visualConfidence: v_c,
        domConfidence: d_c,
        textSimilarity: t_s,
        mlConfidence: m_c,
        candidateConfidence: c_s,
        confidenceGap: candCount > 1 ? gap : null,
        candidateCount: candCount,
        actionType: 'TYPE',
        actionRisk: r_l >= 0.70 ? 'HIGH' : r_l >= 0.40 ? 'MEDIUM' : 'LOW',
        numericRisk: r_l,
        topCandidate: null,
        secondCandidate: null
      };
    } else {
      const v_c = Math.max(0, Math.min(1, input.visualConfidence ?? 0.5));
      const d_c = Math.max(0, Math.min(1, input.domConfidence ?? 0.5));
      const t_s = Math.max(0, Math.min(1, input.textSimilarity ?? d_c));
      const m_c = input.mlConfidence !== null && input.mlConfidence !== undefined
        ? Math.max(0, Math.min(1, input.mlConfidence))
        : null;
      const r_l = Math.max(0, Math.min(1, input.numericRisk ?? input.risk_level ?? 0.15));
      const c_s = Math.max(0, Math.min(1, input.candidateConfidence ?? (v_c * 0.30 + d_c * 0.35 + t_s * 0.35)));
      const gap = input.confidenceGap !== undefined ? input.confidenceGap : (input.score_gap !== undefined ? input.score_gap : null);
      const candCount = input.candidateCount ?? (gap !== null ? 2 : 1);

      params = {
        visualConfidence: v_c,
        domConfidence: d_c,
        textSimilarity: t_s,
        mlConfidence: m_c,
        candidateConfidence: c_s,
        confidenceGap: candCount > 1 ? gap : null,
        candidateCount: candCount,
        actionType: input.actionType || 'TYPE',
        actionRisk: input.actionRisk || (r_l >= 0.70 ? 'HIGH' : r_l >= 0.40 ? 'MEDIUM' : 'LOW'),
        numericRisk: r_l,
        topCandidate: input.topCandidate || null,
        secondCandidate: input.secondCandidate || null
      };
    }

    const {
      visualConfidence: v_c,
      domConfidence: d_c,
      textSimilarity: t_s,
      mlConfidence: m_c,
      candidateConfidence: c_s,
      confidenceGap,
      candidateCount,
      actionType,
      actionRisk,
      numericRisk: r_l
    } = params;

    // Step 3: Compute Linguistic Memberships (Triangular with Overlapping Ranges & Shoulders)
    // Candidate Confidence (LOW: [0, 0, 0.45], MED: [0.35, 0.60, 0.85], HIGH: [0.70, 1.0, 1.0])
    const c_low = fuzzyShoulderLeft(c_s, 0.25, 0.45);
    const c_med = trimf(c_s, [0.35, 0.60, 0.85]);
    const c_high = fuzzyShoulderRight(c_s, 0.70, 0.88);

    // Text Similarity
    const text_low = fuzzyShoulderLeft(t_s, 0.25, 0.45);
    const text_med = trimf(t_s, [0.35, 0.60, 0.85]);
    const text_high = fuzzyShoulderRight(t_s, 0.70, 0.88);

    // DOM Confidence
    const dom_low = fuzzyShoulderLeft(d_c, 0.25, 0.45);
    const dom_med = trimf(d_c, [0.35, 0.60, 0.85]);
    const dom_high = fuzzyShoulderRight(d_c, 0.70, 0.88);

    // Visual Confidence
    const vis_low = fuzzyShoulderLeft(v_c, 0.25, 0.45);
    const vis_med = trimf(v_c, [0.35, 0.60, 0.85]);
    const vis_high = fuzzyShoulderRight(v_c, 0.70, 0.88);

    // ML Confidence (when available)
    let ml_low = 0;
    let ml_med = 0;
    let ml_high = 0;
    const mlAvailable = m_c !== null && m_c !== undefined;
    if (mlAvailable) {
      ml_low = fuzzyShoulderLeft(m_c, 0.25, 0.45);
      ml_med = trimf(m_c, [0.35, 0.60, 0.85]);
      ml_high = fuzzyShoulderRight(m_c, 0.70, 0.88);
    }

    // Confidence Gap (SMALL: [0, 0, 0.12], MED: [0.08, 0.20, 0.35], LARGE: [0.25, 0.50, 1.0])
    let gap_small = 0;
    let gap_med = 0;
    let gap_large = 0;
    if (confidenceGap !== null) {
      gap_small = fuzzyShoulderLeft(confidenceGap, 0.04, 0.12);
      gap_med = trimf(confidenceGap, [0.08, 0.20, 0.35]);
      gap_large = fuzzyShoulderRight(confidenceGap, 0.20, 0.38);
    }

    // Action Risk (LOW: [0, 0, 0.35], MED: [0.25, 0.50, 0.75], HIGH: [0.65, 1.0, 1.0])
    const r_low = fuzzyShoulderLeft(r_l, 0.20, 0.40);
    const r_med = trimf(r_l, [0.25, 0.50, 0.75]);
    const r_high = fuzzyShoulderRight(r_l, 0.60, 0.80);

    // Ambiguity Metric:
    // If multiple candidates: high when gap is small
    // If single candidate: determined by contradictory evidence or weak signals
    let rawAmbiguity = 0.05;
    if (confidenceGap !== null) {
      rawAmbiguity = Math.max(0.0, Math.min(1.0, 1.0 - (confidenceGap / 0.30)));
    } else {
      // Single candidate ambiguity depends on divergence between visual/dom/text
      const variance = Math.abs(t_s - d_c) * 0.5 + Math.abs(t_s - v_c) * 0.5;
      rawAmbiguity = Math.min(0.60, variance);
    }
    const ambiguity_score = Math.round(rawAmbiguity * 10000) / 10000;

    const amb_low = fuzzyShoulderLeft(ambiguity_score, 0.15, 0.35);
    const amb_med = trimf(ambiguity_score, [0.25, 0.50, 0.75]);
    const amb_high = fuzzyShoulderRight(ambiguity_score, 0.60, 0.80);

    const memberships: FuzzyMemberships = {
      candidate_confidence: {
        low: Math.round(c_low * 100) / 100,
        medium: Math.round(c_med * 100) / 100,
        high: Math.round(c_high * 100) / 100
      },
      confidence_gap: confidenceGap !== null ? {
        small: Math.round(gap_small * 100) / 100,
        medium: Math.round(gap_med * 100) / 100,
        large: Math.round(gap_large * 100) / 100
      } : null,
      text_similarity: {
        low: Math.round(text_low * 100) / 100,
        medium: Math.round(text_med * 100) / 100,
        high: Math.round(text_high * 100) / 100
      },
      dom_confidence: {
        low: Math.round(dom_low * 100) / 100,
        medium: Math.round(dom_med * 100) / 100,
        high: Math.round(dom_high * 100) / 100
      },
      visual_confidence: {
        low: Math.round(vis_low * 100) / 100,
        medium: Math.round(vis_med * 100) / 100,
        high: Math.round(vis_high * 100) / 100
      },
      ml_confidence: mlAvailable ? {
        low: Math.round(ml_low * 100) / 100,
        medium: Math.round(ml_med * 100) / 100,
        high: Math.round(ml_high * 100) / 100
      } : null,
      ambiguity: {
        low: Math.round(amb_low * 100) / 100,
        medium: Math.round(amb_med * 100) / 100,
        high: Math.round(amb_high * 100) / 100
      },
      risk: {
        low: Math.round(r_low * 100) / 100,
        medium: Math.round(r_med * 100) / 100,
        high: Math.round(r_high * 100) / 100
      }
    };

    // Step 4: Fuzzy Rule Activations
    const rulesFired: FuzzyRuleActivation[] = [];
    const reasoning: string[] = [];

    // Rule 1: Clear Winner
    // IF candidate confidence is HIGH AND confidence gap is LARGE AND text similarity is HIGH THEN ambiguity is LOW -> EXECUTE
    let r1 = 0;
    if (confidenceGap !== null) {
      r1 = Math.min(c_high, gap_large, text_high);
    } else {
      // Single candidate with high confidence & high text similarity
      r1 = Math.min(c_high, text_high, 1 - r_high);
    }
    // High risk action suppresses automatic execute
    if (actionRisk === 'HIGH' || r_high > 0.50) {
      r1 = 0;
    }
    if (r1 > 0.15) {
      rulesFired.push({
        id: 'rule-1',
        name: 'Clear Winner with Large Margin',
        antecedent_strength: Math.round(r1 * 100) / 100,
        consequent_decision: 'EXECUTE',
        description: 'Strong candidate confidence, large margin, and high text similarity.'
      });
      reasoning.push(`Top candidate demonstrates clear superiority with large confidence gap (${confidenceGap !== null ? (confidenceGap * 100).toFixed(1) + '%' : 'single candidate'}) and high text similarity (${(t_s * 100).toFixed(0)}%).`);
    }

    // Rule 2: High Confidence, Medium Gap -> VERIFY
    // IF candidate confidence is HIGH AND confidence gap is MEDIUM THEN ambiguity is MEDIUM -> VERIFY
    const r2 = confidenceGap !== null ? Math.min(c_high, gap_med) : 0;
    if (r2 > 0.15) {
      rulesFired.push({
        id: 'rule-2',
        name: 'High Confidence with Moderate Margin',
        antecedent_strength: Math.round(r2 * 100) / 100,
        consequent_decision: 'VERIFY',
        description: 'Top candidate is strong but margin is moderate; verification recommended.'
      });
      reasoning.push(`Top candidate is strong, but secondary candidate is moderately close (gap: ${(confidenceGap! * 100).toFixed(1)}%). Verification advised before commit.`);
    }

    // Rule 3: High Ambiguity (Close Candidates) -> ASK_USER
    // IF candidate confidence is (HIGH or MEDIUM) AND confidence gap is SMALL THEN ambiguity is HIGH -> ASK_USER
    const r3 = confidenceGap !== null ? Math.min(Math.max(c_high, c_med), gap_small) : 0;
    if (r3 > 0.15) {
      rulesFired.push({
        id: 'rule-3',
        name: 'High Ambiguity (Close Candidates)',
        antecedent_strength: Math.round(r3 * 100) / 100,
        consequent_decision: 'ASK_USER',
        description: 'Two or more candidates are similarly plausible (narrow gap).'
      });
      reasoning.push(`Ambiguity detected: Top two candidates have nearly identical plausibility scores (gap: ${(confidenceGap! * 100).toFixed(1)}%). Explicit user selection recommended.`);
    }

    // Rule 4: Weak Candidates -> RETRY
    // IF candidate confidence is LOW AND text similarity is LOW THEN RETRY
    const r4 = Math.min(c_low, text_low);
    if (r4 > 0.15) {
      rulesFired.push({
        id: 'rule-4',
        name: 'Weak Candidate Evidence',
        antecedent_strength: Math.round(r4 * 100) / 100,
        consequent_decision: 'RETRY',
        description: 'Candidate match score and text similarity are weak.'
      });
      reasoning.push(`Candidate match confidence is low (${(c_s * 100).toFixed(0)}%) with weak text alignment (${(t_s * 100).toFixed(0)}%). Rescan or re-perception advised.`);
    }

    // Rule 5: Multi-Signal Agreement -> EXECUTE
    // IF ML is HIGH AND DOM is HIGH AND text similarity is HIGH AND gap is LARGE AND risk is LOW THEN EXECUTE
    const mlScore = mlAvailable ? ml_high : 0.8;
    const r5 = confidenceGap !== null
      ? Math.min(mlScore, dom_high, text_high, gap_large, r_low)
      : Math.min(mlScore, dom_high, text_high, r_low);
    if (r5 > 0.15 && actionRisk !== 'HIGH') {
      rulesFired.push({
        id: 'rule-5',
        name: 'Multi-Signal Unanimous Agreement',
        antecedent_strength: Math.round(r5 * 100) / 100,
        consequent_decision: 'EXECUTE',
        description: 'DOM, visual, text, and ML signals are in full unanimous agreement.'
      });
      reasoning.push(`Full multi-signal agreement: DOM (${(d_c * 100).toFixed(0)}%), text similarity (${(t_s * 100).toFixed(0)}%), and ML signals unanimously favor top candidate.`);
    }

    // Rule 6: Conflicting ML Signals (CRITICAL: DO NOT LET ML OVERRIDE EVERYTHING!)
    // IF ML confidence is HIGH BUT text similarity is LOW (or DOM is LOW) THEN VERIFY
    let r6 = 0;
    if (mlAvailable && ml_high > 0.4) {
      r6 = Math.min(ml_high, Math.max(text_low, dom_low));
    }
    if (r6 > 0.15) {
      rulesFired.push({
        id: 'rule-6',
        name: 'Conflicting ML Evidence',
        antecedent_strength: Math.round(r6 * 100) / 100,
        consequent_decision: 'VERIFY',
        description: 'High ML confidence is contradicted by low text similarity or DOM signal.'
      });
      reasoning.push(`Contradictory evidence: High ML confidence (${m_c !== null ? (m_c * 100).toFixed(0) + '%' : 'high'}) is contradicted by low text similarity (${(t_s * 100).toFixed(0)}%) or DOM structure. Verification required.`);
    }

    // Rule 7: High-Risk Action Guardrail -> VERIFY or ASK_USER
    // IF action is high risk (SUBMIT, DELETE, PURCHASE) THEN require verification, never immediate unverified execution
    let r7 = 0;
    if (actionRisk === 'HIGH' || r_high > 0.50) {
      r7 = Math.max(r_high, 0.75);
      const isVeryStrong = c_s >= 0.85 && (confidenceGap === null || confidenceGap >= 0.20);
      const riskDecision: FuzzyDecisionOutput = isVeryStrong ? 'VERIFY' : 'ASK_USER';
      rulesFired.push({
        id: 'rule-7',
        name: 'High-Risk Action Guardrail',
        antecedent_strength: Math.round(r7 * 100) / 100,
        consequent_decision: riskDecision,
        description: `Action (${actionType}) carries high irreversible impact. Safety checks enforce ${riskDecision}.`
      });
      reasoning.push(`High-risk action (${actionType}) requires strict confirmation. Autonomous execution suppressed.`);
    }

    // Rule 8: Low Perception Signals -> RETRY
    // IF visual confidence is LOW AND DOM confidence is LOW THEN RETRY
    const r8 = Math.min(vis_low, dom_low);
    if (r8 > 0.15) {
      rulesFired.push({
        id: 'rule-8',
        name: 'Low Perception Baseline',
        antecedent_strength: Math.round(r8 * 100) / 100,
        consequent_decision: 'RETRY',
        description: 'Visual and DOM confidence are both low; perception may have failed.'
      });
      reasoning.push(`Perception signals are weak (Visual: ${(v_c * 100).toFixed(0)}%, DOM: ${(d_c * 100).toFixed(0)}%). Page state re-scan recommended.`);
    }

    // Rule 9: Single Candidate Evaluation
    // IF single candidate AND confidence is HIGH AND risk is LOW THEN EXECUTE; IF risk HIGH THEN VERIFY
    let r9 = 0;
    if (candidateCount === 1) {
      if (c_high > 0.40 && actionRisk !== 'HIGH') {
        r9 = Math.min(c_high, 1 - r_high);
        rulesFired.push({
          id: 'rule-9a',
          name: 'Single Viable Candidate (High Confidence)',
          antecedent_strength: Math.round(r9 * 100) / 100,
          consequent_decision: 'EXECUTE',
          description: 'Sole matching candidate with high structural and semantic alignment.'
        });
        reasoning.push(`Single unambiguous candidate detected with strong match confidence (${(c_s * 100).toFixed(0)}%).`);
      } else if (actionRisk === 'HIGH') {
        r9 = 0.80;
        rulesFired.push({
          id: 'rule-9b',
          name: 'Single Candidate (High-Risk Action)',
          antecedent_strength: 0.80,
          consequent_decision: 'VERIFY',
          description: 'Sole candidate detected, but high-risk action requires state verification.'
        });
      } else if (c_low > 0.40) {
        r9 = c_low;
        rulesFired.push({
          id: 'rule-9c',
          name: 'Single Weak Candidate',
          antecedent_strength: Math.round(r9 * 100) / 100,
          consequent_decision: 'RETRY',
          description: 'Only candidate found has weak match score.'
        });
        reasoning.push(`Only one candidate found, but confidence score is low (${(c_s * 100).toFixed(0)}%).`);
      }
    }

    // Rule 10: Contradictory Evidence Anti-Override
    // If ML is high but gap is small and text is low -> ASK_USER or VERIFY
    let r10 = 0;
    if (mlAvailable && ml_high > 0.50 && confidenceGap !== null && confidenceGap < 0.10) {
      r10 = Math.min(ml_high, gap_small);
      rulesFired.push({
        id: 'rule-10',
        name: 'Contradictory ML vs Candidate Gap',
        antecedent_strength: Math.round(r10 * 100) / 100,
        consequent_decision: 'ASK_USER',
        description: 'High ML confidence cannot override high candidate ambiguity.'
      });
      reasoning.push(`ML score is elevated, but multiple elements compete with tiny separation margin (${(confidenceGap * 100).toFixed(1)}%). Preventing autonomous execute.`);
    }

    // Step 5: Defuzzification (Weighted Center of Gravity)
    // Consequent centroids: EXECUTE = 92, VERIFY = 65, ASK_USER = 42, RETRY = 20, REJECT = 10
    const execute_weight = Math.max(r1, r5, (candidateCount === 1 && r9 > 0 && actionRisk !== 'HIGH' ? r9 : 0));
    const verify_weight = Math.max(r2, r6, (actionRisk === 'HIGH' && c_s >= 0.70 ? 0.85 : 0));
    const ask_weight = Math.max(r3, r10, (actionRisk === 'HIGH' && c_s < 0.70 ? 0.80 : 0));
    const retry_weight = Math.max(r4, r8, (c_s < 0.45 ? 0.90 : 0));

    const totalWeight = execute_weight + verify_weight + ask_weight + retry_weight;
    let defuzzifiedScore: number;

    if (totalWeight > 0.05) {
      defuzzifiedScore = (
        execute_weight * 92.0 +
        verify_weight * 65.0 +
        ask_weight * 42.0 +
        retry_weight * 20.0
      ) / totalWeight;
    } else {
      // Direct heuristic fallback
      defuzzifiedScore = c_s * 100.0;
    }

    // Step 6: Final Decision Resolution with Safety Enforcements
    let decision: FuzzyDecisionOutput;
    let primaryReason = '';

    // Safety Gate 1: Candidate match is too low
    if (c_s < 0.42 || (candidateCount === 0)) {
      decision = 'RETRY';
      primaryReason = 'Candidate match score is below minimum acceptance threshold (42%). Re-scanning advised.';
    }
    // Safety Gate 2: High Ambiguity between close candidates
    else if (confidenceGap !== null && confidenceGap <= 0.06 && c_s >= 0.50) {
      decision = 'ASK_USER';
      primaryReason = `Two candidates have nearly identical scores (separation gap: ${(confidenceGap * 100).toFixed(1)}%). User choice requested.`;
    }
    // Safety Gate 3: High-Risk Action Guardrail
    else if (actionRisk === 'HIGH' || r_high >= 0.65) {
      if (c_s >= 0.80 && (confidenceGap === null || confidenceGap >= 0.15)) {
        decision = 'VERIFY';
        primaryReason = `High-risk action (${actionType}) requires post-interaction verification step before committing.`;
      } else {
        decision = 'ASK_USER';
        primaryReason = `High-risk action (${actionType}) with moderate candidate confidence. User confirmation required.`;
      }
    }
    // Safety Gate 4: Contradictory signals (High ML but Low Text or Small Gap)
    else if (mlAvailable && ml_high > 0.60 && (text_low > 0.40 || (confidenceGap !== null && confidenceGap < 0.08))) {
      decision = confidenceGap !== null && confidenceGap < 0.08 ? 'ASK_USER' : 'VERIFY';
      primaryReason = 'Elevated ML score is contradicted by low text similarity or narrow candidate margin.';
    }
    // Standard Fuzzy Decision Thresholds
    else if (defuzzifiedScore >= 74.0 && (confidenceGap === null || confidenceGap >= 0.15) && c_s >= 0.70) {
      decision = 'EXECUTE';
      primaryReason = 'Strong multi-signal consensus and distinct candidate margin. Safe for autonomous execution.';
    }
    else if (defuzzifiedScore >= 52.0 && c_s >= 0.50) {
      decision = 'VERIFY';
      primaryReason = confidenceGap !== null && confidenceGap < 0.15
        ? 'Moderate candidate margin; verification step required.'
        : 'Good overall candidate match; proceeding with DOM state verification.';
    }
    else if (defuzzifiedScore >= 35.0 || (confidenceGap !== null && confidenceGap < 0.10)) {
      decision = 'ASK_USER';
      primaryReason = 'Ambiguous candidate alternatives or borderline confidence. Requesting user selection.';
    }
    else {
      decision = 'RETRY';
      primaryReason = 'Insufficient visual and DOM confidence signals. Element re-scan advised.';
    }

    // Calculate Decision Confidence (distinct from candidate confidence)
    // Decision confidence reflects the clarity and firmness of the fuzzy decision
    let decisionConfidence: number;
    if (decision === 'EXECUTE') {
      decisionConfidence = Math.min(0.98, Math.max(0.70, (defuzzifiedScore / 100.0) * (1.0 - ambiguity_score * 0.3)));
    } else if (decision === 'VERIFY') {
      decisionConfidence = Math.min(0.85, Math.max(0.55, (defuzzifiedScore / 100.0)));
    } else if (decision === 'ASK_USER') {
      decisionConfidence = Math.min(0.75, Math.max(0.40, ambiguity_score));
    } else {
      decisionConfidence = Math.max(0.20, Math.min(0.50, defuzzifiedScore / 100.0));
    }

    const formattedRule = `IF Vis(${v_c.toFixed(2)}) & DOM(${d_c.toFixed(2)}) & Text(${t_s.toFixed(2)}) & Gap(${confidenceGap !== null ? confidenceGap.toFixed(2) : 'single'}) & Risk(${actionRisk}) THEN ${decision}`;

    // Add primary reason to reasoning array if not already present
    if (!reasoning.some(r => r.includes(primaryReason.slice(0, 20)))) {
      reasoning.unshift(primaryReason);
    }

    return {
      decision,
      fuzzy_confidence: Math.round(decisionConfidence * 10000) / 10000,
      candidate_confidence: Math.round(c_s * 10000) / 10000,
      ambiguity_score,
      score_gap: confidenceGap !== null ? Math.round(confidenceGap * 10000) / 10000 : null,
      top_candidate: params.topCandidate,
      second_candidate: params.secondCandidate,
      candidate_count: candidateCount,
      action_type: actionType,
      action_risk: actionRisk,
      reasoning,
      rule_activated: formattedRule,
      rules_fired: rulesFired,
      memberships,
      visual_confidence: Math.round(v_c * 10000) / 10000,
      dom_confidence: Math.round(d_c * 10000) / 10000,
      text_similarity: Math.round(t_s * 10000) / 10000,
      ml_confidence: m_c !== null ? Math.round(m_c * 10000) / 10000 : null,
      risk_level: Math.round(r_l * 10000) / 10000,
      raw_score: Math.round(defuzzifiedScore * 100) / 100,
      reason: primaryReason
    };
  }

  private generateNoCandidateResult(
    numericRisk: number,
    actionRisk: ActionRiskLevel,
    actionType: string
  ): FuzzyEvaluationResult {
    const reason = 'No candidate element detected for this target field. Rescan or re-analyze recommended.';
    return {
      decision: 'RETRY',
      fuzzy_confidence: 0.10,
      candidate_confidence: 0.0,
      ambiguity_score: 1.0,
      score_gap: null,
      top_candidate: null,
      second_candidate: null,
      candidate_count: 0,
      action_type: actionType,
      action_risk: actionRisk,
      reasoning: [reason],
      rule_activated: 'IF CandidateCount == 0 THEN RETRY',
      rules_fired: [
        {
          id: 'rule-zero-candidates',
          name: 'Zero Candidates Detected',
          antecedent_strength: 1.0,
          consequent_decision: 'RETRY',
          description: 'No matching DOM element found in current viewport.'
        }
      ],
      memberships: {
        candidate_confidence: { low: 1.0, medium: 0.0, high: 0.0 },
        confidence_gap: null,
        text_similarity: { low: 1.0, medium: 0.0, high: 0.0 },
        dom_confidence: { low: 1.0, medium: 0.0, high: 0.0 },
        visual_confidence: { low: 1.0, medium: 0.0, high: 0.0 },
        ml_confidence: null,
        ambiguity: { low: 0.0, medium: 0.0, high: 1.0 },
        risk: {
          low: actionRisk === 'LOW' ? 1.0 : 0.0,
          medium: actionRisk === 'MEDIUM' ? 1.0 : 0.0,
          high: actionRisk === 'HIGH' ? 1.0 : 0.0
        }
      },
      visual_confidence: 0,
      dom_confidence: 0,
      text_similarity: 0,
      ml_confidence: null,
      risk_level: numericRisk,
      raw_score: 10.0,
      reason
    };
  }
}

export const fuzzyDecisionEngine = new FuzzyDecisionEngine();
