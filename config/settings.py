import os
from pathlib import Path
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')
def env(name, default=''):
    # Never inherit unrelated projects' generic environment settings.
    return os.getenv('YPC_' + name, default)

DEBUG = env('DEBUG', 'true').lower() == 'true'
LOCAL_PREVIEW = env('LOCAL_PREVIEW', 'false').lower() == 'true'
PREVIEW_NETWORKS = [value.strip() for value in env('PREVIEW_NETWORKS').split(',') if value.strip()]
LOCAL_BIND = env('LOCAL_BIND', '127.0.0.1')
SECRET_KEY = env('SECRET_KEY', 'local-only-your-pet-care-development-key-not-for-production')
if not DEBUG and (len(SECRET_KEY) < 50 or SECRET_KEY.startswith('local-only')):
    raise ImproperlyConfigured('Set a unique SECRET_KEY of at least 50 characters.')
ALLOWED_HOSTS = env('ALLOWED_HOSTS', 'localhost,127.0.0.1,testserver').split(',')
CSRF_TRUSTED_ORIGINS = env('CSRF_TRUSTED_ORIGINS', 'http://localhost:8000,http://127.0.0.1:8000').split(',')
INSTALLED_APPS = ['django.contrib.admin', 'django.contrib.auth', 'django.contrib.contenttypes', 'django.contrib.sessions', 'django.contrib.messages', 'django.contrib.staticfiles', 'care']
MIDDLEWARE = ['django.middleware.security.SecurityMiddleware', 'whitenoise.middleware.WhiteNoiseMiddleware', 'django.contrib.sessions.middleware.SessionMiddleware', 'django.middleware.common.CommonMiddleware', 'django.middleware.csrf.CsrfViewMiddleware', 'care.middleware.AuthThrottleMiddleware', 'django.contrib.auth.middleware.AuthenticationMiddleware', 'care.middleware.OwnerTimezoneMiddleware', 'django.contrib.messages.middleware.MessageMiddleware', 'django.middleware.clickjacking.XFrameOptionsMiddleware']
ROOT_URLCONF = 'config.urls'
MIDDLEWARE.insert(MIDDLEWARE.index('care.middleware.OwnerTimezoneMiddleware'), 'care.middleware.LocalPreviewMiddleware')
TEMPLATES = [{'BACKEND': 'django.template.backends.django.DjangoTemplates', 'DIRS': [BASE_DIR / 'templates'], 'APP_DIRS': True, 'OPTIONS': {'context_processors': ['django.template.context_processors.request', 'django.contrib.auth.context_processors.auth', 'django.contrib.messages.context_processors.messages', 'care.context.common']}}]
WSGI_APPLICATION = 'config.wsgi.application'
DATA_DIR = Path(env('DATA_DIR', str(BASE_DIR)))
DATA_DIR.mkdir(parents=True, exist_ok=True)
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': DATA_DIR / 'db.sqlite3', 'OPTIONS': {'timeout': 20, 'transaction_mode': 'IMMEDIATE'}}}
AUTH_PASSWORD_VALIDATORS = [{'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'}, {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'}, {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'}, {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'}]
LANGUAGE_CODE = 'en-au'
TIME_ZONE = 'Australia/Brisbane'
USE_TZ = True
STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_ROOT = DATA_DIR / 'private_media'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
LOGIN_URL = '/accounts/login/'
LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_SSL_REDIRECT = not DEBUG
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
DATA_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024
EMAIL_BACKEND = env('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', '')
EMAIL_PORT = int(env('EMAIL_PORT', '587'))
EMAIL_HOST_USER = env('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = env('EMAIL_USE_TLS', 'true').lower() == 'true'
EMAIL_TIMEOUT = 20
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', 'care@localhost')
OSM_USER_AGENT = env('OSM_USER_AGENT', 'YourPetCare-local-development/1.0')
NOMINATIM_URL = env('NOMINATIM_URL', 'https://nominatim.openstreetmap.org/search')
OVERPASS_URL = env('OVERPASS_URL', 'https://overpass-api.de/api/interpreter')
TILE_URL = env('TILE_URL', 'https://tile.openstreetmap.org/{z}/{x}/{y}.png')
