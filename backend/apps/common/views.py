import mimetypes
import os

from django.http import FileResponse, Http404
from rest_framework import serializers, viewsets

from .audit import AuditedViewSetMixin, log_action
from .models import AuditLog
from .permissions import StaffModelPermissions


class AdminModelViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    """Base viewset for the dashboard: RBAC + audit trail."""

    permission_classes = [StaffModelPermissions]


class AuditLogSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = AuditLog
        exclude = ["user"]


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [StaffModelPermissions]
    filterset_fields = ["action", "model", "username"]
    search_fields = ["username", "object_repr", "model"]


def serve_private_file(instance, field_name: str):
    """Streams a private attachment after the caller has checked permissions, and audits it."""
    field = getattr(instance, field_name, None)
    if not field:
        raise Http404
    try:
        handle = field.open("rb")
    except FileNotFoundError:
        raise Http404
    log_action(AuditLog.Action.DOWNLOAD, instance, changes={"field": field_name})
    filename = f"{instance._meta.model_name}-{instance.pk}-{field_name}{os.path.splitext(field.name)[1]}"
    content_type = mimetypes.guess_type(field.name)[0] or "application/octet-stream"
    response = FileResponse(handle, as_attachment=True, filename=filename, content_type=content_type)
    response["Cache-Control"] = "no-store"
    return response
