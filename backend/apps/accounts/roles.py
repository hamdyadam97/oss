"""Default roles (Django groups) and the model permissions each one receives.

Each entry maps "app_label.model" to the actions granted. `*` means all four
actions (view/add/change/delete). Run `manage.py setup_roles` after changes.
"""

ALL = ("view", "add", "change", "delete")
READ = ("view",)
REVIEW = ("view", "change")

CMS_MODELS = [
    "cms.sitesettings",
    "cms.page",
    "cms.banner",
    "cms.aboutitem",
    "cms.boardmember",
    "cms.faq",
    "cms.statistic",
    "cms.partner",
    "cms.program",
    "cms.programimage",
    "cms.post",
    "cms.album",
    "cms.mediaitem",
    "cms.document",
]

ENGAGEMENT_MODELS = [
    "engagement.service",
    "engagement.servicerequest",
    "engagement.volunteeropportunity",
    "engagement.volunteerapplication",
    "engagement.partnershiprequest",
    "engagement.contactmessage",
]

PROFESSIONAL_MODELS = [
    "professional.course",
    "professional.courseregistration",
    "professional.membershiptype",
    "professional.membership",
]

ROLES: dict[str, dict[str, tuple[str, ...]]] = {
    "admin": {
        **{m: ALL for m in CMS_MODELS + ENGAGEMENT_MODELS + PROFESSIONAL_MODELS},
        "accounts.user": ALL,
        "auth.group": READ,
        "common.auditlog": READ,
    },
    "content_editor": {m: ALL for m in CMS_MODELS},
    "services_officer": {
        "engagement.service": ALL,
        "engagement.servicerequest": REVIEW,
    },
    "volunteer_coordinator": {
        "engagement.volunteeropportunity": ALL,
        "engagement.volunteerapplication": REVIEW,
    },
    "partnerships_officer": {
        "cms.partner": ALL,
        "engagement.partnershiprequest": REVIEW,
        "engagement.contactmessage": REVIEW,
    },
    "training_coordinator": {
        "professional.course": ALL,
        "professional.courseregistration": REVIEW,
    },
    "membership_officer": {
        "professional.membershiptype": ALL,
        "professional.membership": REVIEW,
    },
    # Read-only access to published content; no personal data.
    "viewer": {m: READ for m in CMS_MODELS + ["professional.course", "professional.membershiptype"]},
}

ROLE_LABELS = {
    "admin": "مدير النظام",
    "content_editor": "محرر المحتوى",
    "services_officer": "مسؤول الخدمات",
    "volunteer_coordinator": "منسق التطوع",
    "partnerships_officer": "مسؤول الشراكات والتواصل",
    "training_coordinator": "منسق التدريب والفعاليات",
    "membership_officer": "مسؤول العضويات",
    "viewer": "مراجع (قراءة فقط)",
}
