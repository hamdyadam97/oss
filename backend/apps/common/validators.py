import os

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.deconstruct import deconstructible

# Magic-byte signatures; the extension alone is never trusted.
SIGNATURES = {
    ".pdf": [b"%PDF-"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".webp": [b"RIFF"],
    ".gif": [b"GIF87a", b"GIF89a"],
    ".docx": [b"PK\x03\x04"],
    ".xlsx": [b"PK\x03\x04"],
    ".pptx": [b"PK\x03\x04"],
}

IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")
DOCUMENT_EXTENSIONS = (".pdf", ".docx", ".xlsx", ".pptx")
ATTACHMENT_EXTENSIONS = (".pdf", ".jpg", ".jpeg", ".png")


@deconstructible
class SafeFileValidator:
    def __init__(self, allowed_extensions, max_mb: int | None = None):
        self.allowed_extensions = tuple(allowed_extensions)
        self.max_mb = max_mb

    def __call__(self, file):
        ext = os.path.splitext(file.name)[1].lower()
        if ext not in self.allowed_extensions:
            raise ValidationError(f"نوع الملف غير مسموح. الأنواع المسموحة: {', '.join(self.allowed_extensions)}")
        max_mb = self.max_mb or settings.MAX_UPLOAD_SIZE_MB
        if file.size > max_mb * 1024 * 1024:
            raise ValidationError(f"حجم الملف يتجاوز {max_mb} ميجابايت")
        pos = file.tell() if hasattr(file, "tell") else 0
        file.seek(0)
        head = file.read(16)
        file.seek(pos)
        signatures = SIGNATURES.get(ext, [])
        if signatures and not any(head.startswith(sig) for sig in signatures):
            raise ValidationError("محتوى الملف لا يطابق امتداده")
        if ext == ".webp" and head[8:12] != b"WEBP":
            raise ValidationError("محتوى الملف لا يطابق امتداده")

    def __eq__(self, other):
        return (
            isinstance(other, SafeFileValidator)
            and other.allowed_extensions == self.allowed_extensions
            and other.max_mb == self.max_mb
        )


validate_image = SafeFileValidator(IMAGE_EXTENSIONS, max_mb=5)
validate_document = SafeFileValidator(DOCUMENT_EXTENSIONS, max_mb=25)
validate_attachment = SafeFileValidator(ATTACHMENT_EXTENSIONS)


def validate_phone(value: str):
    """Jordanian mobile numbers: 077/078/079 followed by 7 digits, or the same with +962/00962."""
    digits = "".join(ch for ch in value if ch.isdigit())
    if digits.startswith("00962"):
        digits = digits[2:]
    local = "0" + digits[3:] if digits.startswith("962") else digits
    if not (len(local) == 10 and local[:3] in {"077", "078", "079"}):
        raise ValidationError("رقم الهاتف المحمول غير صحيح (مثال: 07XXXXXXXX)")


def validate_national_id(value: str):
    """Jordanian national number (or personal number for non-Jordanians): 10 digits."""
    if not value.isdigit() or len(value) != 10:
        raise ValidationError("الرقم الوطني / الرقم الشخصي يجب أن يتكون من 10 أرقام")
