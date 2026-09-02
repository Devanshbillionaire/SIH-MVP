from ml.model import AgentMLModel

_ml_model_instance = AgentMLModel()

def get_ml_model_instance() -> AgentMLModel:
    global _ml_model_instance
    return _ml_model_instance

def predict_ml_confidence(visual_conf: float, dom_conf: float, text_sim: float, context_sim: float = 0.8, prev_success: float = 0.85) -> float:
    model = get_ml_model_instance()
    features = [visual_conf, dom_conf, text_sim, context_sim, prev_success]
    return model.predict_confidence(features)
