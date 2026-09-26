from django.contrib import admin
from django.core.exceptions import ValidationError
from django.forms import ModelForm
from django.utils import timezone
import json
from .models import Provider, ListingRequest, Audit, Metric, Pet
from django import forms
from django.urls import path, reverse
from django.utils.html import format_html
from django.http import FileResponse, Http404


class ReviewForm(ModelForm):
    class Meta:
        model = ListingRequest
        fields = '__all__'

    def clean(self):
        data = super().clean()
        if data.get('status') == 'approved' and (not data.get('provider') or not data.get('review_notes')):
            raise ValidationError('Approval requires a linked provider and review notes describing the evidence checked. Create or correct the provider first.')
        return data


class ProviderReviewForm(ModelForm):
    species_supported = forms.MultipleChoiceField(choices=Pet.SPECIES, required=False, widget=forms.CheckboxSelectMultiple, help_text='Only select animals explicitly supported by the source. Leave blank when unknown.')
    class Meta:
        model = Provider
        fields = '__all__'

    def clean(self):
        data = super().clean()
        if (data.get('verified_at') or data.get('emergency_verified_at')) and not data.get('verification_evidence'):
            raise ValidationError('Record the independent verification evidence before marking details or emergency service as verified.')
        for field in ['verified_at', 'emergency_verified_at']:
            if data.get(field) and data[field] > timezone.now():
                self.add_error(field, 'Verification cannot be in the future.')
        return data


@admin.register(ListingRequest)
class ListingAdmin(admin.ModelAdmin):
    form = ReviewForm
    list_display = ['business_name', 'kind', 'status', 'created_at']
    list_filter = ['status', 'kind']
    readonly_fields = ['user', 'created_at']
    search_fields = ['business_name', 'contact_email']

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        Audit.objects.create(actor=request.user, action=f'Listing request {obj.pk}: {obj.status}', details=obj.review_notes)


@admin.register(Provider)
class ProviderAdmin(admin.ModelAdmin):
    form = ProviderReviewForm
    list_display = ['name', 'category', 'verified_at', 'emergency_verified_at']
    search_fields = ['name', 'address']
    list_filter = ['category']
    readonly_fields = ['updated_at']

    def save_model(self, request, obj, form, change):
        previous = Provider.objects.filter(pk=obj.pk).values().first() if change else None
        super().save_model(request, obj, form, change)
        current = Provider.objects.filter(pk=obj.pk).values().first()
        Audit.objects.create(actor=request.user, action=f'Provider {obj.pk}: {"edited" if change else "created"}', details=json.dumps({'before': previous, 'after': current}, default=str))

    def delete_model(self, request, obj):
        Audit.objects.create(actor=request.user, action=f'Provider {obj.pk}: deleted', details=obj.name)
        super().delete_model(request, obj)

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Audit, Metric)
class ReadOnlyAdmin(admin.ModelAdmin):
    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False


class PetPhotoReviewForm(ModelForm):
    photo_revision = forms.CharField(widget=forms.HiddenInput)

    class Meta:
        model = Pet
        fields = ['photo_status', 'photo_review_note']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['photo_revision'].initial = self.instance.photo.name

    def clean(self):
        data = super().clean()
        current = Pet.objects.filter(pk=self.instance.pk).values_list('photo', flat=True).first()
        if data.get('photo_revision') != current:
            raise ValidationError('This photo was replaced while you were reviewing it. Reload and review the new photo before approving.')
        return data


@admin.register(Pet)
class PetPhotoAdmin(admin.ModelAdmin):
    form = PetPhotoReviewForm
    list_display = ['name', 'species', 'owner', 'photo_status', 'photo_reviewed_at']
    list_filter = ['photo_status', 'species']
    search_fields = ['name', 'owner__username']
    fields = ['name', 'species', 'owner', 'photo_preview', 'photo_status', 'photo_review_note', 'photo_reviewed_at', 'photo_revision']
    readonly_fields = ['name', 'species', 'owner', 'photo_preview', 'photo_reviewed_at']

    def get_queryset(self, request):
        return super().get_queryset(request).exclude(photo='')

    def has_add_permission(self, request): return False
    def has_delete_permission(self, request, obj=None): return False

    def get_urls(self):
        return [path('<int:pk>/review-photo/', self.admin_site.admin_view(self.review_photo), name='care_pet_review_photo')] + super().get_urls()

    def review_photo(self, request, pk):
        obj = self.get_object(request, str(pk))
        if not obj or not self.has_view_or_change_permission(request, obj) or not obj.photo:
            raise Http404
        return FileResponse(obj.photo.open('rb'), content_type='application/octet-stream', as_attachment=True, filename=obj.photo.name.rsplit('/',1)[-1]) if request.GET.get('download') else FileResponse(obj.photo.open('rb'))

    @admin.display(description='Photo to review')
    def photo_preview(self, obj):
        return format_html('<img src="{}" alt="Pet photo awaiting review" style="max-width:360px;max-height:360px">', reverse('admin:care_pet_review_photo', args=[obj.pk]))

    def save_model(self, request, obj, form, change):
        if 'photo_status' in form.changed_data or 'photo_review_note' in form.changed_data:
            obj.photo_reviewed_at = timezone.now() if obj.photo_status != 'pending' else None
        super().save_model(request, obj, form, change)
        Audit.objects.create(actor=request.user, action=f'Pet photo {obj.pk}: {obj.photo_status}', details=obj.photo_review_note)


admin.site.site_header = 'Your Pet Care · review desk'
admin.site.site_title = 'Your Pet Care admin'
admin.site.index_title = 'Pet photos, listings and review history'
