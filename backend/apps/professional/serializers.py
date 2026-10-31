from django.db import transaction
from rest_framework import serializers

from apps.cms.serializers import SlugMixin
from apps.common.fields import hash_identifier
from apps.common.validators import validate_national_id
from apps.engagement.serializers import AdminSubmissionSerializer, ConsentMixin, _clean_phone

from .models import Course, CourseRegistration, Membership, MembershipType


# ---------------------------------------------------------------- public read
class PublicCourseListSerializer(serializers.ModelSerializer):
    seats_remaining = serializers.IntegerField(read_only=True)
    is_registration_open = serializers.BooleanField(read_only=True)

    class Meta:
        model = Course
        fields = [
            "id", "kind", "title", "title_en", "slug", "summary", "summary_en", "cover", "start_datetime",
            "end_datetime", "location", "is_online", "seats", "seats_remaining", "is_registration_open",
            "cme_hours", "fee",
        ]


class PublicCourseDetailSerializer(PublicCourseListSerializer):
    class Meta(PublicCourseListSerializer.Meta):
        fields = PublicCourseListSerializer.Meta.fields + [
            "description", "description_en", "objectives", "objectives_en", "target_audience", "target_audience_en",
            "speakers", "registration_deadline", "requires_approval", "accreditation", "members_fee",
            "certificate_enabled",
        ]


class PublicMembershipTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipType
        exclude = ("created_at", "updated_at", "is_active", "order")


# ---------------------------------------------------------------- public submit
class IdentityValidationMixin(serializers.Serializer):
    def validate_national_id(self, value):
        validate_national_id(value)
        return value

    def validate_phone(self, value):
        return _clean_phone(value)


class CourseRegistrationCreateSerializer(IdentityValidationMixin, ConsentMixin, serializers.ModelSerializer):
    course = serializers.SlugRelatedField(slug_field="slug", queryset=Course.objects.published())

    class Meta:
        model = CourseRegistration
        fields = [
            "course", "full_name", "full_name_en", "national_id", "phone", "email", "profession", "specialty",
            "license_number", "workplace", "city", "consent", "website",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        course = attrs["course"]
        if not course.is_registration_open:
            raise serializers.ValidationError({"course": "التسجيل في هذه الدورة مغلق"})
        duplicate = course.registrations.filter(national_id_hash=hash_identifier(attrs["national_id"])).exclude(
            status=CourseRegistration.Status.CANCELLED
        )
        if duplicate.exists():
            raise serializers.ValidationError({"national_id": "يوجد تسجيل سابق بهذه الهوية في هذه الدورة"})
        return attrs

    def create(self, validated_data):
        with transaction.atomic():
            # Lock the course row so concurrent sign-ups cannot oversell seats.
            course = Course.objects.select_for_update().get(pk=validated_data["course"].pk)
            if course.seats is not None and course.seats_taken >= course.seats:
                status = CourseRegistration.Status.WAITLISTED
            elif course.requires_approval:
                status = CourseRegistration.Status.PENDING
            else:
                status = CourseRegistration.Status.CONFIRMED
            validated_data["status"] = status
            return super().create(validated_data)


class MembershipCreateSerializer(IdentityValidationMixin, ConsentMixin, serializers.ModelSerializer):
    membership_type = serializers.SlugRelatedField(
        slug_field="slug", queryset=MembershipType.objects.filter(is_active=True)
    )

    class Meta:
        model = Membership
        fields = [
            "membership_type", "full_name", "full_name_en", "national_id", "phone", "email", "gender", "birth_date",
            "nationality", "profession", "specialty", "qualification", "license_number", "workplace", "city",
            "years_experience", "license_card", "cv", "consent", "website",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        mtype = attrs["membership_type"]
        if mtype.requires_license and not attrs.get("license_number"):
            raise serializers.ValidationError({"license_number": "رقم ترخيص مزاولة المهنة مطلوب لهذه الفئة"})
        if mtype.requires_license and not attrs.get("license_card"):
            raise serializers.ValidationError({"license_card": "يرجى إرفاق صورة ترخيص مزاولة المهنة"})
        existing = Membership.objects.filter(
            national_id_hash=hash_identifier(attrs["national_id"]), status__in=Membership.OPEN_STATUSES
        )
        if existing.exists():
            raise serializers.ValidationError(
                {"national_id": "يوجد طلب عضوية أو عضوية سارية بهذه الهوية. استخدم صفحة تتبع الطلب لمعرفة حالتها."}
            )
        return attrs


# ---------------------------------------------------------------- admin
class AdminCourseSerializer(SlugMixin):
    seats_taken = serializers.IntegerField(read_only=True)
    registrations_count = serializers.IntegerField(source="registrations.count", read_only=True)

    class Meta:
        model = Course
        fields = "__all__"

    def validate(self, attrs):
        attrs = super().validate(attrs)
        start = attrs.get("start_datetime", getattr(self.instance, "start_datetime", None))
        end = attrs.get("end_datetime", getattr(self.instance, "end_datetime", None))
        if start and end and end < start:
            raise serializers.ValidationError({"end_datetime": "النهاية يجب أن تكون بعد البداية"})
        return attrs


class AdminMembershipTypeSerializer(SlugMixin):
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = MembershipType
        fields = "__all__"

    def get_members_count(self, obj):
        return obj.memberships.filter(status=Membership.Status.ACTIVE).count()


class AdminCourseRegistrationSerializer(AdminSubmissionSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    certificate_url = serializers.SerializerMethodField()

    class Meta:
        model = CourseRegistration
        exclude = ["national_id_hash"]

    def get_certificate_url(self, obj):
        return f"/certificates/{obj.certificate_code}" if obj.certificate_code else None


class AdminMembershipSerializer(AdminSubmissionSerializer):
    EDITABLE = AdminSubmissionSerializer.EDITABLE + ("expiry_date",)
    FILE_FIELDS = ("license_card", "cv")
    URL_NAME = "admin-memberships-file"
    membership_type_title = serializers.CharField(source="membership_type.title", read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Membership
        exclude = ["national_id_hash"]


class BulkActionSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(), min_length=1, max_length=500)
    status = serializers.CharField()
