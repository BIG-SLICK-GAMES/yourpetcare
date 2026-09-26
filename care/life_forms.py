import uuid
from django import forms
from django.utils import timezone
from .models import Pet, LifePlan
from .forms import OwnerForm, PetForm
from .ideas import INTERESTS, IDEAS, REMINDERS


class PetPersonalityForm(OwnerForm):
    interests = forms.MultipleChoiceField(choices=INTERESTS, widget=forms.CheckboxSelectMultiple, required=False, label='What would you love to do together?')
    class Meta:
        model = Pet
        fields = ['date_of_birth', 'estimated_age', 'personality', 'training_level', 'energy_level', 'social_comfort', 'travel_comfort', 'interests', 'goals', 'support_notes']
        labels = {'date_of_birth': 'Birthday, if you know it', 'estimated_age': 'Or an estimated age', 'personality': 'Describe them in a few words', 'training_level': 'Where are you with training?', 'energy_level': 'Their kind of day', 'social_comfort': 'How do they feel in social places?', 'travel_comfort': 'How do they feel about travel?', 'goals': 'What would you like to work towards?', 'support_notes': 'What helps them feel comfortable?'}
        help_texts = {'support_notes': 'For example: more space from other dogs, short outings, quiet seating, or mobility support. These are your observations.', 'goals': 'A calm café visit, a new skill, a weekend away… make it yours.'}

    clean_date_of_birth = PetForm.clean_date_of_birth

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.species != 'Dog':
            self.fields['interests'].choices = [(key, label) for key, label in INTERESTS if key not in ['sports', 'cafes']]


class PlanForm(OwnerForm):
    pets = forms.ModelMultipleChoiceField(queryset=Pet.objects.none(), widget=forms.CheckboxSelectMultiple, label='Who’s coming?')
    reminder_offsets = forms.TypedMultipleChoiceField(choices=REMINDERS, coerce=int, widget=forms.CheckboxSelectMultiple, required=False, label='Remind me about the main event')
    selected_steps = forms.MultipleChoiceField(choices=[], widget=forms.CheckboxSelectMultiple, required=False, label='Add these preparation tasks to my calendar')
    creation_token = forms.UUIDField(widget=forms.HiddenInput, initial=uuid.uuid4)

    class Meta:
        model = LifePlan
        fields = ['pets', 'title', 'start_at', 'end_at', 'location', 'website', 'provider', 'confirmation', 'booking_reference', 'notes', 'reminder_offsets']
        labels = {'start_at': 'When does it start?', 'end_at': 'When does it finish?', 'location': 'Where are you going?', 'website': 'Venue, organiser or airline website', 'confirmation': 'Booking status', 'booking_reference': 'Your booking reference'}

    def __init__(self, *args, template_key='custom', user=None, **kwargs):
        self.template_key = template_key
        super().__init__(*args, user=user, **kwargs)
        self.fields['pets'].queryset = Pet.objects.filter(owner=user)
        self.fields['selected_steps'].choices = [(s['key'], f'{s["title"]} · {s["days"]} days before' if s['days'] else s['title'] + ' · on the day') for s in IDEAS[template_key]['steps']]
        if self.instance.pk:
            self.fields.pop('selected_steps')
            self.fields['pets'].disabled = True
            self.fields['creation_token'].initial = self.instance.creation_token
        else:
            self.initial.setdefault('selected_steps', [s['key'] for s in IDEAS[template_key]['steps']])
            self.initial.setdefault('reminder_offsets', [1440, 120])

    def clean(self):
        data = super().clean()
        if data.get('end_at') and data.get('start_at') and data['end_at'] <= data['start_at']:
            self.add_error('end_at', 'Finish must be after the start.')
        pets = data.get('pets', [])
        species = IDEAS[self.template_key]['species']
        if species and any(p.species not in species for p in pets):
            self.add_error('pets', 'This starter is for dogs. Choose a custom plan for other pets.')
        if not self.instance.pk and data.get('start_at') and data['start_at'] <= timezone.now():
            self.add_error('start_at', 'Choose a future start time for a new plan.')
        return data


class ExtraStepForm(forms.Form):
    title = forms.CharField(max_length=150, label='What needs doing?')
    due_at = forms.DateTimeField(widget=forms.DateTimeInput(attrs={'type': 'datetime-local'}), label='When should it happen?')
    notes = forms.CharField(required=False, widget=forms.Textarea(attrs={'rows': 2}), label='Details')
