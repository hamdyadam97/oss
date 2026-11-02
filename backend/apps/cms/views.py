from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.audit import diff, log_action, snapshot
from apps.common.models import AuditLog
from apps.common.permissions import StaffModelPermissions
from apps.common.views import AdminModelViewSet

from . import models, serializers as s


# =============================================================== public API
class PublicReadOnlyViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []


class PublicSettingsView(APIView):
    """Site-wide data for the header and footer."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        from apps.engagement.models import Service, VolunteerOpportunity

        data = s.PublicSettingsSerializer(models.SiteSettings.load(), context={"request": request}).data
        data["footer_pages"] = list(
            models.Page.objects.published().filter(show_in_footer=True).values("slug", "title", "title_en")
        )
        from apps.professional.models import Course, MembershipType

        data["has_services"] = Service.objects.filter(is_active=True).exists()
        data["has_volunteering"] = VolunteerOpportunity.objects.open().exists()
        data["has_membership"] = MembershipType.objects.filter(is_active=True).exists()
        data["has_courses"] = Course.objects.published().exists()
        return Response(data)


class HomeView(APIView):
    """Everything the home page needs in a single request."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        from apps.engagement.models import Service, VolunteerOpportunity
        from apps.engagement.serializers import PublicOpportunitySerializer, PublicServiceSerializer
        from apps.professional.models import Course
        from apps.professional.serializers import PublicCourseListSerializer

        ctx = {"request": request}
        programs = models.Program.objects.published()
        featured = programs.filter(is_featured=True)[:6] or programs[:6]
        upcoming_event = (
            models.Post.objects.published()
            .filter(kind=models.Post.Kind.EVENT, event_date__gte=timezone.now())
            .order_by("event_date")
            .first()
        )
        return Response(
            {
                "banners": s.PublicBannerSerializer(models.Banner.objects.published(), many=True, context=ctx).data,
                "statistics": s.PublicStatisticSerializer(
                    models.Statistic.objects.published().filter(show_on_home=True), many=True, context=ctx
                ).data,
                "programs": s.PublicProgramListSerializer(featured, many=True, context=ctx).data,
                "posts": s.PublicPostListSerializer(
                    models.Post.objects.published().exclude(kind=models.Post.Kind.PUBLICATION)[:3], many=True, context=ctx
                ).data,
                "upcoming_event": s.PublicPostListSerializer(upcoming_event, context=ctx).data if upcoming_event else None,
                "courses": PublicCourseListSerializer(
                    Course.objects.upcoming().order_by("start_datetime")[:3], many=True, context=ctx
                ).data,
                "opportunities": PublicOpportunitySerializer(
                    VolunteerOpportunity.objects.open()[:3], many=True, context=ctx
                ).data,
                "services": PublicServiceSerializer(Service.objects.filter(is_active=True)[:6], many=True, context=ctx).data,
                "partners": s.PublicPartnerSerializer(models.Partner.objects.published(), many=True, context=ctx).data,
            }
        )


class AboutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        ctx = {"request": request}
        items = models.AboutItem.objects.published()
        members = models.BoardMember.objects.published()
        return Response(
            {
                "goals": s.PublicAboutItemSerializer(items.filter(kind="goal"), many=True, context=ctx).data,
                "values": s.PublicAboutItemSerializer(items.filter(kind="value"), many=True, context=ctx).data,
                "disciplines": s.PublicAboutItemSerializer(items.filter(kind="discipline"), many=True, context=ctx).data,
                "partnership": s.PublicAboutItemSerializer(items.filter(kind="partnership"), many=True, context=ctx).data,
                "board": s.PublicBoardMemberSerializer(members.filter(kind="board"), many=True, context=ctx).data,
                "executives": s.PublicBoardMemberSerializer(members.filter(kind="executive"), many=True, context=ctx).data,
                "licenses": s.PublicDocumentSerializer(
                    models.Document.objects.published().filter(category=models.Document.Category.LICENSE),
                    many=True,
                    context=ctx,
                ).data,
            }
        )


class ImpactView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        ctx = {"request": request}
        programs = models.Program.objects.published().exclude(results="", beneficiaries_count__isnull=True)
        return Response(
            {
                "statistics": s.PublicStatisticSerializer(models.Statistic.objects.published(), many=True, context=ctx).data,
                "programs": s.PublicProgramDetailSerializer(programs, many=True, context=ctx).data,
            }
        )


class PublicPageViewSet(PublicReadOnlyViewSet):
    queryset = models.Page.objects.published()
    serializer_class = s.PublicPageSerializer
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"
    pagination_class = None


class PublicFAQViewSet(PublicReadOnlyViewSet):
    queryset = models.FAQ.objects.published()
    serializer_class = s.PublicFAQSerializer
    pagination_class = None


class PublicPartnerViewSet(PublicReadOnlyViewSet):
    queryset = models.Partner.objects.published()
    serializer_class = s.PublicPartnerSerializer
    pagination_class = None
    filterset_fields = ["kind"]


