"""
Signal handlers for the accounts app.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

User = get_user_model()


@receiver(post_save, sender=User)
def on_user_created(sender, instance, created, **kwargs):
    """
    Hook for any post-creation logic.
    Currently a placeholder — extend as features are added
    (e.g., send welcome email, create default notification settings).
    """
    if created:
        pass  # Future: send welcome email, create notification prefs

