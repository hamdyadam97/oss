from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.common.serializers import AdminSerializer

from .models import User
from .roles import ROLE_LABELS


class MeSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "full_name", "email", "job_title", "is_superuser", "roles", "permissions"]

    def get_roles(self, obj):
        return list(obj.groups.values_list("name", flat=True))

    def get_permissions(self, obj):
        return sorted(obj.get_all_permissions())


class UserSerializer(AdminSerializer):
    roles = serializers.SlugRelatedField(
        source="groups", many=True, slug_field="name", queryset=Group.objects.filter(name__in=ROLE_LABELS)
    )
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = [
            "id", "username", "full_name", "email", "job_title", "is_active",
            "roles", "password", "last_login", "date_joined",
        ]
        read_only_fields = ["last_login", "date_joined"]

    def validate_password(self, value):
        if value:
            validate_password(value)
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "كلمة المرور مطلوبة للمستخدم الجديد"})
        return attrs

    def create(self, validated_data):
        groups = validated_data.pop("groups", [])
        password = validated_data.pop("password")
        user = User(**validated_data, is_staff=True)
        user.set_password(password)
        user.save()
        user.groups.set(groups)
        return user

    def update(self, instance, validated_data):
        groups = validated_data.pop("groups", None)
        password = validated_data.pop("password", "")
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        instance.save()
        if groups is not None:
            instance.groups.set(groups)
        return instance


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(style={"input_type": "password"})
