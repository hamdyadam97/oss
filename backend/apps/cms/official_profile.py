"""The association's official content, taken from its institutional profile (البروفايل المؤسسي).

Applied by init_site on every deploy, without ever overwriting staff edits:
- a settings field is set only while it is empty, at its default, still holding a demo value
  (seed_demo's manifest) or holding an older official text listed in SUPERSEDED;
- goals / values / disciplines / partnership points / board are created only while none exist apart
  from demo records, which are then removed so fictional entries never appear next to the real ones;
- the profile photos (branding/profile) fill the about image and discipline images only where none is set,
  or where the about image is still seed_demo's generated one.
"""
import json
from datetime import date
from pathlib import Path

from django.conf import settings as django_settings
from django.core.files import File
from django.db import transaction

from apps.cms.models import AboutItem, BoardMember, SiteSettings

ABOUT_P1 = (
    "جمعية تطوير الممارسة الطبية المهنية هي جمعية تُعنى بتطوير الممارسات المهنية في القطاع الصحي، وتعزيز كفاءة "
    "الكوادر الطبية والتمريضية والمهن الصحية المساندة، من خلال التعليم والتدريب والتطوير المهني المستمر، وبناء "
    "الشراكات مع المؤسسات الصحية والتعليمية والتدريبية."
)
ABOUT_P1_EN = (
    "The Professional Medical Practice Development Association (PMPD-A) is dedicated to advancing professional "
    "practice across the healthcare sector. It strengthens the capabilities of medical, nursing and allied health "
    "professionals through education, training, continuous professional development and partnerships with "
    "healthcare, education and training institutions."
)

SETTINGS = {
    "license_number": "420265586",
    "founded_year": 2026,
    "registered_on": date(2026, 4, 28),
    "about_short": ABOUT_P1,
    "about_short_en": ABOUT_P1_EN,
    "about_full": ABOUT_P1 + "\n\n"
    "تنطلق الجمعية من أهمية الاستثمار في الكفاءات البشرية باعتبارها أحد أهم مرتكزات تحسين جودة الخدمات الصحية "
    "وسلامة المرضى. وتسعى إلى دعم انتقال المعرفة الطبية من الإطار النظري إلى التطبيق العملي، وتعزيز المهارات "
    "السريرية والمهنية، وترسيخ ثقافة الجودة والاعتماد والتحسين المستمر في المؤسسات الصحية.\n\n"
    "وتعمل الجمعية على تطوير مبادرات وبرامج تدريبية وعلمية ومهنية تستجيب للاحتياجات الفعلية للقطاع الصحي، "
    "وتواكب التطورات في الممارسات الطبية والتعليم الصحي، بما يسهم في بناء كوادر مؤهلة وقادرة على تقديم رعاية "
    "صحية آمنة وفعالة ومتمحورة حول المريض.",
    "about_full_en": ABOUT_P1_EN + "\n\n"
    "The Association recognizes investment in people as a foundation for better healthcare quality and patient "
    "safety. It seeks to translate medical knowledge into practical application, strengthen clinical and "
    "professional skills, and foster a culture of quality, accreditation and continuous improvement within "
    "healthcare institutions.\n\n"
    "PMPD-A develops training, scientific and professional initiatives that respond to the sector's real needs and "
    "keep pace with advances in medical practice and health education. Its aim is to build a qualified workforce "
    "able to deliver safe, effective, patient-centred care.",
    "vision": (
        "الريادة في تطوير الممارسة الطبية المهنية والارتقاء بكفاءة الكوادر الصحية، والمساهمة في بناء منظومة صحية "
        "أكثر جودة وأمانًا واستدامة، وفق أفضل الممارسات والمعايير المهنية المعتمدة."
    ),
    "vision_en": (
        "To lead the advancement of professional medical practice, strengthen the capabilities of the healthcare "
        "workforce, and contribute to a higher-quality, safer and more sustainable health system, guided by best "
        "practices and recognized professional standards."
    ),
    "mission": (
        "تمكين الكوادر الصحية والمؤسسات الطبية من تحقيق التميز المهني من خلال برامج التعليم والتدريب والتطوير "
        "المستمر، وتعزيز المهارات العملية والسريرية، ونشر ثقافة الجودة وسلامة المرضى، وتطوير الشراكات الفاعلة التي "
        "تدعم الابتكار والتحسين المستمر في تقديم الخدمات الصحية."
    ),
    "mission_en": (
        "To enable healthcare professionals and medical institutions to achieve professional excellence through "
        "education, training and continuous development; strengthen practical and clinical skills; promote quality "
        "and patient safety; and build effective partnerships that support innovation and continuous improvement in "
        "healthcare delivery."
    ),
    "partnership_intro": (
        "تتيح الشراكة مع الجمعية فرصة لبناء مبادرات مهنية وتعليمية تتوافق مع احتياجات القطاع الصحي، وتدعم تطوير "
        "الكفاءات البشرية وتحسين جودة الممارسات."
    ),
    "partnership_intro_en": (
        "Partnering with the Association creates opportunities to build professional and educational initiatives "
        "aligned with healthcare-sector needs, strengthen human capabilities and improve the quality of practice."
    ),
    "phone": "0794411777",
    "email": "pmpdaccociation@gmail.com",  # spelled exactly as the association's account (confirmed)
    "privacy_contact_email": "pmpdaccociation@gmail.com",
    "address": "عمّان – دوار الداخلية – مبنى الاتحاد العربي للتأمين – الطابق الخامس",
    "address_en": "Arab Insurance Federation Building, Fifth Floor, Interior Circle, Amman, Jordan",
    # Not in the profile: cleared if they still hold demo placeholders, so nothing fictional stays public.
    "whatsapp": "",
    "working_hours": "",
    "working_hours_en": "",
    "map_url": "",
    "map_embed_url": "",
    "x_url": "",
    "instagram_url": "",
    "linkedin_url": "",
    "youtube_url": "",
    "donations_enabled": False,
    "donation_note": "",
    "bank_name": "",
    "bank_account_name": "",
    "iban": "",
}

