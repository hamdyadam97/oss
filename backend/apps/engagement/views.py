from django.db.models import Sum
from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cms.views import PublicReadOnlyViewSet
from apps.common.models import AuditLog
from apps.common.permissions import IsStaff
from apps.common.throttles import SubmissionThrottle, TrackingThrottle
from apps.common.utils import normalize_phone
from apps.common.views import AdminModelViewSet, serve_private_file

from . import models, serializers as s


# =============================================================== public API
class PublicServiceViewSet(PublicReadOnlyViewSet):
    queryset = models.Service.objects.filter(is_active=True)
    serializer_class = s.PublicServiceSerializer
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"
    pagination_class = None


class PublicOpportunityViewSet(PublicReadOnlyViewSet):
    queryset = models.VolunteerOpportunity.objects.open()
    serializer_class = s.PublicOpportunitySerializer
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"
    pagination_class = None


class PublicSubmitView(generics.CreateAPIView):
    """Accepts a public form and returns only the tracking code — never the stored data."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [SubmissionThrottle]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response({"tracking_code": instance.tracking_code}, status=status.HTTP_201_CREATED)


class ServiceRequestSubmitView(PublicSubmitView):
    serializer_class = s.ServiceRequestCreateSerializer


class VolunteerApplySubmitView(PublicSubmitView):
    serializer_class = s.VolunteerApplicationCreateSerializer


class PartnershipSubmitView(PublicSubmitView):
    serializer_class = s.PartnershipRequestCreateSerializer


class ContactSubmitView(PublicSubmitView):
    serializer_class = s.ContactMessageCreateSerializer


class TrackView(APIView):
    """Status lookup by tracking code + phone. Returns status only, no personal data."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [TrackingThrottle]

    def get_models(self):
        from apps.professional.models import CourseRegistration, Membership

        return {
            "SRV": models.ServiceRequest,
            "VOL": models.VolunteerApplication,
            "PRT": models.PartnershipRequest,
            "CRS": CourseRegistration,
            "MEM": Membership,
        }

    def post(self, request):
        from apps.professional.models import CourseRegistration, Membership

        serializer = s.TrackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data["tracking_code"].strip().upper()
        phone = normalize_phone(serializer.validated_data["phone"])
        model = self.get_models().get(code.split("-")[0])
        obj = model.objects.filter(tracking_code=code).first() if model else None
        if obj is None or normalize_phone(obj.phone) != phone:
            return Response({"detail": "لم يتم العثور على طلب بهذه البيانات"}, status=status.HTTP_404_NOT_FOUND)
        extra = {}
        if isinstance(obj, models.ServiceRequest):
            subject = obj.service.title
        elif isinstance(obj, models.VolunteerApplication):
            subject = obj.opportunity.title if obj.opportunity else "طلب تطوع عام"
        elif isinstance(obj, CourseRegistration):
            subject = obj.course.title
            extra = {"event_date": obj.course.start_datetime, "certificate_code": obj.certificate_code}
        elif isinstance(obj, Membership):
            subject = obj.membership_type.title
            extra = {"member_number": obj.member_number, "expiry_date": obj.expiry_date, "is_expired": obj.is_expired}
        else:
            subject = obj.get_kind_display()
        return Response(
            {
                "tracking_code": obj.tracking_code,
                "type": obj._meta.verbose_name,
                "subject": subject,
                "status": obj.status,
                "status_display": obj.get_status_display(),
                "public_note": obj.public_note,
                "created_at": obj.created_at,
                "updated_at": obj.updated_at,
                **extra,
            }
        )


# =============================================================== admin API
class AdminServiceViewSet(AdminModelViewSet):
    queryset = models.Service.objects.all()
    serializer_class = s.AdminServiceSerializer
    search_fields = ["title"]
    filterset_fields = ["is_active"]


