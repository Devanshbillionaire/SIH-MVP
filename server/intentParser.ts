import { GoogleGenAI } from '@google/genai';
import {
  IntentActionType,
  IntentFieldInstruction,
  TaskIntent
} from '../src/types';
import { LocalSecureStore } from './privacyGateway';

export interface ParsedIntent {
  intent: 'SEARCH' | 'OPEN_RESULT' | 'FILL_FORM' | 'CLICK_ELEMENT' | 'NAVIGATE';
  sub_intent: 'OPEN_RESULT' | 'ADD_TO_CART' | 'SUBMIT_FORM' | 'BOOK_FLIGHT' | null;
  query: string | null;
  target: string | null;
  confidence: number;
  description: string;
  form_data?: {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    [key: string]: any;
  };
  from?: string;
  to?: string;
  parser_mode?: string;
}

export interface FieldDefinition {
  normalized: string;
  category: string;
  sensitivity: 'SAFE' | 'PERSONAL' | 'HIGHLY_SENSITIVE';
  execution: 'LOCAL' | 'LOCAL_ONLY' | 'STANDARD';
  defaultAction?: 'FILL' | 'TYPE' | 'SELECT' | 'CHECK' | 'UNCHECK';
}

// Canonical synonym dictionary for deterministic field normalization
export const FIELD_SYNONYMS: Record<string, FieldDefinition> = {
  // Name
  'name': { normalized: 'NAME', category: 'name', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'FILL' },
  'full name': { normalized: 'NAME', category: 'name', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'FILL' },
  'your name': { normalized: 'NAME', category: 'name', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'FILL' },
  'user name': { normalized: 'NAME', category: 'name', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'FILL' },
  'applicant name': { normalized: 'NAME', category: 'name', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'FILL' },
  'first name': { normalized: 'FIRST_NAME', category: 'name', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'FILL' },
  'last name': { normalized: 'LAST_NAME', category: 'name', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'FILL' },

  // Email
  'email': { normalized: 'EMAIL', category: 'email', sensitivity: 'PERSONAL', execution: 'LOCAL', defaultAction: 'FILL' },
  'mail': { normalized: 'EMAIL', category: 'email', sensitivity: 'PERSONAL', execution: 'LOCAL', defaultAction: 'FILL' },
  'email address': { normalized: 'EMAIL', category: 'email', sensitivity: 'PERSONAL', execution: 'LOCAL', defaultAction: 'FILL' },
  'e-mail': { normalized: 'EMAIL', category: 'email', sensitivity: 'PERSONAL', execution: 'LOCAL', defaultAction: 'FILL' },
  'user email': { normalized: 'EMAIL', category: 'email', sensitivity: 'PERSONAL', execution: 'LOCAL', defaultAction: 'FILL' },

  // Phone
  'phone': { normalized: 'PHONE', category: 'phone', sensitivity: 'PERSONAL', execution: 'LOCAL', defaultAction: 'FILL' },
  'phone number': { normalized: 'PHONE', category: 'phone', sensitivity: 'PERSONAL', execution: 'LOCAL', defaultAction: 'FILL' },
  'mobile': { normalized: 'PHONE', category: 'phone', sensitivity: 'PERSONAL', execution: 'LOCAL', defaultAction: 'FILL' },
  'mobile number': { normalized: 'PHONE', category: 'phone', sensitivity: 'PERSONAL', execution: 'LOCAL', defaultAction: 'FILL' },
  'contact number': { normalized: 'PHONE', category: 'phone', sensitivity: 'PERSONAL', execution: 'LOCAL', defaultAction: 'FILL' },
  'contact': { normalized: 'PHONE', category: 'phone', sensitivity: 'PERSONAL', execution: 'LOCAL', defaultAction: 'FILL' },
  'cell': { normalized: 'PHONE', category: 'phone', sensitivity: 'PERSONAL', execution: 'LOCAL', defaultAction: 'FILL' },
  'cell phone': { normalized: 'PHONE', category: 'phone', sensitivity: 'PERSONAL', execution: 'LOCAL', defaultAction: 'FILL' },

  // Location / Address
  'city': { normalized: 'CITY', category: 'city', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'FILL' },
  'location': { normalized: 'CITY', category: 'city', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'FILL' },
  'town': { normalized: 'CITY', category: 'city', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'FILL' },
  'country': { normalized: 'COUNTRY', category: 'country', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'SELECT' },
  'nation': { normalized: 'COUNTRY', category: 'country', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'SELECT' },
  'state': { normalized: 'STATE', category: 'state', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'SELECT' },
  'province': { normalized: 'STATE', category: 'state', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'SELECT' },
  'zip': { normalized: 'ZIP_CODE', category: 'zip', sensitivity: 'PERSONAL', execution: 'LOCAL', defaultAction: 'FILL' },
  'zip code': { normalized: 'ZIP_CODE', category: 'zip', sensitivity: 'PERSONAL', execution: 'LOCAL', defaultAction: 'FILL' },
  'postal code': { normalized: 'ZIP_CODE', category: 'zip', sensitivity: 'PERSONAL', execution: 'LOCAL', defaultAction: 'FILL' },
  'address': { normalized: 'ADDRESS', category: 'address', sensitivity: 'PERSONAL', execution: 'LOCAL', defaultAction: 'FILL' },
  'street': { normalized: 'ADDRESS', category: 'address', sensitivity: 'PERSONAL', execution: 'LOCAL', defaultAction: 'FILL' },
  'street address': { normalized: 'ADDRESS', category: 'address', sensitivity: 'PERSONAL', execution: 'LOCAL', defaultAction: 'FILL' },

  // Highly Sensitive Credentials (Phase 3 Integration)
  'password': { normalized: 'PASSWORD', category: 'password', sensitivity: 'HIGHLY_SENSITIVE', execution: 'LOCAL_ONLY', defaultAction: 'FILL' },
  'pwd': { normalized: 'PASSWORD', category: 'password', sensitivity: 'HIGHLY_SENSITIVE', execution: 'LOCAL_ONLY', defaultAction: 'FILL' },
  'pass': { normalized: 'PASSWORD', category: 'password', sensitivity: 'HIGHLY_SENSITIVE', execution: 'LOCAL_ONLY', defaultAction: 'FILL' },
  'login password': { normalized: 'PASSWORD', category: 'password', sensitivity: 'HIGHLY_SENSITIVE', execution: 'LOCAL_ONLY', defaultAction: 'FILL' },
  'otp': { normalized: 'OTP', category: 'otp', sensitivity: 'HIGHLY_SENSITIVE', execution: 'LOCAL_ONLY', defaultAction: 'FILL' },
  'one time password': { normalized: 'OTP', category: 'otp', sensitivity: 'HIGHLY_SENSITIVE', execution: 'LOCAL_ONLY', defaultAction: 'FILL' },
  'verification code': { normalized: 'OTP', category: 'otp', sensitivity: 'HIGHLY_SENSITIVE', execution: 'LOCAL_ONLY', defaultAction: 'FILL' },
  'security code': { normalized: 'OTP', category: 'otp', sensitivity: 'HIGHLY_SENSITIVE', execution: 'LOCAL_ONLY', defaultAction: 'FILL' },
  'api key': { normalized: 'API_KEY', category: 'api_key', sensitivity: 'HIGHLY_SENSITIVE', execution: 'LOCAL_ONLY', defaultAction: 'FILL' },
  'apikey': { normalized: 'API_KEY', category: 'api_key', sensitivity: 'HIGHLY_SENSITIVE', execution: 'LOCAL_ONLY', defaultAction: 'FILL' },
  'secret key': { normalized: 'API_KEY', category: 'api_key', sensitivity: 'HIGHLY_SENSITIVE', execution: 'LOCAL_ONLY', defaultAction: 'FILL' },
  'credit card': { normalized: 'CREDIT_CARD', category: 'credit_card', sensitivity: 'HIGHLY_SENSITIVE', execution: 'LOCAL_ONLY', defaultAction: 'FILL' },
  'card number': { normalized: 'CREDIT_CARD', category: 'credit_card', sensitivity: 'HIGHLY_SENSITIVE', execution: 'LOCAL_ONLY', defaultAction: 'FILL' },
  'cvv': { normalized: 'CVV', category: 'cvv', sensitivity: 'HIGHLY_SENSITIVE', execution: 'LOCAL_ONLY', defaultAction: 'FILL' },
  'bank account': { normalized: 'BANK_ACCOUNT', category: 'bank_account', sensitivity: 'HIGHLY_SENSITIVE', execution: 'LOCAL_ONLY', defaultAction: 'FILL' },
  'ssn': { normalized: 'GOVT_ID', category: 'govt_id', sensitivity: 'HIGHLY_SENSITIVE', execution: 'LOCAL_ONLY', defaultAction: 'FILL' },
  'government id': { normalized: 'GOVT_ID', category: 'govt_id', sensitivity: 'HIGHLY_SENSITIVE', execution: 'LOCAL_ONLY', defaultAction: 'FILL' },

  // Checkboxes & Selection
  'terms': { normalized: 'TERMS', category: 'terms', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'CHECK' },
  'terms and conditions': { normalized: 'TERMS', category: 'terms', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'CHECK' },
  'terms & conditions': { normalized: 'TERMS', category: 'terms', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'CHECK' },
  'tos': { normalized: 'TERMS', category: 'terms', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'CHECK' },
  'policy': { normalized: 'TERMS', category: 'terms', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'CHECK' },
  'agreement': { normalized: 'TERMS', category: 'terms', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'CHECK' },
  'remember me': { normalized: 'REMEMBER_ME', category: 'remember_me', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'CHECK' },
  'newsletter': { normalized: 'NEWSLETTER', category: 'newsletter', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'CHECK' },
  'newsletter subscription': { normalized: 'NEWSLETTER', category: 'newsletter', sensitivity: 'SAFE', execution: 'LOCAL', defaultAction: 'CHECK' }
};

