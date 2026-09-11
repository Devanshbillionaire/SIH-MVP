export * from './privacyGateway';
import { PrivacyGateway, PrivacyAnalysisResult } from './privacyGateway';

export class PrivacyDataFilter {
  /**
   * Performs full classification and sensitivity isolation via PrivacyGateway.
   */
  public static analyzeInformation(
    rawInput: string | Record<string, any>,
    taskId?: string
  ): PrivacyAnalysisResult {
    return PrivacyGateway.analyze(rawInput, taskId);
  }

  /**
   * Sanitizes text strings or object structures removing PII before logging/learning.
   */
  public static sanitizeText(text: string): string {
    if (!text) return '';
    let sanitized = text;

    // Email addresses
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');

    // Phone numbers (e.g. 10 digits or dashed)
    sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE_REDACTED]');
    sanitized = sanitized.replace(/\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/g, '[PHONE_REDACTED]');

    // Passwords / tokens in query params or text
    sanitized = sanitized.replace(/(password|passwd|pwd|secret|token|api_key|auth)=[^&\s]+/gi, '$1=[CONFIDENTIAL_REDACTED]');

    // Credit cards or 16-digit numbers
    sanitized = sanitized.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD_REDACTED]');

    return sanitized;
  }

  public static sanitizeObject<T>(data: T): T {
    if (typeof data === 'string') {
      return this.sanitizeText(data) as unknown as T;
    }
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeObject(item)) as unknown as T;
    }
    if (data !== null && typeof data === 'object') {
      const sanitizedObj: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (/password|secret|credit_card|cvv|ssn/i.test(key)) {
          sanitizedObj[key] = '[CONFIDENTIAL_REDACTED]';
        } else {
          sanitizedObj[key] = this.sanitizeObject(value);
        }
      }
      return sanitizedObj as T;
    }
    return data;
  }
}
