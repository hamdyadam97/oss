from django.utils.text import slugify
from rest_framework import serializers

from apps.common.serializers import AdminSerializer

from . import models

INTERNAL_FIELDS = ("is_published", "created_at", "updated_at")


def unique_slug(model, text: str, instance=None) -> str:
    base = slugify(text, allow_unicode=True)[:200] or model._meta.model_name
    slug, n = base, 2
    qs = model.objects.all()
    if instance is not None and instance.pk:
        qs = qs.exclude(pk=instance.pk)
    while qs.filter(slug=slug).exists():
        slug = f"{base}-{n}"
        n += 1
    return slug


class SlugMixin(AdminSerializer):
    """Optional slug: generated from the title when left empty, always unique."""

    slug = serializers.SlugField(allow_unicode=True, required=False, allow_blank=True, max_length=255)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if self.instance is None or "slug" in attrs:
            source = attrs.get("slug") or attrs.get("title") or getattr(self.instance, "title", "")
            attrs["slug"] = unique_slug(self.Meta.model, source, self.instance)
        return attrs


def admin_serializer(model_cls, base=AdminSerializer, **extra):
    meta = type("Meta", (), {"model": model_cls, "fields": "__all__"})
    return type(f"Admin{model_cls.__name__}Serializer", (base,), {"Meta": meta, **extra})


# ---------------------------------------------------------------- admin
AdminSiteSettingsSerializer = admin_serializer(models.SiteSettings)
AdminPageSerializer = admin_serializer(models.Page, SlugMixin)
class AdminBannerSerializer(AdminSerializer):
    class Meta:
        model = models.Banner
        fields = "__all__"

    def validate(self, attrs):
        attrs = super().validate(attrs)
        layout = attrs.get("layout", getattr(self.instance, "layout", models.Banner.Layout.IMAGE))
        image = attrs.get("image", getattr(self.instance, "image", None))
        if layout != models.Banner.Layout.BRAND and not image:
            raise serializers.ValidationError({"image": "الصورة مطلوبة لهذا التصميم"})
        return attrs

AdminAboutItemSerializer = admin_serializer(models.AboutItem)
AdminBoardMemberSerializer = admin_serializer(models.BoardMember)
AdminFAQSerializer = admin_serializer(models.FAQ)
AdminStatisticSerializer = admin_serializer(models.Statistic)
AdminPartnerSerializer = admin_serializer(models.Partner)
AdminProgramSerializer = admin_serializer(models.Program, SlugMixin)
AdminProgramImageSerializer = admin_serializer(models.ProgramImage)
AdminPostSerializer = admin_serializer(models.Post, SlugMixin)
AdminAlbumSerializer = admin_serializer(models.Album, SlugMixin)
AdminDocumentSerializer = admin_serializer(models.Document)


class AdminMediaItemSerializer(AdminSerializer):
    class Meta:
        model = models.MediaItem
        fields = "__all__"

    def validate(self, attrs):
        kind = attrs.get("kind", getattr(self.instance, "kind", models.MediaItem.Kind.IMAGE))
        image = attrs.get("image", getattr(self.instance, "image", None))
        video = attrs.get("video_url", getattr(self.instance, "video_url", ""))
        if kind == models.MediaItem.Kind.IMAGE and not image:
            raise serializers.ValidationError({"image": "الصورة مطلوبة"})
        if kind == models.MediaItem.Kind.VIDEO and not video:
            raise serializers.ValidationError({"video_url": "رابط الفيديو مطلوب"})
        return attrs


# ---------------------------------------------------------------- public
class PublicSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.SiteSettings
        exclude = ("id", "created_at", "updated_at", "privacy_contact_email")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not instance.donations_enabled:
            for key in ("donation_url", "donation_note", "donation_note_en", "bank_name", "bank_account_name", "iban"):
                data.pop(key, None)
        return data


def public_serializer(model_cls, exclude=INTERNAL_FIELDS, **extra):
    meta = type("Meta", (), {"model": model_cls, "exclude": exclude})
    return type(f"Public{model_cls.__name__}Serializer", (serializers.ModelSerializer,), {"Meta": meta, **extra})


PublicPageSerializer = public_serializer(models.Page)
PublicBannerSerializer = public_serializer(models.Banner)
PublicAboutItemSerializer = public_serializer(models.AboutItem)
PublicBoardMemberSerializer = public_serializer(models.BoardMember)
PublicFAQSerializer = public_serializer(models.FAQ)
PublicStatisticSerializer = public_serializer(models.Statistic)
PublicPartnerSerializer = public_serializer(models.Partner)
PublicDocumentSerializer = public_serializer(models.Document)
PublicProgramImageSerializer = public_serializer(models.ProgramImage, exclude=("created_at", "updated_at", "program"))
PublicMediaItemSerializer = public_serializer(models.MediaItem, exclude=("created_at", "updated_at", "album"))


class PublicProgramListSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Program
        fields = [
            "id", "kind", "title", "title_en", "slug", "summary", "summary_en", "cover", "icon",
            "status", "start_date", "end_date", "beneficiaries_count", "is_featured",
        ]


class PublicProgramDetailSerializer(serializers.ModelSerializer):
    images = PublicProgramImageSerializer(many=True, read_only=True)
    partners = PublicPartnerSerializer(many=True, read_only=True)

    class Meta:
        model = models.Program
        exclude = INTERNAL_FIELDS + ("order",)


class PublicPostListSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Post
        fields = [
            "id", "kind", "title", "title_en", "slug", "excerpt", "excerpt_en", "cover",
            "event_date", "event_location", "published_at", "is_featured",
        ]


class PublicPostDetailSerializer(serializers.ModelSerializer):
    program = PublicProgramListSerializer(read_only=True)

    class Meta:
        model = models.Post
        exclude = INTERNAL_FIELDS


class PublicAlbumSerializer(serializers.ModelSerializer):
    items_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = models.Album
        exclude = INTERNAL_FIELDS + ("program",)


class PublicAlbumDetailSerializer(PublicAlbumSerializer):
    items = PublicMediaItemSerializer(many=True, read_only=True)
