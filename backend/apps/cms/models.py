"""Public website content. Every model is editable from the dashboard.

Bilingual convention: `<field>` is Arabic (primary), `<field>_en` is the optional
English translation; the frontend falls back to Arabic when it is empty.
"""
from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedModel
from apps.common.storage import RandomFilename
from apps.common.validators import validate_document, validate_image


class PublishableQuerySet(models.QuerySet):
    def published(self):
        return self.filter(is_published=True)


class SiteSettings(TimeStampedModel):
    """Singleton holding identity, contact info, about texts and feature toggles."""

    # Identity
    name = models.CharField("اسم الجمعية", max_length=200, default="جمعية تطوير الممارسة الطبية المهنية")
    name_en = models.CharField(
        "الاسم بالإنجليزية", max_length=200, blank=True, default="Professional Medical Practice Development Association"
    )
    tagline = models.CharField("الشعار النصي", max_length=255, blank=True, default="الارتقاء بكفاءة الكوادر الصحية")
    tagline_en = models.CharField(max_length=255, blank=True, default="Elevating the competence of healthcare professionals")
    logo = models.ImageField(upload_to=RandomFilename("brand"), validators=[validate_image], blank=True)
    logo_light = models.ImageField(
        "شعار للخلفيات الداكنة", upload_to=RandomFilename("brand"), validators=[validate_image], blank=True
    )
    # Sampled from the association's logo.
    primary_color = models.CharField("اللون الأساسي", max_length=7, default="#081940")
    secondary_color = models.CharField("اللون الثانوي", max_length=7, default="#BB944A")

    # Registration & licensing
    license_number = models.CharField("رقم الترخيص", max_length=100, blank=True)
    supervisor = models.CharField("جهة الإشراف", max_length=255, blank=True)
    supervisor_en = models.CharField(max_length=255, blank=True)
    founded_year = models.PositiveIntegerField("سنة التأسيس", null=True, blank=True)

    # About
    about_short = models.TextField("نبذة مختصرة", blank=True)
    about_short_en = models.TextField(blank=True)
    about_full = models.TextField("من نحن", blank=True)
    about_full_en = models.TextField(blank=True)
    vision = models.TextField("الرؤية", blank=True)
    vision_en = models.TextField(blank=True)
    mission = models.TextField("الرسالة", blank=True)
    mission_en = models.TextField(blank=True)
    about_image = models.ImageField(upload_to=RandomFilename("about"), validators=[validate_image], blank=True)
    org_structure_image = models.ImageField(
        "الهيكل التنظيمي", upload_to=RandomFilename("about"), validators=[validate_image], blank=True
    )

    # Contact
    phone = models.CharField("الهاتف", max_length=30, blank=True)
    whatsapp = models.CharField("واتساب", max_length=30, blank=True)
    email = models.EmailField("البريد الإلكتروني", blank=True)
    address = models.CharField("العنوان", max_length=255, blank=True)
    address_en = models.CharField(max_length=255, blank=True)
    working_hours = models.CharField("ساعات العمل", max_length=255, blank=True)
    working_hours_en = models.CharField(max_length=255, blank=True)
    map_url = models.URLField("رابط الخريطة", blank=True)
    map_embed_url = models.URLField("رابط تضمين الخريطة", blank=True, max_length=1000)

    # Social
    x_url = models.URLField("X (تويتر)", blank=True)
    instagram_url = models.URLField(blank=True)
    snapchat_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)
    youtube_url = models.URLField(blank=True)
    tiktok_url = models.URLField(blank=True)
    facebook_url = models.URLField(blank=True)

    # Donations (disabled until permits are in place)
    donations_enabled = models.BooleanField("تفعيل التبرعات", default=False)
    donation_url = models.URLField("رابط منصة التبرع", blank=True)
    donation_note = models.TextField("ملاحظة التبرع", blank=True)
    donation_note_en = models.TextField(blank=True)
    bank_name = models.CharField("اسم البنك", max_length=150, blank=True)
    bank_account_name = models.CharField("اسم الحساب", max_length=200, blank=True)
    iban = models.CharField("الآيبان", max_length=34, blank=True)

    # Features & SEO
    english_enabled = models.BooleanField("تفعيل اللغة الإنجليزية", default=False)
    seo_description = models.CharField("وصف SEO", max_length=300, blank=True)
    seo_description_en = models.CharField(max_length=300, blank=True)
    seo_keywords = models.CharField("كلمات مفتاحية", max_length=300, blank=True)
    privacy_contact_email = models.EmailField("بريد مسؤول حماية البيانات", blank=True)

    class Meta:
        verbose_name = "إعدادات الموقع"
        verbose_name_plural = "إعدادات الموقع"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Page(TimeStampedModel):
    """Free-form pages such as privacy policy and terms."""

    slug = models.SlugField("المعرف في الرابط", unique=True, allow_unicode=True)
    title = models.CharField("العنوان", max_length=255)
    title_en = models.CharField(max_length=255, blank=True)
    body = models.TextField("المحتوى")
    body_en = models.TextField(blank=True)
    show_in_footer = models.BooleanField("إظهار في التذييل", default=False)
    is_published = models.BooleanField("منشور", default=True)
    seo_description = models.CharField(max_length=300, blank=True)

    objects = PublishableQuerySet.as_manager()

    class Meta:
        ordering = ["title"]
        verbose_name = "صفحة"
        verbose_name_plural = "الصفحات"

    def __str__(self):
        return self.title


