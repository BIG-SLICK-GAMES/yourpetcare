import uuid
from datetime import timedelta
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


class Provider(models.Model):
    CATEGORIES = [('vet', 'Veterinary care'), ('groomer', 'Grooming'), ('boarding', 'Boarding & day care'), ('sitter', 'Sitters & walkers'), ('trainer', 'Training'), ('shop', 'Pet supplies'), ('other', 'Other care')]
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORIES)
    address = models.CharField(max_length=400, blank=True)
    lat = models.FloatField(validators=[MinValueValidator(-90), MaxValueValidator(90)])
    lon = models.FloatField(validators=[MinValueValidator(-180), MaxValueValidator(180)])
    phone = models.CharField(max_length=80, blank=True)
    website = models.URLField(blank=True)
    hours = models.CharField(max_length=300, blank=True)
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


class Pet(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=80)
    photo = models.ImageField(upload_to=private_path, blank=True)
    species = models.CharField(max_length=40, choices=[('Dog', 'Dog'), ('Cat', 'Cat'), ('Bird', 'Bird'), ('Rabbit', 'Rabbit'), ('Horse', 'Horse'), ('Other', 'Other')], default='Dog')
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
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


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
            if task.repeat_days:
                count += max(0, (horizon - task.due_at).days // task.repeat_days)
            usage += task.units_used * count
        return {'usage': usage, 'remaining': self.quantity - usage, 'days': self.delivery_days + 7}

    @property
    def needs_order(self):
        if self.ordered_at or (self.snoozed_until and self.snoozed_until > timezone.localdate()):
            return False
        return self.estimate['remaining'] <= self.reorder_at


class Task(models.Model):
    KINDS = [('worming', 'Worming'), ('flea', 'Flea & tick'), ('vaccination', 'Vaccination'), ('medication', 'Medication'), ('appointment', 'Appointment'), ('grooming', 'Grooming'), ('supply', 'Supply reorder'), ('other', 'Other care')]
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=150)
    kind = models.CharField(max_length=30, choices=KINDS, default='other')
    due_at = models.DateTimeField()
    repeat_days = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(3650)], help_text='0 for one-time; otherwise repeat every this many days, at the same local time.')
    reminder_days = models.PositiveIntegerField(default=7, validators=[MaxValueValidator(365)])
    status = models.CharField(max_length=15, choices=[('pending', 'Pending'), ('completed', 'Completed'), ('skipped', 'Skipped')], default='pending')
    completed_at = models.DateTimeField(null=True, blank=True)
    provider = models.ForeignKey(Provider, on_delete=models.SET_NULL, null=True, blank=True)
    location = models.CharField(max_length=400, blank=True)
    notes = models.TextField(blank=True)
    cost = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    follow_up_at = models.DateTimeField(null=True, blank=True)
    supply = models.ForeignKey(Supply, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    units_used = models.DecimalField(max_digits=9, decimal_places=2, default=0, validators=[MinValueValidator(0)], help_text='Entered by you. No dose is suggested by the app.')
    source_record = models.OneToOneField('HealthRecord', on_delete=models.SET_NULL, null=True, blank=True, related_name='follow_up_task')

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
