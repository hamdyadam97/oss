import csv
from datetime import timedelta

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cms.views import PublicReadOnlyViewSet
from apps.common.audit import diff, log_action, snapshot
from apps.common.models import AuditLog
from apps.common.permissions import IsStaff
from apps.common.views import AdminModelViewSet
from apps.engagement.views import AdminSubmissionViewSet, PublicSubmitView

from . import serializers as s
from .models import Course, CourseRegistration, Membership, MembershipType


# =============================================================== public API
class PublicCourseViewSet(PublicReadOnlyViewSet):
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"
    filterset_fields = ["kind"]
    search_fields = ["title", "summary"]

    def get_queryset(self):
        when = self.request.query_params.get("when")
        if when == "upcoming":
            return Course.objects.upcoming().order_by("start_datetime")
        if when == "past":
            return Course.objects.past()
        return Course.objects.published()

    def get_serializer_class(self):
        return s.PublicCourseDetailSerializer if self.action == "retrieve" else s.PublicCourseListSerializer


class PublicMembershipTypeViewSet(PublicReadOnlyViewSet):
    queryset = MembershipType.objects.filter(is_active=True)
    serializer_class = s.PublicMembershipTypeSerializer
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"
    pagination_class = None


class CourseRegisterSubmitView(PublicSubmitView):
    serializer_class = s.CourseRegistrationCreateSerializer

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        reg = CourseRegistration.objects.get(tracking_code=response.data["tracking_code"])
        response.data.update({"status": reg.status, "status_display": reg.get_status_display()})
        return response


class MembershipSubmitView(PublicSubmitView):
    serializer_class = s.MembershipCreateSerializer


