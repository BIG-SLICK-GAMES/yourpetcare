import uuid
from datetime import timedelta
from urllib.parse import urlencode
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.shortcuts import render, redirect, get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_POST
from .models import Pet, LifePlan, Task, Timeline, Preferences, Notification, Provider
from .life_forms import PetPersonalityForm, PlanForm, ExtraStepForm
from .ideas import IDEAS, INTERESTS, SOURCES, LOCAL_STARTERS, suggestions
from .services import finish_task


@login_required
def personality(request, pk):
    pet = get_object_or_404(Pet, pk=pk, owner=request.user)
    form = PetPersonalityForm(request.POST or None, instance=pet, user=request.user)
    if request.method == 'POST' and form.is_valid():
        pet = form.save(commit=False)
        pet.profile_completed_at = timezone.now()
        pet.save()
        Timeline.objects.create(pet=pet, title='A little more about me', notes='Personality, interests and goals updated by owner.')
        messages.success(request, f'Got to know {pet.name} a little better. Let’s plan something together.')
        return redirect('/life/?' + urlencode({'pet': pet.pk}))
    groups = [([form[n] for n in ['date_of_birth', 'estimated_age', 'personality']], '01', 'Meet the real them'), ([form[n] for n in ['training_level', 'energy_level', 'social_comfort', 'travel_comfort']], '02', 'Their pace. Their comfort.'), ([form[n] for n in ['interests', 'goals', 'support_notes']], '03', 'What would you love to do together?')]
    return render(request, 'care/personality.html', {'pet': pet, 'form': form, 'groups': groups})


@login_required
def life_home(request):
    pets = Pet.objects.filter(owner=request.user)
    if request.GET.get('pet'):
        pet = get_object_or_404(pets, pk=request.GET['pet'])
    else:
        pet = pets.first()
    ideas = suggestions(pet) if pet else [dict(v, key=k, reason='A starting point for your next plan.') for k,v in IDEAS.items()]
    category = request.GET.get('category', '')
    if category in dict(INTERESTS):
        ideas = [i for i in ideas if i['category'] == category]
    plans = LifePlan.objects.filter(owner=request.user).prefetch_related('pets').order_by('start_at')
    if pet:
        plans = plans.filter(pets=pet)
    return render(request, 'care/life.html', {'pet': pet, 'pets': pets, 'ideas': ideas, 'plans': plans, 'interests': INTERESTS, 'category': category, 'starters': [s for s in LOCAL_STARTERS if not pet or pet.species in s['species']]})


def plan_context(plan):
    idea = IDEAS[plan.template_key]
    return {'idea': idea, 'sources': [SOURCES[s] for s in idea['sources']]}


