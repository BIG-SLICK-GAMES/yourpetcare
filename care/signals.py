from django.db import transaction
from django.db.models.signals import pre_save, post_delete
from django.dispatch import receiver
from .models import Pet, HealthRecord


def remove_file(field):
    if field:
        storage, name = field.storage, field.name
        transaction.on_commit(lambda: storage.delete(name))


@receiver(pre_save, sender=Pet)
@receiver(pre_save, sender=HealthRecord)
def cleanup_replaced_file(sender, instance, **kwargs):
    if not instance.pk:
        return
    previous = sender.objects.filter(pk=instance.pk).first()
    attr = 'photo' if sender is Pet else 'document'
    if previous and getattr(previous, attr) != getattr(instance, attr):
        remove_file(getattr(previous, attr))


@receiver(post_delete, sender=Pet)
@receiver(post_delete, sender=HealthRecord)
def cleanup_deleted_file(sender, instance, **kwargs):
    remove_file(getattr(instance, 'photo' if sender is Pet else 'document'))
