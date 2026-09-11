import os
import time
from typing import Dict, Any, List

class PagePerception:
    """
    DOM & Visual Perception Engine.
    Uses Playwright to capture page screenshots, extract interactive elements,
    compute bounding boxes, and generate visual inspection overlays.
    """
    def __init__(self, headless: bool = True):
        self.headless = headless

    async def capture_page(self, page, screenshot_path: str = None) -> Dict[str, Any]:
        url = page.url
        title = await page.title()
        
        # Extract interactive elements with bounding boxes
        elements_script = """
        () => {
            const items = [];
            const interactive = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [tabindex="0"]');
            interactive.forEach((el, index) => {
                const rect = el.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
                items.push({
                    index: index,
                    tag: el.tagName.toLowerCase(),
                    text: (el.innerText || el.textContent || '').trim().slice(0, 100),
                    placeholder: el.getAttribute('placeholder') || '',
                    ariaLabel: el.getAttribute('aria-label') || '',
                    name: el.getAttribute('name') || '',
                    id: el.id || '',
                    className: el.className || '',
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    isVisible: isVisible
                });
            });
            return items;
        }
        """
        elements = await page.evaluate(elements_script)

        # Take screenshot if path provided
        if screenshot_path:
            os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
            await page.screenshot(path=screenshot_path, full_page=False)

        return {
            "url": url,
            "title": title,
            "elements": elements,
            "screenshot_path": screenshot_path,
            "timestamp": time.time()
        }
