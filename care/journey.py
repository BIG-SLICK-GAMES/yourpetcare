import uuid
from datetime import timedelta
from django import forms
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import Http404
from django.shortcuts import render, redirect, get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_POST
from .models import Pet, Task, LifePlan, Timeline, ListingRequest, Preferences
from .ideas import IDEAS, INTERESTS, SOURCES, suggestions
from .community_data import TOPICS, RESOURCES


@login_required
@require_POST
def reset_preview(request):
    from django.contrib.auth import logout
    if not request.session.get('local_preview') or request.user.has_usable_password():
        raise Http404
    if request.POST.get('confirm') != 'yes':
        return redirect('settings')
    user = request.user
    # Use model deletion signals for private uploads, as in normal account deletion.
    ListingRequest.objects.filter(user=user).delete()
    logout(request)
    user.delete()
    return redirect('home')


def home(request):
    from .menu import CATEGORIES, grouped_menu
    pets = Pet.objects.filter(owner=request.user) if request.user.is_authenticated else Pet.objects.none()
    query = request.GET.get('q', '').strip()[:100]
    category = request.GET.get('category', 'all')
    if category not in [c[0] for c in CATEGORIES]:
        category = 'all'
    groups, suggestion = grouped_menu(query, category)
    return render(request, 'care/journey_home.html', {'pets': pets, 'first_pet': pets.first(), 'menu_groups': groups, 'menu_categories': CATEGORIES, 'menu_query': query, 'menu_category': category, 'menu_suggestion': suggestion, 'menu_count': sum(len(g['items']) for g in groups)})


STEPS = ['name', 'species', 'age', 'training', 'feeling', 'wish']


class ConversationForm(forms.Form):
    def __init__(self, *args, step, pet_name='your pet', species='Dog', **kwargs):
        super().__init__(*args, **kwargs)
        choices = {
            'species': Pet._meta.get_field('species').choices,
            'age': [('Young', 'Still discovering the world'), ('Adult', 'In their grown-up years'), ('Senior', 'Enjoying a gentler chapter'), ('', 'We’re still figuring that out')],
            'training': Pet.TRAINING_LEVELS,
            'feeling': [('quiet', 'A little shy — let’s take it slowly'), ('building', 'Curious, with a little reassurance'), ('social', 'Ready to meet the world'), ('', 'We’re getting to know each other')],
            'wish': [(k,v) for k,v in INTERESTS if species == 'Dog' or k not in ['sports','cafes']],
        }
        if step == 'name':
            self.fields['answer'] = forms.CharField(max_length=80, label='Their name', widget=forms.TextInput(attrs={'placeholder': 'The name that makes you smile', 'autocomplete': 'off', 'autofocus': True}))
        elif step == 'wish':
            self.fields['answer'] = forms.MultipleChoiceField(choices=choices[step], required=False, label='What sounds lovely?', widget=forms.CheckboxSelectMultiple)
        else:
            self.fields['answer'] = forms.ChoiceField(choices=choices[step], required=step == 'species', widget=forms.RadioSelect, label='Choose what feels closest')


