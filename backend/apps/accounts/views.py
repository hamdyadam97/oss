from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.audit import log_action
from apps.common.models import AuditLog
from apps.common.permissions import IsStaff
from apps.common.throttles import LoginThrottle
from apps.common.views import AdminModelViewSet

from .models import User
from .roles import ROLE_LABELS
from .serializers import LoginSerializer, MeSerializer, UserSerializer


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"ok": True})


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(request, **serializer.validated_data)
        if user is None or not user.is_staff:
            log_action(AuditLog.Action.LOGIN_FAILED, object_repr=serializer.validated_data["username"])
            return Response({"detail": "بيانات الدخول غير صحيحة"}, status=status.HTTP_400_BAD_REQUEST)
        login(request, user)
        log_action(AuditLog.Action.LOGIN, user, user=user)
        return Response(MeSerializer(user).data)


class LogoutView(APIView):
    def post(self, request):
        log_action(AuditLog.Action.LOGOUT, request.user)
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        return Response(MeSerializer(request.user).data)


class RolesView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        return Response([{"value": k, "label": v} for k, v in ROLE_LABELS.items()])


class UserViewSet(AdminModelViewSet):
    queryset = User.objects.filter(is_staff=True).prefetch_related("groups").order_by("username")
    serializer_class = UserSerializer
    search_fields = ["username", "full_name", "email"]
    filterset_fields = ["is_active"]

    def perform_update(self, serializer):
        if serializer.instance == self.request.user and serializer.validated_data.get("is_active") is False:
            raise ValidationError({"is_active": "لا يمكنك تعطيل حسابك"})
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        if instance == self.request.user:
            raise ValidationError({"detail": "لا يمكنك حذف حسابك"})
        super().perform_destroy(instance)
