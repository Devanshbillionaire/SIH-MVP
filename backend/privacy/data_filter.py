import re
from typing import Dict, Any

import re
from typing import Dict, Any, List, Optional

class PrivacySensitivity:
    PUBLIC = "PUBLIC"
    LOW_SENSITIVITY = "LOW_SENSITIVITY"
    PERSONAL = "PERSONAL"
    SENSITIVE = "SENSITIVE"
    HIGHLY_SENSITIVE = "HIGHLY_SENSITIVE"

class PrivacyDataFilter:
    """
    Privacy Data Sanitization and Classification Gateway.
    Detects and sanitizes PII (emails, phone numbers, passwords, tokens, credit card digits)
    before logging or sending features to ML/storage.
    """
    BENIGN_CONCEPT_PATTERNS = [
        re.compile(r'\bpassword\s+manager\b', re.IGNORECASE),
        re.compile(r'\bpassword\s+reset\s*(page|link|form)?\b', re.IGNORECASE),
        re.compile(r'\bforgot\s+password\b', re.IGNORECASE),
        re.compile(r'\botp\s+verification\s*(form|page|screen)?\b', re.IGNORECASE),
        re.compile(r'\b2fa\s+setup\b', re.IGNORECASE),
    ]

    @classmethod
    def classify_field(cls, key: str, value: str) -> Dict[str, Any]:
        norm_key = key.strip().lower()
        val = value.strip()

        # Benign check
        for pattern in cls.BENIGN_CONCEPT_PATTERNS:
            if pattern.search(val) or pattern.search(key):
                return {
                    "key": key,
                    "category": "GENERAL",
                    "sensitivity": PrivacySensitivity.LOW_SENSITIVITY,
                    "confidence": 0.95,
                    "reason": "Mention of security concept in non-secret context",
                    "allowed_for_external_ai": True
                }

        # Password
        if any(term in norm_key for term in ['password', 'passwd', 'pwd', 'passcode', 'secret', 'client_secret']) or norm_key == 'pass':
            return {
                "key": key,
                "category": "PASSWORD",
                "sensitivity": PrivacySensitivity.HIGHLY_SENSITIVE,
                "confidence": 0.99,
                "reason": "Explicit credential password field",
                "allowed_for_external_ai": False,
                "redacted_preview": "[PROTECTED]"
            }

        # OTP & PIN
        if any(term in norm_key for term in ['otp', 'one-time password', 'pin', 'verification code', '2fa', 'mfa']):
            return {
                "key": key,
                "category": "PIN" if "pin" in norm_key else "OTP",
                "sensitivity": PrivacySensitivity.HIGHLY_SENSITIVE,
                "confidence": 0.99,
                "reason": "One-time authentication code or security PIN",
                "allowed_for_external_ai": False,
                "redacted_preview": "[PROTECTED]"
            }

        # API Keys
        if any(term in norm_key for term in ['api_key', 'apikey', 'access_token', 'private_key', 'auth_token']) or val.startswith(('sk-', 'ghp_', 'AIza')):
            return {
                "key": key,
                "category": "API_KEY",
                "sensitivity": PrivacySensitivity.HIGHLY_SENSITIVE,
                "confidence": 0.98,
                "reason": "Secret programmatic authorization API key or access token",
                "allowed_for_external_ai": False,
                "redacted_preview": "[PROTECTED]"
            }

        # Financial / Payment
        if any(term in norm_key for term in ['credit_card', 'card', 'cvv', 'cvc', 'bank_account', 'iban']) or re.match(r'^\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}$', val):
            return {
                "key": key,
                "category": "PAYMENT",
                "sensitivity": PrivacySensitivity.HIGHLY_SENSITIVE,
                "confidence": 0.98,
                "reason": "Financial payment or cardholder credential",
                "allowed_for_external_ai": False,
                "redacted_preview": "[PROTECTED]"
            }

        # Government ID
        if any(term in norm_key for term in ['ssn', 'social security', 'aadhaar', 'passport']) or re.match(r'^\d{3}-\d{2}-\d{4}$', val):
            return {
                "key": key,
                "category": "GOV_ID",
                "sensitivity": PrivacySensitivity.HIGHLY_SENSITIVE,
                "confidence": 0.96,
                "reason": "Official government identity identifier",
                "allowed_for_external_ai": False,
                "redacted_preview": "[PROTECTED]"
            }

        # Email
        if 'email' in norm_key or re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', val):
            return {
                "key": key,
                "category": "EMAIL",
                "sensitivity": PrivacySensitivity.PERSONAL,
                "confidence": 0.99,
                "reason": "Personal direct communication email",
                "allowed_for_external_ai": True
            }

        # Phone
        if any(term in norm_key for term in ['phone', 'mobile', 'tel']) or re.match(r'^\+?[\d\s\-().]{7,20}$', val):
            return {
                "key": key,
                "category": "PHONE",
                "sensitivity": PrivacySensitivity.PERSONAL,
                "confidence": 0.95,
                "reason": "Personal telephone contact number",
                "allowed_for_external_ai": True
            }

        # Name
        if norm_key in ['name', 'fullname', 'firstname', 'lastname', 'custname']:
            return {
                "key": key,
                "category": "NAME",
                "sensitivity": PrivacySensitivity.PERSONAL,
                "confidence": 0.92,
                "reason": "Personal identity name",
                "allowed_for_external_ai": True
            }

        # General / Low Sensitivity
        if any(term in norm_key for term in ['city', 'country', 'state', 'course', 'topic', 'job', 'company']):
            return {
                "key": key,
                "category": "GENERAL",
                "sensitivity": PrivacySensitivity.LOW_SENSITIVITY,
                "confidence": 0.95,
                "reason": "Low-risk categorical or geographic field",
                "allowed_for_external_ai": True
            }

        # Default fallback (low sensitivity)
        return {
            "key": key,
            "category": "GENERAL",
            "sensitivity": PrivacySensitivity.LOW_SENSITIVITY,
            "confidence": 0.8,
            "reason": "Standard form attribute without sensitive markers",
            "allowed_for_external_ai": True
        }

    @classmethod
    def analyze_information(cls, raw_data: Any) -> Dict[str, Any]:
        """
        Analyzes input and splits into safe_data and protected_data.
        Never returns raw protected values.
        """
        safe_data = []
        protected_data = []
        safe_payload = {}

        items = []
        if isinstance(raw_data, dict):
            items = list(raw_data.items())
        elif isinstance(raw_data, str):
            for line in raw_data.strip().splitlines():
                if ':' in line:
                    k, v = line.split(':', 1)
                    items.append((k.strip(), v.strip()))
                elif '=' in line:
                    k, v = line.split('=', 1)
                    items.append((k.strip(), v.strip()))

        for k, v in items:
            classified = cls.classify_field(k, v)
            if not classified["allowed_for_external_ai"]:
                protected_data.append({
                    "key": classified["key"],
                    "category": classified["category"],
                    "sensitivity": classified["sensitivity"],
                    "confidence": classified["confidence"],
                    "reason": classified["reason"],
                    "allowed_for_external_ai": False,
                    "redacted_preview": "[PROTECTED]"
                })
            else:
                safe_data.append({
                    "key": classified["key"],
                    "value": v,
                    "category": classified["category"],
                    "sensitivity": classified["sensitivity"],
                    "confidence": classified["confidence"],
                    "reason": classified["reason"],
                    "allowed_for_external_ai": True
                })
                safe_payload[classified["key"]] = v

        has_protected = len(protected_data) > 0
        return {
            "success": True,
            "analyzed_count": len(items),
            "safe_data": safe_data,
            "protected_data": protected_data,
            "external_ai_safe_payload": safe_payload,
            "external_ai_access": "BLOCKED_FOR_PROTECTED" if has_protected else "ALLOWED",
            "redaction_active": has_protected,
            "message": f"{len(protected_data)} sensitive items isolated; {len(safe_data)} safe items approved."
        }

    @staticmethod
    def filter_text(text: str) -> str:
        if not text:
            return ""
        filtered = text
        filtered = re.sub(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', '[EMAIL_REDACTED]', filtered)
        filtered = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE_REDACTED]', filtered)
        filtered = re.sub(r'\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}', '[PHONE_REDACTED]', filtered)
        filtered = re.sub(r'(password|passwd|pwd|secret|token|api_key|auth)=[^&\s]+', r'\1=[CONFIDENTIAL_REDACTED]', filtered, flags=re.IGNORECASE)
        filtered = re.sub(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b', '[CARD_REDACTED]', filtered)
        return filtered

    @classmethod
    def filter_interaction_data(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        sanitized = {}
        for k, v in data.items():
            if any(term in k.lower() for term in ['password', 'secret', 'token', 'credit_card', 'cvv', 'ssn']):
                sanitized[k] = '[CONFIDENTIAL_REDACTED]'
            elif isinstance(v, str):
                sanitized[k] = cls.filter_text(v)
            elif isinstance(v, dict):
                sanitized[k] = cls.filter_interaction_data(v)
            else:
                sanitized[k] = v
        return sanitized
