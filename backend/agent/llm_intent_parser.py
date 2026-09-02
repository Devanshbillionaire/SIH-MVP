import os
import json
import re
from typing import Dict, Any
from agent.intent_parser import IntentParser

class HybridLLMIntentParser:
    """
    Hybrid Intent Parser combining Rule-Based NLP with optional Gemini LLM fallback.
    Ensures zero external dependency default operation while supporting complex multi-step LLM reasoning.
    """
    @staticmethod
    def parse_intent(task_prompt: str, api_key: str = None) -> Dict[str, Any]:
        # Fast deterministic rule-based parsing
        rule_result = IntentParser.parse(task_prompt)

        # Check if Gemini API key is configured in environment or parameter
        gemini_key = api_key or os.environ.get("GEMINI_API_KEY")

        if gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_key)
                model = genai.GenerativeModel("gemini-1.5-flash")
                
                system_instruction = """
                You are a Web Browser Agent Intent Parser.
                Analyze the user prompt and return ONLY a valid JSON object matching this schema:
                {
                  "intent": "SEARCH" | "OPEN_RESULT" | "FILL_FORM" | "CLICK_ELEMENT" | "NAVIGATE",
                  "sub_intent": "OPEN_RESULT" | "ADD_TO_CART" | "SUBMIT_FORM" | null,
                  "query": string or null,
                  "target": string or null,
                  "confidence": float between 0.8 and 1.0,
                  "description": string
                }
                Do not include markdown code block syntax. Return raw JSON.
                """
                
                response = model.generate_content(f"{system_instruction}\nUser Prompt: {task_prompt}")
                text = response.text.strip()
                # Clean markdown backticks if present
                text = re.sub(r'^```json\s*|\s*```$', '', text, flags=re.MULTILINE)
                
                parsed = json.loads(text)
                parsed["parser_mode"] = "GEMINI_1.5_FLASH_LLM"
                return parsed
            except Exception:
                # Fallback to rule-based parser on network or key error
                rule_result["parser_mode"] = "RULE_BASED_NLP_FALLBACK"
                return rule_result
        else:
            rule_result["parser_mode"] = "RULE_BASED_NLP"
            return rule_result
