import uuid
from datetime import timedelta
from zoneinfo import ZoneInfo
from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


def private_path(instance, filename):
    return f'{instance.pet.owner_id if hasattr(instance, "pet") else instance.owner_id}/{uuid.uuid4().hex}.{filename.rsplit(".", 1)[-1].lower()}'


class Preferences(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    timezone = models.CharField(max_length=80, default='Australia/Brisbane')
    email_reminders = models.BooleanField(default=False)
    reminder_hour = models.PositiveSmallIntegerField(default=8, validators=[MaxValueValidator(23)])
    care_reminders = models.BooleanField(default=True)
    supply_reminders = models.BooleanField(default=True)
    adventure_reminders = models.BooleanField(default=True)


class Provider(models.Model):
    CATEGORIES = [('vet', 'Veterinary care'), ('groomer', 'Grooming'), ('boarding', 'Boarding & day care'), ('sitter', 'Sitters & walkers'), ('trainer', 'Training'), ('shop', 'Pet supplies'), ('cafe', 'Dog-welcoming dining'), ('hotel', 'Pet-friendly stays'), ('park', 'Dog parks'), ('other', 'Other care')]
    CATEGORIES += [('shelter', 'Pounds & rescue'), ('charity', 'Charities & support'), ('funeral', 'Pet funerals & farewell care')]
    name = models.CharField(max_length=200)
    species_supported = models.JSONField(default=list, blank=True, help_text='Animal types explicitly recorded by the source, e.g. ["Horse", "Bird"]. Empty means unknown; never infer from the business name.')
    category = models.CharField(max_length=20, choices=CATEGORIES)
    address = models.CharField(max_length=400, blank=True)
    lat = models.FloatField(validators=[MinValueValidator(-90), MaxValueValidator(90)])
    lon = models.FloatField(validators=[MinValueValidator(-180), MaxValueValidator(180)])
    phone = models.CharField(max_length=80, blank=True)
    website = models.URLField(blank=True)
    hours = models.CharField(max_length=300, blank=True)
    pet_policy = models.CharField(max_length=300, blank=True)
    services = models.TextField(blank=True)
    source = models.URLField(blank=True)
    osm_id = models.CharField(max_length=80, unique=True, null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verification_evidence = models.TextField(blank=True, help_text='Record what was checked, the independent source and date. Required for verification.')
    emergency_verified_at = models.DateTimeField(null=True, blank=True)
    featured = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @property
    def emergency_current(self):
        return self.emergency_verified_at and self.emergency_verified_at > timezone.now() - timedelta(days=7)


class SavedProvider(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    provider = models.ForeignKey(Provider, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['owner', 'provider'], name='one_saved_provider_per_owner')]


class Pet(models.Model):
    SPECIES = [('Dog', 'Dog'), ('Cat', 'Cat'), ('Horse', 'Horse / pony'), ('Bird', 'Bird'), ('Reptile', 'Reptile'), ('Rabbit', 'Rabbit'), ('Guinea pig', 'Guinea pig'), ('Small mammal', 'Other small mammal'), ('Fish', 'Fish'), ('Amphibian', 'Amphibian'), ('Invertebrate', 'Invertebrate'), ('Farm animal', 'Farm companion'), ('Other', 'Another companion')]
    TRAINING_LEVELS = [('', 'Not sure yet'), ('starting', 'Just starting'), ('basics', 'Learning the basics'), ('comfortable', 'Comfortable with everyday skills'), ('advanced', 'Advanced / sport experience')]
    ENERGY_LEVELS = [('', 'Still getting to know them'), ('gentle', 'Gentle, slower days'), ('balanced', 'A mix of play and rest'), ('busy', 'Always up for something')]
    COMFORT_LEVELS = [('', 'Not tried yet'), ('quiet', 'Prefers quiet spaces'), ('building', 'Building confidence'), ('social', 'Comfortable in busy places')]
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=80)
    photo = models.ImageField(upload_to=private_path, blank=True)
    avatar_key = models.CharField(max_length=30, blank=True)
    photo_status = models.CharField(max_length=12, choices=[('pending', 'Waiting for approval'), ('approved', 'Approved'), ('rejected', 'Please choose another photo')], default='pending')
    photo_review_note = models.CharField(max_length=300, blank=True)
    photo_reviewed_at = models.DateTimeField(null=True, blank=True)
    species = models.CharField(max_length=40, choices=SPECIES, default='Dog')
    species_detail = models.CharField(max_length=100, blank=True, verbose_name='Type of animal', help_text='For example: cockatiel, bearded dragon, axolotl, goat or stick insect.')
    breed = models.CharField(max_length=100, blank=True)
    sex = models.CharField(max_length=30, choices=[('', 'Not recorded'), ('Female', 'Female'), ('Male', 'Male'), ('Unknown', 'Unknown')], blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    estimated_age = models.CharField(max_length=80, blank=True)
    identification = models.CharField(max_length=200, blank=True)
    preferred_vet = models.ForeignKey(Provider, on_delete=models.SET_NULL, null=True, blank=True)
    emergency_contact = models.CharField(max_length=200, blank=True)
    allergies = models.TextField(blank=True)
    conditions = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    training_level = models.CharField(max_length=20, choices=TRAINING_LEVELS, blank=True)
    energy_level = models.CharField(max_length=20, choices=ENERGY_LEVELS, blank=True)
    social_comfort = models.CharField(max_length=20, choices=COMFORT_LEVELS, blank=True)
    travel_comfort = models.CharField(max_length=20, choices=[('', 'Not tried yet'), ('new', 'New to travelling'), ('learning', 'Getting comfortable'), ('confident', 'An experienced traveller')], blank=True)
    personality = models.CharField(max_length=300, blank=True)
    interests = models.JSONField(default=list, blank=True)
    goals = models.TextField(blank=True)
    support_notes = models.TextField(blank=True)
    profile_completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @property
    def age_display(self):
        if not self.date_of_birth:
            return self.estimated_age or 'Age not recorded'
        today = timezone.localdate()
        if self.date_of_birth > today:
            return 'Check date of birth'
        months = (today.year - self.date_of_birth.year) * 12 + today.month - self.date_of_birth.month - (today.day < self.date_of_birth.day)
        if months < 1:
            return 'Under a month old'
        if months < 12:
            return f'{months} month' + ('s' if months != 1 else '') + ' old'
        return f'{months // 12} year' + ('s' if months // 12 != 1 else '') + ' old'


class CompanionProposal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE)
    action = models.CharField(max_length=20)
    data = models.JSONField(default=dict)
    before = models.JSONField(default=dict)
    status = models.CharField(max_length=12, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    result_url = models.CharField(max_length=200, blank=True)


class LifePlan(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    pets = models.ManyToManyField(Pet, related_name='life_plans')
    title = models.CharField(max_length=150)
    template_key = models.CharField(max_length=30)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=400, blank=True)
    website = models.URLField(blank=True)
    provider = models.ForeignKey(Provider, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)
    confirmation = models.CharField(max_length=20, choices=[('idea', 'Idea / not booked'), ('enquired', 'Enquiry sent by me'), ('confirmed', 'Confirmed by me')], default='idea')
    booking_reference = models.CharField(max_length=150, blank=True)
    status = models.CharField(max_length=20, choices=[('planned', 'Planned'), ('completed', 'Completed'), ('cancelled', 'Cancelled')], default='planned')
    reminder_offsets = models.JSONField(default=list)
    creation_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Supply(models.Model):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='supplies')
    product = models.CharField(max_length=150)
    pack_size = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    quantity = models.DecimalField(max_digits=9, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    unit = models.CharField(max_length=40, default='tablets')
    supplier = models.ForeignKey(Provider, on_delete=models.SET_NULL, null=True, blank=True)
    supplier_url = models.URLField(blank=True)
    delivery_days = models.PositiveIntegerField(default=5, validators=[MaxValueValidator(365)])
    reorder_at = models.DecimalField(max_digits=9, decimal_places=2, default=1, validators=[MinValueValidator(0)])
    ordered_at = models.DateTimeField(null=True, blank=True)
    snoozed_until = models.DateField(null=True, blank=True)
    stock_updated_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.pet.name} · {self.product}'

    @property
    def order_url(self):
        return self.supplier_url or (self.supplier.website if self.supplier else '')

    @property
    def next_use(self):
        return self.tasks.filter(status='pending').order_by('due_at').first()

    @property
    def estimate(self):
        now = timezone.now()
        horizon = now + timedelta(days=self.delivery_days + 7)
        usage = 0
        for task in self.tasks.filter(status='pending', due_at__lte=horizon):
            count = 1
            if task.repeat_rule:
                from copy import copy
                from .scheduling import next_due
                prefs, _ = Preferences.objects.get_or_create(user=self.pet.owner)
                cursor = copy(task)
                cursor.recurrence_day = task.recurrence_day or task.due_at.astimezone(ZoneInfo(prefs.timezone)).day
                for _ in range(5000):
                    cursor.due_at = next_due(cursor, prefs.timezone)
                    if cursor.due_at > horizon:
                        break
                    count += 1
            elif task.repeat_days:
                count += max(0, (horizon - task.due_at).days // task.repeat_days)
            usage += task.units_used * count
        return {'usage': usage, 'remaining': self.quantity - usage, 'days': self.delivery_days + 7}

    @property
    def needs_order(self):
        if self.ordered_at or (self.snoozed_until and self.snoozed_until > timezone.localdate()):
            return False
        return self.estimate['remaining'] <= self.reorder_at


class Task(models.Model):
    KINDS = [('worming', 'Worming'), ('flea', 'Flea & tick'), ('vaccination', 'Vaccination'), ('medication', 'Medication'), ('appointment', 'Appointment'), ('grooming', 'Grooming'), ('supply', 'Supply reorder'), ('training', 'Training'), ('sport', 'Sport & activities'), ('outing', 'Outing'), ('travel', 'Travel'), ('celebration', 'Celebration'), ('preparation', 'Plan preparation'), ('other', 'Other care')]
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=150)
    kind = models.CharField(max_length=30, choices=KINDS, default='other')
    due_at = models.DateTimeField()
    end_at = models.DateTimeField(null=True, blank=True)
    repeat_rule = models.CharField(max_length=20, choices=[('', 'Use day interval below'), ('weekly', 'Every week'), ('monthly', 'Every month'), ('yearly', 'Every year')], blank=True)
    recurrence_day = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(31)])
    repeat_days = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(3650)], help_text='0 for one-time; otherwise repeat every this many days, at the same local time.')
    reminder_days = models.PositiveIntegerField(default=7, validators=[MaxValueValidator(365)])
    status = models.CharField(max_length=15, choices=[('pending', 'Pending'), ('completed', 'Completed'), ('skipped', 'Skipped'), ('cancelled', 'Cancelled')], default='pending')
    completed_at = models.DateTimeField(null=True, blank=True)
    provider = models.ForeignKey(Provider, on_delete=models.SET_NULL, null=True, blank=True)
    location = models.CharField(max_length=400, blank=True)
    notes = models.TextField(blank=True)
    cost = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    follow_up_at = models.DateTimeField(null=True, blank=True)
    supply = models.ForeignKey(Supply, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    units_used = models.DecimalField(max_digits=9, decimal_places=2, default=0, validators=[MinValueValidator(0)], help_text='Entered by you. No dose is suggested by the app.')
    source_record = models.OneToOneField('HealthRecord', on_delete=models.SET_NULL, null=True, blank=True, related_name='follow_up_task')
    plan = models.ForeignKey(LifePlan, on_delete=models.CASCADE, null=True, blank=True, related_name='tasks')
    plan_step = models.CharField(max_length=50, blank=True)
    reminder_offsets = models.JSONField(null=True, blank=True)
    reminder_snoozed_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['plan', 'pet', 'plan_step'], condition=models.Q(plan__isnull=False), name='unique_plan_pet_step')]

    @property
    def overdue(self):
        return self.status == 'pending' and self.due_at < timezone.now()

    def __str__(self):
        return self.title


