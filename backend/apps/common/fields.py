import base64
import hashlib
import hmac
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.db import models


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    key = settings.FIELD_ENCRYPTION_KEY
    if not key:
        # Development fallback only; production refuses to start without a key.
        key = base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode()).digest()).decode()
    return Fernet(key.encode())


def hash_identifier(value: str) -> str:
    """Deterministic keyed hash, used to detect duplicates without storing IDs in clear text."""
    key = (settings.FIELD_ENCRYPTION_KEY or settings.SECRET_KEY).encode()
    return hmac.new(key, value.strip().encode(), hashlib.sha256).hexdigest()


class EncryptedTextField(models.TextField):
    """Encrypts personal identifiers (e.g. national ID) at rest."""

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value in (None, ""):
            return value
        return _fernet().encrypt(str(value).encode()).decode()

    def from_db_value(self, value, expression, connection):
        if value in (None, ""):
            return value
        try:
            return _fernet().decrypt(value.encode()).decode()
        except InvalidToken:
            return ""
