import json

from django.urls import reverse
from django.utils import timezone
from rest_framework import serializers

from apps.cms.models import Program
from apps.cms.serializers import SlugMixin
from apps.common.utils import normalize_phone
from apps.common.validators import validate_national_id, validate_phone

from . import models

ALLOWED_EXTRA_TYPES = {"text", "textarea", "number", "date", "select", "boolean"}


# ---------------------------------------------------------------- public read
class PublicServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Service
        exclude = ("created_at", "updated_at", "is_active", "order")


class PublicOpportunitySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.VolunteerOpportunity
        exclude = ("created_at", "updated_at", "is_open", "order")


# ---------------------------------------------------------------- public submit
class ConsentMixin(serializers.Serializer):
    consent = serializers.BooleanField(write_only=True)
    # Honeypot: real users never see or fill this field.
    website = serializers.CharField(write_only=True, required=False, allow_blank=True)

    def validate_consent(self, value):
        if not value:
            raise serializers.ValidationError("يجب الموافقة على سياسة الخصوصية")
        return value

    def validate_website(self, value):
        if value:
            raise serializers.ValidationError("طلب غير صالح")
        return value

    def create(self, validated_data):
        validated_data.pop("consent", None)
        validated_data.pop("website", None)
        validated_data["consented_at"] = timezone.now()
        return super().create(validated_data)


def _clean_phone(value):
    validate_phone(value)
    return normalize_phone(value)


class ServiceRequestCreateSerializer(ConsentMixin, serializers.ModelSerializer):
    service = serializers.SlugRelatedField(slug_field="slug", queryset=models.Service.objects.filter(is_active=True))
    extra_data = serializers.JSONField(required=False)

    class Meta:
        model = models.ServiceRequest
        fields = [
            "service", "full_name", "national_id", "phone", "email", "city", "district", "family_size",
            "details", "extra_data", "attachment_1", "attachment_2", "attachment_3", "consent", "website",
        ]

    def validate_national_id(self, value):
        validate_national_id(value)
        return value

    def validate_phone(self, value):
        return _clean_phone(value)

    def validate_extra_data(self, value):
        if isinstance(value, str):
            try:
                value = json.loads(value or "{}")
            except json.JSONDecodeError:
                raise serializers.ValidationError("بيانات غير صالحة")
        if not isinstance(value, dict):
            raise serializers.ValidationError("بيانات غير صالحة")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        service = attrs["service"]
        submitted = attrs.get("extra_data") or {}
        clean, errors = {}, {}
        # Only keep fields the service defines; ignore anything else.
        for field in service.extra_fields or []:
            name, label = field.get("name"), field.get("label", field.get("name"))
            if not name:
                continue
            value = submitted.get(name)
            if value in (None, ""):
                if field.get("required"):
                    errors[name] = f"{label} مطلوب"
                continue
            value = str(value)[:2000]
            if field.get("type") == "select" and value not in (field.get("options") or []):
                errors[name] = f"قيمة غير صالحة لـ {label}"
                continue
            if field.get("type") == "number":
                try:
                    float(value)
                except ValueError:
                    errors[name] = f"{label} يجب أن يكون رقمًا"
                    continue
            clean[name] = {"label": label, "value": value}
        if errors:
            raise serializers.ValidationError({"extra_data": errors})
        attrs["extra_data"] = clean
        if service.requires_attachment and not attrs.get("attachment_1"):
            raise serializers.ValidationError({"attachment_1": "المرفق مطلوب لهذه الخدمة"})
        return attrs


class VolunteerApplicationCreateSerializer(ConsentMixin, serializers.ModelSerializer):
    opportunity = serializers.SlugRelatedField(
        slug_field="slug", queryset=models.VolunteerOpportunity.objects.open(), required=False, allow_null=True
    )

    class Meta:
        model = models.VolunteerApplication
        fields = [
            "opportunity", "full_name", "national_id", "phone", "email", "gender", "birth_date", "city",
            "education", "occupation", "skills", "availability", "motivation", "cv", "consent", "website",
        ]

    def validate_national_id(self, value):
        validate_national_id(value)
        return value

    def validate_phone(self, value):
        return _clean_phone(value)


