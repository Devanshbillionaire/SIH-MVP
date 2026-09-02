import asyncio
from typing import Dict, Any
from playwright.async_api import Page

class ActionExecutor:
    """
    Playwright action execution engine.
    Applies multi-strategy fallbacks (text matching, ARIA attributes, bounding box clicks).
    """
    @staticmethod
    async def execute_action(page: Page, action_type: str, candidate_info: Dict[str, Any], text_value: str = None) -> Dict[str, Any]:
        elem_data = candidate_info.get("element", {}) if candidate_info else {}
        tag = elem_data.get("tag", "").lower()
        text = elem_data.get("text", "")
        placeholder = elem_data.get("placeholder", "")
        name = elem_data.get("name", "")
        elem_id = elem_data.get("id", "")
        x = elem_data.get("x", 0)
        y = elem_data.get("y", 0)
        w = elem_data.get("width", 0)
        h = elem_data.get("height", 0)

        success = False
        action_detail = ""

        try:
            if action_type == "TYPE":
                # Strategy 1: Target by ID or Name attribute if available
                locator = None
                if elem_id:
                    locator = page.locator(f"#{elem_id}")
                elif name:
                    locator = page.locator(f"input[name='{name}']")
                elif placeholder:
                    locator = page.locator(f"input[placeholder='{placeholder}']")
                else:
                    locator = page.locator(tag).first

                if locator and await locator.count() > 0:
                    await locator.fill(text_value or "")
                    success = True
                    action_detail = f"Typed '{text_value}' into target field"
                else:
                    # Strategy 2: Focus and type via bounding box click
                    click_x = x + w / 2
                    click_y = y + h / 2
                    await page.mouse.click(click_x, click_y)
                    await page.keyboard.type(text_value or "")
                    success = True
                    action_detail = f"Typed '{text_value}' via coordinate click focus"

            elif action_type == "PRESS_ENTER":
                await page.keyboard.press("Enter")
                await page.wait_for_timeout(500)
                success = True
                action_detail = "Pressed Enter key"

            elif action_type == "CLICK":
                locator = None
                if elem_id:
                    locator = page.locator(f"#{elem_id}")
                elif text and len(text) < 50:
                    locator = page.get_by_text(text, exact=False).first

                if locator and await locator.count() > 0:
                    await locator.click()
                    success = True
                    action_detail = f"Clicked target element with text '{text or tag}'"
                else:
                    # Strategy 2: Bounding box coordinate mouse click
                    click_x = x + w / 2
                    click_y = y + h / 2
                    await page.mouse.click(click_x, click_y)
                    success = True
                    action_detail = f"Clicked element at position ({click_x:.0f}, {click_y:.0f})"

            elif action_type == "NAVIGATE":
                url = text_value or ""
                await page.goto(url, wait_until="domcontentloaded")
                success = True
                action_detail = f"Navigated to URL {url}"

            await page.wait_for_timeout(600)
        except Exception as e:
            success = False
            action_detail = f"Action execution error: {str(e)}"

        return {
            "success": success,
            "action_type": action_type,
            "details": action_detail
        }