class Banner(TimeStampedModel):
    class Layout(models.TextChoices):
        IMAGE = "image", "صورة خلفية مع نص"
        BRAND = "brand", "هوية الجمعية (الشعار والعنوان على خلفية الهوية)"
        ARTWORK = "artwork", "تصميم جاهز (تُعرض الصورة كاملة كما هي)"

    layout = models.CharField(
        "التصميم", max_length=10, choices=Layout.choices, default=Layout.IMAGE,
        help_text=(
            "تصميم الهوية: تظهر الكلمة الأخيرة من العنوان بالذهبي والصورة اختيارية. "
            "التصميم الجاهز: الصورة تحتوي النص، فيُستخدم العنوان والوصف نصًا بديلًا لمحركات البحث وقارئات الشاشة، والبانر كله رابط."
        ),
    )
    title = models.CharField("العنوان", max_length=255)
    title_en = models.CharField(max_length=255, blank=True)
    subtitle = models.TextField("الوصف", blank=True)
    subtitle_en = models.TextField(blank=True)
    image = models.ImageField("الصورة", upload_to=RandomFilename("banners"), validators=[validate_image], blank=True)
    image_mobile = models.ImageField(
        "صورة للجوال (اختياري)", upload_to=RandomFilename("banners"), validators=[validate_image], blank=True,
        help_text="نسخة طولية من التصميم للشاشات الصغيرة، وإلا تُعرض الصورة الأساسية كاملة",
    )

    class Fit(models.TextChoices):
        COVER = "cover", "ملء عرض الشاشة (يُقص جزء من أعلى التصميم وأسفله)"
        CONTAIN = "contain", "التصميم كاملًا دون قص (تُملأ الجانبان بخلفية من التصميم نفسه)"

    fit = models.CharField(
        "طريقة عرض التصميم الجاهز", max_length=10, choices=Fit.choices, default=Fit.COVER,
        help_text="اختر «كاملًا» إن كان في أعلى التصميم أو أسفله شعار أو زر لا يجوز قصه",
    )
    button_text =models.CharField("نص الزر", max_length=60, blank=True)
    button_text_en = models.CharField(max_length=60, blank=True)
    button_link = models.CharField("رابط الزر", max_length=500, blank=True)
    order = models.PositiveIntegerField("الترتيب", default=0)
    is_published = models.BooleanField("منشور", default=True)

    objects = PublishableQuerySet.as_manager()

    class Meta:
        ordering = ["order", "-created_at"]
        verbose_name = "بانر"
        verbose_name_plural = "البنرات"

    def __str__(self):
        return self.title


