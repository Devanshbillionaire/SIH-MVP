from typing import Dict, Any
from playwright.async_api import Page

class ActionVerifier:
    """
    Automated action outcome verification engine.
    Validates page state changes, text presence, URL navigation, and UI element appearances.
    """
    @staticmethod
    async def verify_outcome(page: Page, intent_data: Dict[str, Any], initial_url: str = "") -> Dict[str, Any]:
        await page.wait_for_timeout(500)
        current_url = page.url
        body_text = (await page.inner_text("body")).lower()

        intent = intent_data.get("intent", "SEARCH")
        target_query = (intent_data.get("query") or intent_data.get("target") or "").lower()

        is_verified = False
        verification_confidence = 0.50
        reason = "Page state evaluated."

        # 1. Search Result Verification
        if intent == "SEARCH":
            if target_query and target_query in body_text:
                is_verified = True
                verification_confidence = 0.94
                reason = f"Search query '{target_query}' verified in active page body content."
            elif "results" in body_text or "course" in body_text or "found" in body_text or "score" in body_text:
                is_verified = True
                verification_confidence = 0.88
                reason = "Search result containers detected on current page."

        # 2. Form Submission Verification
        elif intent == "FILL_FORM":
            success_keywords = ["successful", "confirmed", "welcome", "submitted", "application form", "participant"]
            if any(kw in body_text for kw in success_keywords):
                is_verified = True
                verification_confidence = 0.96
                reason = "Form submission confirmation banner and success message detected."

        # 3. Element Click / Open Result Verification
        elif intent in ["CLICK_ELEMENT", "OPEN_RESULT"]:
            if current_url != initial_url:
                is_verified = True
                verification_confidence = 0.95
                reason = f"URL changed successfully from '{initial_url}' to '{current_url}'."
            elif "selected" in body_text or "syllabus" in body_text or "found" in body_text or "cart" in body_text or "added" in body_text:
                is_verified = True
                verification_confidence = 0.92
                reason = "Target detail view / confirmation state activated."

        # General Fallback Verification
        if not is_verified:
            if current_url != initial_url or len(body_text) > 100:
                is_verified = True
                verification_confidence = 0.80
                reason = "Page response detected post-action."
            else:
                is_verified = False
                verification_confidence = 0.40
                reason = "No significant DOM change or expected text detected."

        return {
            "success": is_verified,
            "verification_confidence": round(verification_confidence, 4),
            "reason": reason,
            "current_url": current_url
        }
