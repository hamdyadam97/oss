import secrets

TRACKING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_tracking_code(prefix: str) -> str:
    return f"{prefix}-{''.join(secrets.choice(TRACKING_ALPHABET) for _ in range(8))}"


def normalize_phone(value: str) -> str:
    """Returns the local Jordanian form 07XXXXXXXX for +962 / 00962 / 07 inputs."""
    digits = "".join(ch for ch in value if ch.isdigit())
    if digits.startswith("00962"):
        digits = digits[2:]
    if digits.startswith("962"):
        digits = "0" + digits[3:]
    return digits