class PartnershipRequestCreateSerializer(ConsentMixin, serializers.ModelSerializer):
    program = serializers.PrimaryKeyRelatedField(
        queryset=Program.objects.published(), required=False, allow_null=True
    )

    class Meta:
        model = models.PartnershipRequest
        fields = [
            "kind", "organization", "contact_name", "position", "email", "phone", "program", "message",
            "attachment", "consent", "website",
        ]

    def validate_phone(self, value):
        return _clean_phone(value)


class ContactMessageCreateSerializer(ConsentMixin, serializers.ModelSerializer):
    class Meta:
        model = models.ContactMessage
        fields = ["name", "email", "phone", "subject", "message", "consent", "website"]


class TrackSerializer(serializers.Serializer):
    tracking_code = serializers.CharField(max_length=20)
    phone = serializers.CharField(max_length=20)


# ---------------------------------------------------------------- admin
class AdminServiceSerializer(SlugMixin):
    class Meta:
        model = models.Service
        fields = "__all__"

    def validate_extra_fields(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("يجب أن تكون قائمة")
        names = set()
        for field in value:
            if not isinstance(field, dict) or not field.get("name") or not field.get("label"):
                raise serializers.ValidationError("كل حقل يحتاج name و label")
            if field.get("type", "text") not in ALLOWED_EXTRA_TYPES:
                raise serializers.ValidationError(f"نوع غير مدعوم: {field.get('type')}")
            if field["name"] in names:
                raise serializers.ValidationError(f"اسم مكرر: {field['name']}")
            names.add(field["name"])
        return value


class AdminOpportunitySerializer(SlugMixin):
    applications_count = serializers.IntegerField(source="applications.count", read_only=True)

    class Meta:
        model = models.VolunteerOpportunity
        fields = "__all__"


class AdminSubmissionSerializer(serializers.ModelSerializer):
    """Applicant data is read-only for staff; only workflow fields are editable."""

    EDITABLE = ("status", "admin_notes", "public_note", "assigned_to")
    FILE_FIELDS: tuple[str, ...] = ()
    URL_NAME = ""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    files = serializers.SerializerMethodField()

    def get_fields(self):
        fields = super().get_fields()
        for name, field in fields.items():
            if name not in self.EDITABLE:
                field.read_only = True
        for name in self.FILE_FIELDS:
            fields.pop(name, None)
        return fields

    def get_files(self, obj):
        request = self.context.get("request")
        result = []
        for name in self.FILE_FIELDS:
            if getattr(obj, name):
                url = reverse(self.URL_NAME, kwargs={"pk": obj.pk, "field": name})
                result.append({"field": name, "url": request.build_absolute_uri(url) if request else url})
        return result


class AdminServiceRequestSerializer(AdminSubmissionSerializer):
    FILE_FIELDS = ("attachment_1", "attachment_2", "attachment_3")
    URL_NAME = "admin-service-requests-file"
    service_title = serializers.CharField(source="service.title", read_only=True)

    class Meta:
        model = models.ServiceRequest
        fields = "__all__"


class AdminVolunteerApplicationSerializer(AdminSubmissionSerializer):
    EDITABLE = AdminSubmissionSerializer.EDITABLE + ("hours_completed",)
    FILE_FIELDS = ("cv",)
    URL_NAME = "admin-volunteer-applications-file"
    opportunity_title = serializers.CharField(source="opportunity.title", read_only=True, default="")

    class Meta:
        model = models.VolunteerApplication
        fields = "__all__"


class AdminPartnershipRequestSerializer(AdminSubmissionSerializer):
    FILE_FIELDS = ("attachment",)
    URL_NAME = "admin-partnership-requests-file"

    class Meta:
        model = models.PartnershipRequest
        fields = "__all__"


class AdminContactMessageSerializer(AdminSubmissionSerializer):
    class Meta:
        model = models.ContactMessage
        fields = "__all__"
