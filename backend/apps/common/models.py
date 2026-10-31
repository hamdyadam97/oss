from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField("تاريخ الإنشاء", auto_now_add=True)
    updated_at = models.DateTimeField("آخر تحديث", auto_now=True)

    class Meta:
        abstract = True


class AuditLog(models.Model):
    """Immutable record of sensitive operations performed by staff."""

    class Action(models.TextChoices):
        CREATE = "create", "إضافة"
        UPDATE = "update", "تعديل"
        DELETE = "delete", "حذف"
        DOWNLOAD = "download", "تنزيل مرفق"
        LOGIN = "login", "تسجيل دخول"
        LOGIN_FAILED = "login_failed", "محاولة دخول فاشلة"
        LOGOUT = "logout", "تسجيل خروج"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="audit_logs"
    )
    username = models.CharField(max_length=150, blank=True)
    action = models.CharField(max_length=20, choices=Action.choices)
    model = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=64, blank=True)
    object_repr = models.CharField(max_length=255, blank=True)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "سجل عملية"
        verbose_name_plural = "سجل العمليات"

    def __str__(self):
        return f"{self.username} {self.action} {self.model}#{self.object_id}"
