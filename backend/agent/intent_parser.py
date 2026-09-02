import re
from typing import Dict, Any

class IntentParser:
    """
    Lightweight rule-based NLP intent parser.
    Parses user natural language prompt into structured intent payload.
    """
    @staticmethod
    def parse(user_prompt: str) -> Dict[str, Any]:
        prompt = user_prompt.strip()
        lower_prompt = prompt.lower()

        # 1. Search + Open result pattern
        search_open_match = re.search(r'(?:search|find|look for)\s+(?:for\s+)?(.+?)\s+and\s+(?:open|click|select)\s+(?:the\s+)?(.+)', lower_prompt)
        if search_open_match:
            query = search_open_match.group(1).strip()
            target = search_open_match.group(2).strip()
            return {
                "intent": "SEARCH",
                "sub_intent": "OPEN_RESULT",
                "query": query,
                "target": target,
                "confidence": 0.98,
                "description": f"Search for '{query}' and open '{target}'"
            }

        # 2. Search + Add to cart pattern
        search_cart_match = re.search(r'(?:search|find)\s+(?:for\s+)?(.+?)\s+and\s+add\s+(?:it\s+)?to\s+cart', lower_prompt)
        if search_cart_match:
            query = search_cart_match.group(1).strip()
            return {
                "intent": "SEARCH",
                "sub_intent": "ADD_TO_CART",
                "query": query,
                "target": "Add to Cart",
                "confidence": 0.96,
                "description": f"Search for '{query}' and add to cart"
            }

        # 3. Simple Search pattern
        if "search" in lower_prompt or "find" in lower_prompt or "look for" in lower_prompt:
            query_match = re.search(r'(?:search|find|look for)\s+(?:for\s+)?([^\.,\n]+)', lower_prompt)
            query = query_match.group(1).strip() if query_match else prompt
            return {
                "intent": "SEARCH",
                "sub_intent": None,
                "query": query,
                "target": None,
                "confidence": 0.95,
                "description": f"Search query '{query}'"
            }

        # 4. Fill form pattern
        if "fill" in lower_prompt or "form" in lower_prompt or "register" in lower_prompt or "registration" in lower_prompt or "apply" in lower_prompt:
            # Extract sample values if given in prompt
            name = "Alex Johnson"
            email = "alex.johnson@example.com"
            phone = "9876543210"
            city = "New Delhi"

            name_match = re.search(r'for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)', prompt)
            if name_match:
                name = name_match.group(1)

            return {
                "intent": "FILL_FORM",
                "sub_intent": "SUBMIT_FORM",
                "form_data": {
                    "name": name,
                    "email": email,
                    "phone": phone,
                    "city": city
                },
                "confidence": 0.96,
                "description": "Fill out participant registration form"
            }

        # 5. Open / Click element pattern
        if "open" in lower_prompt or "click" in lower_prompt or "select" in lower_prompt:
            target_match = re.search(r'(?:open|click|select)\s+(?:the\s+)?(.+)', lower_prompt)
            target = target_match.group(1).strip() if target_match else prompt
            return {
                "intent": "CLICK_ELEMENT",
                "sub_intent": None,
                "query": target,
                "target": target,
                "confidence": 0.92,
                "description": f"Click element matching '{target}'"
            }

        # Default fallback intent: SEARCH / GENERAL
        return {
            "intent": "SEARCH",
            "sub_intent": None,
            "query": prompt,
            "target": None,
            "confidence": 0.85,
            "description": f"General task execution for '{prompt}'"
        }
