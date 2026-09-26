from django.core.management.base import BaseCommand, CommandError
from care.discovery import geocode, import_nearby, DiscoveryError
from care.models import Provider


class Command(BaseCommand):
    help = 'Fetch attributed real OpenStreetMap listings for an Australian suburb (cached and throttled).'
    def add_arguments(self, parser):
        parser.add_argument('location')

    def handle(self, *args, **options):
        try:
            lat, lon = geocode(options['location'])
            import_nearby(lat, lon)
        except DiscoveryError as exc:
            raise CommandError(str(exc))
        self.stdout.write(f'Imported available listings around {options["location"]}. {Provider.objects.count()} sourced providers stored in this installation.')
