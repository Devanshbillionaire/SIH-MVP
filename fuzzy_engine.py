class FuzzyDecisionEngine:

    def __init__(self):
        self.act_threshold = 0.72
        self.review_threshold = 0.45

    def limit(self, value):
        return max(0.0, min(1.0, float(value)))

    def low(self, value):
        value = self.limit(value)

        if value <= 0:
            return 1.0
        if value >= 0.5:
            return 0.0

        return (0.5 - value) / 0.5

    def medium(self, value):
        value = self.limit(value)

        if value <= 0.2 or value >= 0.8:
            return 0.0

        if value < 0.5:
            return (value - 0.2) / 0.3

        return (0.8 - value) / 0.3

    def high(self, value):
        value = self.limit(value)

        if value <= 0.5:
            return 0.0
        if value >= 1:
            return 1.0

        return (value - 0.5) / 0.5

    def evaluate(
        self,
        visual_confidence,
        context_relevance,
        ml_confidence,
        previous_success
    ):
        visual = self.limit(visual_confidence)
        context = self.limit(context_relevance)
        ml = self.limit(ml_confidence)
        history = self.limit(previous_success)

        visual_high = self.high(visual)
        visual_medium = self.medium(visual)
        visual_low = self.low(visual)

        context_high = self.high(context)
        context_low = self.low(context)

        ml_high = self.high(ml)
        ml_medium = self.medium(ml)
        ml_low = self.low(ml)

        history_high = self.high(history)

        rules = [
            min(visual_high, context_high, ml_high),
            min(visual_high, context_high, ml_medium),
            min(visual_high, ml_high, history_high),
            min(visual_medium, context_high, ml_high),
            min(context_high, ml_high, history_high)
        ]

        positive = max(rules)

        uncertainty = max(
            visual_low,
            context_low,
            ml_low
        )

        supporting_score = (
            0.25 * visual +
            0.25 * context +
            0.30 * ml +
            0.20 * history
        )

        score = (
            0.70 * positive +
            0.30 * supporting_score
        )

        score -= 0.15 * uncertainty
        score = self.limit(score)

        if score >= self.act_threshold:
            decision = "ACT"
        elif score >= self.review_threshold:
            decision = "REVIEW"
        else:
            decision = "REJECT"

        return {
            "score": round(score, 4),
            "decision": decision
        }


class CandidateSelector:

    def __init__(self):
        self.fuzzy = FuzzyDecisionEngine()

    def rank(self, candidates):
        results = []

        for candidate in candidates:
            result = self.fuzzy.evaluate(
                candidate.get("visual_confidence", 0),
                candidate.get("context_relevance", 0),
                candidate.get("ml_confidence", 0),
                candidate.get("previous_success", 0)
            )

            results.append({
                "element": candidate.get("element"),
                "score": result["score"],
                "decision": result["decision"]
            })

        return sorted(
            results,
            key=lambda x: x["score"],
            reverse=True
        )

    def choose(self, candidates):
        ranked = self.rank(candidates)

        if not ranked:
            return None

        best = ranked[0]

        if best["decision"] == "ACT":
            return best

        return None


if __name__ == "__main__":

    engine = FuzzyDecisionEngine()

    result = engine.evaluate(
        visual_confidence=0.88,
        context_relevance=0.91,
        ml_confidence=0.86,
        previous_success=0.74
    )

    print("Fuzzy Score:", result["score"])
    print("Decision:", result["decision"])
