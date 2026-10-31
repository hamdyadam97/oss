from django.contrib import admin

from .models import Course, MembershipType

admin.site.register(Course)
admin.site.register(MembershipType)
