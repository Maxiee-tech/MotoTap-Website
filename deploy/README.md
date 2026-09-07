# Deploy MotoTap behind the host-wide caddy-docker-proxy

The server runs one Caddy for everything (`/root/caddy`,
`lucaslorentz/caddy-docker-proxy`). It reads `caddy.*` labels from every
running container and generates its config automatically -- there is no
Caddyfile to edit or sync anymore. Publishing or redeploying a site is just
`docker compose up -d` on that app's own compose file.

```
internet :80/:443
      |
  caddy-docker-proxy  (/root/caddy, owns 80/443, auto-HTTPS, reads labels)
      |  shared `caddy` network (external)
      +-- snipeit app      -> assets.priyav.dev   (labels in ~/snipeit/compose)
      +-- mototap-web      -> mototap.co.ke       (labels in this repo)
      +-- mototap www      -> www.mototap.co.ke   (301 redirect, idle container)
```

Header ownership: the app's image sets `X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy` (see the root
`Caddyfile`, baked into the image). The host proxy adds `Strict-Transport-
Security`. Do not duplicate headers across the two layers -- caddy-docker-
proxy header labels **append**, so doubling is the symptom if you do.

## Prerequisite: DNS

`mototap.co.ke` (and `www.`) must resolve to the server **before** first
request -- Caddy issues certs automatically. The server is dual-stack; add
both an **A** record (IPv4) and an **AAAA** record (IPv6).

## Steps on the server

```sh
# 1. Clone (or pull) MotoTap.
cd ~ && git clone <repo> mototap   # or: cd ~/mototap && git pull

# 2. The host-wide proxy must be up (it creates the shared `caddy` network).
cd ~/caddy && docker compose ps

# 3. Create .env (from .env.example) with VITE_GOOGLE_MAPS_API_KEY etc.
cd ~/mototap && cp .env.example .env && $EDITOR .env

# 4. Build + start (joins the `caddy` network, publishes via labels).
docker compose up -d --build

# 5. Verify.
curl -sI https://mototap.co.ke | head
curl -sI https://www.mototap.co.ke | head    # expect 301 -> apex
```

## Notes

- No host ports on mototap -- only caddy-docker-proxy talks to it, over the
  shared `caddy` network. Check membership with
  `docker network inspect caddy`.
- To redeploy after a code change (required for `mototap.co.ke` to match
  Firebase Hosting): use `deploy/deploy.sh` (rsync + rebuild), or manually:
  ```sh
  cd ~/mototap && git pull origin main && docker compose up -d --build
  ```
- `mototap-447fe.web.app` is deployed separately via `firebase deploy --only hosting`.
  Pushing to GitHub does **not** update `mototap.co.ke` until you rebuild the
  Docker container on the server.
- Google Maps: the browser API key must allow **both** origins in HTTP referrers:
  `https://mototap-447fe.web.app/*` and `https://mototap.co.ke/*`.
- Create `~/mototap/.env` on the server (from `.env.example`) with
  `VITE_GOOGLE_MAPS_API_KEY` before `docker compose up -d --build` so Maps
  loads in the production container build.
- Deploy Firestore rules after security updates:
  `firebase deploy --only firestore:rules`
- **Android app updates:** keep `public/app-version.json` in sync with the APK you
  publish. Bump `versionCode` / `versionName` to match `app/build.gradle.kts`, set
  `apkUrl` to the Cloudflare download link, and optionally `"forceUpdate": true`.
  Redeploy hosting (`npm run deploy:hosting`) so the app can see the new file at
  `/app-version.json`. Optionally also host the same JSON on the Cloudflare worker.
- **Password reset / auth emails:** Firebase reset links expire in ~1 hour (not
  configurable). Customize action URL in Firebase Console must use a Firebase
  Hosting domain with the reserved path `/__/auth/action` (custom paths and
  non-Hosting domains like Docker-served `mototap.co.ke` are rejected). Current
  setting: `https://mototap-447fe.web.app/__/auth/action`. That applies to all
  Auth email templates. Hosting also ships `/auth/action` as an optional custom
  handler page if Console later allows a non-`/__/` path.
- **Cloudinary uploads:** require Firebase Functions (`getCloudinaryUploadSignature`).
  See [deploy/CLOUDINARY_FUNCTIONS.md](./CLOUDINARY_FUNCTIONS.md). Deploy with:
  `npm run deploy:functions`
