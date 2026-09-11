/**
 * PrivaSight — Privacy Protection Gateway (Phase 3)
 *
 * Core Mandates:
 * 1. Sensitive information (passwords, OTPs, PINs, API keys, payment tokens, government IDs)
 *    is detected locally and NEVER sent to external AI or logged in plaintext.
 * 2. Only sanitized/non-sensitive data (PUBLIC, LOW_SENSITIVITY, approved PERSONAL) may pass
 *    to external AI requests via get_external_ai_safe_data().
 * 3. Fail-Closed Principle: If privacy analysis encounters errors or unresolvable ambiguity,
 *    external processing is immediately blocked.
 */

export type SensitivityLevel =
  | 'PUBLIC'
  | 'LOW_SENSITIVITY'
  | 'PERSONAL'
  | 'SENSITIVE'
  | 'HIGHLY_SENSITIVE';

export type PrivacyCategory =
  | 'PASSWORD'
  | 'OTP'
  | 'PIN'
  | 'API_KEY'
  | 'PAYMENT'
  | 'GOV_ID'
  | 'EMAIL'
  | 'PHONE'
  | 'NAME'
  | 'ADDRESS'
  | 'DOB'
  | 'GENERAL';

export interface PrivacyAnalyzedField {
  key: string;
  value?: string;
  category: PrivacyCategory;
  sensitivity: SensitivityLevel;
  confidence: number;
  reason: string;
  allowed_for_external_ai: boolean;
  redacted_preview?: string;
}

export interface PrivacyAnalysisResult {
  success: boolean;
  analyzed_count: number;
  safe_data: PrivacyAnalyzedField[];
  protected_data: PrivacyAnalyzedField[];
  external_ai_safe_payload: Record<string, any>;
  external_ai_access: 'ALLOWED' | 'BLOCKED_FOR_PROTECTED' | 'RESTRICTED';
  redaction_active: boolean;
  message: string;
  scan_status: 'completed' | 'failed' | 'paused';
  error?: string;
}

export interface RawFieldCandidate {
  key: string;
  value: string;
}

/**
 * Task-scoped local in-memory secure vault.
 * Sensitive values stay here temporarily for local browser interaction (Playwright typing)
 * and are NEVER written to disk, database, or network payloads.
 */
export class LocalSecureStore {
  private static store = new Map<string, { secrets: Record<string, string>; timestamp: number }>();

  public static saveTaskSecrets(taskId: string, secrets: Record<string, string>): void {
    this.cleanup();
    this.store.set(taskId, {
      secrets: { ...secrets },
      timestamp: Date.now()
    });
  }

  public static getSecret(taskId: string, key: string): string | undefined {
    const entry = this.store.get(taskId);
    if (!entry) return undefined;
    if (entry.secrets[key] !== undefined) return entry.secrets[key];
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [k, v] of Object.entries(entry.secrets)) {
      if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanKey) {
        return v;
      }
    }
    return undefined;
  }

  public static getTaskSecret(taskId: string, key: string): string | undefined {
    return this.getSecret(taskId, key);
  }

  public static clearTask(taskId: string): void {
    this.store.delete(taskId);
  }

  private static cleanup(): void {
    const now = Date.now();
    const expiryMs = 15 * 60 * 1000; // 15-minute expiry
    for (const [taskId, entry] of this.store.entries()) {
      if (now - entry.timestamp > expiryMs) {
        this.store.delete(taskId);
      }
    }
  }
}

export interface ScreenshotSafetyAssessment {
  allowed_for_external_ai: boolean;
  allowed_to_persist: boolean;
  is_sensitive: boolean;
  reason: string;
}

/**
 * Privacy-aware screenshot handling abstraction.
 * Enforces local storage gating and external AI transmission boundaries.
 * Invariant: If screenshot safety is uncertain or contains sensitive data,
 * it must NOT be written to persistent/public storage.
 */
