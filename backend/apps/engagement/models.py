"""Submissions from the public. These hold personal data and are never exposed publicly."""
from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.common.fields import EncryptedTextField
from apps.common.models import TimeStampedModel
from apps.common.storage import RandomFilename, private_storage
from apps.common.utils import generate_tracking_code
from apps.common.validators import validate_attachment


class Submission(TimeStampedModel):
    """Common fields for anything submitted through a public form."""

    TRACKING_PREFIX = "REQ"

    tracking_code = models.CharField("رقم الطلب", max_length=20, unique=True, editable=False)
    admin_notes = models.TextField("ملاحظات داخلية", blank=True)
    public_note = models.TextField("ملاحظة تظهر لمقدم الطلب", blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="+", verbose_name="المسؤول",
    )
    consented_at = models.DateTimeField("وقت الموافقة على سياسة الخصوصية")

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.tracking_code:
            code = generate_tracking_code(self.TRACKING_PREFIX)
            while type(self).objects.filter(tracking_code=code).exists():
                code = generate_tracking_code(self.TRACKING_PREFIX)
            self.tracking_code = code
        super().save(*args, **kwargs)


class Service(TimeStampedModel):
    """An e-service offered to beneficiaries (defined by staff)."""

    title = models.CharField("اسم الخدمة", max_length=255)
    title_en = models.CharField(max_length=255, blank=True)
    slug = models.SlugField(unique=True, allow_unicode=True, max_length=255)
    summary = models.TextField("وصف مختصر")
    summary_en = models.TextField(blank=True)
    description = models.TextField("تفاصيل الخدمة", blank=True)
    description_en = models.TextField(blank=True)
    eligibility = models.TextField("شروط الاستحقاق", blank=True, help_text="شرط في كل سطر")
    eligibility_en = models.TextField(blank=True)
    required_documents = models.TextField("المستندات المطلوبة", blank=True, help_text="مستند في كل سطر")
    required_documents_en = models.TextField(blank=True)
    icon = models.CharField("الأيقونة", max_length=50, blank=True)
    requires_attachment = models.BooleanField("المرفقات إلزامية", default=False)
    extra_fields = models.JSONField(
        "حقول إضافية", default=list, blank=True,
        help_text='قائمة حقول: [{"name": "income", "label": "الدخل الشهري", "type": "number", "required": true}]',
    )
    order = models.PositiveIntegerField("الترتيب", default=0)
    is_active = models.BooleanField("متاحة", default=True)

    class Meta:
        ordering = ["order", "title"]
        verbose_name = "خدمة إلكترونية"
        verbose_name_plural = "الخدمات الإلكترونية"

    def __str__(self):
        return self.title


class ServiceRequest(Submission):
    TRACKING_PREFIX = "SRV"

    class Status(models.TextChoices):
        NEW = "new", "جديد"
        UNDER_REVIEW = "under_review", "قيد الدراسة"
        NEEDS_INFO = "needs_info", "بحاجة لاستكمال بيانات"
        APPROVED = "approved", "مقبول"
        REJECTED = "rejected", "مرفوض"
        COMPLETED = "completed", "مكتمل"

    service = models.ForeignKey(Service, on_delete=models.PROTECT, related_name="requests", verbose_name="الخدمة")
    status = models.CharField("الحالة", max_length=20, choices=Status.choices, default=Status.NEW, db_index=True)
    full_name = models.CharField("الاسم الكامل", max_length=200)
    national_id = EncryptedTextField("الرقم الوطني / الرقم الشخصي")
    phone = models.CharField("الجوال", max_length=20)
    email = models.EmailField("البريد الإلكتروني", blank=True)
    city = models.CharField("المدينة", max_length=100)
    district = models.CharField("الحي", max_length=100, blank=True)
    family_size = models.PositiveSmallIntegerField("عدد أفراد الأسرة", null=True, blank=True)
    details = models.TextField("تفاصيل الطلب")
    extra_data = models.JSONField("بيانات إضافية", default=dict, blank=True)
    attachment_1 = models.FileField(
        upload_to=RandomFilename("requests"), storage=private_storage, validators=[validate_attachment], blank=True
    )
    attachment_2 = models.FileField(
        upload_to=RandomFilename("requests"), storage=private_storage, validators=[validate_attachment], blank=True
    )
    attachment_3 = models.FileField(
        upload_to=RandomFilename("requests"), storage=private_storage, validators=[validate_attachment], blank=True
    )

    class Meta(Submission.Meta):
        verbose_name = "طلب مستفيد"
        verbose_name_plural = "طلبات المستفيدين"

    def __str__(self):
        return f"{self.tracking_code} - {self.full_name}"


class OpportunityQuerySet(models.QuerySet):
    def open(self):
        today = timezone.localdate()
        return self.filter(is_open=True).filter(Q(end_date__isnull=True) | Q(end_date__gte=today))


