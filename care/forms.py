from zoneinfo import available_timezones
from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from .models import Pet, Task, Supply, HealthRecord, Preferences, ListingRequest, Provider
from .ideas import REMINDERS


class SignupForm(UserCreationForm):
    email = forms.EmailField(required=True)
    class Meta:
        model = User
        fields = ['username', 'email', 'password1', 'password2']

    def clean_email(self):
        email = self.cleaned_data['email'].lower()
        if User.objects.filter(email__iexact=email).exists():
            raise ValidationError('An account with this email already exists.')
        return email


class OwnerForm(forms.ModelForm):
    def __init__(self, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        for name, field in self.fields.items():
            if isinstance(field, forms.DateTimeField):
                field.widget = forms.DateTimeInput(format='%Y-%m-%dT%H:%M', attrs={'type': 'datetime-local'})
            elif isinstance(field, forms.DateField):
                field.widget = forms.DateInput(attrs={'type': 'date'})
            elif isinstance(field.widget, forms.Textarea):
                field.widget.attrs['rows'] = 3
            elif isinstance(field.widget, forms.ClearableFileInput):
                field.widget.template_name = 'care/widgets/private_file.html'
        if 'pet' in self.fields:
            self.fields['pet'].queryset = Pet.objects.filter(owner=user)
        if 'supply' in self.fields:
            self.fields['supply'].queryset = Supply.objects.filter(pet__owner=user)


class PetForm(OwnerForm):
    class Meta:
        model = Pet
        exclude = ['owner', 'created_at', 'training_level', 'energy_level', 'social_comfort', 'travel_comfort', 'personality', 'interests', 'goals', 'support_notes', 'profile_completed_at']

    def clean_date_of_birth(self):
        from django.utils import timezone
        value = self.cleaned_data.get('date_of_birth')
        if value and value > timezone.localdate():
            raise ValidationError('Date of birth cannot be in the future.')
        return value

    def clean_photo(self):
        photo = self.cleaned_data.get('photo')
        if photo and photo.size > 5 * 1024 * 1024:
            raise ValidationError('Please choose a photo smaller than 5 MB.')
        return photo


class TaskForm(OwnerForm):
    reminder_offsets = forms.TypedMultipleChoiceField(choices=REMINDERS, coerce=int, required=False, widget=forms.CheckboxSelectMultiple, label='Extra event reminders', help_text='When selected these replace the single reminder-days setting. Leave all clear to use reminder days.')
    class Meta:
        model = Task
        exclude = ['status', 'completed_at', 'source_record', 'plan', 'plan_step', 'recurrence_day', 'reminder_snoozed_until']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk and self.instance.plan_id:
            for name in ['pet', 'provider', 'location', 'repeat_rule', 'repeat_days', 'supply', 'units_used']:
                self.fields[name].disabled = True

    def clean_reminder_offsets(self):
        return sorted(set(self.cleaned_data['reminder_offsets']), reverse=True) or None

    def clean(self):
        data = super().clean()
        supply = data.get('supply')
        if supply and supply.pet_id != getattr(data.get('pet'), 'pk', None):
            self.add_error('supply', 'Choose a supply belonging to this pet.')
        if not supply and data.get('units_used'):
            self.add_error('units_used', 'Select a supply to record usage.')
        if data.get('end_at') and data.get('due_at') and data['end_at'] <= data['due_at']:
            self.add_error('end_at', 'End time must be after the start.')
        return data


class SupplyForm(OwnerForm):
    class Meta:
        model = Supply
        exclude = ['ordered_at', 'snoozed_until', 'stock_updated_at']

    def clean_pet(self):
        pet = self.cleaned_data['pet']
        if self.instance.pk and self.instance.pet_id != pet.pk and self.instance.tasks.exists():
            raise ValidationError('This supply is linked to care items. Keep it with this pet or create a separate supply for the other pet.')
        return pet


class RecordForm(OwnerForm):
    class Meta:
        model = HealthRecord
        fields = '__all__'

    def clean(self):
        data = super().clean()
        if data.get('kind') == 'weight' and data.get('weight_kg') is None:
            self.add_error('weight_kg', 'Enter the recorded weight.')
        return data

    def clean_document(self):
        document = self.cleaned_data.get('document')
        if document and hasattr(document, 'content_type'):
            if document.size > 10 * 1024 * 1024:
                raise ValidationError('Documents must be smaller than 10 MB.')
            header = document.read(16)
            document.seek(0)
            valid = header.startswith(b'%PDF-') or header.startswith(b'\x89PNG\r\n\x1a\n') or header.startswith(b'\xff\xd8\xff')
            if not valid:
                raise ValidationError('Upload a PDF, PNG or JPEG document.')
        return document


class PreferencesForm(forms.ModelForm):
    timezone = forms.ChoiceField(choices=[(z, z.replace('_', ' ')) for z in sorted(available_timezones()) if z.startswith('Australia/') or z == 'UTC'])
    class Meta:
        model = Preferences
        exclude = ['user']


class ListingForm(OwnerForm):
    class Meta:
        model = ListingRequest
        fields = ['kind', 'provider', 'business_name', 'contact_email', 'details']

    def clean(self):
        data = super().clean()
        if data.get('kind') in ['claim', 'correction'] and not data.get('provider'):
            self.add_error('provider', 'Select the listing this request concerns.')
        return data
