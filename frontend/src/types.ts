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

export interface FuzzyDecision {
  visual_confidence: number;
  dom_confidence: number;
  ml_confidence: number;
  risk_level: number;
  fuzzy_confidence: number;
  raw_score: number;
  decision: 'EXECUTE' | 'VERIFY' | 'RETRY' | 'ASK_USER';
  rule_activated: string;
}

export interface LearningStats {
  total_interactions: number;
  successful_actions: number;
  success_rate: number;
  average_confidence: number;
  before_learning_avg: number;
  after_learning_avg: number;
  learning_improvement: number;
}

export interface TopCandidate {
  element: {
    tag: string;
    text: string;
    placeholder: string;
    ariaLabel: string;
    id: string;
    className: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  text_similarity: number;
  dom_confidence: number;
  visual_confidence: number;
  ml_confidence: number;
  composite_score: number;
}

export interface RunTaskResponse {
  task: string;
  demo_site: string;
  ui_version: string;
  intent_data: any;
  timeline: TimelineStep[];
  perception: {
    url: string;
    screenshot_url: string;
    top_candidate?: TopCandidate;
  };
  fuzzy_decision: FuzzyDecision;
  verification: {
    success: boolean;
    verification_confidence: number;
    reason: string;
    current_url: string;
  };
  learning_stats: LearningStats;
}

export interface DemoSite {
  id: string;
  name: string;
  description: string;
}
