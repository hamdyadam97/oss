from pathlib import Path

from django.conf import settings as django_settings
from django.core.files import File
from django.core.management import call_command
from django.core.management.base import BaseCommand

from apps.cms.models import Banner, Page, SiteSettings

OLD_SAUDI_OPENING = "تلتزم الجمعية بحماية البيانات الشخصية وفق نظام حماية البيانات الشخصية في المملكة العربية السعودية"

PRIVACY_DRAFT = """تلتزم الجمعية بحماية البيانات الشخصية وفق قانون حماية البيانات الشخصية الأردني رقم (24) لسنة 2023 والأنظمة والتعليمات الصادرة بموجبه.

البيانات التي نجمعها
نجمع البيانات التي تقدمها عبر نماذج الموقع فقط (طلبات الخدمات، التطوع، الشراكات، التواصل)، مثل الاسم ورقم الهوية ورقم الجوال والمرفقات.

الغرض من جمع البيانات
تُستخدم البيانات لدراسة الطلبات والتواصل معك وتقديم الخدمة، ولا تُستخدم لأي غرض آخر دون موافقتك.

حماية البيانات
تُحفظ البيانات في أنظمة آمنة، ويُشفَّر رقم الهوية، ولا يطّلع على البيانات إلا الموظفون المخوّلون، وتُسجَّل جميع عمليات الوصول إلى المرفقات.

مشاركة البيانات
لا نشارك بياناتك مع أي جهة إلا بموافقتك أو عند وجود متطلب نظامي.

حقوقك
وفق القانون، يحق لك الاطلاع على بياناتك، وطلب تصحيحها أو تحديثها أو محوها، والاعتراض على معالجتها، وسحب موافقتك في أي وقت، وذلك بالتواصل معنا عبر بيانات التواصل الموضحة في الموقع.

الاحتفاظ بالبيانات
نحتفظ بالبيانات للمدة اللازمة لتحقيق الغرض الذي جُمعت من أجله أو للمدة التي تتطلبها التشريعات النافذة، ثم تُحذف بشكل آمن.

(مسودة — يجب مراجعتها واعتمادها من الجمعية قبل النشر)"""


# Official "About us" text provided by the association. Applied only to empty fields,
# so later edits from the dashboard are never overwritten.
OFFICIAL_CONTENT = {
    "about_full": (
        "جمعية تطوير الممارسة الطبية المهنية (Professional Medical Practice Development Association – PMPD-A) "
        "هي جمعية خيرية غير ربحية، مرخّصة من وزارة التنمية الاجتماعية الأردنية، وتتبع في أنشطتها ومجالات عملها "
        "الصحية لوزارة الصحة، وفقًا للتشريعات والأنظمة المعمول بها في المملكة الأردنية الهاشمية.\n\n"
        "تُعنى الجمعية بتطوير الممارسات المهنية في القطاع الصحي، وتعزيز كفاءة الكوادر الطبية والتمريضية والمهن "
        "الصحية المساندة، من خلال التعليم والتدريب والتطوير المهني المستمر، وتنفيذ المبادرات الصحية والمجتمعية، "
        "وبناء الشراكات الاستراتيجية مع المؤسسات الصحية والتعليمية والتدريبية والجهات ذات العلاقة."
    ),
    "about_full_en": (
        "The Professional Medical Practice Development Association (PMPD-A) is a non-profit charitable association "
        "licensed by the Jordanian Ministry of Social Development. Its health-related activities fall under the "
        "Ministry of Health, in accordance with the laws and regulations in force in the Hashemite Kingdom of Jordan.\n\n"
        "The association is dedicated to developing professional practice in the health sector and strengthening the "
        "competence of medical, nursing and allied health professionals through education, training and continuing "
        "professional development; implementing health and community initiatives; and building strategic partnerships "
        "with health, academic and training institutions and other relevant bodies."
    ),
    "about_short": (
        "جمعية خيرية غير ربحية مرخّصة من وزارة التنمية الاجتماعية الأردنية، تُعنى بتطوير الممارسات المهنية في القطاع "
        "الصحي وتعزيز كفاءة الكوادر الطبية والتمريضية والمهن الصحية المساندة من خلال التعليم والتدريب والتطوير المهني المستمر."
    ),
    "about_short_en": (
        "A non-profit charitable association licensed by the Jordanian Ministry of Social Development, dedicated to "
        "developing professional practice in the health sector through education, training and continuing professional development."
    ),
    "supervisor": "وزارة التنمية الاجتماعية، وتتبع في أنشطتها الصحية لوزارة الصحة",
    "supervisor_en": "Ministry of Social Development; health activities under the Ministry of Health",
    "seo_description": (
        "جمعية تطوير الممارسة الطبية المهنية (PMPD-A) — جمعية خيرية أردنية غير ربحية لتطوير الممارسات المهنية في "
        "القطاع الصحي عبر التعليم والتدريب والتطوير المهني المستمر."
    ),
    "seo_description_en": (
        "PMPD-A — a Jordanian non-profit developing professional practice in the health sector through education, "
        "training and continuing professional development."
    ),
    "seo_keywords": "جمعية تطوير الممارسة الطبية المهنية, PMPDA, PMPD-A, كوادر طبية, طب, تطوير مهني مستمر, CPD, الأردن",
}


