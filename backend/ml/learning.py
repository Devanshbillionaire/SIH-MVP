from ml.predictor import get_ml_model_instance
from storage.interaction_store import InteractionStore

def update_model_from_storage():
    """
    Retrains scikit-learn model with accumulated privacy-safe interaction records.
    """
    store = InteractionStore()
    interactions = store.get_all_interactions()
    
    if len(interactions) < 2:
        return

    X = []
    y = []

    for item in interactions:
        vis = item.get("visual_confidence", 0.5)
        dom = item.get("dom_confidence", 0.5)
        sim = item.get("text_similarity", 0.5)
        ctx = 0.8
        prev = 0.85
        
        success = 1 if item.get("success", True) else 0
        X.append([vis, dom, sim, ctx, prev])
        y.append(success)

    model = get_ml_model_instance()
    model.retrain(X, y)
