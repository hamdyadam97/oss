from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand

from apps.accounts.roles import ROLES


class Command(BaseCommand):
    help = "Creates/updates the default role groups and their permissions."

    def handle(self, *args, **options):
        for role, grants in ROLES.items():
            group, _ = Group.objects.get_or_create(name=role)
            perms = []
            for label, actions in grants.items():
                app_label, model = label.split(".")
                for action in actions:
                    try:
                        perms.append(
                            Permission.objects.get(content_type__app_label=app_label, codename=f"{action}_{model}")
                        )
                    except Permission.DoesNotExist:
                        self.stderr.write(f"Missing permission {app_label}.{action}_{model}")
            group.permissions.set(perms)
            self.stdout.write(self.style.SUCCESS(f"{role}: {len(perms)} permissions"))
