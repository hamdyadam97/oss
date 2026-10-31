from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.accounts import views as accounts
from apps.cms import seo, views as cms
from apps.common.views import AuditLogViewSet
from apps.engagement import views as engagement
from apps.professional import views as professional

public = DefaultRouter()
public.register("pages", cms.PublicPageViewSet, basename="public-pages")
public.register("faqs", cms.PublicFAQViewSet, basename="public-faqs")
public.register("partners", cms.PublicPartnerViewSet, basename="public-partners")
public.register("programs", cms.PublicProgramViewSet, basename="public-programs")
public.register("posts", cms.PublicPostViewSet, basename="public-posts")
public.register("albums", cms.PublicAlbumViewSet, basename="public-albums")
public.register("documents", cms.PublicDocumentViewSet, basename="public-documents")
public.register("services", engagement.PublicServiceViewSet, basename="public-services")
public.register("opportunities", engagement.PublicOpportunityViewSet, basename="public-opportunities")
public.register("courses", professional.PublicCourseViewSet, basename="public-courses")
public.register("membership-types", professional.PublicMembershipTypeViewSet, basename="public-membership-types")

dashboard = DefaultRouter()
dashboard.register("pages", cms.AdminPageViewSet, basename="admin-pages")
dashboard.register("banners", cms.AdminBannerViewSet, basename="admin-banners")
dashboard.register("about-items", cms.AdminAboutItemViewSet, basename="admin-about-items")
dashboard.register("board-members", cms.AdminBoardMemberViewSet, basename="admin-board-members")
dashboard.register("faqs", cms.AdminFAQViewSet, basename="admin-faqs")
dashboard.register("statistics", cms.AdminStatisticViewSet, basename="admin-statistics")
dashboard.register("partners", cms.AdminPartnerViewSet, basename="admin-partners")
dashboard.register("programs", cms.AdminProgramViewSet, basename="admin-programs")
dashboard.register("program-images", cms.AdminProgramImageViewSet, basename="admin-program-images")
dashboard.register("posts", cms.AdminPostViewSet, basename="admin-posts")
dashboard.register("albums", cms.AdminAlbumViewSet, basename="admin-albums")
dashboard.register("media-items", cms.AdminMediaItemViewSet, basename="admin-media-items")
dashboard.register("documents", cms.AdminDocumentViewSet, basename="admin-documents")
dashboard.register("services", engagement.AdminServiceViewSet, basename="admin-services")
dashboard.register("service-requests", engagement.AdminServiceRequestViewSet, basename="admin-service-requests")
dashboard.register("opportunities", engagement.AdminOpportunityViewSet, basename="admin-opportunities")
dashboard.register(
    "volunteer-applications", engagement.AdminVolunteerApplicationViewSet, basename="admin-volunteer-applications"
)
dashboard.register(
    "partnership-requests", engagement.AdminPartnershipRequestViewSet, basename="admin-partnership-requests"
)
dashboard.register("contact-messages", engagement.AdminContactMessageViewSet, basename="admin-contact-messages")
dashboard.register("courses", professional.AdminCourseViewSet, basename="admin-courses")
dashboard.register(
    "course-registrations", professional.AdminCourseRegistrationViewSet, basename="admin-course-registrations"
)
dashboard.register("membership-types", professional.AdminMembershipTypeViewSet, basename="admin-membership-types")
dashboard.register("memberships", professional.AdminMembershipViewSet, basename="admin-memberships")
dashboard.register("users", accounts.UserViewSet, basename="admin-users")
dashboard.register("audit-logs", AuditLogViewSet, basename="admin-audit-logs")

api_patterns = [
    # Auth
    path("auth/csrf/", accounts.CsrfView.as_view()),
    path("auth/login/", accounts.LoginView.as_view()),
    path("auth/logout/", accounts.LogoutView.as_view()),
    path("auth/me/", accounts.MeView.as_view()),
    # Public
    path("public/settings/", cms.PublicSettingsView.as_view()),
    path("public/home/", cms.HomeView.as_view()),
    path("public/about/", cms.AboutView.as_view()),
    path("public/impact/", cms.ImpactView.as_view()),
    path("public/search/", cms.SearchView.as_view()),
    path("public/submit/service-request/", engagement.ServiceRequestSubmitView.as_view()),
    path("public/submit/volunteer/", engagement.VolunteerApplySubmitView.as_view()),
    path("public/submit/partnership/", engagement.PartnershipSubmitView.as_view()),
    path("public/submit/contact/", engagement.ContactSubmitView.as_view()),
    path("public/submit/course-registration/", professional.CourseRegisterSubmitView.as_view()),
    path("public/submit/membership/", professional.MembershipSubmitView.as_view()),
    path("public/certificates/<str:code>/", professional.CertificateVerifyView.as_view()),
    path("public/track/", engagement.TrackView.as_view()),
    path("public/", include(public.urls)),
    # Dashboard
    path("admin/settings/", cms.AdminSettingsView.as_view()),
    path("admin/dashboard/", engagement.DashboardView.as_view()),
    path("admin/roles/", accounts.RolesView.as_view()),
    path("admin/", include(dashboard.urls)),
]

urlpatterns = [
    path("api/", include(api_patterns)),
    path("django-admin/", admin.site.urls),
    path("sitemap.xml", seo.sitemap),
    path("robots.txt", seo.robots),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
