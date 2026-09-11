import time
from typing import Dict, Any, List, Optional
from agent.intent_parser import IntentParser

class AgentPlanner:
    """
    Phase 6: Structured, explainable, and privacy-governed Agent Task Planner.
    Converts natural-language intents into structured TaskPlans with verified dependencies.
    """

    def __init__(self):
        self.intent_parser = IntentParser()

    def create_plan(self, task_prompt: str, target_url: str = "https://example.com/form", user_data: Optional[str] = None) -> Dict[str, Any]:
        plan_id = f"plan_{int(time.time())}"
        intent = self.intent_parser.parse(task_prompt, user_data)

        if intent["status"] == "NEEDS_CLARIFICATION":
            return {
                "plan_id": plan_id,
                "status": "NEEDS_CLARIFICATION",
                "url": target_url,
                "intent": intent,
                "steps": [],
                "explanation": {
                    "summary": "Task needs clarification",
                    "fields": [],
                    "privacy_notes": ["Awaiting specific user instructions."],
                    "next_step": intent.get("clarification_reason", "Provide missing details.")
                }
            }

        steps = []
        step_id = 1

        steps.append({
            "step_id": step_id,
            "action": "NAVIGATE",
            "target": target_url,
            "status": "READY",
            "description": f"Navigate to URL: {target_url}"
        })
        step_id += 1

        steps.append({
            "step_id": step_id,
            "action": "PERCEIVE_PAGE",
            "target": "DOM & Viewport",
            "status": "READY",
            "description": "Capture page screenshot and parse interactive element hierarchy"
        })
        step_id += 1

        explanation_fields = []
        privacy_notes = []

        for field in intent.get("fields", []):
            f_name = field["field_name"]
            is_sensitive = field["sensitivity"] == "HIGHLY_SENSITIVE"
            is_skip = field["preferred_action"] == "SKIP"

            explanation_fields.append({
                "name": f_name,
                "target": field["normalized_name"],
                "sensitivity": field["sensitivity"],
                "execution": field["execution"],
                "action": field["preferred_action"]
            })

            if is_sensitive:
                privacy_notes.append(f"Field '{f_name}' is HIGHLY_SENSITIVE ({field['execution']}). Local execution only.")

            if is_skip:
                steps.append({
                    "step_id": step_id,
                    "action": "SKIP",
                    "target": f_name,
                    "status": "SKIPPED",
                    "description": f"Skip field '{f_name}' per user instruction"
                })
                step_id += 1
                continue

            steps.append({
                "step_id": step_id,
                "action": "FIND_ELEMENT",
                "target": f_name,
                "status": "READY",
                "description": f"Locate element for '{f_name}'"
            })
            step_id += 1

            steps.append({
                "step_id": step_id,
                "action": "SCORE_CANDIDATES",
                "target": f_name,
                "status": "READY",
                "description": f"Evaluate ML & DOM candidate confidence for '{f_name}'"
            })
            step_id += 1

            steps.append({
                "step_id": step_id,
                "action": "FUZZY_DECISION",
                "target": f_name,
                "status": "READY",
                "description": f"Fuzzy ambiguity evaluation for '{f_name}'"
            })
            step_id += 1

            steps.append({
                "step_id": step_id,
                "action": "FILL",
                "target": f_name,
                "status": "READY",
                "description": f"Fill '{f_name}' with {field['value_source']}"
            })
            step_id += 1

            steps.append({
                "step_id": step_id,
                "action": "VERIFY",
                "target": f_name,
                "status": "PENDING",
                "description": f"Verify field state for '{f_name}'"
            })
            step_id += 1

        return {
            "plan_id": plan_id,
            "status": "READY",
            "url": target_url,
            "intent": intent,
            "steps": steps,
            "explanation": {
                "summary": intent.get("explanation", "Task recognized"),
                "fields": explanation_fields,
                "privacy_notes": privacy_notes or ["All fields safe for local execution."],
                "next_step": "Ready for execution: Inspect planned steps and confirm dispatch."
            }
        }
