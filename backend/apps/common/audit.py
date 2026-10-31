from django.db.models.fields.files import FieldFile
from django.forms.models import model_to_dict

from .middleware import get_client_ip, get_current_request
from .models import AuditLog

SENSITIVE_FIELDS = {"national_id", "password", "phone", "email", "birth_date"}
MAX_VALUE_LENGTH = 200


def _clean(name, value):
    if name in SENSITIVE_FIELDS:
        return "***"
    if isinstance(value, FieldFile):
        value = value.name or ""
    if isinstance(value, (list, tuple)):
        value = [getattr(v, "pk", v) for v in value]
    text = str(value) if value is not None else ""
    return text[:MAX_VALUE_LENGTH]


def snapshot(instance) -> dict:
    return {k: _clean(k, v) for k, v in model_to_dict(instance).items()}


def diff(before: dict, after: dict) -> dict:
    return {k: [before.get(k), v] for k, v in after.items() if before.get(k) != v}


def log_action(action, instance=None, changes=None, user=None, request=None, object_repr=None):
    request = request or get_current_request()
    if user is None and request is not None and getattr(request, "user", None) and request.user.is_authenticated:
        user = request.user
    AuditLog.objects.create(
        user=user,
        username=getattr(user, "username", "") or "",
        action=action,
        model=instance._meta.label_lower if instance is not None else "",
        object_id=str(getattr(instance, "pk", "") or ""),
        object_repr=(object_repr or (str(instance) if instance is not None else ""))[:255],
        changes=changes or {},
        ip_address=get_client_ip(request),
        user_agent=(request.META.get("HTTP_USER_AGENT", "") if request else "")[:255],
    )


class AuditedViewSetMixin:
    """Writes an AuditLog entry for every create/update/delete done through the admin API."""

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(AuditLog.Action.CREATE, instance, changes=snapshot(instance))

    def perform_update(self, serializer):
        before = snapshot(serializer.instance)
        instance = serializer.save()
        changes = diff(before, snapshot(instance))
        if changes:
            log_action(AuditLog.Action.UPDATE, instance, changes=changes)

    def perform_destroy(self, instance):
        log_action(AuditLog.Action.DELETE, instance, changes=snapshot(instance))
        instance.delete()
