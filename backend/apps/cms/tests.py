import io
import shutil
import tempfile

from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.common.models import AuditLog

from .models import Program, Statistic

TMP_MEDIA = tempfile.mkdtemp()


def png(name="cover.png"):
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), "teal").save(buf, "PNG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/png")


@override_settings(MEDIA_ROOT=TMP_MEDIA)
class AdminContentTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(TMP_MEDIA, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        call_command("setup_roles", stdout=io.StringIO())
        self.editor = User.objects.create_user(username="editor", password="S3cure-pass-123", is_staff=True)
        self.editor.groups.add(Group.objects.get(name="content_editor"))

    def test_multipart_create_update_and_clear_image(self):
        self.client.force_login(self.editor)
        res = self.client.post(
            "/api/admin/programs/",
            {"title": "برنامج الأسر", "summary": "ملخص", "start_date": "", "beneficiaries_count": "",
             "partners": "", "cover": png()},
            format="multipart",
        )
        self.assertEqual(res.status_code, 201, res.data)
        program = Program.objects.get()
        self.assertEqual(program.slug, "برنامج-الأسر")
        self.assertIsNone(program.start_date)
        self.assertTrue(program.cover)

        res = self.client.patch(f"/api/admin/programs/{program.pk}/", {"cover__clear": "1"}, format="multipart")
        self.assertEqual(res.status_code, 200, res.data)
        program.refresh_from_db()
        self.assertFalse(program.cover)
        self.assertEqual(AuditLog.objects.filter(model="cms.program").count(), 2)

    def test_editor_cannot_manage_users_and_unpublished_hidden(self):
        self.client.force_login(self.editor)
        self.assertEqual(self.client.get("/api/admin/users/").status_code, 403)
        Statistic.objects.create(label="مستفيد", value=10, is_published=False)
        self.client.logout()
        self.assertEqual(self.client.get("/api/public/home/").data["statistics"], [])

    def test_login_flow(self):
        res = self.client.post("/api/auth/login/", {"username": "editor", "password": "wrong"})
        self.assertEqual(res.status_code, 400)
        res = self.client.post("/api/auth/login/", {"username": "editor", "password": "S3cure-pass-123"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("cms.add_program", res.data["permissions"])
        self.assertTrue(AuditLog.objects.filter(action="login_failed").exists())
