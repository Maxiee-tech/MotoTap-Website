# Deploy MotoTap behind snipeit's existing Caddy

Simple approach: reuse the Caddy already running in `~/snipeit`. Add a
`mototap.co.ke` site block to its Caddyfile and attach the MotoTap container
to snipeit's docker network so Caddy can reach it by name.

```
internet :80/:443
      |
  snipeit Caddy  (~/snipeit, owns 80/443, auto-HTTPS)
      |  snipeit_default network (no host ports)
      +-- app          -> assets.priyav.dev
      +-- mototap-web  -> mototap.co.ke
```

## Prerequisite: DNS

`mototap.co.ke` must resolve to the server's public IP **before** first
request — Caddy issues the cert on first hit. Server is IPv6-only, so add an
**AAAA** record pointing at the server's IPv6 address.

## Steps on the server

```sh
# 1. Clone (or pull) MotoTap.
cd ~ && git clone <repo> mototap   # or: cd ~/mototap && git pull

# 2. snipeit must be up (it owns the network + Caddy).
cd ~/snipeit && docker compose ps

# 3. Replace ~/snipeit/Caddyfile with deploy/snipeit/Caddyfile
#    (original assets block + new mototap.co.ke block), then reload Caddy:
cp ~/mototap/deploy/snipeit/Caddyfile ~/snipeit/Caddyfile
cd ~/snipeit && docker compose up -d caddy   # or: docker compose restart caddy

# 4. Build + start mototap (joins snipeit_default, no host ports).
cd ~/mototap && docker compose up -d --build

# 5. Verify.
docker network inspect snipeit_default --format '{{range .Containers}}{{.Name}} {{end}}'
#   -> should list both `app` (or snipeit-app) and `mototap-web`
curl -sI https://mototap.co.ke | head
```

## Notes

- Container name is `mototap-web`; Caddy reaches it via `reverse_proxy
  mototap-web:80` over docker DNS on the shared network.
- If snipeit's network is named something other than `snipeit_default`, check
  with `docker network ls` and update `networks:` in
  `~/mototap/docker-compose.yml` to match.
- No host ports on mototap — only Caddy talks to it. To redeploy after a code
  change (required for `mototap.co.ke` to match Firebase Hosting):
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
- **Cloudinary uploads:** require Firebase Functions (`getCloudinaryUploadSignature`).
  See [deploy/CLOUDINARY_FUNCTIONS.md](./CLOUDINARY_FUNCTIONS.md). Deploy with:
  `npm run deploy:functions`
