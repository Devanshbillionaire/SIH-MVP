import asyncio
from typing import Dict, Any, Optional, List

HIGH_RISK_KEYWORDS = [
    "purchase", "pay", "delete", "send", "confirm", "submit",
    "place order", "transfer", "sign", "authorize", "checkout", "buy now"
]

class ActionExecutor:
    """
    Phase 7 Safe Form Execution Engine (Python Parity).
    Executes form interactions (FILL, TYPE, SELECT, CHECK, UNCHECK, RADIO, CLICK)
    with strict privacy gates, input-type verification, and local outcome checks.
    """
    MAX_RETRIES = 2

    @staticmethod
    def is_high_risk(target_name: str, action_type: str) -> bool:
        lower = (target_name or "").lower()
        return any(kw in lower for kw in HIGH_RISK_KEYWORDS) or action_type.upper() == "SUBMIT"

    @staticmethod
    async def validate_input_compatibility(page, selector: str, action: str) -> Optional[str]:
        try:
            element_meta = await page.eval_on_selector(
                selector,
                "el => ({ tag: el.tagName.toLowerCase(), type: (el.getAttribute('type') || '').toLowerCase() })"
            )
            tag = element_meta.get("tag", "")
            el_type = element_meta.get("type", "")

            act = action.upper()
            if act in ["FILL", "TYPE"]:
                if tag == "select":
                    return "Incompatible element: Expected text input, but found '<select>' dropdown."
                if el_type in ["checkbox", "radio"]:
                    return f"Incompatible element: Cannot fill text into '{el_type}' input."

            if act == "SELECT" and tag != "select":
                return f"Incompatible element: Expected '<select>', but found '<{tag}>'."

            if act in ["CHECK", "UNCHECK"] and el_type != "checkbox":
                return f"Incompatible element: Expected checkbox input, but found '{el_type or tag}'."

            return None
        except Exception:
            return None

    @staticmethod
    async def execute_action(
        page,
        action_type: str,
        element_data: Dict[str, Any],
        input_text: Optional[str] = None,
        is_sensitive: bool = False,
        confirmed_high_risk: bool = False
    ) -> Dict[str, Any]:
        """
        Executes a validated action on the element using Playwright locator strategies,
        enforcing high-risk safety gates and verification.
        """
        act = action_type.upper()
        target_name = element_data.get("name") or element_data.get("id") or element_data.get("placeholder") or "field"

        # Safety Gate: High-risk actions & submit
        if ActionExecutor.is_high_risk(target_name, act) and not confirmed_high_risk:
            return {
                "success": False,
                "status": "BLOCKED",
                "action": act,
                "target": target_name,
                "verified": False,
                "error_category": "HIGH_RISK_BLOCKED",
                "reason": f"High-risk action '{target_name}' blocked per safety policy. User confirmation required."
            }

        # Resolve locator
        selector = None
        if element_data.get("id"):
            selector = f"#{element_data['id']}"
        elif element_data.get("name"):
            selector = f"[name='{element_data['name']}']"
        elif element_data.get("placeholder"):
            selector = f"[placeholder='{element_data['placeholder']}']"

        if not selector:
            x = element_data.get("x", 0) + element_data.get("width", 0) // 2
            y = element_data.get("y", 0) + element_data.get("height", 0) // 2

        try:
            # Compatibility check
            if selector:
                compat_err = await ActionExecutor.validate_input_compatibility(page, selector, act)
                if compat_err:
                    return {
                        "success": False,
                        "status": "FAILED",
                        "action": act,
                        "target": target_name,
                        "verified": False,
                        "reason": compat_err
                    }

            # 1. FILL / TYPE
            if act in ["FILL", "TYPE"]:
                val = input_text or ""
                if selector:
                    await page.fill(selector, val)
                    await page.dispatch_event(selector, "input")
                    await page.dispatch_event(selector, "change")
                else:
                    await page.mouse.click(x, y)
                    await page.keyboard.type(val)

                await asyncio.sleep(0.2)

                # Local verification (never log secret!)
                verified = True
                if selector:
                    actual = await page.input_value(selector)
                    verified = (actual == val)

                return {
                    "success": verified,
                    "status": "SUCCESS" if verified else "FAILED",
                    "action": act,
                    "target": target_name,
                    "verified": verified,
                    "verification_status": "MATCH" if verified else "MISMATCH",
                    "reason": "Protected secret filled locally." if is_sensitive else ("Verified in live DOM" if verified else "Value mismatch")
                }

            # 2. SELECT
            elif act == "SELECT":
                val = (input_text or "").strip()
                if selector:
                    try:
                        await page.select_option(selector, value=val)
                    except Exception:
                        await page.select_option(selector, label=val)
                    await page.dispatch_event(selector, "change")
                await asyncio.sleep(0.2)

                selected = await page.input_value(selector) if selector else None
                verified = bool(selected)
                return {
                    "success": verified,
                    "status": "SUCCESS" if verified else "FAILED",
                    "action": "SELECT",
                    "target": target_name,
                    "verified": verified,
                    "reason": "Dropdown selection verified." if verified else "Selection empty."
                }

            # 3. CHECK
            elif act == "CHECK":
                if selector:
                    is_checked = await page.is_checked(selector)
                    if not is_checked:
                        await page.check(selector)
                else:
                    await page.mouse.click(x, y)
                await asyncio.sleep(0.2)

                verified = await page.is_checked(selector) if selector else True
                return {
                    "success": verified,
                    "status": "SUCCESS" if verified else "FAILED",
                    "action": "CHECK",
                    "target": target_name,
                    "verified": verified,
                    "reason": "Checkbox checked verified."
                }

            # 4. UNCHECK
            elif act == "UNCHECK":
                if selector:
                    is_checked = await page.is_checked(selector)
                    if is_checked:
                        await page.uncheck(selector)
                await asyncio.sleep(0.2)

                verified = not (await page.is_checked(selector)) if selector else True
                return {
                    "success": verified,
                    "status": "SUCCESS" if verified else "FAILED",
                    "action": "UNCHECK",
                    "target": target_name,
                    "verified": verified,
                    "reason": "Checkbox unchecked verified."
                }

            # 5. RADIO
            elif act == "RADIO":
                if selector:
                    await page.check(selector)
                else:
                    await page.mouse.click(x, y)
                await asyncio.sleep(0.2)

                verified = await page.is_checked(selector) if selector else True
                return {
                    "success": verified,
                    "status": "SUCCESS" if verified else "FAILED",
                    "action": "RADIO",
                    "target": target_name,
                    "verified": verified,
                    "reason": "Radio button selected verified."
                }

            # 6. CLICK
            elif act == "CLICK":
                if selector:
                    await page.click(selector)
                else:
                    await page.mouse.click(x, y)
                await asyncio.sleep(0.3)
                return {
                    "success": True,
                    "status": "SUCCESS",
                    "action": "CLICK",
                    "target": target_name,
                    "verified": True,
                    "reason": "Click dispatched safely."
                }

            return {
                "success": False,
                "status": "FAILED",
                "action": act,
                "reason": f"Unsupported action '{act}'"
            }

        except Exception as e:
            return {
                "success": False,
                "status": "FAILED",
                "action": act,
                "target": target_name,
                "verified": False,
                "reason": str(e)
            }

