export type NavigationTab = 'task' | 'activity' | 'learning' | 'settings';

export type StageStatus = 'pending' | 'active' | 'completed' | 'warning' | 'failed';

export interface TaskExecutionStage {
  id: string;
  name: string;
  description: string;
  status: StageStatus;
  detail?: string;
  duration_ms?: number;
}

export interface DetectedField {
  id?: string;
  index?: number;
  name: string;
  type: string;
  tag?: string;
  text?: string;
  label?: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  role?: string;
  selector?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  isVisible?: boolean | string;
  viewportWidth?: number;
  viewportHeight?: number;
  dom_confidence?: number;
  visual_confidence?: number;
  semantic_confidence?: number;
  ml_confidence?: number;
  composite_score?: number;
}

export interface PrivacyAnalyzedField {
  key: string;
  category: string;
  sensitivity: 'PUBLIC' | 'LOW_SENSITIVITY' | 'PERSONAL' | 'SENSITIVE' | 'HIGHLY_SENSITIVE';
  confidence: number;
  reason: string;
  allowed_for_external_ai: boolean;
  redacted_preview?: string;
}

export interface PrivacyCategoryItem {
  name: string;
  category: 'safe' | 'protected';
  description: string;
  status: 'allowed' | 'redacted_locally';
}

export interface PrivacyResult {
  success?: boolean;
  analyzed_count?: number;
  safe_fields: string[];
  protected_fields: string[];
  safe_data?: PrivacyAnalyzedField[];
  protected_data?: PrivacyAnalyzedField[];
  external_ai_access?: 'ALLOWED' | 'BLOCKED_FOR_PROTECTED' | 'RESTRICTED';
  redaction_active: boolean;
  message: string;
  scan_status?: 'completed' | 'failed' | 'paused';
  screenshot_external_allowed?: boolean;
  screenshot_privacy_reason?: string;
}

export interface MLModelMetadata {
  status: 'COLD_START' | 'TRAINED';
  model_version: string;
  training_samples: number;
  last_trained: string | null;
  /**
   * Accuracy evaluated directly on training samples.
   * Named accurately to avoid false validation claims.
   */
  training_accuracy: number | null;
  /** Legacy alias for training_accuracy */
  validation_score?: number | null;
  accuracy: number | null;
  min_samples_for_trained: number;
  features_used: string[];
}

export interface DisambiguationCandidate {
  id: string;
  label: string;
  tag: string;
  selector?: string;
  composite_score: number;
  text_similarity: number;
  dom_confidence: number;
  visual_confidence: number;
  ml_confidence: number | null;
}

export interface CandidateScore {
  element_tag: string;
  element_name: string;
  text_similarity: number;
  dom_confidence: number;
  visual_confidence: number;
  ml_confidence: number | null;
  composite_score: number;
  id?: string;
  selector?: string;
}

export interface FuzzyRuleActivationItem {
  id: string;
  name: string;
  antecedent_strength: number;
  consequent_decision: 'EXECUTE' | 'VERIFY' | 'RETRY' | 'ASK_USER' | 'REJECT' | 'ACT' | 'REVIEW';
  description: string;
}

export interface FuzzyDecision {
  visual_confidence: number;
  dom_confidence: number;
  text_similarity?: number;
  ml_confidence: number | null;
  risk_level: number;
  candidate_confidence?: number;
  fuzzy_confidence: number;
  raw_score: number;
  decision: 'EXECUTE' | 'VERIFY' | 'RETRY' | 'ASK_USER' | 'REJECT' | 'ACT' | 'REVIEW';
  rule_activated: string;
  rules_fired?: FuzzyRuleActivationItem[];
  ambiguity_score?: number;
  score_gap?: number | null;
  candidate_count?: number;
  action_type?: string;
  action_risk?: 'LOW' | 'MEDIUM' | 'HIGH';
  top_candidate_label?: string;
  alternative_candidate_label?: string;
  reason?: string;
  reasoning?: string[];
  alternatives?: DisambiguationCandidate[];
}

export interface FieldMapping {
  user_field: string;
  user_value_preview: string;
  detected_field: string;
  confidence: number;
  decision?: 'EXECUTE' | 'VERIFY' | 'ASK_USER' | 'RETRY' | 'REJECT' | 'ACT' | 'REVIEW';
  ambiguity?: number;
  alternatives?: DisambiguationCandidate[];
  selected_candidate_id?: string;
}

