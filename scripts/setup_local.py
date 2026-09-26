"""Create an isolated local secret; optionally create an explicit sample account."""
import argparse
import os
import secrets
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root))
os.chdir(root)
parser = argparse.ArgumentParser()
parser.add_argument('--demo', action='store_true')
args = parser.parse_args()
env = root / '.env'
if not env.exists():
    env.write_text('YPC_DEBUG=true\nYPC_SECRET_KEY=' + secrets.token_urlsafe(64) + '\nYPC_ALLOWED_HOSTS=localhost,127.0.0.1\n', encoding='utf-8')
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
import django
django.setup()
from django.core.management import call_command
call_command('migrate', interactive=False)
if args.demo:
    from django.contrib.auth.models import User
    user, created = User.objects.get_or_create(username='demo', defaults={'email': ''})
    if created:
        user.set_password('Local-Paws-2026!')
        user.save()
        call_command('demo_data', user.username)
        print('Local sample account: demo / Local-Paws-2026! (not an administrator). Delete before any public deployment.')
    else:
        print('Existing demo account preserved; password and records unchanged.')
