"""Scientific courses/events with registration & certificates, and professional membership."""
import calendar
import secrets
from datetime import date

from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.common.fields import EncryptedTextField, hash_identifier
from apps.common.models import TimeStampedModel
from apps.common.storage import RandomFilename, private_storage
from apps.common.utils import TRACKING_ALPHABET
from apps.common.validators import validate_attachment, validate_image
from apps.engagement.models import Submission


class Profession(models.TextChoices):
    PHYSICIAN = "physician", "طبيب"
    DENTIST = "dentist", "طبيب أسنان"
    NURSE = "nurse", "تمريض"
    MIDWIFE = "midwife", "قبالة قانونية"
    PHARMACIST = "pharmacist", "صيدلي"
    ALLIED = "allied", "تخصصات صحية مساندة"
    ADMIN = "admin", "إدارة صحية"
    STUDENT = "student", "طالب / متدرب"
    OTHER = "other", "أخرى"


class IdentityMixin(models.Model):
    """National ID stored encrypted, plus a keyed hash for duplicate checks."""

    national_id = EncryptedTextField("الرقم الوطني / الرقم الشخصي")
    national_id_hash = models.CharField(max_length=64, db_index=True, editable=False)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.national_id:
            self.national_id_hash = hash_identifier(self.national_id)
        super().save(*args, **kwargs)


def add_months(d: date, months: int) -> date:
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    return date(year, month, min(d.day, calendar.monthrange(year, month)[1]))


# ================================================================ courses
class CourseQuerySet(models.QuerySet):
    def published(self):
        return self.filter(is_published=True)

    def upcoming(self):
        return self.published().filter(end_datetime__gte=timezone.now())

    def past(self):
        return self.published().filter(end_datetime__lt=timezone.now())


class Course(TimeStampedModel):
    class Kind(models.TextChoices):
        COURSE = "course", "دورة تدريبية"
        WORKSHOP = "workshop", "ورشة عمل"
        CONFERENCE = "conference", "مؤتمر"
        SYMPOSIUM = "symposium", "ندوة / لقاء علمي"
        WEBINAR = "webinar", "محاضرة عن بعد"

    kind = models.CharField("النوع", max_length=20, choices=Kind.choices, default=Kind.COURSE)
    title = models.CharField("العنوان", max_length=255)
    title_en = models.CharField(max_length=255, blank=True)
    slug = models.SlugField(unique=True, allow_unicode=True, max_length=255)
    summary = models.TextField("ملخص")
    summary_en = models.TextField(blank=True)
    description = models.TextField("الوصف", blank=True)
    description_en = models.TextField(blank=True)
    objectives = models.TextField("الأهداف التعليمية", blank=True, help_text="هدف في كل سطر")
    objectives_en = models.TextField(blank=True)
    target_audience = models.TextField("الفئة المستهدفة", blank=True, help_text="فئة في كل سطر")
    target_audience_en = models.TextField(blank=True)
    speakers = models.TextField("المتحدثون / المدربون", blank=True, help_text="متحدث في كل سطر: الاسم — الصفة")
    cover = models.ImageField("الغلاف", upload_to=RandomFilename("courses"), validators=[validate_image], blank=True)
    start_datetime = models.DateTimeField("البداية")
    end_datetime = models.DateTimeField("النهاية")
    location = models.CharField("المكان", max_length=255, blank=True)
    is_online = models.BooleanField("عن بعد", default=False)
    seats = models.PositiveIntegerField("عدد المقاعد", null=True, blank=True, help_text="اتركه فارغًا لعدد غير محدود")
    registration_deadline = models.DateTimeField("آخر موعد للتسجيل", null=True, blank=True)
    registration_open = models.BooleanField("التسجيل مفتوح", default=True)
    requires_approval = models.BooleanField(
        "يتطلب موافقة", default=False, help_text="عند التفعيل تكون الطلبات «بانتظار التأكيد» حتى يعتمدها المسؤول"
    )
    cme_hours = models.DecimalField(
        "ساعات التطوير المهني المستمر (CPD)", max_digits=5, decimal_places=1, null=True, blank=True
    )
    accreditation = models.CharField("رقم/جهة الاعتماد", max_length=255, blank=True)
    # Jordanian dinar has 3 decimal places (fils).
    fee = models.DecimalField("الرسوم (دينار)", max_digits=10, decimal_places=3, null=True, blank=True)
    members_fee = models.DecimalField("رسوم الأعضاء (دينار)", max_digits=10, decimal_places=3, null=True, blank=True)
    certificate_enabled = models.BooleanField("إصدار شهادات حضور", default=True)
    program = models.ForeignKey(
        "cms.Program", null=True, blank=True, on_delete=models.SET_NULL, related_name="courses", verbose_name="البرنامج"
    )
    is_published = models.BooleanField("منشور", default=True)

    objects = CourseQuerySet.as_manager()

    class Meta:
        ordering = ["-start_datetime"]
        verbose_name = "دورة/فعالية علمية"
        verbose_name_plural = "الدورات والفعاليات العلمية"

    def __str__(self):
        return self.title

    @property
    def seats_taken(self) -> int:
        return self.registrations.filter(status__in=CourseRegistration.SEAT_STATUSES).count()

    @property
    def seats_remaining(self) -> int | None:
        return None if self.seats is None else max(self.seats - self.seats_taken, 0)

    @property
    def is_registration_open(self) -> bool:
        now = timezone.now()
        if not (self.is_published and self.registration_open) or self.start_datetime <= now:
            return False
        return not (self.registration_deadline and self.registration_deadline < now)


