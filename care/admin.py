from django.contrib import admin
from django.core.exceptions import ValidationError
from django.forms import ModelForm
from django.utils import timezone
import json
from .models import Provider, ListingRequest, Audit, Metric


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


admin.site.site_header = 'Your Pet Care · review desk'
admin.site.site_title = 'Your Pet Care admin'
admin.site.index_title = 'Listings, evidence and audit history'