# Earlier official texts (from the launch post) that the profile replaces.
SUPERSEDED = {
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
}

# (title, title_en, description, description_en, icon)
VALUES = [
    ("الجودة والتميز", "Quality & Excellence",
     "الالتزام بالسعي إلى تحسين الممارسات المهنية وتطوير الخدمات الصحية وفق معايير واضحة وممارسات مبنية على الأدلة.",
     "A commitment to improving professional practice and healthcare services through clear standards and evidence-based approaches.",
     "badge-check"),
    ("سلامة المرضى", "Patient Safety",
     "دعم الممارسات التي تقلل المخاطر والأخطاء وتعزز سلامة المرضى وجودة الرعاية الصحية.",
     "Supporting practices that reduce risks and errors, improve patient safety and raise the quality of care.",
     "shield-check"),
    ("التعلم المستمر", "Lifelong Learning",
     "ترسيخ مفهوم التطوير المهني المستمر ومواكبة المستجدات العلمية والتقنية.",
     "Embedding continuous professional development and keeping pace with scientific and technological advances.",
     "book-open"),
    ("الشراكة والتكامل", "Partnership & Integration",
     "بناء علاقات تعاون فعالة بين المؤسسات الصحية والتعليمية والتدريبية والجهات الداعمة.",
     "Building effective collaboration among healthcare, education and training institutions and supporting organizations.",
     "handshake"),
    ("النزاهة والمسؤولية المهنية", "Integrity & Professional Responsibility",
     "تعزيز الشفافية والمساءلة واحترام أخلاقيات المهن الصحية والمسؤوليات المهنية.",
     "Promoting transparency, accountability, professional ethics and the responsibilities of healthcare practice.",
     "scale"),
    ("الابتكار والاستدامة", "Innovation & Sustainability",
     "تشجيع الحلول المبتكرة والمبادرات المستدامة التي تستجيب للتحديات الصحية والمهنية.",
     "Encouraging innovative solutions and sustainable initiatives that respond to healthcare and professional challenges.",
     "lightbulb"),
]

