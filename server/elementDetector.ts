import { predictMLConfidence } from './mlPredictor';

export interface DOMElementData {
  tag: string;
  type?: string;
  text: string;
  placeholder?: string;
  ariaLabel?: string;
  name?: string;
  id?: string;
  className?: string;
  role?: string;
  value?: string;
  title?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isVisible?: boolean | string;
  viewportWidth?: number;
  viewportHeight?: number;
}

export interface CandidateFeatures {
  text_similarity: number;
  dom_confidence: number;
  visual_confidence: number;
  is_visible: boolean;
  width: number;
  height: number;
  relative_x: number;
  relative_y: number;
  element_tag: string;
  input_type: string;
  has_placeholder: boolean;
  has_name: boolean;
  has_id: boolean;
  has_aria_label: boolean;
  is_search_input: boolean;
  is_button: boolean;
  is_link: boolean;
  is_text_input: boolean;
  is_password_input: boolean;
  is_select: boolean;
}

export interface ScoredCandidate {
  element: DOMElementData;
  text_similarity: number;
  dom_confidence: number;
  visual_confidence: number;
  ml_confidence: number | null;
  ml_status: 'COLD_START' | 'TRAINED';
  composite_score: number;
  features: CandidateFeatures;
}

export class ElementDetector {
  /**
   * Tokenizes identifier or text by splitting spaces, hyphens, underscores, dots, and camelCase.
   */
  private static tokenize(str: string): string[] {
    if (!str) return [];
    return str
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .split(/[\s\-_.:/]+/)
      .filter((t) => t.length > 1);
  }

  private static readonly GENERIC_STOP_WORDS = new Set(['input', 'field', 'box', 'control', 'item', 'element']);

  public static textSimilarity(target: string, candidateStr?: string): number {
    if (!target || !candidateStr) return 0.0;

    const tClean = target.toLowerCase().trim();
    const cClean = candidateStr.toLowerCase().trim();

    if (tClean === cClean) return 1.0;
    if (tClean.includes(cClean) || cClean.includes(tClean)) return 0.88;

    // Advanced token overlap with camelCase/kebab-case/snake_case support
    const tTokens = this.tokenize(tClean);
    const cTokens = new Set(this.tokenize(cClean));

    if (tTokens.length > 0 && cTokens.size > 0) {
      const substantiveTTokens = tTokens.filter((t) => !this.GENERIC_STOP_WORDS.has(t));
      const hasSubstantive = substantiveTTokens.length > 0;

      let matches = 0;
      let substantiveMatches = 0;
      for (const token of tTokens) {
        const isGeneric = this.GENERIC_STOP_WORDS.has(token);
        if (cTokens.has(token)) {
          matches += (isGeneric ? 0.2 : 1.0);
          if (!isGeneric) substantiveMatches++;
        } else {
          // Check for sub-token containment (e.g., 'email' in 'emailinput')
          // Require at least 3 characters for substring containment to avoid false matches on short letters
          for (const cToken of cTokens) {
            if (token.length >= 3 && cToken.length >= 3 && (cToken.includes(token) || token.includes(cToken))) {
              matches += (isGeneric ? 0.15 : 0.85);
              if (!isGeneric) substantiveMatches += 0.85;
              break;
            }
          }
        }
      }

      // If substantive tokens were queried (e.g. 'email' in 'Email Input') but none matched,
      // generic stop words like 'input' alone cannot create a high match
      if (hasSubstantive && substantiveMatches === 0) {
        return 0.15;
      }

      const maxScore = Math.max(substantiveTTokens.length + (tTokens.length - substantiveTTokens.length) * 0.2, 1);
      const overlap = matches / maxScore;
      if (overlap >= 0.99) {
        return 0.98;
      }
      if (overlap >= 0.5) {
        return Math.min(0.95, Math.round((0.60 + 0.35 * overlap) * 100) / 100);
      }
    }

    // Levenshtein ratio
    const distance = this.levenshtein(tClean, cClean);
    const maxLen = Math.max(tClean.length, cClean.length);
    const ratio = maxLen > 0 ? (maxLen - distance) / maxLen : 0;
    return Math.round(ratio * 10000) / 10000;
  }

  private static levenshtein(a: string, b: string): number {
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[a.length][b.length];
  }

