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
  label?: string;
  autocomplete?: string;
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
    if (tClean.length >= 3 && cClean.length >= 3) {
      const escapedT = tClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedC = cClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const isWordBoundaryMatch =
        new RegExp(`(^|\\b)${escapedT}(\\b|$)`, 'i').test(cClean) ||
        new RegExp(`(^|\\b)${escapedC}(\\b|$)`, 'i').test(tClean);
      if (isWordBoundaryMatch) {
        const lengthRatio = Math.min(tClean.length, cClean.length) / Math.max(tClean.length, cClean.length);
        if (lengthRatio >= 0.45) return 0.92;
      }
    }

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

  /**
   * Infer deterministic semantic category from DOM attributes (Priority 1 & 2)
   */
  public static inferFieldSemanticCategory(candidate: DOMElementData): string | null {
    const tag = (candidate.tag || '').toLowerCase();
    const type = (candidate.type || '').toLowerCase();
    const name = (candidate.name || '').toLowerCase();
    const id = String(candidate.id || '').toLowerCase();
    const placeholder = (candidate.placeholder || '').toLowerCase();
    const aria = (candidate.ariaLabel || '').toLowerCase();
    const label = (candidate.label || '').toLowerCase();
    const autocomplete = (candidate.autocomplete || '').toLowerCase();
    const role = (candidate.role || '').toLowerCase();

    // 1. Search input
    const isSearchName = ['q', 'query', 'search', 'search_query', 'searchquery', 's'].includes(name.trim());
    const isSearchId = ['search', 'search_query', 'searchquery', 'query', 'search-box', 'search-input'].includes(id.trim());
    if (
      type === 'search' ||
      role === 'searchbox' ||
      role === 'search' ||
      isSearchName ||
      isSearchId ||
      /\b(search|find products|search for|site search|lookup)\b/i.test(placeholder) ||
      /\b(search|find products|search for|site search|lookup)\b/i.test(aria) ||
      /\b(search|find products|search for|site search|lookup)\b/i.test(label)
    ) {
      return 'SEARCH';
    }

    // 2. Phone field
    if (
      type === 'tel' ||
      autocomplete.includes('tel') ||
      /\b(phone|telephone|mobile|cell|tel|contact[_\s-]?no|contact[_\s-]?number)\b/i.test(name) ||
      /\b(phone|telephone|mobile|cell|tel|contact[_\s-]?no|contact[_\s-]?number)\b/i.test(id) ||
      /\b(phone|telephone|mobile|cell|tel|contact[_\s-]?no|contact[_\s-]?number)\b/i.test(placeholder) ||
      /\b(phone|telephone|mobile|cell|tel|contact[_\s-]?no|contact[_\s-]?number)\b/i.test(label) ||
      /\b(phone|telephone|mobile|cell|tel|contact[_\s-]?no|contact[_\s-]?number)\b/i.test(aria)
    ) {
      return 'PHONE';
    }

    // 3. Email field
    if (
      type === 'email' ||
      autocomplete.includes('email') ||
      /\b(email|e-mail|mail)\b/i.test(name) ||
      /\b(email|e-mail|mail)\b/i.test(id) ||
      /\b(email|e-mail|mail)\b/i.test(placeholder) ||
      /\b(email|e-mail|mail)\b/i.test(label) ||
      /\b(email|e-mail|mail)\b/i.test(aria)
    ) {
      return 'EMAIL';
    }

    // 4. Password field
    if (
      type === 'password' ||
      autocomplete.includes('password') ||
      /\b(password|passwd|pwd)\b/i.test(name) ||
      /\b(password|passwd|pwd)\b/i.test(id) ||
      /\b(password|passwd|pwd)\b/i.test(placeholder) ||
      /\b(password|passwd|pwd)\b/i.test(label)
    ) {
      return 'PASSWORD';
    }

    // 5. Name field
    if (
      type !== 'password' &&
      (
        (autocomplete.includes('name') && !autocomplete.includes('username')) ||
        /\b(fullname|full[_\s-]name|first[_\s-]name|last[_\s-]name|firstname|lastname|fname|lname)\b/i.test(name) ||
        /\b(fullname|full[_\s-]name|first[_\s-]name|last[_\s-]name|firstname|lastname|fname|lname)\b/i.test(id) ||
        /\b(fullname|full[_\s-]name|first[_\s-]name|last[_\s-]name|firstname|lastname)\b/i.test(label) ||
        /\b(fullname|full[_\s-]name)\b/i.test(placeholder) ||
        name.trim() === 'name' ||
        id.trim() === 'name' ||
        label.trim().toLowerCase() === 'name' ||
        label.trim().toLowerCase() === 'full name' ||
        label.trim().toLowerCase() === 'your name'
      )
    ) {
      return 'NAME';
    }

    // 6. Address
    if (
      autocomplete.includes('address') ||
      tag === 'textarea' ||
      /\b(address|street|mailing|suite)\b/i.test(name) ||
      /\b(address|street|mailing|suite)\b/i.test(id) ||
      /\b(address|street|mailing)\b/i.test(label) ||
      /\b(address|street|mailing)\b/i.test(placeholder)
    ) {
      return 'ADDRESS';
    }

    // 7. Country
    if (
      tag === 'select' ||
      autocomplete.includes('country') ||
      /\b(country|nation)\b/i.test(name) ||
      /\b(country|nation)\b/i.test(id) ||
      /\b(country|nation)\b/i.test(label)
    ) {
      return 'COUNTRY';
    }

    // 8. Checkbox / Terms
    if (
      type === 'checkbox' ||
      /\b(terms|conditions|agree|consent)\b/i.test(name) ||
      /\b(terms|conditions|agree|consent)\b/i.test(id) ||
      /\b(terms|conditions|agree|consent)\b/i.test(label)
    ) {
      return 'CHECKBOX';
    }

    return null;
  }

  /**
   * Infer task intent semantic category from query/field metadata (Priority 3)
   */
  public static inferTargetSemanticCategory(intentData: any, actionType: string = 'CLICK'): string | null {
    const norm = String(intentData?.normalized_name || '').toUpperCase().trim();
    if (norm === 'PHONE') return 'PHONE';
    if (norm === 'EMAIL') return 'EMAIL';
    if (norm === 'NAME' || norm === 'FIRST_NAME' || norm === 'LAST_NAME') return 'NAME';
    if (norm === 'PASSWORD') return 'PASSWORD';
    if (norm === 'ADDRESS' || norm === 'CITY' || norm === 'ZIP_CODE' || norm === 'STATE') return 'ADDRESS';
    if (norm === 'COUNTRY') return 'COUNTRY';
    if (norm === 'TERMS') return 'CHECKBOX';
    if (norm === 'SEARCH_QUERY') return 'SEARCH';

    const intent = String(intentData?.intent || '').toUpperCase().trim();
    if (intent === 'SEARCH') return 'SEARCH';

    const targetCandidates = [
      intentData?.target,
      intentData?.field_name,
      intentData?.query
    ].filter(Boolean) as string[];

    const combined = targetCandidates.join(' ').toLowerCase();

    if (/\b(phone|mobile|tel|cell|contact[_\s-]?no|contact[_\s-]?number)\b/i.test(combined)) return 'PHONE';
    if (/\b(email|e-mail|mail)\b/i.test(combined)) return 'EMAIL';
    if (/\b(password|pwd|pass)\b/i.test(combined)) return 'PASSWORD';
    if (/\b(search|find products|lookup|query|search for)\b/i.test(combined)) return 'SEARCH';
    if (/\b(fullname|full[_\s-]name|first[_\s-]name|last[_\s-]name|name)\b/i.test(combined)) return 'NAME';
    if (/\b(address|street|city|state|zip)\b/i.test(combined)) return 'ADDRESS';
    if (/\b(country|nation)\b/i.test(combined)) return 'COUNTRY';
    if (/\b(terms|agree|conditions)\b/i.test(combined)) return 'CHECKBOX';

    return null;
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
    const label = candidate.label || '';
    const autocomplete = (candidate.autocomplete || '').toLowerCase();

    const targetCandidates = [
      intentData.target,
      intentData.field_name,
      intentData.query
    ].filter(Boolean) as string[];

    // 1. Semantic text match across all primary identifiers
    let textSim = 0.0;
    for (const targetText of targetCandidates) {
      const sim = Math.max(
        this.textSimilarity(targetText, text),
        this.textSimilarity(targetText, label),
        this.textSimilarity(targetText, placeholder),
        this.textSimilarity(targetText, aria),
        this.textSimilarity(targetText, name),
        this.textSimilarity(targetText, elemId),
        this.textSimilarity(targetText, title),
        this.textSimilarity(targetText, role)
      );
      if (sim > textSim) textSim = sim;
    }

    const nameLower = name.toLowerCase().trim();
    const isSearchName = ['q', 'query', 'search', 'search_query', 'searchquery'].includes(nameLower);

    // 2. Identify semantic categories for task intent and DOM candidate
    const targetCategory = this.inferTargetSemanticCategory(intentData, actionType);
    const candidateCategory = this.inferFieldSemanticCategory(candidate);

    // 3. Apply Matching Priority & Browser DOM Semantics:
    // Priority 1: Strong explicit DOM semantics
    // Priority 2: Label / placeholder / autocomplete semantics
    if (targetCategory && candidateCategory && targetCategory === candidateCategory) {
      if (targetCategory === 'PHONE') {
        const hasExplicitDom = candidateType === 'tel' || autocomplete.includes('tel');
        textSim = Math.max(textSim, hasExplicitDom ? 0.98 : 0.94);
      } else if (targetCategory === 'EMAIL') {
        const hasExplicitDom = candidateType === 'email' || autocomplete.includes('email');
        textSim = Math.max(textSim, hasExplicitDom ? 0.98 : 0.94);
      } else if (targetCategory === 'NAME') {
        const hasExplicitDom = autocomplete.includes('name') || nameLower === 'name' || elemId.toLowerCase() === 'name';
        textSim = Math.max(textSim, hasExplicitDom ? 0.98 : 0.94);
      } else if (targetCategory === 'PASSWORD') {
        const hasExplicitDom = candidateType === 'password' || autocomplete.includes('password');
        textSim = Math.max(textSim, hasExplicitDom ? 0.98 : 0.94);
      } else if (targetCategory === 'SEARCH') {
        const hasExplicitDom = candidateType === 'search' || isSearchName || role === 'searchbox' || role === 'search';
        textSim = Math.max(textSim, hasExplicitDom ? 0.96 : 0.92);
      } else if (targetCategory === 'CHECKBOX') {
        textSim = Math.max(textSim, candidateType === 'checkbox' ? 0.98 : 0.94);
      }
    }

    // Priority 3: Task intent ↔ field-type compatibility (Semantic Mismatch Penalty)
    // A SEARCH field must NOT become a PHONE/EMAIL/NAME candidate merely because visual confidence is high.
    if (candidateCategory === 'SEARCH' && targetCategory !== 'SEARCH') {
      textSim = Math.min(textSim, 0.05);
    } else if (candidateCategory === 'PASSWORD' && targetCategory !== 'PASSWORD') {
      textSim = Math.min(textSim, 0.05);
    } else if (targetCategory && candidateCategory && targetCategory !== candidateCategory) {
      // Incompatible field roles (e.g. phone vs email, name vs phone)
      if (
        (targetCategory === 'PHONE' && candidateCategory === 'EMAIL') ||
        (targetCategory === 'EMAIL' && candidateCategory === 'PHONE') ||
        (targetCategory === 'NAME' && (candidateCategory === 'PHONE' || candidateCategory === 'EMAIL'))
      ) {
        textSim = Math.min(textSim, 0.10);
      }
    }

    // DOM Confidence Calculation
    let domConf = 0.50;
    if (['input', 'button', 'a', 'select', 'textarea'].includes(tag)) domConf += 0.20;
    if (aria || placeholder || name || elemId || label) domConf += 0.15;
    if (textSim > 0.60) domConf += 0.15;

    // Apply explicit DOM semantics boost
    if (targetCategory && candidateCategory && targetCategory === candidateCategory) {
      domConf = Math.max(domConf, 0.95);
    }

    // Penalize DOM confidence on obvious semantic mismatch
    if (candidateCategory === 'SEARCH' && targetCategory !== 'SEARCH') {
      domConf = Math.min(domConf, 0.25);
    } else if (candidateCategory === 'PASSWORD' && targetCategory !== 'PASSWORD') {
      domConf = Math.min(domConf, 0.25);
    }

    domConf = Math.min(0.98, Math.max(0.15, domConf));

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
