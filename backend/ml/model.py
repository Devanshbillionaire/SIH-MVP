import os
import pickle
import numpy as np
from sklearn.ensemble import RandomForestClassifier

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage")
MODEL_FILE = os.path.join(MODEL_DIR, "model.pkl")

class AgentMLModel:
    def __init__(self):
        os.makedirs(MODEL_DIR, exist_ok=True)
        self.model = RandomForestClassifier(n_estimators=20, random_state=42)
        if os.path.exists(MODEL_FILE):
            self.load()
        else:
            self._train_initial_seed()

    def _train_initial_seed(self):
        # Synthetic seed training set: [visual_conf, dom_conf, text_sim, context_sim, prev_success]
        X = np.array([
            [0.90, 0.95, 0.92, 0.85, 0.90], # Strong match -> Success
            [0.85, 0.88, 0.90, 0.80, 0.85], # High confidence -> Success
            [0.75, 0.80, 0.78, 0.70, 0.75], # Moderate match -> Success
            [0.60, 0.65, 0.55, 0.50, 0.60], # Borderline match -> Success
            [0.82, 0.85, 0.80, 0.75, 0.80], # Good match -> Success
            [0.30, 0.40, 0.35, 0.20, 0.40], # Weak match -> Fail
            [0.20, 0.25, 0.15, 0.10, 0.30], # Low confidence -> Fail
            [0.45, 0.50, 0.40, 0.30, 0.50], # Unreliable match -> Fail
            [0.15, 0.20, 0.10, 0.05, 0.20], # Unrelated element -> Fail
            [0.95, 0.92, 0.94, 0.90, 0.92], # Very strong match -> Success
        ])
        y = np.array([1, 1, 1, 1, 1, 0, 0, 0, 0, 1])
        self.model.fit(X, y)
        self.save()

    def predict_confidence(self, features: list) -> float:
        try:
            X_input = np.array(features).reshape(1, -1)
            probs = self.model.predict_proba(X_input)
            prob_success = probs[0][1] if len(probs[0]) > 1 else probs[0][0]
            return round(float(prob_success), 4)
        except Exception:
            avg = sum(features[:3]) / 3.0
            return round(float(avg), 4)

    def retrain(self, X_new: list, y_new: list):
        if len(X_new) == 0:
            return
        X_arr = np.array(X_new)
        y_arr = np.array(y_new)
        self.model.fit(X_arr, y_arr)
        self.save()

    def save(self):
        try:
            with open(MODEL_FILE, "wb") as f:
                pickle.dump(self.model, f)
        except Exception:
            pass

    def load(self):
        try:
            with open(MODEL_FILE, "rb") as f:
                self.model = pickle.load(f)
        except Exception:
            self._train_initial_seed()