class AboutItem(TimeStampedModel):
    class Kind(models.TextChoices):
        GOAL = "goal", "هدف استراتيجي"
        VALUE = "value", "قيمة"

    kind = models.CharField("النوع", max_length=10, choices=Kind.choices)
    title = models.CharField("العنوان", max_length=255)
    title_en = models.CharField(max_length=255, blank=True)
    description = models.TextField("الوصف", blank=True)
    description_en = models.TextField(blank=True)
    icon = models.CharField("الأيقونة", max_length=50, blank=True)
    order = models.PositiveIntegerField("الترتيب", default=0)
    is_published = models.BooleanField("منشور", default=True)

    objects = PublishableQuerySet.as_manager()

    class Meta:
        ordering = ["kind", "order"]
        verbose_name = "هدف/قيمة"
        verbose_name_plural = "الأهداف والقيم"

    def __str__(self):
        return self.title


class BoardMember(TimeStampedModel):
    class Kind(models.TextChoices):
        BOARD = "board", "الهيئة الإدارية"
        EXECUTIVE = "executive", "الإدارة التنفيذية"

    kind = models.CharField("الفئة", max_length=10, choices=Kind.choices, default=Kind.BOARD)
    name = models.CharField("الاسم", max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    position = models.CharField("المنصب", max_length=200)
    position_en = models.CharField(max_length=200, blank=True)
    photo = models.ImageField(upload_to=RandomFilename("board"), validators=[validate_image], blank=True)
    bio = models.TextField("نبذة", blank=True)
    bio_en = models.TextField(blank=True)
    order = models.PositiveIntegerField("الترتيب", default=0)
    is_published = models.BooleanField("منشور", default=True)

    objects = PublishableQuerySet.as_manager()

    class Meta:
        ordering = ["kind", "order"]
        verbose_name = "عضو"
        verbose_name_plural = "الهيئة الإدارية والإدارة التنفيذية"

    def __str__(self):
        return self.name


class FAQ(TimeStampedModel):
    question = models.CharField("السؤال", max_length=500)
    question_en = models.CharField(max_length=500, blank=True)
    answer = models.TextField("الإجابة")
    answer_en = models.TextField(blank=True)
    order = models.PositiveIntegerField("الترتيب", default=0)
    is_published = models.BooleanField("منشور", default=True)

    objects = PublishableQuerySet.as_manager()

    class Meta:
        ordering = ["order"]
        verbose_name = "سؤال شائع"
        verbose_name_plural = "الأسئلة الشائعة"

    def __str__(self):
        return self.question


class Statistic(TimeStampedModel):
    """Impact figures. Only real numbers entered by staff are ever displayed."""

    label = models.CharField("العنوان", max_length=150)
    label_en = models.CharField(max_length=150, blank=True)
    value = models.PositiveBigIntegerField("القيمة")
    prefix = models.CharField("بادئة", max_length=10, blank=True)
    suffix = models.CharField("لاحقة", max_length=20, blank=True, help_text="مثال: + أو ساعة")
    suffix_en = models.CharField(max_length=20, blank=True)
    icon = models.CharField("الأيقونة", max_length=50, blank=True)
    description = models.CharField("وصف", max_length=255, blank=True)
    description_en = models.CharField(max_length=255, blank=True)
    as_of = models.DateField("حتى تاريخ", null=True, blank=True)
    show_on_home = models.BooleanField("في الرئيسية", default=True)
    order = models.PositiveIntegerField("الترتيب", default=0)
    is_published = models.BooleanField("منشور", default=True)

    objects = PublishableQuerySet.as_manager()

    class Meta:
        ordering = ["order"]
        verbose_name = "إحصائية"
        verbose_name_plural = "الإحصائيات"

    def __str__(self):
        return f"{self.label}: {self.value}"


class Partner(TimeStampedModel):
    class Kind(models.TextChoices):
        STRATEGIC = "strategic", "شريك استراتيجي"
        PARTNER = "partner", "شريك"
        SUPPORTER = "supporter", "داعم"
        SPONSOR = "sponsor", "راعٍ"

    name = models.CharField("الاسم", max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    kind = models.CharField("النوع", max_length=20, choices=Kind.choices, default=Kind.PARTNER)
    logo = models.ImageField("الشعار", upload_to=RandomFilename("partners"), validators=[validate_image])
    url = models.URLField("الموقع", blank=True)
    description = models.TextField("نبذة", blank=True)
    order = models.PositiveIntegerField("الترتيب", default=0)
    is_published = models.BooleanField("منشور", default=True)

    objects = PublishableQuerySet.as_manager()

    class Meta:
        ordering = ["order", "name"]
        verbose_name = "شريك"
        verbose_name_plural = "الشركاء والداعمون"

    def __str__(self):
        return self.name


class Program(TimeStampedModel):
    class Status(models.TextChoices):
        ONGOING = "ongoing", "قائم"
        COMPLETED = "completed", "مكتمل"
        UPCOMING = "upcoming", "قادم"

    class Kind(models.TextChoices):
        PROGRAM = "program", "برنامج"
        TRAINING = "training", "برنامج تدريبي"
        PROJECT = "project", "مشروع"
        INITIATIVE = "initiative", "مبادرة"

    kind = models.CharField("النوع", max_length=20, choices=Kind.choices, default=Kind.PROGRAM)
    title = models.CharField("العنوان", max_length=255)
    title_en = models.CharField(max_length=255, blank=True)
    slug = models.SlugField(unique=True, allow_unicode=True, max_length=255)
    summary = models.TextField("ملخص")
    summary_en = models.TextField(blank=True)
    description = models.TextField("الوصف التفصيلي", blank=True)
    description_en = models.TextField(blank=True)
    goals = models.TextField("الأهداف", blank=True, help_text="هدف في كل سطر")
    goals_en = models.TextField(blank=True)
    target_groups = models.TextField("الفئات المستفيدة", blank=True, help_text="فئة في كل سطر")
    target_groups_en = models.TextField(blank=True)
    results = models.TextField("النتائج المحققة", blank=True, help_text="نتيجة في كل سطر")
    results_en = models.TextField(blank=True)
    beneficiaries_count = models.PositiveIntegerField("عدد المستفيدين", null=True, blank=True)
    cover = models.ImageField("صورة الغلاف", upload_to=RandomFilename("programs"), validators=[validate_image], blank=True)
    icon = models.CharField("الأيقونة", max_length=50, blank=True)
    status = models.CharField("الحالة", max_length=20, choices=Status.choices, default=Status.ONGOING)
    start_date = models.DateField("تاريخ البداية", null=True, blank=True)
    end_date = models.DateField("تاريخ النهاية", null=True, blank=True)
    partners = models.ManyToManyField(Partner, blank=True, related_name="programs", verbose_name="الشركاء")
    is_featured = models.BooleanField("مميز في الرئيسية", default=False)
    order = models.PositiveIntegerField("الترتيب", default=0)
    is_published = models.BooleanField("منشور", default=True)

    objects = PublishableQuerySet.as_manager()

    class Meta:
        ordering = ["order", "-created_at"]
        verbose_name = "برنامج/مشروع"
        verbose_name_plural = "البرامج والمشاريع"

    def __str__(self):
        return self.title


class ProgramImage(TimeStampedModel):
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to=RandomFilename("programs"), validators=[validate_image])
    caption = models.CharField("وصف الصورة", max_length=255, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "صورة برنامج"
        verbose_name_plural = "صور البرامج"

    def __str__(self):
        return self.caption or f"صورة {self.pk}"


class Post(TimeStampedModel):
    class Kind(models.TextChoices):
        NEWS = "news", "خبر"
        EVENT = "event", "فعالية"
        ANNOUNCEMENT = "announcement", "إعلان"
        PUBLICATION = "publication", "منشور/إصدار"

    kind = models.CharField("النوع", max_length=20, choices=Kind.choices, default=Kind.NEWS)
    title = models.CharField("العنوان", max_length=255)
    title_en = models.CharField(max_length=255, blank=True)
    slug = models.SlugField(unique=True, allow_unicode=True, max_length=255)
    excerpt = models.TextField("مقتطف", blank=True)
    excerpt_en = models.TextField(blank=True)
    body = models.TextField("المحتوى")
    body_en = models.TextField(blank=True)
    cover = models.ImageField("صورة الغلاف", upload_to=RandomFilename("posts"), validators=[validate_image], blank=True)
    attachment = models.FileField(
        "مرفق عام", upload_to=RandomFilename("posts/files"), validators=[validate_document], blank=True
    )
    program = models.ForeignKey(
        Program, null=True, blank=True, on_delete=models.SET_NULL, related_name="posts", verbose_name="البرنامج"
    )
    event_date = models.DateTimeField("موعد الفعالية", null=True, blank=True)
    event_location = models.CharField("مكان الفعالية", max_length=255, blank=True)
    published_at = models.DateTimeField("تاريخ النشر", default=timezone.now)
    is_featured = models.BooleanField("مميز", default=False)
    is_published = models.BooleanField("منشور", default=True)

    objects = PublishableQuerySet.as_manager()

    class Meta:
        ordering = ["-published_at"]
        verbose_name = "مادة إعلامية"
        verbose_name_plural = "المركز الإعلامي"

    def __str__(self):
        return self.title


class Album(TimeStampedModel):
    title = models.CharField("العنوان", max_length=255)
    title_en = models.CharField(max_length=255, blank=True)
    slug = models.SlugField(unique=True, allow_unicode=True, max_length=255)
    description = models.TextField("الوصف", blank=True)
    cover = models.ImageField("الغلاف", upload_to=RandomFilename("gallery"), validators=[validate_image], blank=True)
    date = models.DateField("التاريخ", default=timezone.localdate)
    program = models.ForeignKey(Program, null=True, blank=True, on_delete=models.SET_NULL, related_name="albums")
    is_published = models.BooleanField("منشور", default=True)

    objects = PublishableQuerySet.as_manager()

    class Meta:
        ordering = ["-date"]
        verbose_name = "ألبوم"
        verbose_name_plural = "معرض الصور والفيديو"

    def __str__(self):
        return self.title


class MediaItem(TimeStampedModel):
    class Kind(models.TextChoices):
        IMAGE = "image", "صورة"
        VIDEO = "video", "فيديو"

    album = models.ForeignKey(Album, on_delete=models.CASCADE, related_name="items", verbose_name="الألبوم")
    kind = models.CharField("النوع", max_length=10, choices=Kind.choices, default=Kind.IMAGE)
    image = models.ImageField(upload_to=RandomFilename("gallery"), validators=[validate_image], blank=True)
    video_url = models.URLField("رابط الفيديو (يوتيوب)", blank=True)
    caption = models.CharField("الوصف", max_length=255, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "عنصر وسائط"
        verbose_name_plural = "عناصر الوسائط"

    def __str__(self):
        return self.caption or f"{self.get_kind_display()} {self.pk}"


class Document(TimeStampedModel):
    class Category(models.TextChoices):
        ANNUAL_REPORT = "annual_report", "التقارير السنوية"
        FINANCIAL = "financial", "القوائم المالية"
        AUDITOR = "auditor", "تقارير المراجع الخارجي"
        PERFORMANCE = "performance", "تقارير الأداء"
        POLICY = "policy", "السياسات واللوائح"
        BYLAWS = "bylaws", "اللائحة الأساسية"
        LICENSE = "license", "التراخيص والشهادات"
        GENERAL_ASSEMBLY = "general_assembly", "محاضر اجتماعات الهيئة العامة"
        OTHER = "other", "أخرى"

    category = models.CharField("التصنيف", max_length=30, choices=Category.choices)
    title = models.CharField("العنوان", max_length=255)
    title_en = models.CharField(max_length=255, blank=True)
    description = models.TextField("الوصف", blank=True)
    year = models.PositiveIntegerField("السنة", null=True, blank=True)
    file = models.FileField("الملف", upload_to=RandomFilename("documents"), validators=[validate_document])
    published_at = models.DateField("تاريخ النشر", default=timezone.localdate)
    order = models.PositiveIntegerField("الترتيب", default=0)
    is_published = models.BooleanField("منشور", default=True)

    objects = PublishableQuerySet.as_manager()

    class Meta:
        ordering = ["category", "-year", "order"]
        verbose_name = "وثيقة"
        verbose_name_plural = "الحوكمة والوثائق"

    def __str__(self):
        return self.title
