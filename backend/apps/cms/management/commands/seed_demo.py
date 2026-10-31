"""Demo content for trying the portal. Fully reversible:

    python manage.py seed_demo          # create (replaces any previous demo data)
    python manage.py seed_demo --clear  # remove every demo record, file and account

Every created record is listed in demo_manifest.json so --clear never touches real data.
"""
import io
import json
import math
import os
import random
from datetime import timedelta
from pathlib import Path

from django.apps import apps
from django.conf import settings as dj_settings
from django.contrib.auth.models import Group
from django.core.files.base import ContentFile
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from PIL import Image, ImageDraw, ImageFont

from apps.accounts.models import User
from apps.cms import models as cms
from apps.engagement import models as eng
from apps.professional import models as pro

# Overridable so containers keep it on a persistent volume (the code directory is rebuilt on every deploy)
MANIFEST = Path(os.environ.get("DEMO_MANIFEST", Path(dj_settings.BASE_DIR) / "demo_manifest.json"))
# The default is published in the README: public servers set their own via DEMO_PASSWORD
DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD") or "Demo@2026pass"
NAVY, GOLD = (20, 48, 90), (197, 160, 89)
PALETTES = [
    (NAVY, (41, 98, 160)), ((14, 74, 94), (32, 140, 150)), ((60, 40, 100), (110, 80, 170)),
    ((20, 48, 90), (197, 160, 89)), ((24, 90, 70), (60, 160, 120)), ((120, 50, 50), (200, 110, 90)),
]


# ---------------------------------------------------------------- generated media
def _gradient(w, h, c1, c2):
    img = Image.new("RGB", (w, h), c1)
    draw = ImageDraw.Draw(img)
    for x in range(w):
        t = x / max(w - 1, 1)
        draw.line([(x, 0), (x, h)], fill=tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)))
    return img, draw


def _jpeg(img) -> ContentFile:
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=85)
    return ContentFile(buf.getvalue(), name="demo.jpg")


def _png(img) -> ContentFile:
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return ContentFile(buf.getvalue(), name="demo.png")


