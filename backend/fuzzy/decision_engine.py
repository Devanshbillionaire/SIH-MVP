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
        self.risk_lvl = ctrl.Antecedent(np.arange(0, 1.05, 0.05), 'risk_level')

        # Define Consequent (Output)
        self.action_decision = ctrl.Consequent(np.arange(0, 101, 1), 'action_decision')

        # Membership functions for inputs
        for antecedent in [self.visual_conf, self.dom_conf, self.ml_conf]:
            antecedent['low'] = fuzzy.trimf(antecedent.universe, [0, 0, 0.45])
            antecedent['medium'] = fuzzy.trimf(antecedent.universe, [0.35, 0.6, 0.85])
            antecedent['high'] = fuzzy.trimf(antecedent.universe, [0.75, 1.0, 1.0])

        self.risk_lvl['low'] = fuzzy.trimf(self.risk_lvl.universe, [0, 0, 0.4])
        self.risk_lvl['medium'] = fuzzy.trimf(self.risk_lvl.universe, [0.3, 0.5, 0.7])
        self.risk_lvl['high'] = fuzzy.trimf(self.risk_lvl.universe, [0.6, 1.0, 1.0])

        # Membership functions for decision consequent (0 - 100)
        # 0-30: RETRY, 30-50: ASK_USER, 50-75: VERIFY, 75-100: EXECUTE
        self.action_decision['retry'] = fuzzy.trimf(self.action_decision.universe, [0, 15, 35])
        self.action_decision['ask_user'] = fuzzy.trimf(self.action_decision.universe, [25, 42, 55])
        self.action_decision['verify'] = fuzzy.trimf(self.action_decision.universe, [48, 65, 80])
        self.action_decision['execute'] = fuzzy.trimf(self.action_decision.universe, [75, 90, 100])

        # Rule Definitions
        rule1 = ctrl.Rule(self.visual_conf['high'] & self.dom_conf['high'] & self.ml_conf['high'] & self.risk_lvl['low'], self.action_decision['execute'])
        rule2 = ctrl.Rule(self.visual_conf['high'] & self.dom_conf['high'] & self.risk_lvl['low'], self.action_decision['execute'])
        rule3 = ctrl.Rule(self.visual_conf['medium'] & self.dom_conf['high'] & self.ml_conf['medium'], self.action_decision['verify'])
        rule4 = ctrl.Rule(self.visual_conf['medium'] | self.dom_conf['medium'], self.action_decision['verify'])
        rule5 = ctrl.Rule(self.risk_lvl['high'], self.action_decision['ask_user'])
        rule6 = ctrl.Rule(self.visual_conf['low'] & self.dom_conf['low'], self.action_decision['retry'])
        rule7 = ctrl.Rule(self.ml_conf['low'] & self.visual_conf['low'], self.action_decision['retry'])
        rule8 = ctrl.Rule(self.visual_conf['high'] & self.dom_conf['medium'] & self.risk_lvl['medium'], self.action_decision['verify'])
        rule9 = ctrl.Rule(self.visual_conf['high'] & self.ml_conf['high'] & self.risk_lvl['medium'], self.action_decision['execute'])

        self.control_sys = ctrl.ControlSystem([rule1, rule2, rule3, rule4, rule5, rule6, rule7, rule8, rule9])
        self.sim = ctrl.ControlSystemSimulation(self.control_sys)

    def evaluate(self, visual_confidence: float, dom_confidence: float, ml_confidence: float, risk_level: float = 0.1) -> dict:
        v_c = max(0.0, min(1.0, float(visual_confidence)))
        d_c = max(0.0, min(1.0, float(dom_confidence)))
        m_c = max(0.0, min(1.0, float(ml_confidence)))
        r_l = max(0.0, min(1.0, float(risk_level)))

        try:
            self.sim.input['visual_confidence'] = v_c
            self.sim.input['dom_confidence'] = d_c
            self.sim.input['ml_confidence'] = m_c
            self.sim.input['risk_level'] = r_l

            self.sim.compute()
            score = float(self.sim.output['action_decision'])
        except Exception:
            # Mathematical fallback calculation if crisp inputs fall into gaps
            weights = [0.35, 0.35, 0.20, -0.10]
            composite = (v_c * weights[0] + d_c * weights[1] + m_c * weights[2] + (1 - r_l) * 0.10)
            score = min(100.0, max(0.0, composite * 100.0))

        # Map crisp numerical score to decision label
        if r_l >= 0.8:
            decision = "ASK_USER"
        elif score >= 72.0:
            decision = "EXECUTE"
        elif score >= 50.0:
            decision = "VERIFY"
        elif score >= 35.0:
            decision = "ASK_USER"
        else:
            decision = "RETRY"

        fuzzy_conf = round(score / 100.0, 4)

        return {
            "visual_confidence": round(v_c, 4),
            "dom_confidence": round(d_c, 4),
            "ml_confidence": round(m_c, 4),
            "risk_level": round(r_l, 4),
            "fuzzy_confidence": fuzzy_conf,
            "raw_score": round(score, 2),
            "decision": decision,
            "rule_activated": f"IF Vis({v_c:.2f}) & DOM({d_c:.2f}) & ML({m_c:.2f}) THEN {decision}"
        }
