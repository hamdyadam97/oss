import io
import shutil
import tempfile

from django.contrib.auth.models import Group
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.db import connection
from django.test import override_settings
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.common.models import AuditLog
from apps.common.storage import private_storage

from .models import Service, ServiceRequest

PDF = b"%PDF-1.4\n%test\n"
TMP_PRIVATE = tempfile.mkdtemp()


@override_settings(REST_FRAMEWORK={
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend",
                                "rest_framework.filters.SearchFilter", "rest_framework.filters.OrderingFilter"],
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.StandardPagination",
    "DEFAULT_THROTTLE_RATES": {"submissions": "1000/min", "tracking": "1000/min", "login": "1000/min"},
})
class EngagementFlowTests(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        private_storage._location = TMP_PRIVATE
        private_storage.__dict__.pop("base_location", None)
        private_storage.__dict__.pop("location", None)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(TMP_PRIVATE, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        cache.clear()  # throttle counters
        call_command("setup_roles", stdout=io.StringIO())
        self.service = Service.objects.create(
            title="مساعدة", slug="help", summary="...",
            extra_fields=[{"name": "income", "label": "الدخل", "type": "number", "required": True}],
        )

    def make_user(self, role):
        user = User.objects.create_user(username=role, password="S3cure-pass-123", is_staff=True)
        user.groups.add(Group.objects.get(name=role))
        return user

    def submit(self, **overrides):
        data = {
            "service": "help", "full_name": "مستفيد", "national_id": "1012345678", "phone": "0791234567",
            "city": "الرياض", "details": "تفاصيل", "extra_data": '{"income": "3000", "evil": "x"}',
            "consent": "true", "attachment_1": SimpleUploadedFile("id.pdf", PDF, content_type="application/pdf"),
        }
        data.update(overrides)
        return self.client.post("/api/public/submit/service-request/", data, format="multipart")

    def test_submission_returns_only_tracking_code_and_encrypts_id(self):
        res = self.submit()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(set(res.data), {"tracking_code"})
        obj = ServiceRequest.objects.get()
        self.assertEqual(obj.national_id, "1012345678")
        self.assertEqual(obj.extra_data, {"income": {"label": "الدخل", "value": "3000"}})
        with connection.cursor() as cur:
            cur.execute("SELECT national_id FROM engagement_servicerequest")
            self.assertNotIn("1012345678", cur.fetchone()[0])

    def test_validation_consent_honeypot_and_file_signature(self):
        self.assertEqual(self.submit(consent="false").status_code, 400)
        self.assertEqual(self.submit(website="spam").status_code, 400)
        self.assertEqual(self.submit(national_id="123").status_code, 400)
        fake = SimpleUploadedFile("x.pdf", b"MZ\x90\x00 not a pdf", content_type="application/pdf")
        self.assertEqual(self.submit(attachment_1=fake).status_code, 400)
        self.assertEqual(self.submit(extra_data="{}").status_code, 400)  # required extra field

    def test_tracking_needs_matching_phone_and_hides_personal_data(self):
        code = self.submit().data["tracking_code"]
        self.assertEqual(self.client.post("/api/public/track/", {"tracking_code": code, "phone": "0780000000"}).status_code, 404)
        res = self.client.post("/api/public/track/", {"tracking_code": code.lower(), "phone": "+962791234567"})
        self.assertEqual(res.status_code, 200)
        self.assertNotIn("national_id", res.data)
        self.assertNotIn("full_name", res.data)
        self.assertEqual(res.data["status"], "new")

    def test_rbac_on_requests_and_audited_download(self):
        self.submit()
        obj = ServiceRequest.objects.get()
        self.assertEqual(self.client.get("/api/admin/service-requests/").status_code, 403)

        self.client.force_login(self.make_user("content_editor"))
        self.assertEqual(self.client.get("/api/admin/service-requests/").status_code, 403)

        self.client.force_login(self.make_user("services_officer"))
        res = self.client.get("/api/admin/service-requests/")
        self.assertEqual(res.status_code, 200)
        row = res.data["results"][0]
        self.assertEqual(row["national_id"], "1012345678")
        self.assertNotIn("attachment_1", row)
        self.assertEqual(len(row["files"]), 1)

        # Applicant data is read-only; workflow fields are editable.
        res = self.client.patch(f"/api/admin/service-requests/{obj.pk}/", {"status": "approved", "full_name": "x"}, format="json")
        self.assertEqual(res.status_code, 200)
        obj.refresh_from_db()
        self.assertEqual((obj.status, obj.full_name), ("approved", "مستفيد"))
        self.assertTrue(AuditLog.objects.filter(action="update", object_id=str(obj.pk)).exists())

        res = self.client.get(f"/api/admin/service-requests/{obj.pk}/files/attachment_1/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(b"".join(res.streaming_content), PDF)
        self.assertTrue(AuditLog.objects.filter(action="download").exists())
        self.assertEqual(self.client.get(f"/api/admin/service-requests/{obj.pk}/files/national_id/").status_code, 403)
        self.assertIn(self.client.post("/api/admin/service-requests/", {}).status_code, (403, 405))

    def test_jordanian_phone_and_national_number(self):
        from django.core.exceptions import ValidationError

        from apps.common.utils import normalize_phone
        from apps.common.validators import validate_national_id, validate_phone

        for ok in ["0791234567", "0781234567", "0771234567", "+962791234567", "00962 79 123 4567"]:
            validate_phone(ok)
        for bad in ["0551234567", "0761234567", "065123456", "079123456"]:
            with self.assertRaises(ValidationError):
                validate_phone(bad)
        self.assertEqual(normalize_phone("+962 79 123 4567"), "0791234567")
        self.assertEqual(normalize_phone("00962791234567"), "0791234567")
        validate_national_id("9861012345")
        with self.assertRaises(ValidationError):
            validate_national_id("98610123")

    def test_public_endpoints(self):
        for url in ["/api/public/settings/", "/api/public/home/", "/api/public/about/", "/api/public/impact/",
                    "/api/public/programs/", "/api/public/posts/", "/api/public/documents/", "/sitemap.xml"]:
            self.assertEqual(self.client.get(url).status_code, 200, url)
        settings = self.client.get("/api/public/settings/").data
        self.assertNotIn("iban", settings)