class HealthRecord(models.Model):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='records')
    kind = models.CharField(max_length=30, choices=[('weight', 'Weight'), ('treatment', 'Treatment'), ('vaccination', 'Vaccination'), ('medication', 'Medication'), ('observation', 'Observation'), ('visit', 'Vet visit'), ('document', 'Document')])
    title = models.CharField(max_length=150)
    recorded_at = models.DateTimeField(default=timezone.now)
    weight_kg = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0.01)])
    notes = models.TextField(blank=True)
    cost = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    follow_up_at = models.DateTimeField(null=True, blank=True)
    document = models.FileField(upload_to=private_path, blank=True)


class Timeline(models.Model):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='timeline')
    title = models.CharField(max_length=250)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class ListingRequest(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    provider = models.ForeignKey(Provider, on_delete=models.SET_NULL, null=True, blank=True)
    kind = models.CharField(max_length=20, choices=[('new', 'New listing'), ('claim', 'Ownership claim'), ('correction', 'Correction')])
    business_name = models.CharField(max_length=200)
    contact_email = models.EmailField()
    details = models.TextField(help_text='Include the address, website, services and supporting evidence. Never send identity documents or passwords.')
    status = models.CharField(max_length=20, choices=[('pending', 'Pending review'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='pending')
    review_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Audit(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=250)
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    key = models.CharField(max_length=200, unique=True)
    title = models.CharField(max_length=250)
    status = models.CharField(max_length=20, default='in_app')
    error = models.CharField(max_length=250, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)


class ServiceCache(models.Model):
    key = models.CharField(max_length=250, unique=True)
    data = models.JSONField(default=dict)
    expires_at = models.DateTimeField()


class Metric(models.Model):
    day = models.DateField(default=timezone.localdate)
    name = models.CharField(max_length=40)
    count = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['day', 'name'], name='metric_day_name')]