# The association's own banner designs (branding/banners). Text fields double as alt text.
OFFICIAL_BANNERS = [
    dict(layout="brand", title="انطلقنا لنُمكّن", title_en="We set out to empower",
         subtitle="الارتقاء بكفاءة الكوادر الصحية", subtitle_en="Elevating the competence of healthcare professionals",
         button_text="تعرف على الجمعية", button_text_en="About us", button_link="/about"),
    dict(layout="artwork", image="patient-safety.webp", title="سلامة المرضى أولًا", title_en="Patient safety first",
         subtitle="مبادرات وبرامج لتعزيز ثقافة الجودة وسلامة المرضى في المنشآت الصحية",
         subtitle_en="Initiatives and programs that strengthen quality and patient safety in healthcare facilities",
         button_text="تعرف على الجمعية", button_text_en="About us", button_link="/about"),
    dict(layout="artwork", image="join-community.webp", title="انضم إلى مجتمعنا المهني", title_en="Join our professional community",
         subtitle="عضوية تمنحك أولوية التسجيل وخصومات على البرامج وشبكة من الخبراء",
         subtitle_en="Membership with priority registration, programme discounts and a network of experts",
         button_text="انضم عضوًا", button_text_en="Become a member", button_link="/membership"),
]


class Command(BaseCommand):
    help = "Initial setup: roles, settings singleton and draft legal pages (no demo content)."

    def handle(self, *args, **options):
        call_command("setup_roles")
        settings = SiteSettings.load()
        # Replace the original placeholder identity, never values staff have edited.
        if settings.name == "اسم الجمعية":
            for field in ("name", "name_en", "tagline", "tagline_en"):
                setattr(settings, field, SiteSettings._meta.get_field(field).default)
        # Earlier built-in palettes -> colours sampled from the logo.
        if (settings.primary_color, settings.secondary_color) in {("#0F5F5A", "#C9A227"), ("#14305A", "#C5A059")}:
            settings.primary_color, settings.secondary_color = "#081940", "#BB944A"
        for field, value in OFFICIAL_CONTENT.items():
            if not getattr(settings, field):
                setattr(settings, field, value)
        # Official logo shipped with the project (branding/), used until staff upload another.
        logo_file = Path(django_settings.BASE_DIR).parent / "branding" / "logo.webp"
        if logo_file.exists():
            for field in ("logo", "logo_light"):
                if not getattr(settings, field):
                    getattr(settings, field).save("logo.webp", File(logo_file.open("rb")), save=False)
        settings.save()

        # Official banners, only on a site that has none (never duplicates or overrides staff changes).
        banners_dir = Path(django_settings.BASE_DIR).parent / "branding" / "banners"
        if not Banner.objects.exists():
            for order, data in enumerate(OFFICIAL_BANNERS):
                data = dict(data)
                image_name = data.pop("image", None)
                banner = Banner(order=order, **data)
                if image_name and (banners_dir / image_name).exists():
                    banner.image.save(image_name, File((banners_dir / image_name).open("rb")), save=False)
                banner.save()
        # Replace the earlier Saudi-law draft if nobody has edited it yet.
        Page.objects.filter(slug="privacy", body__startswith=OLD_SAUDI_OPENING).update(body=PRIVACY_DRAFT)
        Page.objects.get_or_create(
            slug="privacy",
            defaults={"title": "سياسة الخصوصية", "title_en": "Privacy Policy", "body": PRIVACY_DRAFT,
                      "show_in_footer": True, "is_published": False},
        )
        Page.objects.get_or_create(
            slug="terms",
            defaults={"title": "شروط الاستخدام", "title_en": "Terms of Use",
                      "body": "(مسودة — أضف شروط الاستخدام المعتمدة من الجمعية)",
                      "show_in_footer": True, "is_published": False},
        )
        self.stdout.write(self.style.SUCCESS("Site initialised. Review and publish the draft pages from the dashboard."))
