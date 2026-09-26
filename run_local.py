"""Serve locally on the configured interface and run the reminder worker."""
import os
import threading
import time
import socket
from pathlib import Path

os.chdir(Path(__file__).resolve().parent)
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
from config.wsgi import application
from django.core.management import call_command
from django.db import close_old_connections
from django.conf import settings
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
    try:
        with socket.create_connection(('127.0.0.1', 8000), timeout=1):
            raise SystemExit('Port 8000 is already in use. Stop the existing local app before restarting.')
    except (ConnectionRefusedError, TimeoutError, OSError):
        pass
    call_command('migrate', interactive=False)
    call_command('collectstatic', interactive=False, verbosity=0)
    threading.Thread(target=reminders, daemon=True).start()
    print('Your Pet Care is running at http://127.0.0.1:8000', flush=True)
    serve(application, host=settings.LOCAL_BIND, port=8000, threads=6)
