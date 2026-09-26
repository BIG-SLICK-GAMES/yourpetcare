"""Serve only on loopback and generate reminders while the local app is running."""
import os
import threading
import time
from pathlib import Path

os.chdir(Path(__file__).resolve().parent)
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
from config.wsgi import application
from django.core.management import call_command
from django.db import close_old_connections
from waitress import serve


def reminders():
    while True:
        try:
            close_old_connections()
            call_command('send_reminders')
        except Exception as exc:
            print(f'Reminder worker needs attention: {type(exc).__name__}', flush=True)
        finally:
            close_old_connections()
        time.sleep(60)


if __name__ == '__main__':
    call_command('migrate', interactive=False)
    call_command('collectstatic', interactive=False, verbosity=0)
    threading.Thread(target=reminders, daemon=True).start()
    print('Your Pet Care is running at http://127.0.0.1:8000', flush=True)
    serve(application, host='127.0.0.1', port=8000, threads=6)