export type VerificationStatus = 'PENDING' | 'SUCCESS' | 'WARNING' | 'FAILED';

export interface VerificationResult {
  status: VerificationStatus;
  fields_filled: number;
  total_fields: number;
  expected_state_detected: boolean;
  confidence: number;
  message: string;
}

export interface LearningStats {
  total_interactions: number;
  successful_actions: number;
  success_rate: number;
  average_confidence: number;
  before_learning_avg: number;
  after_learning_avg: number;
  learning_improvement: number;
  model_metadata?: MLModelMetadata;
}

export interface ActivityItem {
  id: string;
  url: string;
  domain: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED' | 'IN_PROGRESS';
  fields_processed: number;
  verification: string;
  confidence: number;
  timestamp: string;
}

export interface AppSettings {
  ai_provider: 'automatic' | 'local' | 'external';
  privacy_protection: boolean;
  local_processing: boolean;
  continuous_learning: boolean;
  verification_strictness: 'strict' | 'balanced' | 'lenient';
  external_ai_usage: 'never' | 'ambiguous_only' | 'always';
}

export interface TimelineStep {
  step: number;
  type: 'INTENT' | 'NAVIGATION' | 'PERCEPTION' | 'DECISION' | 'ACTION' | 'VERIFICATION';
  message: string;
  confidence?: number;
  visual_confidence?: number;
  dom_confidence?: number;
  text_similarity?: number;
  ml_confidence?: number;
  action_type?: string;
  success?: boolean;
  fuzzy_decision?: FuzzyDecision;
  details?: any;
}

export interface PagePerceptionData {
  url: string;
  screenshot?: string;
  screenshot_url?: string;
  page?: {
    title: string;
    viewportWidth: number;
    viewportHeight: number;
  };
  elements?: DetectedField[];
  detected_fields?: DetectedField[];
  elements_count?: number;
  candidate_scores?: CandidateScore[];
}

export type IntentActionType =
  | 'FILL'
  | 'TYPE'
  | 'CLICK'
  | 'SELECT'
  | 'CHECK'
  | 'UNCHECK'
  | 'SEARCH'
  | 'SUBMIT'
  | 'NAVIGATE';

export interface IntentFieldInstruction {
  field_name: string;
  normalized_name: string;
  value_source: 'USER_DATA' | 'TASK_PROMPT' | 'SAVED_PROFILE' | 'LOCAL_VAULT' | 'NONE';
  value_preview?: string;
  sensitivity: 'SAFE' | 'PERSONAL' | 'HIGHLY_SENSITIVE';
  execution: 'LOCAL' | 'LOCAL_ONLY' | 'STANDARD';
  preferred_action: 'FILL' | 'TYPE' | 'SELECT' | 'CHECK' | 'UNCHECK' | 'SKIP' | 'CLICK' | 'SUBMIT';
  required: boolean | 'unknown';
  value?: string;
}

export interface TaskIntent {
  action: IntentActionType;
  status: 'READY' | 'NEEDS_CLARIFICATION' | 'AMBIGUOUS' | 'INVALID';
  target?: string | null;
  query?: string | null;
  value?: string | null;
  fields: IntentFieldInstruction[];
  raw_task: string;
  normalized_action: string;
  requires_confirmation: boolean;
  clarification_reason?: string;
  explanation?: string;
  user_data_separated?: Record<string, string>;
  parser_mode?: string;
  confidence?: number;
}

export type PlanStepAction =
  | 'NAVIGATE'
  | 'PERCEIVE_PAGE'
  | 'FIND_ELEMENT'
  | 'SCORE_CANDIDATES'
  | 'FUZZY_DECISION'
  | 'VERIFY_PRIVACY'
  | 'FILL'
  | 'TYPE'
  | 'CLICK'
  | 'SELECT'
  | 'CHECK'
  | 'UNCHECK'
  | 'SEARCH'
  | 'SKIP'
  | 'VERIFY';

