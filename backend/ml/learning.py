from typing import List, Dict, Any
from ml.predictor import get_ml_model_instance

class AgentLearningPipeline:
    """
    Online learning pipeline for updating the Random Forest agent model
    using privacy-sanitized feature vectors and verified interaction outcomes.
    """
    @staticmethod
    def retrain_from_interactions(interactions: List[Dict[str, Any]]):
        if not interactions:
            return
        
        X = []
        y = []
        for item in interactions:
            if "visual_confidence" in item and "dom_confidence" in item:
                feats = [
                    float(item.get("visual_confidence", 0.8)),
                    float(item.get("dom_confidence", 0.8)),
                    float(item.get("text_similarity", 0.8)),
                    float(item.get("context_similarity", 0.8)),
                    float(item.get("prev_success", 0.85))
                ]
                label = 1 if item.get("success", True) else 0
                X.append(feats)
                y.append(label)
        
        if X and y:
            model = get_ml_model_instance()
            model.retrain(X, y)
