import re
from typing import Dict, Any, List, Optional

FIELD_SYNONYMS = {
    "name": "NAME",
    "full name": "NAME",
    "first name": "FIRST_NAME",
    "last name": "LAST_NAME",
    "email": "EMAIL",
    "email address": "EMAIL",
    "mail": "EMAIL",
    "phone": "PHONE",
    "phone number": "PHONE",
    "mobile": "PHONE",
    "cell phone": "PHONE",
    "contact": "PHONE",
    "password": "PASSWORD",
    "passcode": "PASSWORD",
    "secret": "PASSWORD",
    "pin": "PIN",
    "address": "ADDRESS",
    "street": "ADDRESS",
    "city": "CITY",
    "zip": "ZIP",
    "postal code": "ZIP",
    "state": "STATE",
    "country": "COUNTRY",
    "card number": "PAYMENT_CARD",
    "credit card": "PAYMENT_CARD",
    "expiry": "CARD_EXPIRY",
    "cvv": "CARD_CVV"
}

HIGHLY_SENSITIVE_FIELDS = {"PASSWORD", "PIN", "PAYMENT_CARD", "CARD_CVV", "API_KEY", "OTP"}
PERSONAL_FIELDS = {"NAME", "FIRST_NAME", "LAST_NAME", "EMAIL", "PHONE", "ADDRESS", "CITY", "ZIP"}

class IntentParser:
    """
    Phase 6: Deterministic, privacy-aware Intent Parser.
    Separates user data from task instructions and classifies field sensitivities.
    """

    @staticmethod
    def extract_user_data(text: str) -> Dict[str, str]:
        extracted = {}
        if not text:
            return extracted
        
        # Match Key = Value or Key: Value
        pairs = re.findall(r'([A-Za-z\s_]+)\s*[:=]\s*([^\n,;]+)', text)
        for k, v in pairs:
            clean_k = k.strip().title()
            clean_v = v.strip()
            if clean_k and clean_v:
                extracted[clean_k] = clean_v

        # Fallback email extraction
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b', text)
        if email_match and "Email" not in extracted:
            extracted["Email"] = email_match.group(0)

        # Fallback phone extraction
        phone_match = re.search(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
        if phone_match and "Phone" not in extracted:
            extracted["Phone"] = phone_match.group(0)

        return extracted

    @classmethod
    def parse(cls, raw_task: str, user_data_text: Optional[str] = None) -> Dict[str, Any]:
        task = (raw_task or "").strip()
        user_data = cls.extract_user_data(user_data_text or raw_task)
        lower_task = task.lower()

        if not task:
            return {
                "action": "FILL",
                "status": "INVALID",
                "fields": [],
                "raw_task": "",
                "normalized_action": "FILL",
                "requires_confirmation": False,
                "clarification_reason": "No task instruction provided."
            }

        # Clarification check
        if any(w in lower_task for w in ["something", "fill it", "do it", "help me"]) and len(task.split()) < 4:
            return {
                "action": "FILL",
                "status": "NEEDS_CLARIFICATION",
                "fields": [],
                "raw_task": task,
                "normalized_action": "FILL",
                "requires_confirmation": True,
                "clarification_reason": "Instruction is vague. Please specify which fields to fill or actions to perform."
            }

        # Check skip instructions
        skip_matches = re.findall(r'(?:leave|skip|omit|do not fill|don\'t fill)\s+(?:the\s+)?([a-zA-Z\s]+?)(?:for me|field|\.|\,|$)', lower_task)
        skipped_fields = set()
        for sm in skip_matches:
            cleaned = sm.strip()
            if cleaned:
                skipped_fields.add(cleaned)

        fields_list = []

        # Parse explicitly mentioned fields or infer from user_data
        detected_field_keys = set(user_data.keys())
        for syn, canonical in FIELD_SYNONYMS.items():
            if syn in lower_task:
                detected_field_keys.add(syn.title())

        for f_name in detected_field_keys:
            norm_key = f_name.lower().strip()
            canonical = FIELD_SYNONYMS.get(norm_key, f_name.upper().replace(" ", "_"))
            is_skipped = any(sk in norm_key for sk in skipped_fields)

            is_sensitive = canonical in HIGHLY_SENSITIVE_FIELDS
            is_personal = canonical in PERSONAL_FIELDS

            sensitivity = "HIGHLY_SENSITIVE" if is_sensitive else ("PERSONAL" if is_personal else "SAFE")
            execution = "LOCAL_ONLY" if is_sensitive else "LOCAL"
            action = "SKIP" if is_skipped else "FILL"

            fields_list.append({
                "field_name": f_name,
                "normalized_name": canonical,
                "value_source": "LOCAL_VAULT" if is_sensitive else ("USER_DATA" if f_name in user_data else "TASK_PROMPT"),
                "value_preview": "[PROTECTED_LOCALLY]" if is_sensitive else user_data.get(f_name, ""),
                "sensitivity": sensitivity,
                "execution": execution,
                "preferred_action": action,
                "required": True
            })

        action_type = "FILL"
        if "click" in lower_task or "press" in lower_task:
            action_type = "CLICK"
        elif "search" in lower_task or "find" in lower_task:
            action_type = "SEARCH"

        return {
            "action": action_type,
            "status": "READY",
            "fields": fields_list,
            "raw_task": task,
            "normalized_action": action_type,
            "requires_confirmation": False,
            "explanation": f"Recognized {action_type} intent with {len(fields_list)} field instruction(s)",
            "user_data_separated": user_data
        }
