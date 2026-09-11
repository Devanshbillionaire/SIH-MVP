/**
 * CandidateSelector — Phase 5 Decision Pipeline candidate ranking and selection.
 * Integrates FuzzyDecisionEngine evaluation for visual confidence, context relevance,
 * ML confidence, and prior execution history.
 */

export {
  CandidateSelector,
  candidateSelector,
  FuzzyDecisionEngine,
  fuzzyDecisionEngine,
  type CandidateForSelection,
  type RankedCandidate,
  type FuzzyDecisionOutput,
  type FuzzyEvaluationResult
} from './fuzzyEngine';
