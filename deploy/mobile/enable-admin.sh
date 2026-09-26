#!/bin/sh
set -eu
# Run on the existing EC2 host after uploading mobile-server/ and this config.
sudo install -m 644 /tmp/yourpetcare-admin-apache.conf /etc/apache2/yourpetcare-admin.conf
sudo python3 - <<'PY'
from pathlib import Path
from datetime import datetime, timezone
path = Path('/etc/apache2/sites-available/admin.21-holdem.com-le-ssl.conf')
content = path.read_text()
include = '    Include /etc/apache2/yourpetcare-admin.conf'
if include not in content:
    backup = path.with_name(path.name + '.before-petcare-' + datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S'))
    backup.write_text(content)
    path.write_text(content.replace('<VirtualHost *:443>', '<VirtualHost *:443>\n' + include, 1))
env = Path('/etc/yourpetcare/mobile-api.env')
lines = env.read_text().splitlines()
key = 'YPC_ADMIN_PROFILE_URL='
lines = [line for line in lines if not line.startswith(key)]
lines.append(key + 'http://127.0.0.1:3051/api/v1/admin/profile')
for i, line in enumerate(lines):
    if line.startswith('YPC_WEB_ORIGINS=') and 'https://admin.21-holdem.com' not in line:
        lines[i] += ',https://admin.21-holdem.com'
env.write_text('\n'.join(lines) + '\n')
PY
# Apache needs traversal/read access only to this public static admin directory.
sudo chmod 755 /opt/yourpetcare-mobile-api /opt/yourpetcare-mobile-api/admin
sudo chmod 644 /opt/yourpetcare-mobile-api/admin/*
sudo apache2ctl configtest
sudo systemctl restart yourpetcare-api
sudo systemctl reload apache2
curl --fail --silent --retry 10 --retry-connrefused --retry-delay 1 http://127.0.0.1:3060/v1/health
