import io
import shutil
import tempfile
from datetime import timedelta

from django.contrib.auth.models import Group
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.common.storage import private_storage

from .models import Course, CourseRegistration, Membership, MembershipType, add_months

TMP_PRIVATE = tempfile.mkdtemp()
RATES = {"submissions": "1000/min", "tracking": "1000/min", "login": "1000/min"}


@override_settings(REST_FRAMEWORK={
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend",
                                "rest_framework.filters.SearchFilter", "rest_framework.filters.OrderingFilter"],
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.StandardPagination",
    "DEFAULT_THROTTLE_RATES": RATES,
})
class ProfessionalTests(APITestCase):
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
        start = timezone.now() + timedelta(days=10)
        self.course = Course.objects.create(
            title="دورة الإنعاش القلبي", slug="bls", summary="...", seats=1,
            start_datetime=start, end_datetime=start + timedelta(hours=6), cme_hours=6,
        )
        self.mtype = MembershipType.objects.create(title="عضو عامل", slug="regular", duration_months=12)

    def user(self, role):
        u = User.objects.create_user(username=role, password="S3cure-pass-123", is_staff=True)
        u.groups.add(Group.objects.get(name=role))
        return u

    def register(self, national_id="1012345678", phone="0791234567"):
        return self.client.post("/api/public/submit/course-registration/", {
            "course": "bls", "full_name": "د. أحمد", "national_id": national_id, "phone": phone,
            "email": "a@example.com", "profession": "physician", "city": "الرياض", "consent": "true",
        })

    def test_seats_waitlist_and_duplicates(self):
        first = self.register()
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(first.data["status"], "confirmed")
        self.assertEqual(self.register().status_code, 400)  # same person twice
        second = self.register(national_id="1098765432", phone="0789999999")
        self.assertEqual(second.data["status"], "waitlisted")  # only one seat
        self.assertEqual(self.client.get("/api/public/courses/bls/").data["seats_remaining"], 0)

    def test_closed_registration(self):
        self.course.registration_open = False
        self.course.save()
        self.assertEqual(self.register().status_code, 400)

    def test_attendance_issues_verifiable_certificate(self):
        code = self.register().data["tracking_code"]
        reg = CourseRegistration.objects.get(tracking_code=code)
        self.assertEqual(self.client.get("/api/public/certificates/NOPE/").status_code, 404)

        self.client.force_login(self.user("training_coordinator"))
        res = self.client.post("/api/admin/course-registrations/bulk/", {"ids": [reg.pk], "status": "attended"}, format="json")
        self.assertEqual(res.data, {"updated": 1})
        reg.refresh_from_db()
        self.assertTrue(reg.certificate_code.startswith("CERT-"))

        export = self.client.get(f"/api/admin/course-registrations/export/?course={self.course.pk}")
        content = b"".join(export.streaming_content if export.streaming else [export.content]).decode("utf-8-sig")
        self.assertIn(reg.certificate_code, content)
        self.assertNotIn("1012345678", content)  # national ID never exported

        self.client.logout()
        cert = self.client.get(f"/api/public/certificates/{reg.certificate_code.lower()}/")
        self.assertEqual(cert.status_code, 200)
        self.assertEqual(str(cert.data["cme_hours"]), "6.0")
        self.assertNotIn("national_id", cert.data)
        track = self.client.post("/api/public/track/", {"tracking_code": code, "phone": "0791234567"})
        self.assertEqual(track.data["certificate_code"], reg.certificate_code)

    def test_membership_activation_and_renewal(self):
        self.mtype.requires_license = True
        self.mtype.save()
        data = {
            "membership_type": "regular", "full_name": "أخصائية", "national_id": "2012345678", "phone": "0771234567",
            "email": "m@example.com", "gender": "female", "profession": "nurse", "city": "جدة", "consent": "true",
        }
        self.assertEqual(self.client.post("/api/public/submit/membership/", data).status_code, 400)  # needs licence
        card = SimpleUploadedFile("card.pdf", b"%PDF-1.4 x", content_type="application/pdf")
        res = self.client.post("/api/public/submit/membership/", {**data, "license_number": "12345", "license_card": card})
        self.assertEqual(res.status_code, 201, res.data)
        dup = self.client.post("/api/public/submit/membership/", {**data, "license_number": "1", "license_card": SimpleUploadedFile("c.pdf", b"%PDF-1.4", content_type="application/pdf")})
        self.assertEqual(dup.status_code, 400)

        m = Membership.objects.get()
        self.client.force_login(self.user("training_coordinator"))
        self.assertEqual(self.client.get("/api/admin/memberships/").status_code, 403)

        self.client.force_login(self.user("membership_officer"))
        res = self.client.patch(f"/api/admin/memberships/{m.pk}/", {"status": "active"}, format="json")
        self.assertEqual(res.status_code, 200)
        m.refresh_from_db()
        today = timezone.localdate()
        self.assertTrue(m.member_number.startswith(f"M{today.year}-"))
        self.assertEqual(m.expiry_date, add_months(today, 12))
        self.assertEqual(len(res.data["files"]), 1)

        self.client.post(f"/api/admin/memberships/{m.pk}/renew/")
        m.refresh_from_db()
        self.assertEqual(m.expiry_date, add_months(add_months(today, 12), 12))

        self.client.logout()
        track = self.client.post("/api/public/track/", {"tracking_code": m.tracking_code, "phone": "0771234567"})
        self.assertEqual(track.data["member_number"], m.member_number)

    def test_add_months_clamps_day(self):
        from datetime import date

        self.assertEqual(add_months(date(2026, 1, 31), 1), date(2026, 2, 28))