class PublicProgramViewSet(PublicReadOnlyViewSet):
    queryset = models.Program.objects.published().prefetch_related("images", "partners")
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"
    filterset_fields = ["status", "kind"]
    search_fields = ["title", "summary"]

    def get_serializer_class(self):
        return s.PublicProgramDetailSerializer if self.action == "retrieve" else s.PublicProgramListSerializer


class PublicPostViewSet(PublicReadOnlyViewSet):
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"
    filterset_fields = ["kind", "program"]
    search_fields = ["title", "excerpt", "body"]

    def get_queryset(self):
        return models.Post.objects.published().filter(published_at__lte=timezone.now()).select_related("program")

    def get_serializer_class(self):
        return s.PublicPostDetailSerializer if self.action == "retrieve" else s.PublicPostListSerializer


class PublicAlbumViewSet(PublicReadOnlyViewSet):
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"

    def get_queryset(self):
        qs = models.Album.objects.published().annotate(items_count=Count("items"))
        return qs.prefetch_related("items") if self.action == "retrieve" else qs

    def get_serializer_class(self):
        return s.PublicAlbumDetailSerializer if self.action == "retrieve" else s.PublicAlbumSerializer


class PublicDocumentViewSet(PublicReadOnlyViewSet):
    queryset = models.Document.objects.published()
    serializer_class = s.PublicDocumentSerializer
    filterset_fields = ["category", "year"]
    search_fields = ["title", "description"]
    pagination_class = None


class SearchView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        q = request.query_params.get("q", "").strip()[:100]
        if len(q) < 2:
            return Response({"programs": [], "posts": [], "documents": []})
        ctx = {"request": request}
        return Response(
            {
                "programs": s.PublicProgramListSerializer(
                    models.Program.objects.published().filter(Q(title__icontains=q) | Q(summary__icontains=q))[:8],
                    many=True, context=ctx,
                ).data,
                "posts": s.PublicPostListSerializer(
                    models.Post.objects.published().filter(Q(title__icontains=q) | Q(body__icontains=q))[:8],
                    many=True, context=ctx,
                ).data,
                "documents": s.PublicDocumentSerializer(
                    models.Document.objects.published().filter(title__icontains=q)[:8], many=True, context=ctx
                ).data,
            }
        )


# =============================================================== admin API
class AdminSettingsView(APIView):
    permission_classes = [StaffModelPermissions]
    queryset = models.SiteSettings.objects.all()

    def get(self, request):
        return Response(s.AdminSiteSettingsSerializer(models.SiteSettings.load(), context={"request": request}).data)

    def patch(self, request):
        instance = models.SiteSettings.load()
        serializer = s.AdminSiteSettingsSerializer(instance, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        before = snapshot(instance)
        instance = serializer.save()
        log_action(AuditLog.Action.UPDATE, instance, changes=diff(before, snapshot(instance)))
        return Response(serializer.data)


def admin_viewset(model_cls, serializer_cls, search=("title",), filters=(), ordering=None):
    attrs = {
        "queryset": model_cls.objects.all(),
        "serializer_class": serializer_cls,
        "search_fields": list(search),
        "filterset_fields": list(filters),
    }
    if ordering:
        attrs["ordering"] = ordering
    return type(f"Admin{model_cls.__name__}ViewSet", (AdminModelViewSet,), attrs)


AdminPageViewSet = admin_viewset(models.Page, s.AdminPageSerializer, filters=("is_published",))
AdminBannerViewSet = admin_viewset(models.Banner, s.AdminBannerSerializer, filters=("is_published",))
AdminAboutItemViewSet = admin_viewset(models.AboutItem, s.AdminAboutItemSerializer, filters=("kind", "is_published"))
AdminBoardMemberViewSet = admin_viewset(
    models.BoardMember, s.AdminBoardMemberSerializer, search=("name", "position"), filters=("kind",)
)
AdminFAQViewSet = admin_viewset(models.FAQ, s.AdminFAQSerializer, search=("question",))
AdminStatisticViewSet = admin_viewset(models.Statistic, s.AdminStatisticSerializer, search=("label",))
AdminPartnerViewSet = admin_viewset(models.Partner, s.AdminPartnerSerializer, search=("name",), filters=("kind",))
AdminProgramViewSet = admin_viewset(
    models.Program, s.AdminProgramSerializer, search=("title", "summary"), filters=("status", "kind", "is_published")
)
AdminProgramImageViewSet = admin_viewset(models.ProgramImage, s.AdminProgramImageSerializer, search=("caption",), filters=("program",))
AdminPostViewSet = admin_viewset(
    models.Post, s.AdminPostSerializer, search=("title", "excerpt"), filters=("kind", "is_published", "program")
)
AdminAlbumViewSet = admin_viewset(models.Album, s.AdminAlbumSerializer, filters=("is_published",))
AdminMediaItemViewSet = admin_viewset(models.MediaItem, s.AdminMediaItemSerializer, search=("caption",), filters=("album", "kind"))
AdminDocumentViewSet = admin_viewset(
    models.Document, s.AdminDocumentSerializer, filters=("category", "year", "is_published")
)