GOALS = [
    ("تطوير الكفاءات الصحية", "Develop Healthcare Capabilities",
     "رفع كفاءة الأطباء وأطباء الأسنان والممرضين والصيادلة والفنيين وسائر المهن الصحية.",
     "Build the capabilities of physicians, dentists, nurses, pharmacists, technicians and other health professionals."),
    ("تعزيز التعليم الطبي المستمر", "Advance Continuing Medical Education",
     "دعم فرص التعلم والتدريب المستمر بما يواكب التطورات العلمية والاحتياجات المهنية.",
     "Support ongoing learning and training that keep pace with scientific advances and professional needs."),
    ("تنمية المهارات السريرية والعملية", "Strengthen Clinical & Practical Skills",
     "تنظيم برامج تطبيقية وورش عمل ومحاكاة سريرية تسهم في تعزيز الجاهزية المهنية.",
     "Organize practical programmes, workshops and clinical simulation that strengthen professional readiness."),
    ("دعم جودة الرعاية الصحية", "Support Healthcare Quality",
     "نشر مفاهيم الجودة وسلامة المرضى وإدارة المخاطر والتحسين المستمر.",
     "Promote quality, patient safety, risk management and continuous improvement."),
    ("المساهمة في تطوير المؤسسات الصحية", "Help Healthcare Institutions Improve",
     "دعم المبادرات التي تهدف إلى تحسين الأداء المؤسسي ورفع كفاءة الخدمات.",
     "Support initiatives that improve institutional performance and service efficiency."),
    ("تعزيز البحث العلمي", "Promote Scientific Research",
     "تشجيع البحث والتعاون العلمي ونشر المعرفة الطبية القائمة على الأدلة.",
     "Encourage research, scientific collaboration and the sharing of evidence-based medical knowledge."),
    ("تمكين الشباب والخريجين", "Empower Young Professionals & Graduates",
     "المساهمة في تطوير المهارات المهنية والعملية التي تساعد على الانتقال إلى سوق العمل الصحي.",
     "Help develop the professional and practical skills that support entry into the healthcare workforce."),
    ("بناء الشراكات الاستراتيجية", "Build Strategic Partnerships",
     "التعاون مع الجامعات والمستشفيات والمراكز التدريبية والهيئات المهنية والقطاع الخاص.",
     "Collaborate with universities, hospitals, training centres, professional bodies and the private sector."),
    ("تعزيز الاستجابة للاحتياجات الصحية المجتمعية", "Respond to Community Health Needs",
     "المساهمة في التوعية الصحية والمبادرات المجتمعية وبرامج الإسعافات الأولية.",
     "Contribute to health awareness, community initiatives and first-aid programmes."),
    ("دعم التحول الرقمي الصحي", "Support Digital Health Transformation",
     "تشجيع استخدام الحلول الرقمية في التعليم والتدريب وتطوير الممارسات المهنية.",
     "Encourage digital solutions in education, training and the development of professional practice."),
]

