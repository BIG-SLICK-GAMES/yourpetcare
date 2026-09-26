# Mobile API operations

The temporary public API is https://21-holdem.com/yourpetcare-api. On the existing EC2 host, the `yourpetcare-api` systemd service runs `/opt/yourpetcare-mobile-api/src/server.js` as a dedicated service user, listening on loopback port 3060. Apache proxies HTTPS. Private configuration is `/etc/yourpetcare/mobile-api.env` (root/service-group readable only). Never commit or copy that file into a web build.

Required private configuration: `YPC_MONGODB_URI`, `YPC_MONGODB_DATABASE=yourpetcare`, and a precise comma-separated `YPC_WEB_ORIGINS`. Set `YPC_OPENAI_API_KEY` privately to enable AI; `YPC_COMPANION_MODEL` selects the model. Restart the service after environment/source changes. Check `/v1/health` and `/v1/catalog` afterward. Health confirms the process; exercise account persistence separately to check MongoDB.

The initial deployment reused the existing cluster connection credential, which has broader Atlas privileges than this app needs. Before public production, create an app-specific MongoDB user restricted to `yourpetcare`, replace the URI privately and verify backup/retention. Existing game collections are not modified. Local Django/SQLite accounts are not migrated.

## Existing admin integration

`YPC_ADMIN_PROFILE_URL=http://127.0.0.1:3051/api/v1/admin/profile` delegates staff authorization to the existing admin service for every request. No JWT signing secret is duplicated. That service checks the current token, admin role and account status. Expired, revoked, non-admin or unverifiable sessions fail closed.

`admin-apache.conf` mounts public static portal assets at `/pet-care/` on the existing admin HTTPS origin and proxies `/pet-care-api/` to port 3060. The portal reads the same origin's existing `token` storage key; it does not request or store another password. Sign into the existing admin and then open `/pet-care/`. The existing admin frontend/backend source is unchanged; its navigation does not yet contain a pet-care link.

Admins can search usernames and see pet/plan counts, then confirm suspend/restore with a reason. Each change clears mobile login tokens and records actor/time/action/reason in the same account document. The portal does not expose passwords, tokens, chats or pet health details. Admin account deletion/password resets and photo moderation are not implemented. Audit records currently share the account's deletion lifetime; durable independent audit retention is future work.

To update, copy reviewed `mobile-server/src`, `admin` and package files into the service directory, run `npm ci --omit=dev`, then restart the dedicated service. `enable-admin.sh` installs the Apache include after backing up the existing virtual host. Run `apache2ctl configtest` before reload. Existing game/admin application deployments are independent.

Rollback: remove the corresponding Apache Include line or restore its timestamped backup, validate/reload Apache, and restore the previous API source before restarting. Do not remove or overwrite existing game/admin data.


## Admin-managed AI key

Open the AI connection section at https://admin.21-holdem.com/pet-care/ after signing into the existing admin. Create a dedicated OpenAI project key in the OpenAI dashboard, paste it into the password field, Save key, then Test connection. The test makes a small Responses API request. API billing and access to the configured model are needed. The portal never reads the saved secret back.

Keys are encrypted with AES-256-GCM in the app database settings collection. `YPC_KEY_ENCRYPTION_KEY` is a random 32-byte hexadecimal key held in the private server environment, separately from MongoDB. The deployment script generates it only if absent. Protect/back up it with the server configuration; rotating or losing it requires re-saving the OpenAI key. Settings record the last updating staff ID and time. Runtime requests load the saved configuration without a service restart; clients can refresh their connection indicator. Removing the key disables the saved configuration even if a legacy environment key exists.

Audio uploads require a valid owner session and consent, are rate-limited and capped at 4 MB. They are forwarded to OpenAI transcription (`YPC_TRANSCRIPTION_MODEL`, default `gpt-transcribe`) without being written to server disk or MongoDB. The resulting text is part of the normal conversation. No API key, recording or request body is logged.

`POST /v1/walk-routes` is public and sends validated points (30 m?30 km apart) to FOSSGIS routed-foot. A global 1.1-second throttle enforces its maximum 1 request/second policy for this single server process. No route coordinates are stored in Mongo. Multiple API processes require a shared limiter; public routing capacity must be replaced before heavy usage.

Nearby outing stops use the checked-in Brisbane snapshot first. `POST /v1/outing-stops` falls back outside coverage to Private.coffee Overpass with approximate coordinates, a 15-second global throttle and bounded 30-minute cache. Public Overpass availability has been unreliable during testing; Brisbane council/venue records remain available locally. Do not rely on this fallback for a large production launch. Source snapshots live under src and deploy with the API.