export class ScreenshotPrivacyManager {
  public static evaluateScreenshotSafety(
    screenshotPathOrBuffer: string | Buffer | null,
    hasSensitiveData: boolean,
    context?: {
      elements?: any[];
      hasSensitiveFields?: boolean;
      userProvidedSensitiveData?: boolean;
    }
  ): ScreenshotSafetyAssessment {
    // 1. If explicitly flagged as sensitive
    if (hasSensitiveData || context?.hasSensitiveFields || context?.userProvidedSensitiveData) {
      return {
        allowed_for_external_ai: false,
        allowed_to_persist: false,
        is_sensitive: true,
        reason: 'Screenshot contains or is associated with sensitive/confidential form fields; external AI transmission and disk persistence strictly blocked.'
      };
    }

    // 2. Fail-closed: If payload is missing or empty, safety is uncertain -> do not persist
    if (!screenshotPathOrBuffer || (Buffer.isBuffer(screenshotPathOrBuffer) && screenshotPathOrBuffer.length === 0)) {
      return {
        allowed_for_external_ai: false,
        allowed_to_persist: false,
        is_sensitive: true,
        reason: 'Screenshot payload uncertain or empty; fail-closed policy forbids persistence.'
      };
    }

    // 3. Inspect candidate elements if provided
    if (context?.elements && Array.isArray(context.elements)) {
      const containsSensitive = context.elements.some((el: any) => {
        const type = String(el.type || '').toLowerCase();
        if (type === 'password') return true;
        const textToScan = `${el.name || ''} ${el.id || ''} ${el.label || ''} ${el.placeholder || ''} ${el.text || ''}`.toLowerCase();
        return /\b(password|passwd|pin|otp|secret|token|ssn|credit[_-]?card|cvv|cvc)\b/i.test(textToScan);
      });

      if (containsSensitive) {
        return {
          allowed_for_external_ai: false,
          allowed_to_persist: false,
          is_sensitive: true,
          reason: 'Screenshot scope contains detected sensitive input controls; storage and transmission blocked under fail-safe privacy policy.'
        };
      }
    }

    return {
      allowed_for_external_ai: true,
      allowed_to_persist: true,
      is_sensitive: false,
      reason: 'No sensitive credentials or protected values detected in screenshot scope.'
    };
  }
}

export class PrivacyGateway {
  // Common benign phrases that mention security concepts without being secret values
  private static readonly BENIGN_CONCEPT_PATTERNS = [
    /\bpassword\s+manager\b/i,
    /\bpassword\s+reset\s*(page|link|form)?\b/i,
    /\bforgot\s+password\b/i,
    /\botp\s+verification\s*(form|page|screen)?\b/i,
    /\b2fa\s+setup\b/i,
    /\bchange\s+password\s*(page|dialog)?\b/i
  ];

