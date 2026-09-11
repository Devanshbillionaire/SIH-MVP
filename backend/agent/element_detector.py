from difflib import SequenceMatcher
from typing import Dict, Any, Optional
from ml.predictor import predict_ml_confidence

class ElementDetector:
    """
    Multi-factor candidate element detection & confidence scoring engine.
    Calculates Text similarity, DOM confidence, Visual confidence, and ML confidence.
    """
    @staticmethod
    def _text_similarity(target: str, candidate_str: str) -> float:
        if not target or not candidate_str:
            return 0.0
        
        t_clean = target.lower().strip()
        c_clean = candidate_str.lower().strip()

        if t_clean == c_clean:
            return 1.0
        if t_clean in c_clean or c_clean in t_clean:
            return 0.88

        t_tokens = set(t_clean.split())
        c_tokens = set(c_clean.split())
        if t_tokens and c_tokens:
            overlap = len(t_tokens.intersection(c_tokens)) / max(len(t_tokens), 1)
            if overlap > 0.5:
                return min(0.95, round(0.6 + 0.35 * overlap, 2))

        seq_ratio = SequenceMatcher(None, t_clean, c_clean).ratio()
        return round(float(seq_ratio), 4)

    @classmethod
    def calculate_candidate_scores(cls, candidate: Dict[str, Any], intent_data: Dict[str, Any], action_type: str = "CLICK") -> Dict[str, Any]:
        tag = candidate.get("tag", "").lower()
        text = candidate.get("text", "")
        placeholder = candidate.get("placeholder", "")
        aria = candidate.get("ariaLabel", "")
        name = candidate.get("name", "")
        elem_id = str(candidate.get("id", "") or "")
        className = candidate.get("className", "")
        candidate_type = candidate.get("type", "").lower()
        
        target_text = intent_data.get("query") or intent_data.get("target") or ""
        
        text_sim = max([
            cls._text_similarity(target_text, text),
            cls._text_similarity(target_text, placeholder),
            cls._text_similarity(target_text, aria),
            cls._text_similarity(target_text, name),
            cls._text_similarity(target_text, elem_id)
        ])

        name_lower = name.lower().strip()
        is_search_name = name_lower in ["q", "query", "search", "search_query"]

        if action_type == "TYPE" or intent_data.get("intent") == "SEARCH":
            if tag in ["input", "textarea"] or "search" in placeholder.lower() or "find" in placeholder.lower() or is_search_name or "search" in className.lower() or candidate_type == "search":
                input_match_score = max(
                    cls._text_similarity("search", placeholder),
                    cls._text_similarity("find", placeholder),
                    cls._text_similarity("query", name),
                    cls._text_similarity("search", aria),
                    0.85 if candidate_type == "search" else 0.0
                )
                text_sim = max(text_sim, input_match_score)

        dom_conf = 0.5
        if tag in ["input", "button", "a", "select"]:
            dom_conf += 0.2
        if aria or placeholder or name or elem_id:
            dom_conf += 0.15
        if text_sim > 0.6:
            dom_conf += 0.15
        dom_conf = min(0.98, max(0.2, dom_conf))

        w = candidate.get("width", 0)
        h = candidate.get("height", 0)
        x = candidate.get("x", 0)
        y = candidate.get("y", 0)
        raw_visible = candidate.get("isVisible", True)
        if isinstance(raw_visible, str):
            is_visible = raw_visible.lower() in ["true", "1", "yes"]
        else:
            is_visible = bool(raw_visible)

        viewport_w = candidate.get("viewportWidth", 1440)
        viewport_h = candidate.get("viewportHeight", 900)

        visual_conf = 0.5
        if is_visible:
            visual_conf += 0.2
        if w >= 20 and h >= 15:
            visual_conf += 0.15
        if 0 <= y <= viewport_h and 0 <= x <= viewport_w:
            visual_conf += 0.10
        visual_conf = min(0.96, max(0.15, visual_conf))

        ml_conf = predict_ml_confidence(visual_conf, dom_conf, text_sim)
        composite_score = (text_sim * 0.45) + (dom_conf * 0.25) + (visual_conf * 0.15) + (ml_conf * 0.15)

        return {
            "element": candidate,
            "text_similarity": round(text_sim, 4),
            "dom_confidence": round(dom_conf, 4),
            "visual_confidence": round(visual_conf, 4),
            "ml_confidence": round(ml_conf, 4),
            "composite_score": round(composite_score, 4)
        }

    @classmethod
    def detect_target_element(cls, perception_data: Dict[str, Any], intent_data: Dict[str, Any], action_type: str = "CLICK") -> Dict[str, Any]:
        candidates = perception_data.get("elements", [])
        if not candidates:
            return None

        scored_candidates = []
        for cand in candidates:
            scored = cls.calculate_candidate_scores(cand, intent_data, action_type)
            scored_candidates.append(scored)

        scored_candidates.sort(key=lambda x: x["composite_score"], reverse=True)
        top_match = scored_candidates[0] if scored_candidates else None
        
        return {
            "top_candidate": top_match,
            "all_scored_candidates": scored_candidates[:5]
        }
