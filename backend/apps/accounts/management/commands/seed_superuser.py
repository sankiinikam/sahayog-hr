"""
Management command to seed a superuser for development.
Usage: python manage.py seed_superuser
Only runs if no admin users exist.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = "Create an initial superuser (development only). No-op if admin already exists."

    def handle(self, *args, **options):
        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write(self.style.WARNING("Superuser already exists. Skipping."))
            return

        user = User.objects.create_superuser(
            email="admin@hrms.local",
            password="Admin@1234",
            first_name="System",
            last_name="Administrator",
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"\n[OK] Superuser created:\n"
                f"   Email   : {user.email}\n"
                f"   Password: Admin@1234\n"
                f"   Role    : {user.role}\n\n"
                f"[WARNING] CHANGE THIS PASSWORD IMMEDIATELY in any non-development environment.\n"
            )
        )