@login_required
def conversation(request):
    step = request.GET.get('step', 'name')
    if step not in STEPS:
        raise Http404
    data = dict(request.session.get('pet_conversation', {}))
    if request.method == 'GET' and request.GET.get('new') == 'yes':
        data = {}
        request.session['pet_conversation'] = data
    index = STEPS.index(step)
    if index and not data.get('name'):
        return redirect('journey')
    name = data.get('name', 'your pet')
    prompts = {
        'name': ('Every good story starts with a name.', 'Who’s the little character sharing your life?'),
        'species': (f'Lovely to meet you, {name}.', 'Tell us a little about your companion.'),
        'age': (f'What chapter is {name} in?', 'An exact birthday can wait. A rough idea is plenty.'),
        'training': ('Every little win counts.', f'Where are you and {name} with learning together? There’s no “behind” here.'),
        'feeling': (f'How does {name} feel about new things?', 'Quiet company and big adventures can both make a beautiful day.'),
        'wish': ('What would you love more of?', 'Choose a few things that make you smile. You can change your mind anytime.'),
    }
    form = ConversationForm(request.POST or None, step=step, pet_name=name, species=data.get('species','Dog'), initial={'answer': data.get(step)})
    if request.method == 'POST':
        if request.POST.get('skip') and step != 'name':
            value = [] if step == 'wish' else ('Dog' if step == 'species' else '')
        elif form.is_valid():
            value = form.cleaned_data['answer']
        else:
            value = None
        if value is not None:
            data[step] = value
            request.session['pet_conversation'] = data
            if step == 'wish':
                with transaction.atomic():
                    Preferences.objects.select_for_update().get_or_create(user=request.user)
                    pet = Pet.objects.filter(pk=data.get('pet_id'), owner=request.user).first()
                    if not pet:
                        pet = Pet(owner=request.user)
                    pet.name = data['name']
                    pet.species = data.get('species') or 'Dog'
                    pet.estimated_age = data.get('age', '')
                    pet.training_level = data.get('training', '')
                    pet.social_comfort = data.get('feeling', '')
                    pet.interests = value
                    pet.profile_completed_at = timezone.now()
                    pet.save()
                data['pet_id'] = pet.pk
                request.session['pet_conversation'] = data
                return redirect('journey-ready')
            # Training remains optional for every species; no dog-only readiness claims.
            return redirect('/journey/?step=' + STEPS[index+1])
    return render(request, 'care/conversation.html', {'form': form, 'step': step, 'heading': prompts[step][0], 'intro': prompts[step][1], 'index': index+1, 'previous': STEPS[index-1] if index else '', 'data': data})


@login_required
def ready(request):
    pet_id = request.GET.get('pet') or request.session.get('pet_conversation', {}).get('pet_id')
    pet = Pet.objects.filter(owner=request.user, pk=pet_id).first() if str(pet_id).isdigit() else None
    if not pet:
        return redirect('journey')
    picks = suggestions(pet)[:3]
    return render(request, 'care/journey_ready.html', {'pet': pet, 'ideas': picks})


class QuickPlanForm(forms.Form):
    day = forms.DateField(label='Pick a day', widget=forms.DateInput(format='%Y-%m-%d', attrs={'type':'date'}))
    time = forms.TimeField(label='Around what time?', initial='10:00', widget=forms.TimeInput(attrs={'type':'time'}))
    location = forms.CharField(label='Somewhere in mind? (optional)', max_length=400, required=False)
    preparation = forms.BooleanField(label='Add the suggested preparation reminders', required=False)
    token = forms.UUIDField(widget=forms.HiddenInput, initial=uuid.uuid4)

    def clean(self):
        from datetime import datetime
        data = super().clean()
        if data.get('day') and data.get('time'):
            data['start'] = timezone.make_aware(datetime.combine(data['day'], data['time']))
            if data['start'] <= timezone.now():
                self.add_error('day', 'Let’s choose a time still ahead of us.')
        return data


