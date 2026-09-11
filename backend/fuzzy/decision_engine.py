import numpy as np
import skfuzzy as fuzzy
from skfuzzy import control as ctrl

class FuzzyDecisionEngine:
    def __init__(self):
        self._setup_fuzzy_system()

    def _setup_fuzzy_system(self):
        # Define Antecedents (Inputs)
        self.visual_conf = ctrl.Antecedent(np.arange(0, 1.05, 0.05), 'visual_confidence')
        self.dom_conf = ctrl.Antecedent(np.arange(0, 1.05, 0.05), 'dom_confidence')
        self.ml_conf = ctrl.Antecedent(np.arange(0, 1.05, 0.05), 'ml_confidence')
        self.text_sim = ctrl.Antecedent(np.arange(0, 1.05, 0.05), 'text_similarity')
        self.conf_gap = ctrl.Antecedent(np.arange(0, 1.05, 0.05), 'confidence_gap')
        self.risk_lvl = ctrl.Antecedent(np.arange(0, 1.05, 0.05), 'risk_level')

        # Define Consequent (Output)
        self.action_decision = ctrl.Consequent(np.arange(0, 101, 1), 'action_decision')

        # Membership functions for inputs
        for antecedent in [self.visual_conf, self.dom_conf, self.ml_conf, self.text_sim]:
            antecedent['low'] = fuzzy.trimf(antecedent.universe, [0, 0, 0.45])
            antecedent['medium'] = fuzzy.trimf(antecedent.universe, [0.35, 0.6, 0.85])
            antecedent['high'] = fuzzy.trimf(antecedent.universe, [0.70, 1.0, 1.0])

        self.conf_gap['small'] = fuzzy.trimf(self.conf_gap.universe, [0, 0, 0.12])
        self.conf_gap['medium'] = fuzzy.trimf(self.conf_gap.universe, [0.08, 0.20, 0.35])
        self.conf_gap['large'] = fuzzy.trimf(self.conf_gap.universe, [0.25, 1.0, 1.0])

        self.risk_lvl['low'] = fuzzy.trimf(self.risk_lvl.universe, [0, 0, 0.35])
        self.risk_lvl['medium'] = fuzzy.trimf(self.risk_lvl.universe, [0.25, 0.50, 0.75])
        self.risk_lvl['high'] = fuzzy.trimf(self.risk_lvl.universe, [0.65, 1.0, 1.0])

        # Membership functions for decision consequent (0 - 100)
        # 0-30: RETRY, 30-50: ASK_USER, 50-75: VERIFY, 75-100: EXECUTE
        self.action_decision['retry'] = fuzzy.trimf(self.action_decision.universe, [0, 15, 35])
        self.action_decision['ask_user'] = fuzzy.trimf(self.action_decision.universe, [25, 42, 55])
        self.action_decision['verify'] = fuzzy.trimf(self.action_decision.universe, [48, 65, 80])
        self.action_decision['execute'] = fuzzy.trimf(self.action_decision.universe, [75, 92, 100])

        # Rule Definitions
        # Rule 1: High V, High DOM, High Text, Large Gap, Low Risk -> EXECUTE
        rule1 = ctrl.Rule(self.visual_conf['high'] & self.dom_conf['high'] & self.text_sim['high'] & self.conf_gap['large'] & self.risk_lvl['low'], self.action_decision['execute'])
        # Rule 2: High Confidence, Medium Gap -> VERIFY
        rule2 = ctrl.Rule(self.dom_conf['high'] & self.conf_gap['medium'], self.action_decision['verify'])
        # Rule 3: Small Gap -> ASK_USER (Ambiguous Candidates)
        rule3 = ctrl.Rule(self.conf_gap['small'] & (self.dom_conf['high'] | self.dom_conf['medium']), self.action_decision['ask_user'])
        # Rule 4: Weak Perception -> RETRY
        rule4 = ctrl.Rule(self.visual_conf['low'] & self.dom_conf['low'], self.action_decision['retry'])
        # Rule 5: Multi-Signal Agreement with High ML -> EXECUTE
        rule5 = ctrl.Rule(self.ml_conf['high'] & self.dom_conf['high'] & self.text_sim['high'] & self.conf_gap['large'] & self.risk_lvl['low'], self.action_decision['execute'])
        # Rule 6: High ML but Low Text/DOM -> VERIFY (Do NOT let ML override everything!)
        rule6 = ctrl.Rule(self.ml_conf['high'] & self.text_sim['low'], self.action_decision['verify'])
        # Rule 7: High Risk -> ASK_USER
        rule7 = ctrl.Rule(self.risk_lvl['high'], self.action_decision['ask_user'])
        # Rule 8: Low Text & Low Candidate -> RETRY
        rule8 = ctrl.Rule(self.text_sim['low'] & self.dom_conf['low'], self.action_decision['retry'])

        self.control_sys = ctrl.ControlSystem([rule1, rule2, rule3, rule4, rule5, rule6, rule7, rule8])
        self.sim = ctrl.ControlSystemSimulation(self.control_sys)

    def evaluate(
        self,
        visual_confidence: float,
        dom_confidence: float,
        ml_confidence: float,
        risk_level: float = 0.1,
        confidence_gap: float = 0.30,
        text_similarity: float = None,
        candidate_count: int = 1,
        action_type: str = 'TYPE'
    ) -> dict:
        v_c = max(0.0, min(1.0, float(visual_confidence)))
        d_c = max(0.0, min(1.0, float(dom_confidence)))
        m_c = max(0.0, min(1.0, float(ml_confidence))) if ml_confidence is not None else (d_c * 0.6 + v_c * 0.4)
        r_l = max(0.0, min(1.0, float(risk_level)))
        c_gap = max(0.0, min(1.0, float(confidence_gap))) if confidence_gap is not None else (0.50 if candidate_count == 1 else 0.10)
        t_s = max(0.0, min(1.0, float(text_similarity))) if text_similarity is not None else d_c

        # Composite Candidate Score
        composite = (t_s * 0.40 + d_c * 0.30 + v_c * 0.15 + m_c * 0.15)
        ambiguity = max(0.0, min(1.0, 1.0 - (c_gap / 0.30))) if candidate_count > 1 else 0.05

        try:
            self.sim.input['visual_confidence'] = v_c
            self.sim.input['dom_confidence'] = d_c
            self.sim.input['ml_confidence'] = m_c
            self.sim.input['text_similarity'] = t_s
            self.sim.input['confidence_gap'] = c_gap
            self.sim.input['risk_level'] = r_l

            self.sim.compute()
            score = float(self.sim.output['action_decision'])
        except Exception:
            # Deterministic defuzzification fallback
            weights = [0.35, 0.30, 0.15, 0.20]
            raw = (t_s * weights[0] + d_c * weights[1] + v_c * weights[2] + m_c * weights[3])
            score = min(100.0, max(0.0, raw * 100.0))

        # Apply Safety Guardrails
        high_risk_actions = ['SUBMIT', 'DELETE', 'PURCHASE', 'SEND', 'CONFIRM']
        is_high_risk = action_type.upper() in high_risk_actions or r_l >= 0.70

        reasoning = []
        if composite < 0.42:
            decision = "RETRY"
            reason = "Candidate match score is below minimum acceptance threshold."
            reasoning.append(reason)
        elif candidate_count > 1 and c_gap <= 0.06:
            decision = "ASK_USER"
            reason = f"Candidate ambiguity detected: Separation margin is only {c_gap * 100:.1f}%. User selection requested."
            reasoning.append(reason)
        elif is_high_risk:
            if composite >= 0.80 and (candidate_count == 1 or c_gap >= 0.15):
                decision = "VERIFY"
                reason = f"High-risk action ({action_type}) requires explicit verification step."
            else:
                decision = "ASK_USER"
                reason = f"High-risk action ({action_type}) requires user authorization."
            reasoning.append(reason)
        elif m_c >= 0.85 and (t_s <= 0.40 or d_c <= 0.40):
            decision = "VERIFY"
            reason = "High ML confidence contradicted by low text similarity or DOM signal."
            reasoning.append(reason)
        elif score >= 72.0 and (candidate_count == 1 or c_gap >= 0.15) and composite >= 0.70:
            decision = "EXECUTE"
            reason = "Strong DOM, visual, text, and ML signals with unambiguous candidate margin."
            reasoning.append(reason)
        elif score >= 50.0 and composite >= 0.50:
            decision = "VERIFY"
            reason = "Good candidate match; proceeding with DOM state verification."
            reasoning.append(reason)
        elif score >= 35.0 or (candidate_count > 1 and c_gap < 0.10):
            decision = "ASK_USER"
            reason = "Candidate ambiguity or moderate confidence. Prompting user confirmation."
            reasoning.append(reason)
        else:
            decision = "RETRY"
            reason = "Insufficient visual and DOM confidence signals. Element rescan advised."
            reasoning.append(reason)

        fuzzy_conf = round(score / 100.0, 4)

        return {
            "visual_confidence": round(v_c, 4),
            "dom_confidence": round(d_c, 4),
            "text_similarity": round(t_s, 4),
            "ml_confidence": round(m_c, 4),
            "confidence_gap": round(c_gap, 4) if candidate_count > 1 else None,
            "candidate_confidence": round(composite, 4),
            "ambiguity_score": round(ambiguity, 4),
            "risk_level": round(r_l, 4),
            "fuzzy_confidence": fuzzy_conf,
            "raw_score": round(score, 2),
            "decision": decision,
            "reason": reason,
            "reasoning": reasoning,
            "rule_activated": f"IF Vis({v_c:.2f}) & DOM({d_c:.2f}) & Text({t_s:.2f}) & Gap({c_gap:.2f}) THEN {decision}"
        }
