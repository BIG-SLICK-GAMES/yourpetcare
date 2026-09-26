from datetime import timedelta
from decimal import Decimal
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from care.models import Pet, Supply, Task, Timeline, HealthRecord, Preferences


class Command(BaseCommand):
    help = 'Add clearly labelled sample pets to an existing LOCAL account. Never adds providers.'
    def add_arguments(self, parser):
        parser.add_argument('username')

    def handle(self, *args, **options):
        try:
            user = User.objects.get(username=options['username'])
        except User.DoesNotExist:
            raise CommandError('Create an account first.')
        if Pet.objects.filter(owner=user).exists():
            raise CommandError('Use an empty account so demo data never mixes with real records.')
        Preferences.objects.get_or_create(user=user)
        now = timezone.now()
        stormy = Pet.objects.create(owner=user, name='Stormy', species='Dog', breed='Border Collie', sex='Female', estimated_age='3 years (sample)', notes='SAMPLE PET — replace with your own details. Loves a long walk and a good ear scratch.')
        mochi = Pet.objects.create(owner=user, name='Mochi', species='Cat', breed='Domestic Shorthair', sex='Male', estimated_age='2 years (sample)', notes='SAMPLE PET — enjoys sunny windows and quiet afternoons.')
        supply = Supply.objects.create(pet=stormy, product='Worming tablets', quantity=1, pack_size=4, unit='tablets', delivery_days=5, supplier_url='https://www.petbarn.com.au/', reorder_at=1)
        Task.objects.create(pet=stormy, title='Worming treatment', kind='worming', due_at=now+timedelta(days=7), repeat_days=90, reminder_days=7, supply=supply, units_used=1, notes='SAMPLE schedule and usage only. Enter the schedule and dose your vet has advised.')
        Task.objects.create(pet=stormy, title='Assessment appointment', kind='appointment', due_at=now+timedelta(days=3), notes='SAMPLE appointment, not a booking. Choose your provider and confirmed date.')
        Task.objects.create(pet=mochi, title='A little brush & nail check', kind='grooming', due_at=now+timedelta(days=1), repeat_days=14)
        for i, weight in enumerate(['18.2', '18.4', '18.5']):
            HealthRecord.objects.create(pet=stormy, title='Sample weight entry', kind='weight', weight_kg=Decimal(weight), recorded_at=now-timedelta(days=(2-i)*30), notes='Sample owner-entered weight, not a health assessment.')
        for pet in [stormy, mochi]:
            Timeline.objects.create(pet=pet, title='Sample profile added', notes='Local demo data. No real appointment or purchase has been made.')
        self.stdout.write(self.style.SUCCESS('Added sample Stormy and Mochi, routines and stock. No providers fabricated.'))