  /**
   * Parse user-provided text into discrete key-value candidates.
   * Handles JSON, key: value, key = value, and natural language clauses.
   */
  public static parseInformation(rawInput: string | Record<string, any>): RawFieldCandidate[] {
    if (!rawInput) return [];

    // 1. Direct object input
    if (typeof rawInput === 'object' && !Array.isArray(rawInput)) {
      return Object.entries(rawInput).map(([k, v]) => ({
        key: k.trim(),
        value: typeof v === 'string' ? v.trim() : JSON.stringify(v)
      }));
    }

    const text = String(rawInput).trim();
    if (!text) return [];

    // 2. Try JSON parsing
    if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return Object.entries(parsed).map(([k, v]) => ({
            key: k.trim(),
            value: typeof v === 'string' ? v.trim() : String(v)
          }));
        }
      } catch {
        // Fall back to line/regex parsing
      }
    }

    const candidates: RawFieldCandidate[] = [];
    const seenKeys = new Set<string>();

    // 3. Line-by-line parsing: "Key: Value" or "Key = Value"
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check "Key: Value" or "Key = Value"
      const kvMatch = trimmed.match(/^([a-zA-Z0-9_\s\-#]{1,40})\s*[:=]\s*(.+)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        const value = kvMatch[2].trim();
        if (key && value) {
          const normKey = key.toLowerCase();
          if (!seenKeys.has(normKey)) {
            candidates.push({ key, value });
            seenKeys.add(normKey);
          }
          continue;
        }
      }
    }

    // 4. Natural language phrasing extraction:
    // e.g. "password is Secret123", "OTP code is 123456", "my email is test@example.com"
    const nlPatterns = [
      { regex: /(?:my\s+)?(?:login\s+)?password\s+(?:is|:|to)\s+([^\s,;]+)/i, defaultKey: 'Password' },
      { regex: /(?:my\s+)?(?:one[\s-]time\s+password|otp(?:\s+code)?)\s+(?:is|:)\s+([^\s,;]+)/i, defaultKey: 'OTP' },
      { regex: /(?:my\s+)?(?:security\s+code|pin)\s+(?:is|:)\s+([^\s,;]+)/i, defaultKey: 'PIN' },
      { regex: /(?:my\s+)?(?:api[_-]?key|access[_-]?token)\s+(?:is|=|:)\s+([^\s,;]+)/i, defaultKey: 'API_Key' },
      { regex: /(?:my\s+)?email\s+(?:is|:)\s+([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/i, defaultKey: 'Email' },
      { regex: /(?:my\s+)?phone(?:\s+number)?\s+(?:is|:)\s+([\d+()\-.\s]{7,18})/i, defaultKey: 'Phone' },
      { regex: /(?:my\s+)?name\s+(?:is|:)\s+([A-Za-z\s]{2,40})/i, defaultKey: 'Name' },
      { regex: /(?:i\s+live\s+in|my\s+city\s+is)\s+([A-Za-z\s]{2,30})/i, defaultKey: 'City' }
    ];

    for (const pattern of nlPatterns) {
      const match = text.match(pattern.regex);
      if (match && match[1]) {
        const val = match[1].trim();
        const normKey = pattern.defaultKey.toLowerCase();
        if (!seenKeys.has(normKey)) {
          candidates.push({ key: pattern.defaultKey, value: val });
          seenKeys.add(normKey);
        }
      }
    }

    // 5. Standalone pattern extraction if not already caught
    // Standalone email
    const emailMatch = text.match(/\b([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b/);
    if (emailMatch && !seenKeys.has('email')) {
      candidates.push({ key: 'Email', value: emailMatch[1] });
      seenKeys.add('email');
    }

    // Standalone API key (e.g. sk-..., ghp_...)
    const apiKeyMatch = text.match(/\b(sk-[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{36}|AIza[0-9A-Za-z-_]{35})\b/);
    if (apiKeyMatch && !seenKeys.has('api_key') && !seenKeys.has('apikey')) {
      candidates.push({ key: 'API_Key', value: apiKeyMatch[1] });
      seenKeys.add('api_key');
    }

    // If no specific pairs found, wrap whole string as general query if non-empty
    if (candidates.length === 0 && text) {
      candidates.push({ key: 'General_Info', value: text });
    }

    return candidates;
  }

  /**
   * Classifies a candidate key-value pair into a structured sensitivity category.
   */
  public static classifyField(key: string, value: string): PrivacyAnalyzedField {
    const normKey = key.trim().toLowerCase();
    const val = value.trim();

    // 1. Check for Benign Security Concept Mentions (avoid false positives)
    for (const benignRegex of this.BENIGN_CONCEPT_PATTERNS) {
      if (benignRegex.test(val) || (benignRegex.test(key) && !val)) {
        return {
          key,
          category: 'GENERAL',
          sensitivity: 'LOW_SENSITIVITY',
          confidence: 0.95,
          reason: 'Mention of security term in benign conceptual context (not a credential value)',
          allowed_for_external_ai: true
        };
      }
    }

    // 2. PASSWORDS & CREDENTIALS
    if (
      normKey === 'pass' ||
      normKey === 'passwd' ||
      normKey === 'pwd' ||
      normKey.includes('password') ||
      normKey.includes('passcode') ||
      normKey === 'secret' ||
      normKey === 'client_secret' ||
      normKey === 'master_key'
    ) {
      return {
        key,
        category: 'PASSWORD',
        sensitivity: 'HIGHLY_SENSITIVE',
        confidence: 0.99,
        reason: 'Field explicitly designated as password/authentication secret',
        allowed_for_external_ai: false,
        redacted_preview: '[PROTECTED]'
      };
    }

    // 3. OTP & PINs
    if (
      normKey === 'otp' ||
      normKey.includes('one time password') ||
      normKey.includes('one-time password') ||
      normKey.includes('verification code') ||
      normKey === 'pin' ||
      normKey === 'mpin' ||
      normKey === 'security code' ||
      normKey === '2fa' ||
      normKey === 'mfa'
    ) {
      return {
        key,
        category: normKey.includes('pin') ? 'PIN' : 'OTP',
        sensitivity: 'HIGHLY_SENSITIVE',
        confidence: 0.99,
        reason: 'Time-sensitive one-time authentication token / PIN code',
        allowed_for_external_ai: false,
        redacted_preview: '[PROTECTED]'
      };
    }

    // Check if value looks like an OTP (4-8 digits) in an ambiguous or code-related field
    if (/^\d{4,8}$/.test(val) && (normKey.includes('code') || normKey.includes('token') || normKey.includes('auth'))) {
      return {
        key,
        category: 'OTP',
        sensitivity: 'HIGHLY_SENSITIVE',
        confidence: 0.94,
        reason: 'Numeric sequence matching one-time authentication token pattern',
        allowed_for_external_ai: false,
        redacted_preview: '[PROTECTED]'
      };
    }

    // 4. API KEYS & ACCESS TOKENS
    if (
      normKey.includes('api_key') ||
      normKey.includes('apikey') ||
      normKey.includes('access_token') ||
      normKey.includes('auth_token') ||
      normKey.includes('private_key') ||
      normKey === 'bearer' ||
      /^sk-[a-zA-Z0-9_-]{20,}$/.test(val) ||
      /^ghp_[a-zA-Z0-9]{36}$/.test(val) ||
      /^AIza[0-9A-Za-z-_]{35}$/.test(val)
    ) {
      return {
        key,
        category: 'API_KEY',
        sensitivity: 'HIGHLY_SENSITIVE',
        confidence: 0.98,
        reason: 'Secret programmatic authorization token or API key',
        allowed_for_external_ai: false,
        redacted_preview: '[PROTECTED]'
      };
    }

    // 5. PAYMENT & FINANCIAL CARDS
    if (
      normKey.includes('card') ||
      normKey.includes('credit') ||
      normKey.includes('debit') ||
      normKey.includes('cvv') ||
      normKey.includes('cvc') ||
      normKey.includes('bank_account') ||
      normKey.includes('iban') ||
      /^\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}$/.test(val)
    ) {
      return {
        key,
        category: 'PAYMENT',
        sensitivity: 'HIGHLY_SENSITIVE',
        confidence: 0.98,
        reason: 'Financial payment card or bank identifier',
        allowed_for_external_ai: false,
        redacted_preview: '[PROTECTED]'
      };
    }

    // 6. GOVERNMENT IDENTIFIERS
    if (
      normKey.includes('ssn') ||
      normKey.includes('social security') ||
      normKey.includes('aadhaar') ||
      normKey.includes('passport') ||
      normKey.includes('national_id') ||
      /^\d{3}-\d{2}-\d{4}$/.test(val) || // US SSN
      /^\d{4}\s\d{4}\s\d{4}$/.test(val)   // Indian Aadhaar
    ) {
      return {
        key,
        category: 'GOV_ID',
        sensitivity: 'HIGHLY_SENSITIVE',
        confidence: 0.96,
        reason: 'Official government identification number',
        allowed_for_external_ai: false,
        redacted_preview: '[PROTECTED]'
      };
    }

    // 7. EMAIL ADDRESSES (Personal)
    if (
      normKey.includes('email') ||
      normKey.includes('e-mail') ||
      /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(val)
    ) {
      return {
        key,
        category: 'EMAIL',
        sensitivity: 'PERSONAL',
        confidence: 0.99,
        reason: 'Personal direct communication email address',
        allowed_for_external_ai: true
      };
    }

    // 8. PHONE NUMBERS (Personal)
    if (
      normKey.includes('phone') ||
      normKey.includes('mobile') ||
      normKey.includes('telephone') ||
      normKey.includes('custtel') ||
      /^\+?[\d\s\-().]{7,20}$/.test(val) && /\d{7,}/.test(val.replace(/\D/g, ''))
    ) {
      return {
        key,
        category: 'PHONE',
        sensitivity: 'PERSONAL',
        confidence: 0.95,
        reason: 'Personal telecommunication telephone number',
        allowed_for_external_ai: true
      };
    }

    // 9. NAME & PERSONAL IDENTITY (Personal)
    if (
      normKey === 'name' ||
      normKey === 'fullname' ||
      normKey === 'full name' ||
      normKey === 'firstname' ||
      normKey === 'lastname' ||
      normKey === 'custname'
    ) {
      return {
        key,
        category: 'NAME',
        sensitivity: 'PERSONAL',
        confidence: 0.92,
        reason: 'Personal identity name',
        allowed_for_external_ai: true
      };
    }

    // 10. PHYSICAL ADDRESS / COMMENTS (Personal)
    if (
      normKey.includes('address') ||
      normKey.includes('street') ||
      normKey.includes('residence') ||
      normKey.includes('comments') ||
      normKey.includes('instructions')
    ) {
      return {
        key,
        category: 'ADDRESS',
        sensitivity: 'PERSONAL',
        confidence: 0.88,
        reason: 'Physical delivery address or personal notes',
        allowed_for_external_ai: true
      };
    }

    // 11. DATE OF BIRTH (Personal)
    if (normKey.includes('dob') || normKey.includes('birth') || normKey.includes('birthday')) {
      return {
        key,
        category: 'DOB',
        sensitivity: 'PERSONAL',
        confidence: 0.94,
        reason: 'Personal date of birth',
        allowed_for_external_ai: true
      };
    }

    // 12. GENERAL / PUBLIC ATTRIBUTES (Low Sensitivity / Public)
    if (
      normKey.includes('city') ||
      normKey.includes('country') ||
      normKey.includes('state') ||
      normKey.includes('zip') ||
      normKey.includes('postal') ||
      normKey.includes('course') ||
      normKey.includes('role') ||
      normKey.includes('job') ||
      normKey.includes('title') ||
      normKey.includes('company') ||
      normKey.includes('organization') ||
      normKey.includes('topic') ||
      normKey.includes('size') ||
      normKey.includes('topping') ||
      normKey.includes('delivery') ||
      normKey.includes('query')
    ) {
      return {
        key,
        category: 'GENERAL',
        sensitivity: 'LOW_SENSITIVITY',
        confidence: 0.95,
        reason: 'General geographic, operational, or categorical form attribute',
        allowed_for_external_ai: true
      };
    }

    // 13. High-entropy token fallback guard (Fail-Closed)
    // If key or value is completely unknown, but value is a high-entropy hex/base64 string > 24 chars
    if (/^[A-Za-z0-9+/=_-]{24,}$/.test(val) && !val.includes(' ')) {
      return {
        key,
        category: 'API_KEY',
        sensitivity: 'HIGHLY_SENSITIVE',
        confidence: 0.85,
        reason: 'Unidentified high-entropy string isolated under fail-closed security rule',
        allowed_for_external_ai: false,
        redacted_preview: '[PROTECTED]'
      };
    }

    // Default: General safe standard attribute
    return {
      key,
      category: 'GENERAL',
      sensitivity: 'LOW_SENSITIVITY',
      confidence: 0.8,
      reason: 'General form value with no sensitive markers detected',
      allowed_for_external_ai: true
    };
  }

  /**
   * Main Gateway Method: Analyzes input, classifies each item, protects secrets locally,
   * and prepares the safe payload for external AI.
   */
  public static analyze(
    rawInput: string | Record<string, any>,
    taskId?: string
  ): PrivacyAnalysisResult {
    try {
      const candidates = this.parseInformation(rawInput);
      const safeData: PrivacyAnalyzedField[] = [];
      const protectedData: PrivacyAnalyzedField[] = [];
      const safePayload: Record<string, any> = {};
      const localSecrets: Record<string, string> = {};

      for (const candidate of candidates) {
        const classified = this.classifyField(candidate.key, candidate.value);

        if (classified.sensitivity === 'HIGHLY_SENSITIVE' || classified.sensitivity === 'SENSITIVE') {
          // Store raw value ONLY in local in-memory vault
          localSecrets[candidate.key] = candidate.value;

          // DO NOT include raw value in response
          protectedData.push({
            key: classified.key,
            category: classified.category,
            sensitivity: classified.sensitivity,
            confidence: classified.confidence,
            reason: classified.reason,
            allowed_for_external_ai: false,
            redacted_preview: '[PROTECTED]'
          });
        } else {
          // Safe to include in external AI payload
          safeData.push({
            key: classified.key,
            value: candidate.value,
            category: classified.category,
            sensitivity: classified.sensitivity,
            confidence: classified.confidence,
            reason: classified.reason,
            allowed_for_external_ai: true
          });
          safePayload[candidate.key] = candidate.value;
        }
      }

      // If a taskId is provided, store the protected secrets strictly locally
      if (taskId && Object.keys(localSecrets).length > 0) {
        LocalSecureStore.saveTaskSecrets(taskId, localSecrets);
      }

      const hasProtected = protectedData.length > 0;
      const externalAccess = hasProtected ? 'BLOCKED_FOR_PROTECTED' : 'ALLOWED';

      return {
        success: true,
        analyzed_count: candidates.length,
        safe_data: safeData,
        protected_data: protectedData,
        external_ai_safe_payload: safePayload,
        external_ai_access: externalAccess,
        redaction_active: hasProtected,
        message: hasProtected
          ? `${protectedData.length} sensitive item(s) isolated locally; ${safeData.length} safe item(s) approved for external AI.`
          : `All ${safeData.length} item(s) approved for processing.`,
        scan_status: 'completed'
      };
    } catch (err: any) {
      // Fail-Closed policy: On any error, block all external processing
      console.error('[Privacy Gateway Error] Analysis encountered unexpected error:', err?.message);
      return {
        success: false,
        analyzed_count: 0,
        safe_data: [],
        protected_data: [],
        external_ai_safe_payload: {},
        external_ai_access: 'RESTRICTED',
        redaction_active: true,
        message: 'Privacy scan encountered an error. External AI access paused under fail-closed security policy.',
        scan_status: 'failed',
        error: err?.message || 'Privacy scan error'
      };
    }
  }

  /**
   * Gatekeeper interface for any future external AI or LLM request.
   * STRICT GUARANTEE: Returns ONLY data where allowed_for_external_ai is true.
   * Throws immediately if the privacy scan failed or was restricted.
   */
  public static get_external_ai_safe_data(analysis: PrivacyAnalysisResult): Record<string, any> {
    if (!analysis || !analysis.success || analysis.scan_status === 'failed') {
      throw new Error(
        'External AI Access Blocked: Privacy analysis either failed or was not completed (Fail-Closed Enforcement).'
      );
    }

    const payload: Record<string, any> = {};
    for (const item of analysis.safe_data) {
      if (
        item.allowed_for_external_ai &&
        item.sensitivity !== 'HIGHLY_SENSITIVE' &&
        item.sensitivity !== 'SENSITIVE'
      ) {
        payload[item.key] = item.value;
      }
    }
    return payload;
  }
}
