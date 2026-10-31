from rest_framework.throttling import AnonRateThrottle


class SubmissionThrottle(AnonRateThrottle):
    """Limits public form submissions per IP (applies to authenticated users too)."""

    scope = "submissions"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class TrackingThrottle(SubmissionThrottle):
    scope = "tracking"


class LoginThrottle(SubmissionThrottle):
    scope = "login"