export interface TaskPlanStep {
  step_id: number | string;
  action: PlanStepAction | string;
  target?: string;
  status: 'PENDING' | 'READY' | 'BLOCKED' | 'SKIPPED' | 'NEEDS_CLARIFICATION' | 'COMPLETED' | string;
  description?: string;
  field_name?: string;
  target_description?: string;
  target_element?: Partial<DetectedField>;
  value?: string;
  value_to_input?: string;
  required_confidence?: number;
  sensitivity?: 'SAFE' | 'PERSONAL' | 'HIGHLY_SENSITIVE';
  execution?: 'LOCAL' | 'LOCAL_ONLY' | 'STANDARD';
  candidate_id?: string;
  decision?: 'EXECUTE' | 'VERIFY' | 'RETRY' | 'ASK_USER' | 'REJECT' | 'ACT' | 'REVIEW';
  decision_confidence?: number;
  blocked_reason?: string;
  requires_user_input?: boolean;
}

export interface TaskPlanExplanation {
  summary: string;
  fields: {
    name: string;
    target: string;
    sensitivity: string;
    execution: string;
    action: string;
  }[];
  privacy_notes: string[];
  next_step: string;
}

export interface TaskPlan {
  plan_id?: string;
  task_id?: string;
  status: 'DRAFT' | 'READY' | 'BLOCKED' | 'NEEDS_CLARIFICATION' | string;
  url?: string;
  target_url?: string;
  intent?: TaskIntent;
  intent_action?: string;
  confidence?: number;
  steps: TaskPlanStep[];
  explanation?: TaskPlanExplanation;
  created_at?: string | number;
  fuzzy_summary?: {
    overall_decision: string;
    ambiguous_fields: string[];
  };
}

export type ExecutionStatus =
  | 'PENDING'
  | 'ANALYZING'
  | 'RESOLVING'
  | 'READY'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'SUCCESS'
  | 'PARTIAL_SUCCESS'
  | 'RETRYING'
  | 'BLOCKED'
  | 'NEEDS_USER'
  | 'FAILED';

export type ActionErrorCategory =
  | 'INVALID_TARGET'
  | 'AMBIGUOUS_TARGET'
  | 'ELEMENT_NOT_FOUND'
  | 'ELEMENT_CHANGED'
  | 'ELEMENT_NOT_INTERACTABLE'
  | 'PRIVACY_BLOCKED'
  | 'VERIFICATION_FAILED'
  | 'CAPTCHA_DETECTED'
  | 'LOGIN_REQUIRED'
  | 'TIMEOUT'
  | 'UNSUPPORTED_ACTION'
  | 'USER_REQUIRED'
  | 'HIGH_RISK_BLOCKED';

export interface ExecutedAction {
  step_id: number | string;
  action: 'FILL' | 'TYPE' | 'CLICK' | 'SELECT' | 'CHECK' | 'UNCHECK' | 'RADIO' | 'SKIP' | string;
  target?: string;
  field_name?: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'BLOCKED' | 'NEEDS_USER';
  verified: boolean;
  verification_status?: 'MATCH' | 'MISMATCH' | 'UNKNOWN' | 'SKIPPED';
  confidence?: number;
  reason?: string;
  retries?: number;
  retries_attempted?: number;
  error_category?: ActionErrorCategory;
  candidate_used?: {
    tag: string;
    id?: string;
    name?: string;
    selector?: string;
  };
}

export interface TaskExecutionResult {
  task_id: string;
  status: ExecutionStatus;
  url: string;
  summary: string;
  total_actions: number;
  completed_actions: number;
  verified_count: number;
  actions: ExecutedAction[];
  screenshot_after?: string;
  error_category?: ActionErrorCategory;
  user_prompt?: {
    type: 'AMBIGUOUS_CHOICE' | 'CONFIRMATION_REQUIRED' | 'CAPTCHA' | 'LOGIN';
    title: string;
    message: string;
    field_name?: string;
    options?: DisambiguationCandidate[];
  };
  duration_ms?: number;
}

export interface TaskState {
  url: string;
  information: string;
  isRunning: boolean;
  hasRun: boolean;
  stages: TaskExecutionStage[];
  perception: PagePerceptionData | null;
  fuzzy_decision: FuzzyDecision | null;
  privacy_result: PrivacyResult | null;
  field_mappings: FieldMapping[];
  verification: VerificationResult | null;
  task_plan?: TaskPlan | null;
  execution_result?: TaskExecutionResult | null;
  ml_metadata?: MLModelMetadata | null;
  error?: string | null;
}
