# Cloudinary signed uploads (Firebase Functions)

Requires **Blaze plan**. For **Spark / no billing**, use **Option B (unsigned)** — see below.

Uploads use a **signed Cloudinary preset**. The API secret never ships in the website or Android app — only the Cloud Function signs uploads after validating the Firebase Auth token, user role, MIME type, size, and extension.

## Architecture

```
Browser / Android
    │ 1. Firebase Auth (ID token)
    ▼
getCloudinaryUploadSignature (Cloud Function)
    │ validates file metadata + Firestore role + uid ownership
    │ signs with CLOUDINARY_API_SECRET (server only)
    ▼
Client POST → Cloudinary (signed upload)
    ▼
secure_url → Firestore user profile
```

## 1. Cloudinary Dashboard

1. **Upload preset** → create or edit preset
   - **Signing mode:** Signed (required)
   - **Preset name:** e.g. `mototap_signed` (match `CLOUDINARY_UPLOAD_PRESET` below)
   - Format/size limits are enforced by the backend (`allowed_formats` + metadata checks).

2. **Security** → if you previously exposed your API secret, **rotate it** and update the Firebase secret.

## 2. Configure Firebase Functions

From the repo root:

```bash
cd functions
cp .env.example .env
# Edit .env — API key + cloud name + signed preset name (NOT the secret)
```

Set the API secret (interactive prompt):

```bash
firebase functions:secrets:set CLOUDINARY_API_SECRET
```

`functions/.env`:

```env
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_CLOUD_NAME=deoquaz6p
CLOUDINARY_PRESET_PROFILE_PHOTOS=mototap_profile_photos
CLOUDINARY_PRESET_SIGNUP_DOCUMENTS=mototap_signup_documents
CLOUDINARY_PRESET_VEHICLES=mototap_vehicles
CLOUDINARY_PRESET_USER_UPLOADS=mototap_user_uploads
```

Create **four signed presets** in Cloudinary with these exact names (or match your `.env` values).

Install and deploy:

```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```

Or: `npm run deploy:functions`

## 3. Client / Android

- **Do not** embed `CLOUDINARY_API_SECRET` or `CLOUDINARY_API_KEY` in the web bundle or APK.
- Call callable `getCloudinaryUploadSignature` with `folder`, `fileName`, `mimeType`, `fileSize`.
- POST to Cloudinary using returned signed fields.

Web: `js/services/CloudinaryStorageService.js`

## 4. Server validation (authoritative)

| Check | Location |
|-------|----------|
| MIME type | `functions/src/uploadValidation.js` |
| Extension | same |
| Max size | 5 / 8 / 10 / 15 MB by category |
| Firebase Auth | Callable `request.auth` |
| Ownership | uid from token only |
| Role | Firestore `users/{uid}.role` |
| Cloudinary formats | `allowed_formats` in signed params |

---

## Option B — Unsigned uploads (Spark plan, no Blaze)

Use when Cloud Functions cannot be deployed (free Spark plan).

1. Cloudinary Dashboard → create **Unsigned** upload presets (one per category or one shared).
2. Root `.env` (baked into Vite build):

```env
VITE_CLOUDINARY_UPLOAD_MODE=unsigned
VITE_CLOUDINARY_CLOUD_NAME=deoquaz6p
VITE_CLOUDINARY_PRESET_PROFILE_PHOTOS=mototap_profile_photos
VITE_CLOUDINARY_PRESET_SIGNUP_DOCUMENTS=mototap_signup_documents
VITE_CLOUDINARY_PRESET_VEHICLES=mototap_vehicles
VITE_CLOUDINARY_PRESET_USER_UPLOADS=mototap_user_uploads
```

3. Rebuild and deploy hosting: `npm run build && npx firebase deploy --only hosting`

Client validation still runs; API secret stays out of the bundle. Upgrade to Blaze later and set `VITE_CLOUDINARY_UPLOAD_MODE=signed` after deploying Functions.