def medical_image(seed: int, w=1200, h=750) -> ContentFile:
    """Abstract medical-themed artwork (no text): gradient, diamond pattern, cross and pulse line."""
    rnd = random.Random(seed)
    c1, c2 = PALETTES[seed % len(PALETTES)]
    img, draw = _gradient(w, h, c1, c2)
    step, line = 60, tuple(min(255, v + 28) for v in c1)
    for y in range(0, h + step, step):
        for x in range(0, w + step, step):
            draw.polygon([(x, y - 22), (x + 22, y), (x, y + 22), (x - 22, y)], outline=line)
    for _ in range(4):
        r = rnd.randint(60, 200)
        cx, cy = rnd.randint(0, w), rnd.randint(0, h)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=GOLD, width=3)
    # medical cross
    cx, cy, s = int(w * (0.25 + 0.5 * rnd.random())), int(h * 0.42), int(min(w, h) * 0.12)
    draw.rounded_rectangle([cx - s // 3, cy - s, cx + s // 3, cy + s], radius=12, fill=(255, 255, 255))
    draw.rounded_rectangle([cx - s, cy - s // 3, cx + s, cy + s // 3], radius=12, fill=(255, 255, 255))
    # heartbeat line
    y0, pts, x = int(h * 0.78), [], 0
    while x <= w:
        pts.append((x, y0))
        if rnd.random() < 0.18:
            pts += [(x + 15, y0 - 70), (x + 30, y0 + 50), (x + 45, y0)]
            x += 45
        x += 40
    draw.line(pts, fill=GOLD, width=6, joint="curve")
    return _jpeg(img)


def logo_image(initials: str, seed: int) -> ContentFile:
    c1, c2 = PALETTES[seed % len(PALETTES)]
    img = Image.new("RGBA", (400, 200), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([20, 30, 160, 170], radius=36, fill=c1)
    draw.ellipse([60, 70, 120, 130], fill=c2)
    font = ImageFont.load_default(size=72)
    draw.text((185, 58), initials, fill=c1, font=font)
    return _png(img)


def avatar_image(seed: int) -> ContentFile:
    bg = [(226, 232, 240), (237, 228, 210), (220, 236, 232)][seed % 3]
    img = Image.new("RGB", (500, 500), bg)
    draw = ImageDraw.Draw(img)
    draw.ellipse([170, 90, 330, 250], fill=NAVY)
    draw.ellipse([90, 280, 410, 640], fill=NAVY)
    draw.polygon([(250, 300), (225, 420), (250, 460), (275, 420)], fill=GOLD)  # tie
    return _jpeg(img)


def demo_pdf(title: str) -> ContentFile:
    """A small valid PDF (Latin text) used as a stand-in document."""
    text = f"BT /F1 22 Tf 72 760 Td ({title}) Tj 0 -36 Td /F1 12 Tf (Demo document - replace with the official file.) Tj ET"
    objs = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(text)} >>\nstream\n{text}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out, offsets = "%PDF-1.4\n", []
    for i, body in enumerate(objs, 1):
        offsets.append(len(out.encode()))
        out += f"{i} 0 obj\n{body}\nendobj\n"
    xref = len(out.encode())
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n" + "".join(f"{o:010d} 00000 n \n" for o in offsets)
    out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n"
    return ContentFile(out.encode(), name="demo.pdf")


# ---------------------------------------------------------------- command
class Command(BaseCommand):
    help = "Creates (or with --clear removes) demo content for every section of the portal."

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true", help="Remove all demo data")

    def handle(self, *args, clear=False, **options):
        if MANIFEST.exists():
            self.clear()
        if clear:
            self.stdout.write(self.style.SUCCESS("Demo data removed."))
            return
        call_command("setup_roles", stdout=io.StringIO())
        self.created: list[tuple[str, int]] = []
        with transaction.atomic():
            previous = self.seed()
        MANIFEST.write_text(json.dumps({"objects": self.created, "previous": previous}, ensure_ascii=False, indent=1), "utf-8")
        self.report()

    # .............................................................. helpers
    def add(self, obj):
        obj.save()
        self.created.append((obj._meta.label, obj.pk))
        return obj

    def make(self, model, **fields):
        files = {k: fields.pop(k) for k in list(fields) if isinstance(fields[k], ContentFile)}
        obj = model(**fields)
        for name, content in files.items():
            getattr(obj, name).save(content.name, content, save=False)
        return self.add(obj)

    def clear(self):
        data = json.loads(MANIFEST.read_text("utf-8"))
        with transaction.atomic():
            for label, pk in reversed(data["objects"]):
                obj = apps.get_model(label).objects.filter(pk=pk).first()
                if obj is None:
                    continue
                for field in obj._meta.fields:
                    if field.get_internal_type() in ("FileField", "ImageField"):
                        f = getattr(obj, field.name)
                        if f:
                            f.delete(save=False)
                obj.delete()
            prev = data.get("previous", {})
            if "settings" in prev:
                site = cms.SiteSettings.load()
                applied = prev.get("demo_settings")
                for field in site._meta.fields:
                    name = field.name
                    if name not in prev["settings"] or field.get_internal_type() in ("FileField", "ImageField"):
                        continue
                    if applied is None:  # manifests from older versions restored everything
                        setattr(site, name, prev["settings"][name])
                    elif name in applied and getattr(site, name) == applied[name]:
                        # Only undo values that still hold demo content; keep anything staff edited since.
                        setattr(site, name, prev["settings"][name])
                if prev.get("about_image_added") and site.about_image:
                    site.about_image.delete(save=False)
                site.save()
            for slug, published in prev.get("pages", {}).items():
                cms.Page.objects.filter(slug=slug).update(is_published=published)
        MANIFEST.unlink()

    # .............................................................. seed
    def seed(self):
        now = timezone.now()
        today = timezone.localdate()
        previous = {}

        # ---- settings (snapshot first so --clear restores it)
        site = cms.SiteSettings.load()
        previous["settings"] = {
            f.name: getattr(site, f.name) for f in site._meta.fields
            if f.get_internal_type() not in ("FileField", "ImageField", "DateTimeField", "AutoField", "BigAutoField")
        }
        values = dict(
            name="جمعية تطوير الممارسة الطبية المهنية",
            name_en="Professional Medical Practice Development Association",
            tagline="الارتقاء بكفاءة الكوادر الصحية",
            tagline_en="Elevating the competence of healthcare professionals",
            license_number="1234 (تجريبي)",
            supervisor="سجل الجمعيات — وزارة التنمية الاجتماعية",
            supervisor_en="Registry of Societies — Ministry of Social Development",
            founded_year=2024,
            about_short=(
                "جمعية أهلية متخصصة تُعنى بتطوير الممارسة الطبية المهنية ورفع كفاءة الكوادر الصحية، "
                "عبر برامج التدريب والتعليم الطبي المستمر وتعزيز ثقافة الجودة وسلامة المرضى."
            ),
            about_short_en=(
                "A professional non-profit association dedicated to developing medical practice and raising the "
                "competence of healthcare professionals through training, continuing medical education and patient safety."
            ),
            about_full=(
                "انطلقت جمعية تطوير الممارسة الطبية المهنية إيمانًا بأن جودة الرعاية الصحية تبدأ من كفاءة من يقدّمها. "
                "نعمل مع الأطباء والممرضين والصيادلة والتخصصات الصحية المساندة لتطوير مهاراتهم السريرية والمهنية، "
                "ونقدّم برامج تدريبية معتمدة، ولقاءات علمية، ومبادرات لتعزيز أخلاقيات المهنة وسلامة المرضى.\n\n"
                "كما نسعى إلى بناء شراكات فاعلة مع المنشآت الصحية والجهات الأكاديمية لنقل المعرفة وتبادل الخبرات، "
                "ودعم الكوادر الوطنية الشابة في مسيرتها المهنية."
            ),
            vision="أن نكون المرجع الوطني الرائد في تطوير الممارسة الطبية المهنية وتمكين الكوادر الصحية.",
            vision_en="To be the leading national reference in developing professional medical practice.",
            mission=(
                "تمكين الكوادر الصحية بالمعرفة والمهارة من خلال برامج تعليم طبي مستمر عالية الجودة، "
                "وشراكات فاعلة، وبيئة مهنية تعزز سلامة المرضى وجودة الرعاية."
            ),
            mission_en="Empowering healthcare professionals through high-quality CME programs and effective partnerships.",
            phone="065123456",
            whatsapp="0791234567",
            email="info@example.org.jo",
            address="عمّان — الشميساني",
            address_en="Shmeisani, Amman, Jordan",
            working_hours="الأحد – الخميس: 8:30 ص – 4:00 م",
            working_hours_en="Sun – Thu: 8:30 AM – 4:00 PM",
            map_url="https://maps.google.com/?q=Shmeisani,Amman",
            map_embed_url="https://www.google.com/maps?q=Shmeisani,Amman&output=embed",
            x_url="https://x.com/example",
            instagram_url="https://instagram.com/example",
            linkedin_url="https://linkedin.com/company/example",
            youtube_url="https://youtube.com/@example",
            donations_enabled=True,
            donation_note="يمكنكم دعم برامج تأهيل الكوادر الصحية عبر التحويل البنكي، وفق الموافقات الرسمية لجمع التبرعات (بيانات تجريبية).",
            bank_name="البنك التجريبي",
            bank_account_name="جمعية تطوير الممارسة الطبية المهنية",
            iban="JO00DEMO0000000000000000000000",
            english_enabled=True,
            seo_description="جمعية تطوير الممارسة الطبية المهنية — برامج تدريب وتعليم طبي مستمر وعضوية مهنية للكوادر الصحية.",
            privacy_contact_email="privacy@example.org.jo",
        )
        # Never overwrite real content: only fill fields that are empty or still at their default.
        applied = {}
        for k, v in values.items():
            current, default = getattr(site, k), cms.SiteSettings._meta.get_field(k).default
            if current in ("", None) or current == default:
                setattr(site, k, v)
                applied[k] = v
        previous["demo_settings"] = applied
        # Only fill the image if the association has not uploaded its own.
        previous["about_image_added"] = not site.about_image
        if not site.about_image:
            site.about_image.save("about.jpg", medical_image(101), save=False)
        site.save()

        # ---- legal pages (drafts) published for the demo
        previous["pages"] = dict(cms.Page.objects.values_list("slug", "is_published"))
        cms.Page.objects.filter(slug__in=["privacy", "terms"]).update(is_published=True)

        # ---- banners: the association's official banners come from init_site; demo ones only on an empty site
        if not cms.Banner.objects.exists():
            for i, (title, sub, btn, link) in enumerate([
                ("انطلقنا لنُمكّن", "الارتقاء بكفاءة الكوادر الصحية", "استعرض الدورات", "/courses"),
                ("انضم إلى مجتمعنا المهني", "عضوية تمنحك أولوية التسجيل وخصومات على البرامج وشبكة من الخبراء", "انضم عضوًا", "/membership"),
                ("سلامة المرضى أولًا", "مبادرات وبرامج لتعزيز ثقافة الجودة وسلامة المرضى في المنشآت الصحية", "برامجنا", "/programs"),
            ]):
                self.make(cms.Banner, title=title, subtitle=sub, button_text=btn, button_link=link, order=i,
                          title_en=["We set out to empower", "Join our professional community", "Patient safety first"][i],
                          layout="brand" if i == 0 else "image",
                          image=medical_image(10 + i, 1920, 800) if i else "")

        # ---- goals & values
        for i, (t, d) in enumerate([
            ("رفع كفاءة الكوادر الصحية", "تقديم برامج تدريبية معتمدة تواكب أحدث الممارسات السريرية."),
            ("تعزيز التطوير المهني المستمر", "توفير ساعات تطوير مهني مستمر (CPD) معتمدة تدعم متطلبات تجديد الترخيص."),
            ("نشر ثقافة الجودة وسلامة المرضى", "تبنّي مبادرات توعوية وتطبيقية في المنشآت الصحية."),
            ("بناء شراكات مهنية فاعلة", "التعاون مع المستشفيات والجامعات والجهات المهنية."),
            ("دعم الكوادر الوطنية الشابة", "برامج إرشاد مهني وتأهيل لحديثي التخرج."),
        ]):
            self.make(cms.AboutItem, kind="goal", title=t, description=d, order=i)
        for i, (t, d, icon) in enumerate([
            ("المهنية", "نلتزم بأعلى معايير الممارسة والأخلاقيات المهنية.", "stethoscope"),
            ("الجودة", "نسعى للتميز في كل برنامج نقدّمه.", "badge-check"),
            ("التعلم المستمر", "نؤمن بأن المعرفة الطبية رحلة لا تتوقف.", "book-open"),
            ("الشراكة", "نعمل مع شركائنا لتحقيق أثر أكبر.", "handshake"),
        ]):
            self.make(cms.AboutItem, kind="value", title=t, description=d, icon=icon, order=i)

        # ---- board & executives (fictional people)
        people = [
            ("board", "د. عبدالله المجالي", "رئيس الهيئة الإدارية"),
            ("board", "د. رنا الخصاونة", "نائب رئيس الهيئة الإدارية"),
            ("board", "د. خالد العبادي", "أمين الصندوق"),
            ("board", "أ. ريم الحياري", "أمين السر"),
            ("board", "د. سامر الطراونة", "عضو الهيئة الإدارية"),
            ("executive", "أ. فيصل البطاينة", "المدير التنفيذي"),
            ("executive", "أ. هند الروسان", "مديرة البرامج والتدريب"),
            ("executive", "أ. ماجد النسور", "مدير الشراكات والعضويات"),
        ]
        for i, (kind, name, pos) in enumerate(people):
            self.make(cms.BoardMember, kind=kind, name=name, position=pos, order=i, photo=avatar_image(i))

        # ---- FAQ
        for i, (q, a) in enumerate([
            ("كيف أسجل في دورة تدريبية؟", "من صفحة «الدورات والفعاليات» اختر الدورة واملأ نموذج التسجيل، وستحصل على رقم تسجيل لمتابعة حالته."),
            ("هل الدورات معتمدة بساعات تطوير مهني مستمر (CPD)؟",
             "نعم، تُعرض ساعات التطوير المهني المستمر وجهة الاعتماد في صفحة كل دورة، ويمكن احتسابها ضمن متطلبات تجديد ترخيص مزاولة المهنة وفق تعليمات الجهة المختصة."),
            ("كيف أحصل على شهادة الحضور؟", "بعد تأكيد حضورك تصدر الشهادة تلقائيًا، ويمكنك عرضها وطباعتها من صفحة «تتبع طلب»."),
            ("كيف أتحقق من صحة شهادة؟", "من صفحة «التحقق من الشهادات» أدخل رمز الشهادة المطبوع عليها."),
            ("ما مزايا العضوية؟", "أولوية التسجيل في البرامج، وخصومات على الرسوم، وحضور اللقاءات المهنية الخاصة بالأعضاء."),
            ("كيف أجدد عضويتي؟", "تواصل معنا قبل انتهاء العضوية، وبعد سداد الرسوم تُجدَّد لمدة سنة إضافية."),
        ]):
            self.make(cms.FAQ, question=q, answer=a, order=i)

        # ---- statistics
        for i, (label, val, suffix, icon) in enumerate([
            ("ممارس صحي مستفيد من برامجنا", 1250, "+", "users"),
            ("ساعة تعليم طبي مستمر", 3400, "", "presentation"),
            ("دورة وورشة عمل", 48, "", "school"),
            ("عضو في الجمعية", 320, "+", "badge-check"),
        ]):
            self.make(cms.Statistic, label=label, value=val, suffix=suffix, icon=icon, order=i, as_of=today)

        # ---- partners (fictional)
        partners = []
        for i, (name, kind, ini) in enumerate([
            ("مستشفى النخبة التخصصي", "strategic", "NSH"),
            ("كلية العلوم الصحية التطبيقية", "strategic", "CHS"),
            ("مجمع الشفاء الطبي", "partner", "SMC"),
            ("مركز المهارات السريرية", "partner", "CSC"),
            ("شركة الرعاية المتقدمة", "sponsor", "ACC"),
            ("مؤسسة العطاء الصحية", "supporter", "AHF"),
        ]):
            partners.append(self.make(cms.Partner, name=name, kind=kind, order=i, url="https://example.com", logo=logo_image(ini, i)))

        # ---- programs
        programs = []
        for i, p in enumerate([
            dict(kind="training", title="برنامج تأهيل الأطباء المقيمين", status="ongoing", icon="stethoscope", beneficiaries_count=180,
                 summary="برنامج تدريبي متكامل لتطوير المهارات السريرية والتواصلية للأطباء المقيمين في سنواتهم الأولى.",
                 goals="تعزيز مهارات الفحص السريري\nتطوير مهارات التواصل مع المرضى\nتطبيق الممارسة المبنية على البراهين",
                 target_groups="الأطباء المقيمون\nأطباء الامتياز",
                 results="تأهيل 180 طبيبًا مقيمًا\nرضا المتدربين 94%\nتنفيذ 12 ورشة عملية"),
            dict(kind="initiative", title="مبادرة سلامة المرضى", status="ongoing", icon="shield-check", beneficiaries_count=640,
                 summary="مبادرة لنشر ثقافة سلامة المرضى وتقليل الأخطاء الطبية في المنشآت الصحية الشريكة.",
                 goals="رفع الوعي بمعايير سلامة المرضى\nتدريب فرق الجودة\nقياس مؤشرات السلامة",
                 target_groups="فرق التمريض\nإدارات الجودة\nالأطباء",
                 results="تدريب 640 ممارسًا صحيًا\nتطبيق المبادرة في 5 منشآت"),
            dict(kind="program", title="برنامج الإرشاد المهني للخريجين", status="upcoming", icon="graduation-cap",
                 summary="ربط الخريجين الجدد من التخصصات الصحية بمرشدين ذوي خبرة لدعم مسيرتهم المهنية.",
                 goals="دعم الانتقال من الدراسة إلى الممارسة\nبناء شبكة علاقات مهنية",
                 target_groups="حديثو التخرج\nطلاب سنة الامتياز"),
            dict(kind="project", title="مشروع الدليل الوطني للمهارات التمريضية", status="completed", icon="book-open", beneficiaries_count=2100,
                 summary="إعداد دليل مرجعي مصوّر للمهارات التمريضية الأساسية بالتعاون مع خبراء التمريض.",
                 results="نشر الدليل لأكثر من 2100 ممارس\nاعتماده مرجعًا في 3 كليات صحية"),
        ]):
            prog = self.make(cms.Program, slug=f"demo-program-{i + 1}", order=i, is_featured=True,
                             description=p["summary"] + "\n\nيتضمن البرنامج محاضرات نظرية وتدريبًا عمليًا على المحاكاة، مع تقييم قبلي وبعدي لقياس الأثر.",
                             start_date=today - timedelta(days=200 - i * 30), cover=medical_image(20 + i), **p)
            prog.partners.set(partners[i % 3:(i % 3) + 2])
            programs.append(prog)
            for j in range(3):
                self.make(cms.ProgramImage, program=prog, order=j, caption=f"من فعاليات {prog.title}", image=medical_image(200 + i * 10 + j, 900, 900))

        # ---- posts
        posts = [
            ("news", "الجمعية توقّع مذكرة تعاون مع مستشفى النخبة التخصصي", -3, None),
            ("news", "اختتام برنامج تأهيل الأطباء المقيمين بمشاركة 60 طبيبًا", -12, None),
            ("event", "اللقاء العلمي السنوي لسلامة المرضى", -20, 18),
            ("announcement", "فتح باب التسجيل في عضوية الجمعية لعام 2026", -6, None),
            ("news", "ورشة عمل حول الممارسة المبنية على البراهين", -28, None),
            ("publication", "إصدار الدليل الوطني للمهارات التمريضية", -40, None),
        ]
        for i, (kind, title, days, event_in) in enumerate(posts):
            self.make(cms.Post, kind=kind, title=title, slug=f"demo-post-{i + 1}", published_at=now + timedelta(days=days),
                      excerpt=f"{title}، ضمن جهود الجمعية في تطوير الممارسة الطبية المهنية.",
                      body=(f"{title}.\n\nأكدت الجمعية أن هذه الخطوة تأتي ضمن خطتها الاستراتيجية للارتقاء بكفاءة الكوادر الصحية، "
                            "وتعزيز التعاون مع الجهات الصحية والأكاديمية.\n\nوأشارت إلى أن البرنامج يتضمن محاضرات وورش عمل تطبيقية، "
                            "وسيُعلن عن التفاصيل عبر الموقع الرسمي وحسابات الجمعية."),
                      event_date=now + timedelta(days=event_in) if event_in else None,
                      event_location="عمّان — قاعة المؤتمرات" if event_in else "",
                      program=programs[i % len(programs)] if i < 3 else None, is_featured=i == 0,
                      cover=medical_image(40 + i), attachment=demo_pdf("Nursing Skills Guide") if kind == "publication" else "")

        # ---- gallery
        for a in range(2):
            album = self.make(cms.Album, title=["ورش التدريب على المحاكاة", "اللقاء العلمي السنوي"][a], slug=f"demo-album-{a + 1}",
                              description="صور من فعاليات الجمعية.", date=today - timedelta(days=15 + a * 40), cover=medical_image(60 + a))
            for j in range(6):
                self.make(cms.MediaItem, album=album, kind="image", order=j, caption=f"صورة {j + 1}", image=medical_image(300 + a * 10 + j, 1000, 1000))

        # ---- governance documents
        for i, (cat, title, year) in enumerate([
            ("annual_report", "التقرير السنوي 2025", 2025),
            ("financial", "القوائم المالية المدققة 2025", 2025),
            ("auditor", "تقرير المراجع الخارجي 2025", 2025),
            ("bylaws", "اللائحة الأساسية للجمعية", None),
            ("license", "شهادة تسجيل الجمعية", None),
            ("policy", "سياسة تعارض المصالح", None),
            ("policy", "سياسة حماية البيانات الشخصية", None),
            ("general_assembly", "محضر اجتماع الهيئة العامة العادي 2025", 2025),
        ]):
            self.make(cms.Document, category=cat, title=title, year=year, order=i, file=demo_pdf(f"Demo: {cat} {year or ''}"))

        # ---- e-services
        services = [
            self.make(eng.Service, title="طلب دعم حضور مؤتمر علمي", slug="demo-conference-support", icon="presentation", order=0,
                      summary="دعم الممارسين الصحيين لحضور المؤتمرات العلمية المعتمدة داخل الأردن.",
                      eligibility="أن يكون المتقدم عضوًا ساري العضوية\nأن يكون المؤتمر معتمدًا بساعات تعليم طبي",
                      required_documents="خطاب قبول أو تسجيل في المؤتمر\nصورة ترخيص مزاولة المهنة",
                      requires_attachment=True,
                      extra_fields=[{"name": "conference", "label": "اسم المؤتمر", "type": "text", "required": True},
                                    {"name": "date", "label": "تاريخ المؤتمر", "type": "date", "required": True}]),
            self.make(eng.Service, title="طلب إرشاد مهني", slug="demo-mentorship", icon="users", order=1,
                      summary="اطلب مرشدًا مهنيًا من ذوي الخبرة في تخصصك لدعم مسيرتك المهنية.",
                      extra_fields=[{"name": "level", "label": "المستوى المهني", "type": "select", "required": True,
                                     "options": ["طالب امتياز", "مقيم", "أخصائي", "استشاري"]}]),
            self.make(eng.Service, title="طلب استضافة برنامج تدريبي في منشأة", slug="demo-hosted-training", icon="hospital", order=2,
                      summary="للمنشآت الصحية الراغبة في تنفيذ برنامج تدريبي للجمعية لدى كوادرها.",
                      extra_fields=[{"name": "staff", "label": "عدد المتدربين المتوقع", "type": "number", "required": True}]),
        ]

        # ---- volunteering
        opps = []
        for i, (t, loc, hours) in enumerate([
            ("منظم في اللقاء العلمي السنوي", "عمّان", 12),
            ("مدرب مساعد في ورش المحاكاة", "عمّان", 20),
            ("محتوى توعوي صحي عن بعد", "", 10),
        ]):
            opps.append(self.make(eng.VolunteerOpportunity, title=t, slug=f"demo-opportunity-{i + 1}", location=loc, is_remote=not loc,
                                  description="فرصة تطوعية للمساهمة في أنشطة الجمعية واكتساب الخبرة والعمل ضمن فريق مهني.",
                                  requirements="الالتزام بالمواعيد\nمهارات تواصل جيدة",
                                  start_date=today + timedelta(days=10 + i * 7), end_date=today + timedelta(days=40 + i * 7),
                                  hours=hours, seats=10 + i * 5, order=i))

        # ---- courses
        courses = []
        for i, c in enumerate([
            dict(kind="course", title="دورة دعم الحياة الأساسي BLS", days=8, hours=6, cme=4, seats=30, fee=60, members_fee=45,
                 location="عمّان — مركز المهارات السريرية"),
            dict(kind="workshop", title="ورشة التواصل الفعّال مع المرضى", days=15, hours=4, cme=3, seats=2, fee=0, members_fee=None,
                 location="عمّان — مقر الجمعية"),
            dict(kind="webinar", title="محاضرة: مقاومة المضادات الحيوية", days=4, hours=2, cme=2, seats=None, fee=0, members_fee=None,
                 location="", online=True),
            dict(kind="conference", title="المؤتمر السنوي لسلامة المرضى", days=30, hours=16, cme=12, seats=300, fee=100, members_fee=70,
                 location="عمّان — مركز الملك حسين للمؤتمرات"),
            dict(kind="course", title="دورة دعم الحياة القلبي المتقدم ACLS", days=-25, hours=14, cme=12, seats=24, fee=150, members_fee=120,
                 location="عمّان — مركز المهارات السريرية"),
            dict(kind="workshop", title="ورشة الممارسة المبنية على البراهين", days=-60, hours=5, cme=4, seats=40, fee=0, members_fee=None,
                 location="إربد — كلية العلوم الصحية"),
        ]):
            start = (now + timedelta(days=c["days"])).replace(hour=6, minute=0, second=0, microsecond=0)
            courses.append(self.make(
                pro.Course, kind=c["kind"], title=c["title"], slug=f"demo-course-{i + 1}",
                summary=f"{c['title']} وفق أحدث الإرشادات العلمية، مع تدريب عملي وتقييم معتمد.",
                description="تهدف هذه الدورة إلى تزويد المشاركين بالمعرفة والمهارات اللازمة وفق أحدث الإرشادات، "
                            "من خلال محاضرات تفاعلية وتطبيقات عملية على أجهزة المحاكاة.",
                objectives="فهم الأسس العلمية الحديثة\nتطبيق المهارات العملية بثقة\nالعمل ضمن فريق في الحالات الحرجة",
                target_audience="الأطباء\nالتمريض\nأخصائيو الطوارئ",
                speakers="د. سامي الزعبي — استشاري طب الطوارئ\nأ. منى الشريدة — مدربة معتمدة في الإنعاش",
                start_datetime=start, end_datetime=start + timedelta(hours=c["hours"]),
                location=c["location"], is_online=c.get("online", False), seats=c["seats"],
                registration_deadline=start - timedelta(days=2) if c["days"] > 3 else None,
                cme_hours=c["cme"], accreditation="المجلس الصحي العالي (تجريبي)",
                fee=c["fee"] or None, members_fee=c["members_fee"], requires_approval=i == 3,
                program=programs[0] if i in (0, 4) else None, cover=medical_image(80 + i),
            ))

        # ---- membership types
        mtypes = [
            self.make(pro.MembershipType, title="عضو عامل", slug="demo-full-member", fee=50, duration_months=12, requires_license=True,
                      icon="badge-check", order=0, description="للممارسين الصحيين الحاصلين على ترخيص مزاولة مهنة ساري المفعول في الأردن.",
                      benefits="حق التصويت في الهيئة العامة\nخصم 30% على الدورات\nأولوية التسجيل في الفعاليات",
                      eligibility="ترخيص مزاولة مهنة ساري المفعول\nعضوية سارية في النقابة المهنية المختصة\nخبرة لا تقل عن سنتين"),
            self.make(pro.MembershipType, title="عضو منتسب", slug="demo-associate-member", fee=25, duration_months=12, requires_license=False,
                      icon="users", order=1, description="للمهتمين بالقطاع الصحي من الإداريين والباحثين.",
                      benefits="خصم 15% على الدورات\nالنشرة الدورية للجمعية"),
            self.make(pro.MembershipType, title="عضو طالب", slug="demo-student-member", fee=None, duration_months=12, requires_license=False,
                      icon="graduation-cap", order=2, description="لطلاب الكليات الصحية وطلاب الامتياز.",
                      benefits="حضور المحاضرات عن بعد مجانًا\nبرنامج الإرشاد المهني",
                      eligibility="إثبات قيد دراسي ساري"),
        ]

        # ---- people for submissions (fictional)
        names = [
            ("د. أحمد الزعبي", "Ahmad Al-Zoubi", "male", "physician", "طب الطوارئ"),
            ("أ. سارة المومني", "Sara Al-Momani", "female", "nurse", "تمريض العناية الحثيثة"),
            ("د. عمر العزام", "Omar Al-Azzam", "male", "pharmacist", "الصيدلة السريرية"),
            ("د. لمى الحوراني", "Lama Al-Hourani", "female", "physician", "طب الأسرة"),
            ("أ. يوسف القضاة", "Yousef Al-Qudah", "male", "allied", "العلاج التنفسي"),
            ("أ. أمل الشرع", "Amal Al-Sharaa", "female", "midwife", "القبالة"),
            ("د. طارق الكايد", "Tareq Al-Kayed", "male", "dentist", "طب الأسنان العام"),
            ("أ. جود الرواشدة", "Joud Al-Rawashdeh", "female", "student", "التحاليل الطبية"),
        ]
        consent = now - timedelta(days=5)

        def person(i):
            ar, en, gender, prof, spec = names[i % len(names)]
            return dict(full_name=ar, full_name_en=en, national_id=f"99{i:02d}{345678 + i:06d}", phone=f"079{1000000 + i * 1111:07d}",
                        email=f"demo{i}@example.com", profession=prof, specialty=spec, city=["عمّان", "إربد", "الزرقاء"][i % 3],
                        workplace="مستشفى النخبة التخصصي", license_number=f"{10000 + i}", consented_at=consent), gender

        # course registrations: past courses have attendance + certificates
        regs = [
            (4, 0, "attended"), (4, 1, "attended"), (4, 2, "absent"), (5, 3, "attended"),
            (0, 0, "confirmed"), (0, 4, "confirmed"), (1, 5, "confirmed"), (1, 6, "confirmed"), (1, 7, "waitlisted"),
            (3, 1, "pending"), (3, 2, "pending"), (2, 3, "confirmed"),
        ]
        for course_i, person_i, st in regs:
            data, _ = person(person_i)
            self.make(pro.CourseRegistration, course=courses[course_i], status=st, **data)

        # memberships: active, expiring soon, expired, pending, under review
        for i, (mt, st, start_days) in enumerate([
            (0, "active", 200), (0, "active", 350), (1, "active", 400), (0, "pending", None), (2, "under_review", None),
        ]):
            data, gender = person(i)
            m = pro.Membership(membership_type=mtypes[mt], status=st, gender=gender, qualification="بكالوريوس",
                               years_experience=3 + i, nationality="أردني" if i % 2 == 0 else "أردنية", **data)
            if start_days:
                m.start_date = today - timedelta(days=start_days)
                m.expiry_date = pro.add_months(m.start_date, 12)
            if mtypes[mt].requires_license:
                m.license_card.save("license.pdf", demo_pdf("Practice licence (demo)"), save=False)
            self.add(m)

        # beneficiary requests, volunteers, partnerships, messages
        for i, (svc, st, extra) in enumerate([
            (0, "new", {"conference": {"label": "اسم المؤتمر", "value": "مؤتمر طب الطوارئ الخليجي"}, "date": {"label": "تاريخ المؤتمر", "value": str(today + timedelta(days=45))}}),
            (1, "under_review", {"level": {"label": "المستوى المهني", "value": "مقيم"}}),
            (2, "approved", {"staff": {"label": "عدد المتدربين المتوقع", "value": "40"}}),
        ]):
            data, _ = person(i + 2)
            r = eng.ServiceRequest(service=services[svc], status=st, full_name=data["full_name"], national_id=data["national_id"],
                                   phone=data["phone"], email=data["email"], city=data["city"], details="أرغب في الاستفادة من هذه الخدمة لتطوير مهاراتي المهنية.",
                                   extra_data=extra, consented_at=consent,
                                   public_note="تمت الموافقة، سيتم التواصل معكم لتحديد الموعد." if st == "approved" else "")
            if svc == 0:
                r.attachment_1.save("letter.pdf", demo_pdf("Conference acceptance (demo)"), save=False)
            self.add(r)
        for i, st in enumerate(["new", "accepted", "completed"]):
            data, gender = person(i + 5)
            self.add(eng.VolunteerApplication(
                opportunity=opps[i], status=st, full_name=data["full_name"], national_id=data["national_id"], phone=data["phone"],
                email=data["email"], gender=gender, city=data["city"], education="بكالوريوس", skills="التنظيم، التواصل",
                availability="نهاية الأسبوع", motivation="أرغب في خدمة المجتمع الصحي.", consented_at=consent,
                hours_completed=12 if st == "completed" else 0))
        for i, (org, kind, st) in enumerate([("مستشفى الأمل الأهلي", "partnership", "new"), ("شركة المستلزمات الطبية المتقدمة", "sponsorship", "under_review")]):
            self.add(eng.PartnershipRequest(kind=kind, status=st, organization=org, contact_name="أ. محمد العبدالله", position="مدير العلاقات",
                                            email=f"partner{i}@example.com", phone=f"0789000{i:03d}", program=programs[i],
                                            message="نرغب في التعاون مع الجمعية في تنفيذ برامج تدريبية لكوادرنا.", consented_at=consent))
        for i, (name, subject, st) in enumerate([("نوف السالم", "استفسار عن مواعيد دورة BLS", "new"),
                                                  ("بدر الخالدي", "طلب شهادة حضور سابقة", "in_progress"),
                                                  ("هيفاء العتوم", "اقتراح برنامج تدريبي", "closed")]):
            self.add(eng.ContactMessage(name=name, email=f"contact{i}@example.com", phone=f"0778000{i:03d}", subject=subject,
                                        message="السلام عليكم، أرجو التكرم بالإفادة.", status=st, consented_at=consent))

        # ---- demo staff accounts, one per role
        for role in ["admin", "content_editor", "training_coordinator", "membership_officer", "services_officer",
                     "volunteer_coordinator", "partnerships_officer", "viewer"]:
            username = f"demo_{role}"
            User.objects.filter(username=username).delete()
            user = User(username=username, full_name=f"حساب تجريبي — {role}", is_staff=True)
            user.set_password(DEMO_PASSWORD)
            self.add(user)
            user.groups.add(Group.objects.get(name=role))
        return previous

    def report(self):
        attended = pro.CourseRegistration.objects.filter(certificate_code__isnull=False).select_related("course").first()
        member = pro.Membership.objects.filter(status="active").first()
        w = self.stdout.write
        w(self.style.SUCCESS(f"\nDemo data created ({len(self.created)} records)."))
        w(f"\n  Dashboard:  http://localhost:5173/admin   password for all demo accounts: {DEMO_PASSWORD}")
        w("  Accounts:   demo_admin, demo_content_editor, demo_training_coordinator, demo_membership_officer,")
        w("              demo_services_officer, demo_volunteer_coordinator, demo_partnerships_officer, demo_viewer")
        if attended:
            w(f"\n  Certificate to verify:  {attended.certificate_code}   (/certificates/{attended.certificate_code})")
            w(f"  Track a registration:   {attended.tracking_code}  +  phone {attended.phone}")
        if member:
            w(f"  Track a membership:     {member.tracking_code}  +  phone {member.phone}   (member {member.member_number})")
        w(self.style.WARNING("\n  Remove everything before launch:  python manage.py seed_demo --clear\n"))
