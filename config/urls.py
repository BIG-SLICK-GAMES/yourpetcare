from django.contrib import admin
from django.urls import path, include
from care import views
from care import discovery

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/signup/', views.signup, name='signup'),
    path('accounts/', include('django.contrib.auth.urls')),
    path('', views.home, name='home'),
    path('pets/', views.pets, name='pets'),
    path('pets/add/', views.edit, {'kind': 'pet'}, name='pet-add'),
    path('pets/<int:pk>/', views.pet_detail, name='pet-detail'),
    path('pets/<int:pk>/edit/', views.edit, {'kind': 'pet'}, name='pet-edit'),
    path('calendar/', views.care_calendar, name='calendar'),
    path('calendar/export/', views.calendar_export, name='calendar-export'),
    path('tasks/add/', views.edit, {'kind': 'task'}, name='task-add'),
    path('tasks/<int:pk>/edit/', views.edit, {'kind': 'task'}, name='task-edit'),
    path('tasks/<int:pk>/action/', views.task_action, name='task-action'),
    path('supplies/', views.supplies, name='supplies'),
    path('supplies/add/', views.edit, {'kind': 'supply'}, name='supply-add'),
    path('supplies/<int:pk>/edit/', views.edit, {'kind': 'supply'}, name='supply-edit'),
    path('supplies/<int:pk>/action/', views.supply_action, name='supply-action'),
    path('records/add/', views.edit, {'kind': 'record'}, name='record-add'),
    path('records/<int:pk>/edit/', views.edit, {'kind': 'record'}, name='record-edit'),
    path('files/<str:kind>/<int:pk>/', views.private_file, name='private-file'),
    path('find-care/', discovery.find_care, name='find-care'),
    path('providers/<int:pk>/', discovery.provider_detail, name='provider'),
    path('providers/<int:pk>/attach/', discovery.attach_provider, name='attach-provider'),
    path('providers/<int:pk>/contact/', discovery.contact_provider, name='contact-provider'),
    path('business/submit/', views.listing_request, name='listing-request'),
    path('business/requests/', views.my_requests, name='my-requests'),
    path('settings/', views.settings_view, name='settings'),
    path('settings/export/', views.export_data, name='export-data'),
    path('settings/delete/', views.delete_account, name='delete-account'),
    path('privacy/', views.privacy, name='privacy'),
]