# (title, title_en, description, description_en, icon, photo in branding/profile)
DISCIPLINES = [
    ("الطب البشري", "Medicine",
     "تطوير المعرفة والمهارات السريرية، وتعزيز الممارسة المبنية على الأدلة والرعاية المتمحورة حول المريض.",
     "Advancing knowledge and clinical skills, evidence-based practice and patient-centred care.", "stethoscope", "medicine"),
    ("طب الأسنان", "Dentistry",
     "دعم التطوير المهني والمهارات التطبيقية وجودة الممارسة في مجالات طب الأسنان.",
     "Supporting professional development, practical skills and quality across dental practice.", "smile", "dentistry"),
    ("التمريض", "Nursing",
     "تعزيز الكفاءة التمريضية وسلامة المرضى والعمل التكاملي ضمن الفريق الصحي.",
     "Strengthening nursing capabilities, patient safety and collaboration within the healthcare team.", "heart-pulse", "nursing"),
    ("الصيدلة", "Pharmacy",
     "تنمية الكفاءات المهنية ودعم المعرفة الدوائية والتواصل الفعال ضمن منظومة الرعاية.",
     "Developing professional capabilities, medication knowledge and effective communication across care.", "pill", "pharmacy"),
    ("المختبرات الطبية", "Medical Laboratories",
     "تعزيز المهارات الفنية ومفاهيم الجودة والممارسة المهنية الدقيقة في العمل المخبري.",
     "Strengthening technical skills, quality principles and precise professional laboratory practice.", "microscope", "laboratory"),
    ("الأشعة والتصوير الطبي", "Radiology & Medical Imaging",
     "دعم الكفاءة الفنية وسلامة المرضى والتطوير المستمر في الممارسات التشخيصية.",
     "Supporting technical competence, patient safety and continuous development in diagnostic practice.", "scan", "radiology"),
    ("العلاج الطبيعي والتأهيل", "Physiotherapy & Rehabilitation",
     "تنمية المهارات العملية ودعم الرعاية التأهيلية والتعاون بين التخصصات الصحية.",
     "Developing practical skills, rehabilitation care and collaboration across healthcare disciplines.", "accessibility", "physiotherapy"),
    ("الطوارئ والإسعافات الأولية", "Emergency Care & First Aid",
     "تعزيز الجاهزية العملية والتدريب بالمحاكاة ومهارات الاستجابة الأولية الآمنة.",
     "Building practical readiness, simulation-based learning and safe initial-response skills.", "ambulance", "emergency"),
]

# "Why partner with us?" (title, title_en, description, description_en, icon)
PARTNERSHIP = [
    ("برامج مبنية على الاحتياجات", "Needs-Based Programmes",
     "تصميم الأنشطة وفق الفجوات التدريبية والأهداف المحددة لكل فئة أو مؤسسة.",
     "Designing activities around training gaps and the specific objectives of each professional group or institution.",
     "target"),
    ("تعاون متعدد التخصصات", "Multidisciplinary Collaboration",
     "إتاحة فرص للعمل المشترك بين الكوادر الطبية والتمريضية والإدارية والتعليمية.",
     "Creating opportunities for collaboration among medical, nursing, administrative and education professionals.",
     "users"),
    ("مخرجات قابلة للقياس", "Measurable Outcomes",
     "تحديد نتائج واضحة للمشاريع وتوثيق الأداء وقياس الأثر بحسب طبيعة النشاط.",
     "Defining clear project outcomes, documenting performance and measuring impact in ways suited to each activity.",
     "clipboard"),
    ("مرونة في نماذج التعاون", "Flexible Partnership Models",
     "تطوير اتفاقيات ومبادرات مشتركة تتناسب مع أهداف الشركاء وإمكاناتهم واحتياجاتهم.",
     "Developing agreements and joint initiatives that fit partners' goals, resources and needs.",
     "handshake"),
    ("أثر مهني ومجتمعي", "Professional & Community Impact",
     "دعم المبادرات التي تجمع بين تطوير الكفاءات وتحسين الممارسة الصحية وخدمة المجتمع.",
     "Supporting initiatives that combine capability development, better healthcare practice and service to the community.",
     "hand-heart"),
]

PHOTOS = Path(django_settings.BASE_DIR).parent / "branding" / "profile"

# (name, name_en, position, position_en) — the administrative board as listed in the profile
BOARD = [
    ("د. روز وسام أبو خضر", "Dr. Rose Wissam Abu Khader", "الرئيس", "President"),
    ("م. وسام أبو خضر", "Eng. Wissam Abu Khader", "نائب الرئيس", "Vice President"),
    ("د. ناريمان أبو الرز", "Dr. Nariman Abu Al-Ruz", "أمين الصندوق", "Treasurer"),
    ("م. بسام أبو النصر", "Eng. Bassam Abu Al-Nasr", "أمين السر", "Secretary"),
    ("د. عبد الرحمن المعاني", "Dr. Abdul Rahman Al-Maani", "رئيس اللجنة العلمية", "Head of the Scientific Committee"),
]


def _demo_manifest():
    """seed_demo's record of what it created (empty when no demo data is installed)."""
    from apps.cms.management.commands.seed_demo import MANIFEST

    if not MANIFEST.exists():
        return {}
    return json.loads(MANIFEST.read_text("utf-8"))