@login_required
def plan_edit(request, pk=None, template_key='custom'):
    plan = get_object_or_404(LifePlan, pk=pk, owner=request.user) if pk else None
    if plan:
        template_key = plan.template_key
        if plan.status != 'planned':
            messages.info(request, 'This plan is complete or cancelled. Its history is kept as recorded.')
            return redirect('plan-detail', pk=plan.pk)
    if template_key not in IDEAS:
        from django.http import Http404
        raise Http404
    initial = {} if plan else {'title': IDEAS[template_key]['title']}
    if not plan and request.GET.get('provider'):
        provider = get_object_or_404(Provider, pk=request.GET['provider'])
        initial.update(provider=provider, title='Visit ' + provider.name[:140], location=provider.address or provider.name, website=provider.website)
    if not plan and request.GET.get('pet'):
        initial['pets'] = [get_object_or_404(Pet, pk=request.GET['pet'], owner=request.user)]
    starter = next((s for s in LOCAL_STARTERS if s['name'] == request.GET.get('venue') and s['template'] == template_key), None)
    if starter and not plan:
        initial.update(title=f'{IDEAS[template_key]["title"]}: {starter["name"]}', location=starter['name'] + ', ' + starter['area'], website=starter['source'])
    form = PlanForm(request.POST or None, instance=plan, user=request.user, template_key=template_key, initial=initial)
    if request.method == 'POST' and form.is_valid():
        with transaction.atomic():
            # Serialize same-account submissions before looking up the form token.
            Preferences.objects.get_or_create(user=request.user)
            Preferences.objects.select_for_update().get(user=request.user)
            if not plan:
                existing = LifePlan.objects.filter(creation_token=form.cleaned_data['creation_token']).first()
                if existing:
                    if existing.owner_id == request.user.pk:
                        return redirect('plan-detail', pk=existing.pk)
                    form.add_error(None, 'Please reload this form and try again.')
                    return render(request, 'care/plan_form.html', {'form': form, 'idea': IDEAS[template_key], 'plan': None})
            old_start = LifePlan.objects.select_for_update().get(pk=plan.pk).start_at if plan else None
            obj = form.save(commit=False)
            obj.owner = request.user
            obj.template_key = template_key
            if not plan:
                obj.creation_token = form.cleaned_data['creation_token']
            obj.save()
            form.save_m2m()
            if not plan:
                for pet in obj.pets.all():
                    Task.objects.create(pet=pet, title=obj.title, kind=IDEAS[template_key]['kind'], due_at=obj.start_at, end_at=obj.end_at, location=obj.location, provider=obj.provider, notes=obj.notes, plan=obj, plan_step='event', reminder_offsets=obj.reminder_offsets)
                    for step in IDEAS[template_key]['steps']:
                        if step['key'] in form.cleaned_data['selected_steps']:
                            Task.objects.create(pet=pet, title=step['title'], kind='preparation', due_at=obj.start_at-timedelta(days=step['days']), notes=step['note'], plan=obj, plan_step=step['key'], reminder_offsets=[1440])
                    Timeline.objects.create(pet=pet, title='A new plan together', notes=obj.title)
            else:
                delta = timezone.localtime(obj.start_at) - timezone.localtime(old_start)
                for task in obj.tasks.select_for_update().filter(status='pending'):
                    task.due_at = timezone.localtime(task.due_at) + delta
                    task.reminder_snoozed_until = None
                    if task.plan_step == 'event':
                        task.title, task.end_at, task.location, task.provider, task.notes = obj.title, obj.end_at, obj.location, obj.provider, obj.notes
                        task.reminder_offsets = obj.reminder_offsets
                    task.save()
                for pet in obj.pets.all():
                    Timeline.objects.create(pet=pet, title='Plan updated', notes=obj.title + ('. Pending preparation moved with the new date.' if delta else ''))
        messages.success(request, 'Plan saved. Your event and preparation are on the calendar. Past preparation dates are shown as overdue so you can review them.')
        return redirect('plan-detail', pk=obj.pk)
    return render(request, 'care/plan_form.html', {'form': form, 'idea': IDEAS[template_key], 'plan': plan, 'sources': [SOURCES[s] for s in IDEAS[template_key]['sources']]})


@login_required
def plan_detail(request, pk):
    plan = get_object_or_404(LifePlan.objects.prefetch_related('pets'), pk=pk, owner=request.user)
    tasks = plan.tasks.select_related('pet').order_by('due_at', 'pk')
    total = tasks.count()
    done = tasks.filter(status='completed').count()
    directions = 'https://www.google.com/maps/search/?' + urlencode({'api': 1, 'query': plan.location}) if plan.location else ''
    return render(request, 'care/plan.html', {'plan': plan, 'tasks': tasks, 'step_form': ExtraStepForm(), 'done': done, 'total': total, 'progress': round(done / total * 100) if total else 0, 'directions': directions, **plan_context(plan)})


@login_required
@require_POST
@transaction.atomic
def plan_action(request, pk):
    plan = get_object_or_404(LifePlan.objects.select_for_update(), pk=pk, owner=request.user)
    if plan.status != 'planned':
        return redirect('plan-detail', pk=pk)
    action = request.POST.get('action')
    if action == 'cancel':
        plan.tasks.filter(status='pending').update(status='cancelled', reminder_snoozed_until=None)
        plan.status = 'cancelled'
        plan.save(update_fields=['status'])
        for pet in plan.pets.all():
            Timeline.objects.create(pet=pet, title='Plan cancelled', notes=plan.title)
        messages.success(request, 'Plan cancelled. Pending tasks and reminders have been stopped; past history is preserved.')
    elif action == 'step':
        form = ExtraStepForm(request.POST)
        if form.is_valid():
            key = 'custom-' + uuid.uuid4().hex
            for pet in plan.pets.all():
                Task.objects.create(pet=pet, title=form.cleaned_data['title'], due_at=form.cleaned_data['due_at'], notes=form.cleaned_data['notes'], kind='preparation', plan=plan, plan_step=key, reminder_offsets=[1440])
            messages.success(request, 'Preparation step added to the plan and calendar.')
        else:
            messages.error(request, 'Enter a title and valid date/time for your preparation step.')
    return redirect('plan-detail', pk=pk)
