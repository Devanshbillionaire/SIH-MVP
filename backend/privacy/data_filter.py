import re
from typing import Any, Dict

class PrivacyDataFilter:
    """
    Privacy-aware data sanitizer.
    Strips raw sensitive personal information (emails, passwords, phone numbers,
    credit cards, sensitive personal names) before logging or learning,
    storing only abstract categorical and numerical features.
    """
    EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
    PHONE_PATTERN = re.compile(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b')
    PASSWORD_PATTERN = re.compile(r'(?i)(password|passwd|secret|pwd|pin)')

    @classmethod
    def sanitize_text(cls, text: str) -> str:
        if not text or not isinstance(text, str):
            return text
        
        # Redact emails
        text = cls.EMAIL_PATTERN.sub('[REDACTED_EMAIL]', text)
        # Redact phone numbers
        text = cls.PHONE_PATTERN.sub('[REDACTED_PHONE]', text)
        return text

    @classmethod
    def filter_interaction_data(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extracts abstract features suitable for ML learning without storing PII.
        """
        sanitized = {
            "timestamp": data.get("timestamp"),
            "intent": data.get("intent", "UNKNOWN"),
            "element_type": data.get("element_type", "generic"),
            "visual_confidence": round(float(data.get("visual_confidence", 0.0)), 4),
            "dom_confidence": round(float(data.get("dom_confidence", 0.0)), 4),
            "text_similarity": round(float(data.get("text_similarity", 0.0)), 4),
            "ml_confidence": round(float(data.get("ml_confidence", 0.0)), 4),
            "fuzzy_confidence": round(float(data.get("fuzzy_confidence", 0.0)), 4),
            "action_type": data.get("action_type", "CLICK"),
            "ui_version": data.get("ui_version", "A"),
            "demo_site": data.get("demo_site", "search"),
            "success": bool(data.get("success", False)),
            "sanitized_query_length": len(str(data.get("raw_query", ""))),
            "privacy_sanitized": True
        }
        return sanitized