class VolunteerOpportunity(TimeStampedModel):
    title = models.CharField("عنوان الفرصة", max_length=255)
    title_en = models.CharField(max_length=255, blank=True)
    slug = models.SlugField(unique=True, allow_unicode=True, max_length=255)
    description = models.TextField("الوصف")
    description_en = models.TextField(blank=True)
    requirements = models.TextField("المتطلبات والمهارات", blank=True)
    requirements_en = models.TextField(blank=True)
    location = models.CharField("المكان", max_length=255, blank=True)
    is_remote = models.BooleanField("عن بعد", default=False)
    start_date = models.DateField("تاريخ البداية", null=True, blank=True)
    end_date = models.DateField("تاريخ النهاية", null=True, blank=True)
    hours = models.PositiveIntegerField("عدد الساعات", null=True, blank=True)
    seats = models.PositiveIntegerField("عدد المقاعد", null=True, blank=True)
    program = models.ForeignKey(
        "cms.Program", null=True, blank=True, on_delete=models.SET_NULL, related_name="opportunities"
    )
    is_open = models.BooleanField("التسجيل مفتوح", default=True)
    order = models.PositiveIntegerField("الترتيب", default=0)

    objects = OpportunityQuerySet.as_manager()

    class Meta:
        ordering = ["order", "-created_at"]
        verbose_name = "فرصة تطوعية"
        verbose_name_plural = "الفرص التطوعية"

    def __str__(self):
        return self.title


class VolunteerApplication(Submission):
    TRACKING_PREFIX = "VOL"

    class Status(models.TextChoices):
        NEW = "new", "جديد"
        UNDER_REVIEW = "under_review", "قيد المراجعة"
        INTERVIEW = "interview", "مقابلة"
        ACCEPTED = "accepted", "مقبول"
        REJECTED = "rejected", "غير مقبول"
        COMPLETED = "completed", "أنهى التطوع"

    class Gender(models.TextChoices):
        MALE = "male", "ذكر"
        FEMALE = "female", "أنثى"

    opportunity = models.ForeignKey(
        VolunteerOpportunity, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="applications", verbose_name="الفرصة",
    )
    status = models.CharField("الحالة", max_length=20, choices=Status.choices, default=Status.NEW, db_index=True)
    full_name = models.CharField("الاسم الكامل", max_length=200)
    national_id = EncryptedTextField("الرقم الوطني / الرقم الشخصي")
    phone = models.CharField("الجوال", max_length=20)
    email = models.EmailField("البريد الإلكتروني")
    gender = models.CharField("الجنس", max_length=10, choices=Gender.choices)
    birth_date = models.DateField("تاريخ الميلاد", null=True, blank=True)
    city = models.CharField("المدينة", max_length=100)
    education = models.CharField("المؤهل العلمي", max_length=150, blank=True)
    occupation = models.CharField("المهنة", max_length=150, blank=True)
    skills = models.TextField("المهارات", blank=True)
    availability = models.CharField("أوقات التفرغ", max_length=255, blank=True)
    motivation = models.TextField("سبب الرغبة في التطوع", blank=True)
    cv = models.FileField(
        "السيرة الذاتية", upload_to=RandomFilename("volunteers"), storage=private_storage,
        validators=[validate_attachment], blank=True,
    )
    hours_completed = models.DecimalField("ساعات التطوع المنجزة", max_digits=7, decimal_places=1, default=0)

    class Meta(Submission.Meta):
        verbose_name = "طلب تطوع"
        verbose_name_plural = "طلبات التطوع"

    def __str__(self):
        return f"{self.tracking_code} - {self.full_name}"


class PartnershipRequest(Submission):
    TRACKING_PREFIX = "PRT"

    class Kind(models.TextChoices):
        PARTNERSHIP = "partnership", "شراكة"
        SPONSORSHIP = "sponsorship", "رعاية"
        IN_KIND = "in_kind", "دعم عيني"
        CSR = "csr", "مسؤولية اجتماعية"
        OTHER = "other", "أخرى"

    class Status(models.TextChoices):
        NEW = "new", "جديد"
        UNDER_REVIEW = "under_review", "قيد الدراسة"
        ACCEPTED = "accepted", "مقبول"
        DECLINED = "declined", "معتذر عنه"

    kind = models.CharField("نوع الطلب", max_length=20, choices=Kind.choices)
    status = models.CharField("الحالة", max_length=20, choices=Status.choices, default=Status.NEW, db_index=True)
    organization = models.CharField("اسم الجهة", max_length=255)
    contact_name = models.CharField("اسم المسؤول", max_length=200)
    position = models.CharField("المنصب", max_length=150, blank=True)
    email = models.EmailField("البريد الإلكتروني")
    phone = models.CharField("الجوال", max_length=20)
    program = models.ForeignKey(
        "cms.Program", null=True, blank=True, on_delete=models.SET_NULL, related_name="+", verbose_name="البرنامج المقترح"
    )
    message = models.TextField("تفاصيل الطلب")
    attachment = models.FileField(
        "مرفق", upload_to=RandomFilename("partnerships"), storage=private_storage,
        validators=[validate_attachment], blank=True,
    )

    class Meta(Submission.Meta):
        verbose_name = "طلب شراكة"
        verbose_name_plural = "طلبات الشراكة والرعاية"

    def __str__(self):
        return f"{self.organization} ({self.get_kind_display()})"


class ContactMessage(Submission):
    TRACKING_PREFIX = "MSG"

    class Status(models.TextChoices):
        NEW = "new", "جديدة"
        IN_PROGRESS = "in_progress", "قيد المتابعة"
        CLOSED = "closed", "مغلقة"

    status = models.CharField("الحالة", max_length=20, choices=Status.choices, default=Status.NEW, db_index=True)
    name = models.CharField("الاسم", max_length=200)
    email = models.EmailField("البريد الإلكتروني")
    phone = models.CharField("الجوال", max_length=20, blank=True)
    subject = models.CharField("الموضوع", max_length=255)
    message = models.TextField("الرسالة")

    class Meta(Submission.Meta):
        verbose_name = "رسالة تواصل"
        verbose_name_plural = "رسائل التواصل"

    def __str__(self):
        return f"{self.name}: {self.subject}"