export class IntentParser {
  /**
   * Normalize an extracted field string into canonical definition
   */
  public static normalizeField(raw: string): FieldDefinition {
    const cleaned = raw.toLowerCase().replace(/^(?:my|the|your|a|an)\s+/i, '').trim();
    if (FIELD_SYNONYMS[cleaned]) {
      return FIELD_SYNONYMS[cleaned];
    }

    // Partial match heuristics
    for (const [synonym, def] of Object.entries(FIELD_SYNONYMS)) {
      if (cleaned.includes(synonym) || synonym.includes(cleaned)) {
        return def;
      }
    }

    // Fallback: Custom unknown field
    return {
      normalized: cleaned.toUpperCase().replace(/\s+/g, '_'),
      category: cleaned,
      sensitivity: 'SAFE',
      execution: 'LOCAL',
      defaultAction: 'FILL'
    };
  }

  /**
   * Deterministically separate user data key-values from task instructions
   */
  public static extractUserData(rawInput: string | Record<string, string> | undefined): Record<string, string> {
    const userData: Record<string, string> = {};
    if (!rawInput) return userData;

    if (typeof rawInput === 'object') {
      for (const [k, v] of Object.entries(rawInput)) {
        if (v && typeof v === 'string') {
          userData[k] = v.trim();
        }
      }
      return userData;
    }

    const text = String(rawInput).trim();
    if (!text) return userData;

    // 1. Explicit key-value lines (e.g. "Name: Alice", "Email = bob@test.com")
    const lines = text.split('\n');
    for (const line of lines) {
      const match = line.match(/^([^:=]+)[:=-]\s*(.+)$/);
      if (match) {
        const k = match[1].trim();
        const v = match[2].trim();
        if (k && v) {
          userData[k] = v;
        }
      }
    }

    // 2. Embedded data pattern recognition if no lines matched
    if (Object.keys(userData).length === 0) {
      const emailMatch = text.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/);
      if (emailMatch) userData['Email'] = emailMatch[0];

      const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}|\b\d{10}\b/);
      if (phoneMatch) userData['Phone'] = phoneMatch[0];

      const nameMatch = text.match(/(?:my name is|name is)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i) ||
                        text.match(/(?:for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (nameMatch) {
        const candidateName = nameMatch[1].trim();
        const lowerName = candidateName.toLowerCase();
        if (!['me', 'us', 'you', 'him', 'her', 'them', 'now', 'later', 'free', 'here'].includes(lowerName)) {
          userData['Name'] = candidateName;
        }
      }

      const cityMatch = text.match(/(?:in city|city:|location:)\s+([A-Za-z\s]+)/i);
      if (cityMatch) userData['City'] = cityMatch[1].trim();

      const pwdMatch = text.match(/(?:password|pwd)\s*(?:is|:|=)\s*(\S+)/i);
      if (pwdMatch) {
        // Vault securely; do not leave cleartext
        userData['Password'] = pwdMatch[1];
      }
    }

    return userData;
  }

  /**
   * Main deterministic Intent Parsing Entry Point (Phase 6)
   */
  public static parse(taskPrompt: string, externalUserData?: string | Record<string, string>): TaskIntent {
    const rawTask = (taskPrompt || '').trim();
    const lower = rawTask.toLowerCase();

    // 1. Separate user data from task prompt
    const extractedData = this.extractUserData(externalUserData || rawTask);

    // If sensitive data like password exists in user data, register in LocalSecureStore
    if (extractedData['Password'] || extractedData['password']) {
      const secret = extractedData['Password'] || extractedData['password'];
      LocalSecureStore.saveTaskSecrets(`intent_vault_${Date.now()}`, { password: secret });
    }

    // 2. Check for empty task
    if (!rawTask) {
      return {
        action: 'FILL',
        status: 'INVALID',
        fields: [],
        raw_task: '',
        normalized_action: 'FILL',
        requires_confirmation: false,
        clarification_reason: 'Task is empty: Please provide a description of the task to perform.'
      };
    }

    // 3. Ambiguous Intent Detection (Section 7)
    // "fill my details", "fill the form", "fill my info", "complete the form"
    const isAmbiguousPrompt =
      /^(?:fill|enter|submit|complete)\s+(?:all\s+)?(?:my\s+)?(?:details|info|information|data|form)(?:\s+for\s+me)?\.?$/i.test(lower) ||
      /^(?:fill|complete)\s+(?:the\s+)?(?:form|page|inputs)(?:\s+using\s+my\s+saved\s+information)?\.?$/i.test(lower);

    if (isAmbiguousPrompt && Object.keys(extractedData).length === 0) {
      return {
        action: 'FILL',
        status: 'NEEDS_CLARIFICATION',
        fields: [],
        raw_task: rawTask,
        normalized_action: 'FILL',
        requires_confirmation: true,
        clarification_reason: 'The requested fields were not specified. Please specify which fields to fill or provide your details.',
        explanation: 'Ambiguous request: No target fields or user data specified. Waiting for user clarification.'
      };
    }

    // 4. Action: SEARCH
    if (/^(?:search|find|look for)\s+/i.test(lower) && !lower.includes('form') && !lower.includes('input')) {
      const searchMatch = rawTask.match(/(?:search|find|look for)\s+(?:for\s+)?(.+?)(?:\s+on\s+the\s+page|\s+in\s+the\s+site|$)/i);
      const query = searchMatch ? searchMatch[1].replace(/["']/g, '').trim() : rawTask;

      return {
        action: 'SEARCH',
        status: 'READY',
        target: 'Search Input',
        query,
        fields: [
          {
            field_name: 'Search Query',
            normalized_name: 'SEARCH_QUERY',
            value_source: 'TASK_PROMPT',
            value_preview: query,
            sensitivity: 'SAFE',
            execution: 'LOCAL',
            preferred_action: 'TYPE',
            required: true,
            value: query
          }
        ],
        raw_task: rawTask,
        normalized_action: 'SEARCH',
        requires_confirmation: false,
        confidence: 0.95,
        explanation: `Recognized search intent for query: '${query}'`
      };
    }

    // 5. Action: SELECT
    // "select India as country", "select California from state dropdown", "choose California for state"
    const selectMatch =
      rawTask.match(/(?:select|choose|pick)\s+([a-zA-Z0-9\s]+?)\s+(?:as|for|from|in)\s+(?:the\s+)?([a-zA-Z0-9\s]+?)(?:\s+dropdown|\s+select|$)/i) ||
      rawTask.match(/(?:select|choose|pick)\s+(?:the\s+)?([a-zA-Z0-9\s]+?)\s+(?:dropdown|option)\s+(?:as|to|with)\s+([a-zA-Z0-9\s]+)/i);

    if (selectMatch) {
      const value = selectMatch[1].trim();
      const target = selectMatch[2].trim();
      const fieldDef = this.normalizeField(target);

      return {
        action: 'SELECT',
        status: 'READY',
        target: fieldDef.category,
        value,
        fields: [
          {
            field_name: target,
            normalized_name: fieldDef.normalized,
            value_source: 'TASK_PROMPT',
            value_preview: value,
            sensitivity: fieldDef.sensitivity,
            execution: fieldDef.execution,
            preferred_action: 'SELECT',
            required: true,
            value
          }
        ],
        raw_task: rawTask,
        normalized_action: 'SELECT',
        requires_confirmation: false,
        confidence: 0.94,
        explanation: `Recognized selection: Set '${target}' option to '${value}'`
      };
    }

    // 6. Action: CHECK / UNCHECK
    // "check the terms and conditions checkbox", "check remember me", "uncheck newsletter subscription"
    if (/(?:uncheck|untick|deselect)\s+/i.test(lower)) {
      const uncheckMatch = rawTask.match(/(?:uncheck|untick|deselect)\s+(?:the\s+)?(.+?)(?:\s+checkbox|\s+box|$)/i);
      const target = uncheckMatch ? uncheckMatch[1].trim() : 'checkbox';
      const fieldDef = this.normalizeField(target);

      return {
        action: 'UNCHECK',
        status: 'READY',
        target: fieldDef.category,
        value: 'false',
        fields: [
          {
            field_name: target,
            normalized_name: fieldDef.normalized,
            value_source: 'TASK_PROMPT',
            value_preview: 'Uncheck (false)',
            sensitivity: 'SAFE',
            execution: 'LOCAL',
            preferred_action: 'UNCHECK',
            required: false,
            value: 'false'
          }
        ],
        raw_task: rawTask,
        normalized_action: 'UNCHECK',
        requires_confirmation: false,
        confidence: 0.94,
        explanation: `Recognized checkbox de-selection for '${target}'`
      };
    }

    if (/(?:check|tick)\s+/i.test(lower) && !lower.includes('check out')) {
      const checkMatch = rawTask.match(/(?:check|tick)\s+(?:the\s+)?(.+?)(?:\s+checkbox|\s+box|$)/i);
      const target = checkMatch ? checkMatch[1].trim() : 'checkbox';
      const fieldDef = this.normalizeField(target);

      return {
        action: 'CHECK',
        status: 'READY',
        target: fieldDef.category,
        value: 'true',
        fields: [
          {
            field_name: target,
            normalized_name: fieldDef.normalized,
            value_source: 'TASK_PROMPT',
            value_preview: 'Check (true)',
            sensitivity: 'SAFE',
            execution: 'LOCAL',
            preferred_action: 'CHECK',
            required: true,
            value: 'true'
          }
        ],
        raw_task: rawTask,
        normalized_action: 'CHECK',
        requires_confirmation: false,
        confidence: 0.94,
        explanation: `Recognized checkbox selection for '${target}'`
      };
    }

    // 7. Action: CLICK
    // "click login", "click submit button", "click search button"
    if (/^(?:click|press|tap)\s+/i.test(lower)) {
      const clickMatch = rawTask.match(/^(?:click|press|tap)\s+(?:on\s+)?(?:the\s+)?(.+?)$/i);
      const target = clickMatch ? clickMatch[1].trim() : 'Button';

      return {
        action: 'CLICK',
        status: 'READY',
        target,
        fields: [],
        raw_task: rawTask,
        normalized_action: 'CLICK',
        requires_confirmation: /delete|remove|pay|purchase|buy|confirm/i.test(target),
        confidence: 0.93,
        explanation: `Recognized click action on element '${target}'`
      };
    }

    // 8. Action: FILL / TYPE (Multi-field or Single field)
    // Extract fields requested in the natural language task
    const requestedFields: IntentFieldInstruction[] = [];
    const skippedFields: string[] = [];

    // Detect "leave X for me", "leave X untouched", "skip X", "don't fill X", "do not fill X", "keep X untouched", etc.
    const skipRegex = /(?:leave\s+(?:the\s+)?([a-zA-Z\s]+?)\s+(?:field\s+)?(?:for\s+me|untouched|empty|blank|alone)|keep\s+(?:the\s+)?([a-zA-Z\s]+?)\s+(?:field\s+)?(?:untouched|empty|blank)|skip\s+(?:the\s+)?([a-zA-Z\s]+?)(?:\s+field)?|(?:don'?t|do\s+not)\s+(?:fill|touch|enter)\s+(?:the\s+)?([a-zA-Z\s]+?)(?:\s+field)?)/gi;
    let skipMatch: RegExpExecArray | null;
    while ((skipMatch = skipRegex.exec(rawTask)) !== null) {
      const fieldStr = (skipMatch[1] || skipMatch[2] || skipMatch[3] || skipMatch[4] || '').trim();
      if (fieldStr) {
        skippedFields.push(fieldStr.toLowerCase());
      }
    }

    // Helper for case-insensitive lookup in extractedData
    const getExtractedVal = (key: string): string | undefined => {
      const cleanTarget = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [k, v] of Object.entries(extractedData)) {
        if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget) {
          return v;
        }
      }
      return undefined;
    };

    // Match requested fields from prompt tokens
    // Patterns: "fill my name, email and phone", "enter my email address", "fill password"
    const fieldExtractionWords = [
      'name', 'full name', 'first name', 'last name',
      'email', 'email address', 'mail',
      'phone', 'phone number', 'mobile', 'mobile number', 'contact number',
      'password', 'pwd',
      'city', 'country', 'address', 'state', 'zip', 'zip code',
      'otp', 'api key'
    ];

    const foundFieldSet = new Set<string>();

    for (const syn of fieldExtractionWords) {
      const regex = new RegExp(`\\b${syn}\\b`, 'i');
      if (regex.test(lower)) {
        const def = this.normalizeField(syn);
        if (!foundFieldSet.has(def.normalized)) {
          foundFieldSet.add(def.normalized);

          const isSkipped = skippedFields.some((s) => s.includes(syn) || syn.includes(s));
          const hasUserVal = getExtractedVal(syn) || getExtractedVal(def.category) || getExtractedVal(def.normalized);
          const isSensitive = def.sensitivity === 'HIGHLY_SENSITIVE';

          requestedFields.push({
            field_name: syn,
            normalized_name: def.normalized,
            value_source: isSensitive
              ? 'LOCAL_VAULT'
              : hasUserVal
              ? 'USER_DATA'
              : 'SAVED_PROFILE',
            value_preview: isSensitive
              ? '•••••••• (Protected Locally)'
              : hasUserVal
              ? (hasUserVal.length > 20 ? hasUserVal.slice(0, 18) + '...' : hasUserVal)
              : undefined,
            sensitivity: def.sensitivity,
            execution: def.execution,
            preferred_action: isSkipped ? 'SKIP' : def.defaultAction || 'FILL',
            required: !isSkipped,
            value: isSensitive ? undefined : hasUserVal
          });
        }
      }
    }

    // Also include any fields supplied in extractedData that were not mentioned explicitly in task text
    for (const [key, val] of Object.entries(extractedData)) {
      const def = this.normalizeField(key);
      if (!foundFieldSet.has(def.normalized)) {
        foundFieldSet.add(def.normalized);
        const isSensitive = def.sensitivity === 'HIGHLY_SENSITIVE';
        requestedFields.push({
          field_name: key,
          normalized_name: def.normalized,
          value_source: isSensitive ? 'LOCAL_VAULT' : 'USER_DATA',
          value_preview: isSensitive
            ? '•••••••• (Protected Locally)'
            : (val.length > 20 ? val.slice(0, 18) + '...' : val),
          sensitivity: def.sensitivity,
          execution: def.execution,
          preferred_action: def.defaultAction || 'FILL',
          required: true,
          value: isSensitive ? undefined : val
        });
      }
    }

    // If still no fields found, but prompt is about filling/registering
    if (requestedFields.length === 0) {
      if (/fill|form|register|apply/i.test(lower)) {
        // Fallback: Generic form fill intent requiring clarification or default fields
        return {
          action: 'FILL',
          status: 'NEEDS_CLARIFICATION',
          fields: [],
          raw_task: rawTask,
          normalized_action: 'FILL',
          requires_confirmation: true,
          clarification_reason: 'The requested fields were not specified. Please specify which fields to fill or provide your details.',
          explanation: 'General form task detected without specific field instructions.'
        };
      }

      // Default generic task
      return {
        action: 'FILL',
        status: 'READY',
        target: 'Form Elements',
        fields: [
          {
            field_name: 'Target Element',
            normalized_name: 'GENERAL_INPUT',
            value_source: 'TASK_PROMPT',
            sensitivity: 'SAFE',
            execution: 'LOCAL',
            preferred_action: 'FILL',
            required: true
          }
        ],
        raw_task: rawTask,
        normalized_action: 'FILL',
        requires_confirmation: false,
        confidence: 0.85,
        explanation: `General form execution for: '${rawTask}'`
      };
    }

    // Sanitize user data: Remove passwords from returned user_data_separated
    const safeUserData: Record<string, string> = {};
    for (const [k, v] of Object.entries(extractedData)) {
      const def = this.normalizeField(k);
      if (def.sensitivity !== 'HIGHLY_SENSITIVE') {
        safeUserData[k] = v;
      }
    }

    return {
      action: 'FILL',
      status: 'READY',
      fields: requestedFields,
      raw_task: rawTask,
      normalized_action: 'FILL',
      user_data_separated: safeUserData,
      requires_confirmation: requestedFields.some((f) => f.sensitivity === 'HIGHLY_SENSITIVE' && f.preferred_action !== 'SKIP'),
      confidence: 0.96,
      explanation: `Fill form fields: ${requestedFields.map((f) => f.preferred_action === 'SKIP' ? `${f.field_name} (SKIP)` : f.field_name).join(', ')}`
    };
  }
}

/**
 * Backward-compatible HybridLLMIntentParser class wrapper
 */
export class HybridLLMIntentParser {
  public static parseRuleBased(userPrompt: string): ParsedIntent {
    const intent = IntentParser.parse(userPrompt);

    let mappedIntent: 'SEARCH' | 'OPEN_RESULT' | 'FILL_FORM' | 'CLICK_ELEMENT' | 'NAVIGATE' = 'FILL_FORM';
    if (intent.action === 'SEARCH') mappedIntent = 'SEARCH';
    else if (intent.action === 'CLICK') mappedIntent = 'CLICK_ELEMENT';
    else if (intent.action === 'NAVIGATE') mappedIntent = 'NAVIGATE';

    return {
      intent: mappedIntent,
      sub_intent: intent.action === 'FILL' ? 'SUBMIT_FORM' : null,
      query: intent.query || intent.target || null,
      target: intent.target || null,
      confidence: intent.confidence || 0.95,
      description: intent.explanation || userPrompt,
      form_data: intent.user_data_separated,
      parser_mode: 'RULE_BASED_NLP'
    };
  }

  public static async parseIntent(taskPrompt: string): Promise<ParsedIntent> {
    // Zero external AI dependency for Phase 6 by default
    return this.parseRuleBased(taskPrompt);
  }
}
