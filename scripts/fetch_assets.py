"""Fetch pinned Leaflet and self-hosted Google Fonts assets; run only when updating vendors."""
from pathlib import Path
import re
import requests

root = Path(__file__).resolve().parent.parent / 'static'
font_dir = root / 'fonts'
font_dir.mkdir(exist_ok=True)
for path, filename in [('dmsans/DMSans%5Bopsz,wght%5D.ttf', 'dm-sans'), ('manrope/Manrope%5Bwght%5D.ttf', 'manrope')]:
    font = requests.get('https://raw.githubusercontent.com/google/fonts/main/ofl/' + path, timeout=25)
    font.raise_for_status()
    (font_dir / (filename + '.ttf')).write_bytes(font.content)
for family, path in [('dm-sans', 'dmsans'), ('manrope', 'manrope')]:
    response = requests.get(f'https://raw.githubusercontent.com/google/fonts/main/ofl/{path}/OFL.txt', timeout=25)
    response.raise_for_status()
    licence = '\n'.join(line.rstrip() for line in response.text.splitlines()) + '\n'
    (font_dir / (family + '-OFL.txt')).write_bytes(licence.encode('utf-8'))
print('Fonts downloaded with their licences.')