class CertificateVerifyView(APIView):
    """Public verification of an attendance certificate by its code."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, code):
        reg = get_object_or_404(
            CourseRegistration.objects.select_related("course"),
            certificate_code=code.strip().upper(),
            status=CourseRegistration.Status.ATTENDED,
        )
        course = reg.course
        return Response(
            {
                "code": reg.certificate_code,
                "full_name": reg.full_name,
                "full_name_en": reg.full_name_en,
                "course_title": course.title,
                "course_title_en": course.title_en,
                "course_kind": course.get_kind_display(),
                "start_datetime": course.start_datetime,
                "end_datetime": course.end_datetime,
                "location": "" if course.is_online else course.location,
                "is_online": course.is_online,
                "cme_hours": course.cme_hours,
                "accreditation": course.accreditation,
                "issued_at": reg.certificate_issued_at,
            }
        )


# =============================================================== admin API
class AdminCourseViewSet(AdminModelViewSet):
    queryset = Course.objects.all()
    serializer_class = s.AdminCourseSerializer
    search_fields = ["title"]
    filterset_fields = ["kind", "is_published", "registration_open"]


class AdminMembershipTypeViewSet(AdminModelViewSet):
    queryset = MembershipType.objects.all()
    serializer_class = s.AdminMembershipTypeSerializer
    search_fields = ["title"]
    filterset_fields = ["is_active"]


class ExportBulkMixin:
    """Bulk status changes and CSV export for submission lists."""

    EXPORT_FIELDS: list[tuple[str, str]] = []
    model = None
    # POST is needed for the bulk/renew actions; plain creation stays blocked below.
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def create(self, request, *args, **kwargs):
        raise MethodNotAllowed("POST")

    def _require(self, action_name):
        perm = f"{self.model._meta.app_label}.{action_name}_{self.model._meta.model_name}"
        if not self.request.user.has_perm(perm):
            raise PermissionDenied

    @action(detail=False, methods=["post"], permission_classes=[IsStaff])
    def bulk(self, request):
        self._require("change")
        data = s.BulkActionSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        new_status = data.validated_data["status"]
        if new_status not in self.model.Status.values:
            raise ValidationError({"status": "حالة غير صالحة"})
        updated = 0
        for obj in self.get_queryset().filter(pk__in=data.validated_data["ids"]):
            before = snapshot(obj)
            obj.status = new_status
            obj.save()  # runs certificate / membership hooks
            log_action(AuditLog.Action.UPDATE, obj, changes=diff(before, snapshot(obj)))
            updated += 1
        return Response({"updated": updated})

    @action(detail=False, methods=["get"])
    def export(self, request):
        # Deliberately excludes national IDs (data minimisation).
        qs = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="{self.basename}.csv"'
        response["Cache-Control"] = "no-store"
        response.write("﻿")  # BOM so Excel shows Arabic correctly
        writer = csv.writer(response)
        writer.writerow([label for _, label in self.EXPORT_FIELDS])
        count = 0
        for obj in qs:
            row = []
            for field, _ in self.EXPORT_FIELDS:
                value = obj
                for part in field.split("."):
                    value = getattr(value, part, "")
                    value = value() if callable(value) else value
                row.append("" if value is None else value)
            writer.writerow(row)
            count += 1
        log_action(AuditLog.Action.DOWNLOAD, object_repr=f"تصدير {self.model._meta.verbose_name_plural} ({count})")
        return response


class AdminCourseRegistrationViewSet(ExportBulkMixin, AdminSubmissionViewSet):
    model = CourseRegistration
    queryset = CourseRegistration.objects.select_related("course")
    serializer_class = s.AdminCourseRegistrationSerializer
    search_fields = ["tracking_code", "full_name", "phone", "email", "license_number", "certificate_code"]
    filterset_fields = ["status", "course", "profession", "city"]
    EXPORT_FIELDS = [
        ("tracking_code", "رقم التسجيل"), ("course.title", "الدورة"), ("full_name", "الاسم"),
        ("full_name_en", "الاسم بالإنجليزية"), ("phone", "الجوال"), ("email", "البريد"),
        ("get_profession_display", "المهنة"), ("specialty", "التخصص"), ("license_number", "رقم ترخيص المزاولة"),
        ("workplace", "جهة العمل"), ("city", "المدينة"), ("get_status_display", "الحالة"),
        ("certificate_code", "رمز الشهادة"), ("created_at", "تاريخ التسجيل"),
    ]


class AdminMembershipViewSet(ExportBulkMixin, AdminSubmissionViewSet):
    model = Membership
    queryset = Membership.objects.select_related("membership_type")
    serializer_class = s.AdminMembershipSerializer
    search_fields = ["tracking_code", "member_number", "full_name", "phone", "email", "license_number"]
    filterset_fields = ["status", "membership_type", "profession", "gender", "city"]
    ordering_fields = ["created_at", "expiry_date", "status"]
    EXPORT_FIELDS = [
        ("member_number", "رقم العضوية"), ("tracking_code", "رقم الطلب"), ("membership_type.title", "الفئة"),
        ("full_name", "الاسم"), ("phone", "الجوال"), ("email", "البريد"), ("get_profession_display", "المهنة"),
        ("specialty", "التخصص"), ("license_number", "رقم ترخيص المزاولة"), ("workplace", "جهة العمل"),
        ("city", "المدينة"), ("get_status_display", "الحالة"), ("start_date", "بداية العضوية"),
        ("expiry_date", "انتهاء العضوية"),
    ]

    def get_queryset(self):
        qs = super().get_queryset()
        expiring = self.request.query_params.get("expiring", "")
        if expiring.isdigit():
            # Active memberships expiring within N days (or already past expiry).
            limit = timezone.localdate() + timedelta(days=int(expiring))
            qs = qs.filter(status=Membership.Status.ACTIVE, expiry_date__lte=limit)
        return qs

    @action(detail=True, methods=["post"], permission_classes=[IsStaff])
    def renew(self, request, pk=None):
        self._require("change")
        obj = self.get_object()
        before = snapshot(obj)
        obj.renew()
        log_action(AuditLog.Action.UPDATE, obj, changes=diff(before, snapshot(obj)))
        return Response(self.get_serializer(obj).data)