class AdminOpportunityViewSet(AdminModelViewSet):
    queryset = models.VolunteerOpportunity.objects.all()
    serializer_class = s.AdminOpportunitySerializer
    search_fields = ["title"]
    filterset_fields = ["is_open"]


class AdminSubmissionViewSet(AdminModelViewSet):
    """Staff can review, update workflow fields and delete — but never create — submissions."""

    http_method_names = ["get", "patch", "delete", "head", "options"]
    filterset_fields = ["status"]
    ordering_fields = ["created_at", "updated_at", "status"]

    @action(detail=True, methods=["get"], url_path=r"files/(?P<field>[a-z0-9_]+)", url_name="file")
    def file(self, request, pk=None, field=None):
        if field not in self.get_serializer_class().FILE_FIELDS:
            raise PermissionDenied
        return serve_private_file(self.get_object(), field)


class AdminServiceRequestViewSet(AdminSubmissionViewSet):
    queryset = models.ServiceRequest.objects.select_related("service")
    serializer_class = s.AdminServiceRequestSerializer
    search_fields = ["tracking_code", "full_name", "phone", "city"]
    filterset_fields = ["status", "service", "city"]


class AdminVolunteerApplicationViewSet(AdminSubmissionViewSet):
    queryset = models.VolunteerApplication.objects.select_related("opportunity")
    serializer_class = s.AdminVolunteerApplicationSerializer
    search_fields = ["tracking_code", "full_name", "phone", "email", "city"]
    filterset_fields = ["status", "opportunity", "gender", "city"]


class AdminPartnershipRequestViewSet(AdminSubmissionViewSet):
    queryset = models.PartnershipRequest.objects.all()
    serializer_class = s.AdminPartnershipRequestSerializer
    search_fields = ["tracking_code", "organization", "contact_name", "email"]
    filterset_fields = ["status", "kind"]


class AdminContactMessageViewSet(AdminSubmissionViewSet):
    queryset = models.ContactMessage.objects.all()
    serializer_class = s.AdminContactMessageSerializer
    search_fields = ["name", "email", "subject"]


class DashboardView(APIView):
    """Overview counters, limited to what the current user's role can see."""

    permission_classes = [IsStaff]

    def get(self, request):
        from datetime import timedelta

        from django.utils import timezone

        from apps.professional.models import CourseRegistration, Membership

        user = request.user
        data = {}
        sources = {
            "service_requests": ("engagement.view_servicerequest", models.ServiceRequest, "new"),
            "volunteer_applications": ("engagement.view_volunteerapplication", models.VolunteerApplication, "new"),
            "partnership_requests": ("engagement.view_partnershiprequest", models.PartnershipRequest, "new"),
            "contact_messages": ("engagement.view_contactmessage", models.ContactMessage, "new"),
            "course_registrations": ("professional.view_courseregistration", CourseRegistration, "pending"),
            "memberships": ("professional.view_membership", Membership, "pending"),
        }
        for key, (perm, model, new_status) in sources.items():
            if user.has_perm(perm):
                data[key] = {"total": model.objects.count(), "new": model.objects.filter(status=new_status).count()}
        if user.has_perm("professional.view_membership"):
            active = Membership.objects.filter(status=Membership.Status.ACTIVE)
            data["members"] = {
                "active": active.filter(expiry_date__gte=timezone.localdate()).count(),
                "expiring_30": active.filter(
                    expiry_date__gte=timezone.localdate(), expiry_date__lte=timezone.localdate() + timedelta(days=30)
                ).count(),
                "expired": active.filter(expiry_date__lt=timezone.localdate()).count(),
            }
        if user.has_perm("engagement.view_volunteerapplication"):
            data["volunteer_hours"] = (
                models.VolunteerApplication.objects.aggregate(total=Sum("hours_completed"))["total"] or 0
            )
        if user.has_perm("common.view_auditlog"):
            data["recent_activity"] = list(
                AuditLog.objects.values("id", "username", "action", "model", "object_repr", "created_at")[:10]
            )
        return Response(data)