  public static calculateCandidateScores(
    candidate: DOMElementData,
    intentData: any,
    actionType: string = 'CLICK'
  ): ScoredCandidate {
    const tag = (candidate.tag || '').toLowerCase();
    const candidateType = (candidate.type || '').toLowerCase();
    const text = candidate.text || '';
    const placeholder = candidate.placeholder || '';
    const aria = candidate.ariaLabel || '';
    const name = candidate.name || '';
    const elemId = String(candidate.id || '');
    const className = candidate.className || '';
    const role = candidate.role || '';
    const title = candidate.title || '';

    const targetCandidates = [
      intentData.target,
      intentData.field_name,
      intentData.query
    ].filter(Boolean) as string[];

    // Semantic text match across all primary identifiers
    let textSim = 0.0;
    for (const targetText of targetCandidates) {
      const sim = Math.max(
        this.textSimilarity(targetText, text),
        this.textSimilarity(targetText, placeholder),
        this.textSimilarity(targetText, aria),
        this.textSimilarity(targetText, name),
        this.textSimilarity(targetText, elemId),
        this.textSimilarity(targetText, title),
        this.textSimilarity(targetText, role)
      );
      if (sim > textSim) textSim = sim;
    }
    const targetText = targetCandidates[0] || '';

    const nameLower = name.toLowerCase().trim();
    const isSearchName = ['q', 'query', 'search', 'search_query', 'searchquery'].includes(nameLower);
    const isSearchTarget = ['search', 'find', 'lookup', 'query'].includes(targetText.toLowerCase().trim());

    if (actionType === 'TYPE' || intentData.intent === 'SEARCH' || isSearchTarget) {
      if (
        ['input', 'textarea'].includes(tag) &&
        (placeholder.toLowerCase().includes('search') ||
          placeholder.toLowerCase().includes('find') ||
          isSearchName ||
          className.toLowerCase().includes('search') ||
          elemId.toLowerCase().includes('search') ||
          candidateType === 'search')
      ) {
        const inputMatch = Math.max(
          this.textSimilarity('search', placeholder),
          this.textSimilarity('find', placeholder),
          this.textSimilarity('query', name),
          this.textSimilarity('search', aria),
          this.textSimilarity('search', elemId),
          candidateType === 'search' ? 0.90 : 0.0
        );
        textSim = Math.max(textSim, inputMatch);
      }
    }

    // DOM Confidence Calculation
    let domConf = 0.50;
    if (['input', 'button', 'a', 'select', 'textarea'].includes(tag)) domConf += 0.20;
    if (aria || placeholder || name || elemId) domConf += 0.15;
    if (textSim > 0.60) domConf += 0.15;
    domConf = Math.min(0.98, Math.max(0.20, domConf));

    // Visual Confidence Calculation
    const w = candidate.width || 0;
    const h = candidate.height || 0;
    const x = candidate.x || 0;
    const y = candidate.y || 0;

    let isVisible = true;
    if (typeof candidate.isVisible === 'string') {
      isVisible = ['true', '1', 'yes'].includes(candidate.isVisible.toLowerCase());
    } else if (candidate.isVisible !== undefined) {
      isVisible = Boolean(candidate.isVisible);
    }

    const viewportW = candidate.viewportWidth || 1440;
    const viewportH = candidate.viewportHeight || 900;

    let visualConf = 0.50;
    if (isVisible) visualConf += 0.20;
    if (w >= 20 && h >= 15) visualConf += 0.15;
    if (y >= 0 && y <= viewportH && x >= 0 && x <= viewportW) visualConf += 0.10;
    visualConf = Math.min(0.96, Math.max(0.15, visualConf));

    // ML Confidence with Cold-Start Strategy
    const mlResult = predictMLConfidence(visualConf, domConf, textSim);
    const mlConf = mlResult.confidence;
    const mlStatus = mlResult.status;

    // Privacy-Safe Features for inspection, testing, and training
    const features: CandidateFeatures = {
      text_similarity: Math.round(textSim * 10000) / 10000,
      dom_confidence: Math.round(domConf * 10000) / 10000,
      visual_confidence: Math.round(visualConf * 10000) / 10000,
      is_visible: isVisible,
      width: w,
      height: h,
      relative_x: Math.round((x / Math.max(viewportW, 1)) * 1000) / 1000,
      relative_y: Math.round((y / Math.max(viewportH, 1)) * 1000) / 1000,
      element_tag: tag,
      input_type: candidateType || (tag === 'textarea' ? 'textarea' : 'standard'),
      has_placeholder: Boolean(placeholder),
      has_name: Boolean(name),
      has_id: Boolean(elemId),
      has_aria_label: Boolean(aria),
      is_search_input: isSearchName || candidateType === 'search',
      is_button: tag === 'button' || candidateType === 'submit' || role === 'button',
      is_link: tag === 'a',
      is_text_input: tag === 'input' && ['text', 'email', 'tel', 'search', 'url', ''].includes(candidateType),
      is_password_input: candidateType === 'password',
      is_select: tag === 'select'
    };

    // Heuristic Composite Score (Cold Start aware)
    let compositeScore: number;
    if (mlConf !== null) {
      compositeScore = (textSim * 0.45) + (domConf * 0.25) + (visualConf * 0.15) + (mlConf * 0.15);
    } else {
      // Deterministic baseline when ML is in COLD_START
      compositeScore = (textSim * 0.50) + (domConf * 0.30) + (visualConf * 0.20);
    }

    return {
      element: candidate,
      text_similarity: Math.round(textSim * 10000) / 10000,
      dom_confidence: Math.round(domConf * 10000) / 10000,
      visual_confidence: Math.round(visualConf * 10000) / 10000,
      ml_confidence: mlConf,
      ml_status: mlStatus,
      composite_score: Math.round(compositeScore * 10000) / 10000,
      features
    };
  }

  public static detectTargetElement(
    candidates: DOMElementData[],
    intentData: any,
    actionType: string = 'CLICK'
  ): {
    top_candidate: ScoredCandidate | null;
    all_scored_candidates: ScoredCandidate[];
  } {
    if (!candidates || candidates.length === 0) {
      return { top_candidate: null, all_scored_candidates: [] };
    }

    const scored = candidates.map((cand) => this.calculateCandidateScores(cand, intentData, actionType));
    scored.sort((a, b) => b.composite_score - a.composite_score);

    return {
      top_candidate: scored[0] || null,
      all_scored_candidates: scored.slice(0, 5)
    };
  }
}
