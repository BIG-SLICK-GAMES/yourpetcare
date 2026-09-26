import sqlite3
import zipfile
from datetime import datetime, timezone, timedelta
from pathlib import Path
from tempfile import TemporaryDirectory
from contextlib import closing
from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Back up SQLite consistently and copy private uploads. Keep output on encrypted storage.'
    def add_arguments(self, parser):
        parser.add_argument('--output', default='backups')

    def handle(self, *args, **options):
        output = Path(options['output']).resolve()
        output.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        destination = output / f'your-pet-care-{stamp}.zip'
        with TemporaryDirectory() as temp:
            db_path = Path(temp) / 'db.sqlite3'
            with closing(sqlite3.connect(settings.DATABASES['default']['NAME'])) as source, closing(sqlite3.connect(db_path)) as target:
                source.backup(target)
            with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as archive:
                archive.write(db_path, 'db.sqlite3')
                if settings.MEDIA_ROOT.exists():
                    for file in settings.MEDIA_ROOT.rglob('*'):
                        if file.is_file():
                            archive.write(file, 'private_media/' + file.relative_to(settings.MEDIA_ROOT).as_posix())
        cutoff = datetime.now(timezone.utc).timestamp() - timedelta(days=30).total_seconds()
        for old in output.glob('your-pet-care-*.zip'):
            if old.is_file() and old.stat().st_mtime < cutoff:
                old.unlink()
        self.stdout.write(self.style.SUCCESS(str(destination)))
