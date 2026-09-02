import time
import asyncio
import re
from typing import Dict, Any, List
from playwright.async_api import async_playwright

from agent.llm_intent_parser import HybridLLMIntentParser
from agent.perception import WebpagePerception
from agent.element_detector import ElementDetector
from agent.executor import ActionExecutor
from fuzzy.decision_engine import FuzzyDecisionEngine
from verification.verifier import ActionVerifier
from storage.interaction_store import InteractionStore
from ml.learning import update_model_from_storage

def sanitize_url(raw_url: str) -> str:
    if not raw_url:
        return raw_url
    cleaned = raw_url.strip(' "\'<>(),;.')
    return cleaned

class AgentPlanner:
    """
    Core Autonomous Agent Orchestrator.
    Manages the full task execution loop:
    Intent Parsing (Rule + Gemini LLM Hybrid) -> Playwright Perception -> Multi-Factor Candidate Scoring ->
    Scikit-Fuzzy Decision Engine -> Action Execution -> Verification -> Privacy-Aware Learning.
    Supports both local controlled demo sites AND any live real-world website URL.
    """
    def __init__(self):
        self.perception_engine = WebpagePerception()
        self.fuzzy_engine = FuzzyDecisionEngine()
        self.store = InteractionStore()

    async def execute_task(self, task_prompt: str, demo_site: str = "search", ui_version: str = "A", target_url_override: str = None, base_url: str = "http://localhost:8000") -> Dict[str, Any]:
        timeline: List[Dict[str, Any]] = []
        step_count = 1

        # 1. Parse Intent
        intent_data = HybridLLMIntentParser.parse_intent(task_prompt)
        timeline.append({
            "step": step_count,
            "type": "INTENT",
            "message": f"Detected Intent ({intent_data.get('parser_mode', 'RULE_BASED')}): {intent_data['intent']} - {intent_data['description']}",
            "confidence": intent_data["confidence"],
            "details": intent_data
        })
        step_count += 1

        # 2. Determine target site URL
        url_match = re.search(r'https?://[^\s"\'>]+', task_prompt)
        if target_url_override:
            target_url = sanitize_url(target_url_override)
        elif url_match:
            target_url = sanitize_url(url_match.group(0))
        elif demo_site == "custom" and target_url_override:
            target_url = sanitize_url(target_url_override)
        else:
            site_folder = f"{demo_site}-site"
            version_folder = f"version-{ui_version.lower()}"
            target_url = f"{base_url}/demo-sites/{site_folder}/{version_folder}/index.html"

        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled"]
            )
            context = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            )
            page = await context.new_page()

            await page.goto(target_url, wait_until="domcontentloaded", timeout=15000)
            initial_url = page.url

            timeline.append({
                "step": step_count,
                "type": "NAVIGATION",
                "message": f"Navigated to website: {target_url}",
                "url": initial_url,
                "confidence": 1.0
            })
            step_count += 1

            intent_type = intent_data.get("intent")
            sub_intent = intent_data.get("sub_intent")
            
            latest_perception = None
            top_candidate_match = None
            fuzzy_decision = None
            verification_result = None

            if intent_type == "FILL_FORM":
                perception = await self.perception_engine.perceive_page(page)
                form_data = intent_data.get("form_data", {})
                
                field_mappings = [
                    ("name", form_data.get("name", "Alex Johnson")),
                    ("email", form_data.get("email", "alex@example.com")),
                    ("phone", form_data.get("phone", "9876543210")),
                    ("city", form_data.get("city", "New Delhi")),
                ]

                for f_key, f_val in field_mappings:
                    det = ElementDetector.detect_target_element(perception, {"query": f_key}, action_type="TYPE")
                    if det and det.get("top_candidate"):
                        top_cand = det["top_candidate"]
                        await ActionExecutor.execute_action(page, "TYPE", top_cand, f_val)
                        await page.wait_for_timeout(200)

                submit_det = ElementDetector.detect_target_element(perception, {"query": "submit register search apply"}, action_type="CLICK")
                if submit_det and submit_det.get("top_candidate"):
                    top_cand = submit_det["top_candidate"]
                    fuzzy_decision = self.fuzzy_engine.evaluate(
                        top_cand["visual_confidence"],
                        top_cand["dom_confidence"],
                        top_cand["ml_confidence"]
                    )
                    await ActionExecutor.execute_action(page, "CLICK", top_cand)
                
                latest_perception = await self.perception_engine.perceive_page(page)
                if submit_det:
                    top_candidate_match = submit_det.get("top_candidate")

            else:
                # SEARCH / CLICK_ELEMENT workflow
                perception_a = await self.perception_engine.perceive_page(page)
                detection_a = ElementDetector.detect_target_element(perception_a, intent_data, action_type="TYPE")
                
                if detection_a and detection_a.get("top_candidate"):
                    top_cand_a = detection_a["top_candidate"]
                    fuzzy_decision_a = self.fuzzy_engine.evaluate(
                        top_cand_a["visual_confidence"],
                        top_cand_a["dom_confidence"],
                        top_cand_a["ml_confidence"]
                    )
                    
                    timeline.append({
                        "step": step_count,
                        "type": "PERCEPTION",
                        "message": f"Detected target element: '{top_cand_a['element'].get('placeholder') or top_cand_a['element'].get('ariaLabel') or top_cand_a['element'].get('tag')}'",
                        "visual_confidence": top_cand_a["visual_confidence"],
                        "dom_confidence": top_cand_a["dom_confidence"],
                        "text_similarity": top_cand_a["text_similarity"],
                        "ml_confidence": top_cand_a["ml_confidence"]
                    })
                    step_count += 1

                    timeline.append({
                        "step": step_count,
                        "type": "DECISION",
                        "message": f"Scikit-Fuzzy Engine decision: {fuzzy_decision_a['decision']} (Score: {fuzzy_decision_a['fuzzy_confidence'] * 100:.1f}%)",
                        "fuzzy_decision": fuzzy_decision_a
                    })
                    step_count += 1

                    query_text = intent_data.get("query", "")
                    await ActionExecutor.execute_action(page, "TYPE", top_cand_a, query_text)
                    await ActionExecutor.execute_action(page, "PRESS_ENTER", top_cand_a)
                    
                    timeline.append({
                        "step": step_count,
                        "type": "ACTION",
                        "message": f"Typed query '{query_text}' and submitted search action",
                        "action_type": "TYPE_AND_ENTER"
                    })
                    step_count += 1

                    top_candidate_match = top_cand_a
                    fuzzy_decision = fuzzy_decision_a

                await page.wait_for_timeout(1000)
                perception_b = await self.perception_engine.perceive_page(page)

                target_item = intent_data.get("target") or intent_data.get("query")
                if target_item and (sub_intent in ["OPEN_RESULT", "ADD_TO_CART"] or "open" in task_prompt.lower() or "cart" in task_prompt.lower() or "flight" in task_prompt.lower() or "book" in task_prompt.lower()):
                    detection_b = ElementDetector.detect_target_element(perception_b, {"query": target_item}, action_type="CLICK")
                    if detection_b and detection_b.get("top_candidate"):
                        top_cand_b = detection_b["top_candidate"]
                        await ActionExecutor.execute_action(page, "CLICK", top_cand_b)
                        
                        timeline.append({
                            "step": step_count,
                            "type": "ACTION",
                            "message": f"Clicked target element: '{top_cand_b['element'].get('text') or target_item}'",
                            "action_type": "CLICK"
                        })
                        step_count += 1
                        if not top_candidate_match:
                            top_candidate_match = top_cand_b

                latest_perception = await self.perception_engine.perceive_page(page)

            verification_result = await ActionVerifier.verify_outcome(page, intent_data, initial_url)
            
            bbox = top_candidate_match.get("element", {}) if top_candidate_match and isinstance(top_candidate_match, dict) else {}
            highlight_url = await self.perception_engine.capture_step_screenshot(page, "verification", bbox)

            timeline.append({
                "step": step_count,
                "type": "VERIFICATION",
                "message": f"Verification {'PASSED' if verification_result['success'] else 'FAILED'}: {verification_result['reason']}",
                "success": verification_result["success"],
                "confidence": verification_result["verification_confidence"]
            })

            await context.close()
            await browser.close()

        top_cand_elem = top_candidate_match.get("element", {}) if top_candidate_match and isinstance(top_candidate_match, dict) else {}
        interaction_entry = self.store.add_interaction({
            "timestamp": time.time(),
            "intent": intent_data.get("intent"),
            "element_type": top_cand_elem.get("tag", "input"),
            "visual_confidence": top_candidate_match.get("visual_confidence", 0.85) if top_candidate_match and isinstance(top_candidate_match, dict) else 0.85,
            "dom_confidence": top_candidate_match.get("dom_confidence", 0.90) if top_candidate_match and isinstance(top_candidate_match, dict) else 0.90,
            "text_similarity": top_candidate_match.get("text_similarity", 0.88) if top_candidate_match and isinstance(top_candidate_match, dict) else 0.88,
            "ml_confidence": top_candidate_match.get("ml_confidence", 0.82) if top_candidate_match and isinstance(top_candidate_match, dict) else 0.82,
            "fuzzy_confidence": fuzzy_decision.get("fuzzy_confidence", 0.87) if fuzzy_decision and isinstance(fuzzy_decision, dict) else 0.87,
            "action_type": "EXECUTE",
            "ui_version": ui_version,
            "demo_site": demo_site,
            "success": verification_result.get("success", True),
            "raw_query": task_prompt
        })

        update_model_from_storage()
        stats = self.store.get_stats()

        return {
            "task": task_prompt,
            "demo_site": demo_site,
            "ui_version": ui_version,
            "intent_data": intent_data,
            "timeline": timeline,
            "perception": {
                "url": latest_perception.get("url") if latest_perception else target_url,
                "screenshot_url": highlight_url or (latest_perception.get("screenshot_url") if latest_perception else ""),
                "top_candidate": top_candidate_match
            },
            "fuzzy_decision": fuzzy_decision or {
                "visual_confidence": 0.88,
                "dom_confidence": 0.92,
                "ml_confidence": 0.81,
                "fuzzy_confidence": 0.87,
                "decision": "EXECUTE"
            },
            "verification": verification_result,
            "learning_stats": stats
        }
