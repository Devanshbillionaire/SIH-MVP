/**
 * PrivaSight — External AI Semantic Reasoning Adapter (Phase 8/9)
 * 
 * ROLE:
 * Semantic Reasoning Assistant ONLY.
 * It is NOT an autonomous browser controller.
 * 
 * BOUNDARIES & SAFETY INVARIANTS:
 * 1. External AI NEVER receives raw secrets, passwords, OTPs, API keys, or cookies.
 * 2. Only consumes sanitized metadata approved by PrivacyGateway.
 * 3. External AI MUST NOT execute clicks, types, fills, submissions, or control Playwright.
 * 4. External AI output is strictly validated JSON. Free-form text is never executed.
 * 5. Automatic Fallback: If GEMINI_API_KEY is missing, times out, or errors,
 *    the system seamlessly falls back to ElementDetector + ML + Fuzzy Logic.
 */

import { GoogleGenAI } from '@google/genai';

export interface SanitizedCandidateContext {
  id: string;
  tag: string;
  type?: string;
  role?: string;
  placeholder?: string;
  ariaLabel?: string;
  text?: string;
  name?: string;
}

export interface ExternalAIReasoningRequest {
  targetField: string;
  fieldDescription?: string;
  pageTitle?: string;
  sanitizedCandidates: SanitizedCandidateContext[];
  timeoutMs?: number;
}

export interface ExternalAIReasoningResponse {
  candidateId: string | null;
  confidence: number;
  reason: string;
  source: 'GEMINI' | 'LOCAL_FALLBACK';
  modelUsed?: string;
  error?: string;
}

export class ExternalAIService {
  private static aiClient: GoogleGenAI | null = null;
  private static readonly MODEL_NAME = 'gemini-3.8-flash';
  private static readonly DEFAULT_TIMEOUT_MS = 5000;

  /**
   * Checks whether external AI is configured via environment variable.
   * Never exposes the key.
   */
  public static isConfigured(): boolean {
    const key = process.env.GEMINI_API_KEY;
    return typeof key === 'string' && key.trim().length > 0;
  }

  /**
   * Sanitizes arbitrary text before prompt construction by redacting passwords,
   * OTP tokens, API keys, and payment credentials.
   */
  public static sanitizeText(text: string): string {
    if (!text) return '';
    return text
      .replace(/(?:password|passwd|pwd)\s*[:=]\s*([^\s,;]+)/gi, 'password: [REDACTED]')
      .replace(/(?:otp|pin|token)\s*[:=]\s*([^\s,;]+)/gi, 'otp: [REDACTED]')
      .replace(/\b(sk-[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{36}|AIza[0-9A-Za-z-_]{35})\b/g, '[REDACTED_API_KEY]')
      .replace(/(?:password\s+is\s+)([^\s,;]+)/gi, 'password is [REDACTED]')
      .replace(/(?:otp\s+is\s+)([^\s,;]+)/gi, 'otp is [REDACTED]')
      .replace(/(?:password\s+)([^\s,;]+)/gi, 'password [REDACTED]')
      .replace(/(?:otp\s+)(\d{4,8})/gi, 'otp [REDACTED]');
  }

  /**
   * Lazy initialization of GoogleGenAI client on server side.
   */
  private static getClient(): GoogleGenAI | null {
    if (!this.aiClient && this.isConfigured()) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      } catch (err: any) {
        console.warn('[ExternalAI] Failed to initialize GoogleGenAI client:', err?.message);
        this.aiClient = null;
      }
    }
    return this.aiClient;
  }

  /**
   * Evaluates candidate elements for semantic relevance to a target field name.
   * Guaranteed to fall back locally if key is missing, timeout occurs, or API fails.
   */
  public static async disambiguateCandidate(
    request: ExternalAIReasoningRequest
  ): Promise<ExternalAIReasoningResponse> {
    const { targetField, sanitizedCandidates, pageTitle, timeoutMs = this.DEFAULT_TIMEOUT_MS } = request;

    // Fast-path local fallback if no candidates
    if (!sanitizedCandidates || sanitizedCandidates.length === 0) {
      return {
        candidateId: null,
        confidence: 0,
        reason: 'No candidates provided for semantic evaluation',
        source: 'LOCAL_FALLBACK'
      };
    }

    // Fast-path local fallback if not configured
    if (!this.isConfigured()) {
      return {
        candidateId: null,
        confidence: 0,
        reason: 'GEMINI_API_KEY not configured in environment; using local heuristic and ML pipeline',
        source: 'LOCAL_FALLBACK'
      };
    }

    const client = this.getClient();
    if (!client) {
      return {
        candidateId: null,
        confidence: 0,
        reason: 'AI client unavailable; using local heuristic and ML pipeline',
        source: 'LOCAL_FALLBACK'
      };
    }

    // Ensure candidates don't contain any sensitive keys
    const safeCandidates = sanitizedCandidates.map(c => ({
      id: String(c.id || ''),
      tag: String(c.tag || ''),
      type: c.type ? String(c.type) : undefined,
      role: c.role ? String(c.role) : undefined,
      placeholder: c.placeholder ? String(c.placeholder) : undefined,
      ariaLabel: c.ariaLabel ? String(c.ariaLabel) : undefined,
      text: c.text ? String(c.text).slice(0, 100) : undefined,
      name: c.name ? String(c.name) : undefined
    }));

    const validCandidateIds = new Set(safeCandidates.map(c => c.id));

    const prompt = `You are a semantic UI field matching assistant.
Your task is to identify which HTML candidate element best matches the intended user field '${targetField}'.
Page title: ${pageTitle || 'Unknown'}

Available candidate elements (sanitized):
${JSON.stringify(safeCandidates, null, 2)}

Respond with a strictly valid JSON object adhering to this schema:
{
  "candidateId": string (must exactly match one of the candidate 'id' values above, or null if none match),
  "confidence": number between 0.0 and 1.0,
  "reason": string explaining the semantic match
}

Do NOT include markdown backticks or extra commentary. Return valid JSON only.`;

    try {
      // Use Promise.race for strict timeout enforcement
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`External AI request timed out after ${timeoutMs}ms`)), timeoutMs)
      );

      const apiCallPromise = client.models.generateContent({
        model: this.MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const response: any = await Promise.race([apiCallPromise, timeoutPromise]);
      const rawText = response.text || (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) || '';

      if (!rawText) {
        throw new Error('Empty response received from External AI model');
      }

      // Parse and validate structured JSON
      const parsed = JSON.parse(rawText.trim());

      const candidateId = typeof parsed.candidateId === 'string' && validCandidateIds.has(parsed.candidateId)
        ? parsed.candidateId
        : null;

      const confidence = typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5;

      const reason = typeof parsed.reason === 'string'
        ? parsed.reason.slice(0, 200)
        : 'Semantic match evaluated by external model';

      return {
        candidateId,
        confidence,
        reason,
        source: 'GEMINI',
        modelUsed: this.MODEL_NAME
      };
    } catch (err: any) {
      console.warn(`[ExternalAI Fallback] ${err?.message || 'Unknown error'}. Falling back to local pipeline.`);
      return {
        candidateId: null,
        confidence: 0,
        reason: `External AI unavailable (${err?.message || 'Error'}). Local engines active.`,
        source: 'LOCAL_FALLBACK',
        error: err?.message
      };
    }
  }
}