def _save_manifest(manifest):
    from apps.cms.management.commands.seed_demo import MANIFEST

    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), "utf-8")


def _photo(field, name):
    """Store branding/profile/<name>.webp in an image field (no-op if the file is missing)."""
    path = PHOTOS / f"{name}.webp"
    if not path.exists():
        return False
    with path.open("rb") as fh:
        field.save(path.name, File(fh), save=False)
    return True


def _demo_pks(manifest, label):
    return {pk for lbl, pk in manifest.get("objects", []) if lbl == label}


def _replace_demo(model, manifest, rows, **filters):
    """Create the official rows unless real ones exist; demo rows of the same kind are removed first."""
    demo = _demo_pks(manifest, model._meta.label)
    qs = model.objects.filter(**filters)
    if qs.exclude(pk__in=demo).exists():
        return 0  # the association already has its own entries: leave them alone
    for obj in qs.filter(pk__in=demo):
        for field in obj._meta.fields:
            if field.get_internal_type() == "ImageField" and getattr(obj, field.name):
                getattr(obj, field.name).delete(save=False)
        obj.delete()
    for order, fields in enumerate(rows):
        model.objects.create(order=order, **filters, **fields)
    return len(rows)


@transaction.atomic
def apply_profile():
    manifest = _demo_manifest()
    demo_settings = manifest.get("previous", {}).get("demo_settings", {})

    site = SiteSettings.load()
    changed = []
    for name, value in SETTINGS.items():
        current = getattr(site, name)
        replaceable = (
            current in ("", None)
            or current == SiteSettings._meta.get_field(name).default
            or (name in demo_settings and current == demo_settings[name])
            or current == SUPERSEDED.get(name)
        )
        if replaceable and current != value:
            setattr(site, name, value)
            changed.append(name)
    # The demo's generated picture gives way to the profile photo; tell seed_demo --clear it is no longer its own.
    demo_image = manifest.get("previous", {}).get("about_image_added")
    if (not site.about_image or demo_image) and PHOTOS.joinpath("about.webp").exists():
        if site.about_image:
            site.about_image.delete(save=False)
        _photo(site.about_image, "about")
        changed.append("about_image")
        if demo_image:
            manifest["previous"]["about_image_added"] = False
            _save_manifest(manifest)
    if changed:
        site.save()

    created = {
        "goals": _replace_demo(AboutItem, manifest, [
            dict(title=t, title_en=te, description=d, description_en=de) for t, te, d, de in GOALS
        ], kind="goal"),
        "values": _replace_demo(AboutItem, manifest, [
            dict(title=t, title_en=te, description=d, description_en=de, icon=i) for t, te, d, de, i in VALUES
        ], kind="value"),
        "disciplines": _replace_demo(AboutItem, manifest, [
            dict(title=t, title_en=te, description=d, description_en=de, icon=i) for t, te, d, de, i, _ in DISCIPLINES
        ], kind="discipline"),
        "partnership": _replace_demo(AboutItem, manifest, [
            dict(title=t, title_en=te, description=d, description_en=de, icon=i) for t, te, d, de, i in PARTNERSHIP
        ], kind="partnership"),
        "board": _replace_demo(BoardMember, manifest, [
            dict(name=n, name_en=ne, position=p, position_en=pe) for n, ne, p, pe in BOARD
        ], kind="board"),
    }
    # Photos for the official disciplines that have none (including ones created before photos existed).
    for title, *_, photo in DISCIPLINES:
        for item in AboutItem.objects.filter(kind="discipline", title=title, image=""):
            if _photo(item.image, photo):
                item.save(update_fields=["image"])
                created["discipline photos"] = created.get("discipline photos", 0) + 1
    # Fictional executives are not part of the profile: drop the demo ones once the real board is in.
    if created["board"]:
        demo_exec = BoardMember.objects.filter(kind="executive", pk__in=_demo_pks(manifest, BoardMember._meta.label))
        for obj in demo_exec:
            if obj.photo:
                obj.photo.delete(save=False)
            obj.delete()
    return changed, created