@login_required
def quick_plan(request, key):
    if key not in IDEAS:
        raise Http404
    pet_id = request.GET.get('pet')
    if not str(pet_id).isdigit():
        return redirect('journey')
    pet = get_object_or_404(Pet, pk=pet_id, owner=request.user)
    idea = IDEAS[key]
    if idea['species'] and pet.species not in idea['species']:
        raise Http404
    form = QuickPlanForm(request.POST or None, initial={'day': timezone.localdate()+timedelta(days=7)})
    if request.method == 'POST' and form.is_valid():
        data = form.cleaned_data
        with transaction.atomic():
            Preferences.objects.select_for_update().get_or_create(user=request.user)
            plan = LifePlan.objects.filter(creation_token=data['token']).first()
            if plan and plan.owner_id != request.user.pk:
                raise Http404
            if not plan:
                plan = LifePlan.objects.create(owner=request.user, template_key=key, title=idea['title'], start_at=data['start'], location=data['location'], reminder_offsets=[1440,120], creation_token=data['token'])
                plan.pets.add(pet)
                Task.objects.create(pet=pet, title=plan.title, kind=idea['kind'], due_at=plan.start_at, location=plan.location, plan=plan, plan_step='event', reminder_offsets=plan.reminder_offsets)
                if data['preparation']:
                    for step in idea['steps']:
                        Task.objects.create(pet=pet, title=step['title'], kind='preparation', due_at=plan.start_at-timedelta(days=step['days']), notes=step['note'], plan=plan, plan_step=step['key'], reminder_offsets=[1440])
                Timeline.objects.create(pet=pet, title='Something to look forward to', notes=plan.title)
        return render(request, 'care/journey_saved.html', {'plan': plan, 'pet': pet})
    return render(request, 'care/quick_plan.html', {'form': form, 'idea': idea, 'pet': pet, 'sources': [SOURCES[s] for s in idea['sources']]})


def community(request, category='all'):
    if category != 'all' and category not in TOPICS:
        raise Http404
    heading, intro, label = TOPICS.get(category, ('There’s a whole community around you.', 'For new beginnings, a helping hand, and the moments that need a little extra care.', 'Community'))
    return render(request, 'care/community.html', {'category': category, 'heading': heading, 'intro': intro, 'topics': TOPICS.items(), 'resources': [r for r in RESOURCES if category == 'all' or r['category'] == category]})


class ServiceForm(forms.Form):
    service = forms.ChoiceField(label='How do you help pets?', choices=[('sitting','Pet sitting'),('walking','Dog walking'),('both','Sitting & walking'),('farewell','Pet funerals & farewell care')], widget=forms.RadioSelect)
    name = forms.CharField(label='Your service or business name', max_length=200)
    area = forms.CharField(label='Which suburbs or towns do you cover?', max_length=300)
    about = forms.CharField(label='What would you like pet families to know?', max_length=3000, widget=forms.Textarea(attrs={'rows':4}), help_text='Tell them about your experience, the pets you care for and what a visit is like.')
    email = forms.EmailField(label='Your contact email', help_text='Kept with your submission; not published automatically.')
    website = forms.URLField(label='Website or business page (optional)', required=False)
    consent = forms.BooleanField(label='I’m authorised to submit these details for review.')
    token = forms.UUIDField(widget=forms.HiddenInput)


@login_required
def offer_service(request):
    token = request.session.get('service_token')
    if not token:
        token = str(uuid.uuid4())
        request.session['service_token'] = token
    form = ServiceForm(request.POST or None, initial={'token':token, 'service':request.GET.get('kind','sitting')})
    if request.method == 'POST' and form.is_valid():
        d = form.cleaned_data
        if str(d['token']) != token:
            form.add_error(None, 'This form has expired. Reload this page and try again.')
        else:
            with transaction.atomic():
                Preferences.objects.select_for_update().get_or_create(user=request.user)
                marker = 'Submission reference: ' + token
                listing = ListingRequest.objects.filter(user=request.user, details__endswith=marker).first()
                if not listing:
                    listing = ListingRequest.objects.create(user=request.user, kind='new', business_name=d['name'], contact_email=d['email'], details=f'Service: {dict(form.fields["service"].choices)[d["service"]]}\nArea: {d["area"]}\nWebsite: {d["website"]}\n\n{d["about"]}\n\n{marker}')
            return redirect('service-thanks', pk=listing.pk)
    return render(request, 'care/service_offer.html', {'form':form})


@login_required
def service_thanks(request, pk):
    listing = get_object_or_404(ListingRequest, pk=pk, user=request.user)
    # A fresh form can now be used for another service; old POSTs cannot duplicate it.
    request.session.pop('service_token', None)
    return render(request, 'care/service_thanks.html', {'listing':listing})