class CourseRegistration(IdentityMixin, Submission):
    TRACKING_PREFIX = "CRS"

    class Status(models.TextChoices):
        PENDING = "pending", "بانتظار التأكيد"
        CONFIRMED = "confirmed", "مؤكد"
        WAITLISTED = "waitlisted", "قائمة الانتظار"
        CANCELLED = "cancelled", "ملغى"
        ATTENDED = "attended", "حضر"
        ABSENT = "absent", "لم يحضر"

    SEAT_STATUSES = (Status.PENDING, Status.CONFIRMED, Status.ATTENDED)

    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name="registrations", verbose_name="الدورة")
    status = models.CharField("الحالة", max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    full_name = models.CharField("الاسم الكامل (كما يظهر في الشهادة)", max_length=200)
    full_name_en = models.CharField("الاسم بالإنجليزية", max_length=200, blank=True)
    phone = models.CharField("الجوال", max_length=20)
    email = models.EmailField("البريد الإلكتروني")
    profession = models.CharField("المهنة", max_length=20, choices=Profession.choices)
    specialty = models.CharField("التخصص", max_length=150, blank=True)
    license_number = models.CharField("رقم ترخيص مزاولة المهنة / رقم العضوية في النقابة", max_length=30, blank=True)
    workplace = models.CharField("جهة العمل", max_length=200, blank=True)
    city = models.CharField("المدينة", max_length=100)
    certificate_code = models.CharField("رمز الشهادة", max_length=20, unique=True, null=True, blank=True, editable=False)
    certificate_issued_at = models.DateTimeField("تاريخ إصدار الشهادة", null=True, blank=True, editable=False)

    class Meta(Submission.Meta):
        verbose_name = "تسجيل في دورة"
        verbose_name_plural = "التسجيل في الدورات"
        constraints = [
            models.UniqueConstraint(
                fields=["course", "national_id_hash"],
                condition=~Q(status="cancelled"),
                name="unique_active_registration_per_course",
            )
        ]

    def __str__(self):
        return f"{self.tracking_code} - {self.full_name}"

    def save(self, *args, **kwargs):
        # Attendance automatically issues a verifiable certificate.
        if self.status == self.Status.ATTENDED and self.course.certificate_enabled and not self.certificate_code:
            code = self._new_certificate_code()
            while CourseRegistration.objects.filter(certificate_code=code).exists():
                code = self._new_certificate_code()
            self.certificate_code = code
            self.certificate_issued_at = timezone.now()
        super().save(*args, **kwargs)

    @staticmethod
    def _new_certificate_code() -> str:
        return "CERT-" + "".join(secrets.choice(TRACKING_ALPHABET) for _ in range(10))


# ================================================================ membership
class MembershipType(TimeStampedModel):
    title = models.CharField("فئة العضوية", max_length=200)
    title_en = models.CharField(max_length=200, blank=True)
    slug = models.SlugField(unique=True, allow_unicode=True, max_length=255)
    description = models.TextField("الوصف", blank=True)
    description_en = models.TextField(blank=True)
    eligibility = models.TextField("شروط الانضمام", blank=True, help_text="شرط في كل سطر")
    eligibility_en = models.TextField(blank=True)
    benefits = models.TextField("المزايا", blank=True, help_text="ميزة في كل سطر")
    benefits_en = models.TextField(blank=True)
    fee = models.DecimalField("الرسوم السنوية (دينار)", max_digits=10, decimal_places=3, null=True, blank=True)
    duration_months = models.PositiveSmallIntegerField("مدة العضوية بالأشهر", default=12)
    requires_license = models.BooleanField("يتطلب ترخيص مزاولة المهنة", default=True)
    icon = models.CharField("الأيقونة", max_length=50, blank=True)
    order = models.PositiveIntegerField("الترتيب", default=0)
    is_active = models.BooleanField("متاحة", default=True)

    class Meta:
        ordering = ["order", "title"]
        verbose_name = "فئة عضوية"
        verbose_name_plural = "فئات العضوية"

    def __str__(self):
        return self.title


class Membership(IdentityMixin, Submission):
    TRACKING_PREFIX = "MEM"

    class Status(models.TextChoices):
        PENDING = "pending", "طلب جديد"
        UNDER_REVIEW = "under_review", "قيد الدراسة"
        NEEDS_INFO = "needs_info", "بحاجة لاستكمال بيانات"
        ACTIVE = "active", "عضوية سارية"
        REJECTED = "rejected", "مرفوض"
        SUSPENDED = "suspended", "موقوفة"
        CANCELLED = "cancelled", "ملغاة"

    OPEN_STATUSES = (Status.PENDING, Status.UNDER_REVIEW, Status.NEEDS_INFO, Status.ACTIVE)

    membership_type = models.ForeignKey(
        MembershipType, on_delete=models.PROTECT, related_name="memberships", verbose_name="فئة العضوية"
    )
    status = models.CharField("الحالة", max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    member_number = models.CharField("رقم العضوية", max_length=20, unique=True, null=True, blank=True, editable=False)
    start_date = models.DateField("بداية العضوية", null=True, blank=True)
    expiry_date = models.DateField("انتهاء العضوية", null=True, blank=True)
    full_name = models.CharField("الاسم الكامل", max_length=200)
    full_name_en = models.CharField("الاسم بالإنجليزية", max_length=200, blank=True)
    phone = models.CharField("الجوال", max_length=20)
    email = models.EmailField("البريد الإلكتروني")
    gender = models.CharField("الجنس", max_length=10, choices=[("male", "ذكر"), ("female", "أنثى")])
    birth_date = models.DateField("تاريخ الميلاد", null=True, blank=True)
    nationality = models.CharField("الجنسية", max_length=100, blank=True)
    profession = models.CharField("المهنة", max_length=20, choices=Profession.choices)
    specialty = models.CharField("التخصص", max_length=150, blank=True)
    qualification = models.CharField("المؤهل العلمي", max_length=150, blank=True)
    license_number = models.CharField("رقم ترخيص مزاولة المهنة / رقم العضوية في النقابة", max_length=30, blank=True)
    workplace = models.CharField("جهة العمل", max_length=200, blank=True)
    city = models.CharField("المدينة", max_length=100)
    years_experience = models.PositiveSmallIntegerField("سنوات الخبرة", null=True, blank=True)
    license_card = models.FileField(
        "صورة ترخيص مزاولة المهنة", upload_to=RandomFilename("members"), storage=private_storage,
        validators=[validate_attachment], blank=True,
    )
    cv = models.FileField(
        "السيرة الذاتية", upload_to=RandomFilename("members"), storage=private_storage,
        validators=[validate_attachment], blank=True,
    )

    class Meta(Submission.Meta):
        verbose_name = "عضوية"
        verbose_name_plural = "العضويات"

    def __str__(self):
        return f"{self.member_number or self.tracking_code} - {self.full_name}"

    @property
    def is_expired(self) -> bool:
        return bool(self.expiry_date and self.expiry_date < timezone.localdate())

    def save(self, *args, **kwargs):
        # Activation assigns a member number and the validity period.
        if self.status == self.Status.ACTIVE and not self.member_number:
            self.member_number = self._next_member_number()
            self.start_date = self.start_date or timezone.localdate()
            self.expiry_date = self.expiry_date or add_months(self.start_date, self.membership_type.duration_months)
        super().save(*args, **kwargs)

    def renew(self):
        """Extends validity by one period from today or from the current expiry, whichever is later."""
        base = max(self.expiry_date or timezone.localdate(), timezone.localdate())
        self.expiry_date = add_months(base, self.membership_type.duration_months)
        self.status = self.Status.ACTIVE
        self.save()

    @classmethod
    def _next_member_number(cls) -> str:
        prefix = f"M{timezone.localdate().year}-"
        seq = cls.objects.filter(member_number__startswith=prefix).count() + 1
        while cls.objects.filter(member_number=f"{prefix}{seq:05d}").exists():
            seq += 1
        return f"{prefix}{seq:05d}"
