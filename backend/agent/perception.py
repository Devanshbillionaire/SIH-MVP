import os
import time
from typing import List, Dict, Any
from playwright.async_api import Page

STATIC_SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "screenshots")

class WebpagePerception:
    """
    DOM + Visual perception engine using Playwright.
    Extracts structural DOM nodes, bounding box spatial coordinates, and step-by-step visual screenshot artifacts.
    """
    def __init__(self):
        os.makedirs(STATIC_SCREENSHOT_DIR, exist_ok=True)

    async def perceive_page(self, page: Page) -> Dict[str, Any]:
        await page.wait_for_load_state("domcontentloaded")
        
        elements_js = """
        () => {
            const candidates = [];
            const selector = 'input, button, a, select, textarea, [role="button"], [role="link"], .course-card, .v2-card-item, .product-card, .v2-item-box, [data-test], [name]';
            const nodes = document.querySelectorAll(selector);

            nodes.forEach((el, index) => {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                const isVisible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';

                if (isVisible) {
                    let text = (el.innerText || el.textContent || el.value || '').trim();
                    if (text.length > 150) text = text.substring(0, 150);

                    candidates.push({
                        index: index,
                        tag: el.tagName.toLowerCase(),
                        id: el.id || '',
                        className: el.className || '',
                        name: el.getAttribute('name') || '',
                        type: el.getAttribute('type') || '',
                        placeholder: el.getAttribute('placeholder') || '',
                        ariaLabel: el.getAttribute('aria-label') || el.getAttribute('aria-placeholder') || '',
                        role: el.getAttribute('role') || '',
                        text: text,
                        x: Math.round(rect.x),
                        y: Math.round(rect.y),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                        isVisible: isVisible
                    });
                }
            });
            return candidates;
        }
        """
        raw_elements = await page.evaluate(elements_js)
        
        filename = f"screenshot_{int(time.time() * 1000)}.png"
        screenshot_path = os.path.join(STATIC_SCREENSHOT_DIR, filename)
        await page.screenshot(path=screenshot_path, full_page=False)

        return {
            "title": await page.title(),
            "url": page.url,
            "elements": raw_elements,
            "screenshot_filename": filename,
            "screenshot_url": f"/static/screenshots/{filename}"
        }

    async def capture_step_screenshot(self, page: Page, step_name: str, bbox: dict = None) -> str:
        """
        Captures a labeled step screenshot with optional bounding box highlight for presentation export.
        """
        if bbox and bbox.get("width", 0) > 0:
            highlight_js = f"""
            () => {{
                let box = document.getElementById('sih-agent-box');
                if (!box) {{
                    box = document.createElement('div');
                    box.id = 'sih-agent-box';
                    box.style.position = 'absolute';
                    box.style.border = '3px solid #ef4444';
                    box.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                    box.style.pointerEvents = 'none';
                    box.style.zIndex = '999999';
                    box.style.borderRadius = '4px';
                    box.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.7)';
                    document.body.appendChild(box);
                }}
                box.style.left = '{bbox["x"]}px';
                box.style.top = '{bbox["y"]}px';
                box.style.width = '{bbox["width"]}px';
                box.style.height = '{bbox["height"]}px';
            }}
            """
            try:
                await page.evaluate(highlight_js)
            except Exception:
                pass

        clean_step = step_name.replace(" ", "_").lower()
        filename = f"{clean_step}_{int(time.time() * 1000)}.png"
        screenshot_path = os.path.join(STATIC_SCREENSHOT_DIR, filename)
        await page.screenshot(path=screenshot_path, full_page=False)

        return f"/static/screenshots/{filename}"
