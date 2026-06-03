# Mototap Web - Setup & Security Guide

## Prerequisites

- Node.js (v14+)
- npm or yarn
- Firebase project with Firestore enabled
- Domain with HTTPS support (for production)

## Local Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The dev server will start at `http://localhost:5173` (default Vite port).

## HTTPS Requirement

Firebase Authentication **requires HTTPS** for production. For local development, Vite's dev server works with HTTP, but you must use HTTPS for any remote access.

### Enable HTTPS Locally (Optional)

Create a self-signed certificate for testing:

```bash
# Generate certificate (valid for 365 days)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

Then use Vite with HTTPS:

```bash
# Update package.json scripts
"dev": "vite --host --protocol https --cert cert.pem --key key.pem"
```

## Firestore Security Rules

Set up proper security rules in your Firebase Console → Firestore → Rules:

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Allow authenticated users to write messages
    match /website_messages/{document=**} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow delete: if request.auth.uid == resource.data.uid;
    }

    // Deny all other access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Firebase Authentication Setup

1. Open [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Authentication** → **Sign-in method**
4. Enable **Email/Password**
5. (Optional) Enable **Google Sign-In** if needed

### Update your app to support Google Sign-In

In `js/FirebaseAuthRepository.js`, add Google provider support:

```javascript
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

async signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(this.auth, provider);
    return { success: true };
  } catch (error) {
    return { success: false, error: this.mapError(error) };
  }
}
```

## Password Requirements

The app enforces strong passwords:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*()_+...)

Adjust in `js/PasswordValidator.js` if needed.

## Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` folder.

## Deploy to Firebase Hosting

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Initialize Hosting

```bash
firebase init hosting
```

Select your project and answer prompts:
- Public directory: `dist`
- Single-page app: `Yes`
- GitHub Actions: Choose based on your preference

### 3. Deploy

```bash
npm run build
firebase deploy
```

Your site will be live at `https://<project-id>.web.app`

## Environment Variables

For sensitive config (if not embedding in firebase.js):

Create `.env` file:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Access in code:

```javascript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // ... other values
};
```

## Testing

### Test Real-time Sync

1. Open the website in one browser tab
2. Open your Android app on a device
3. Modify user data in the app
4. Watch the website update in real-time

### Test Authentication

- **Sign up**: Create an account with email/password
- **Login**: Sign in with the same credentials
- **Logout**: Sign out and verify redirect to login form

## Troubleshooting

### "Auth requires HTTPS" Error

- Ensure you're accessing via HTTPS in production
- For local dev, use `http://localhost:5173` (Vite dev server is exempt)

### Firestore read/write fails

- Check Firestore security rules in Firebase Console
- Verify user is authenticated
- Check browser console for detailed error messages

### Password strength not showing

- Ensure `js/PasswordValidator.js` is imported in `js/auth-ui.js`
- Check browser console for import errors

### Real-time sync not updating

- Verify Firestore rules allow `read` for authenticated users
- Check if listener is properly initialized in `js/app.js`

## File Structure

```
mototap_web/
├── firebase.js           # Firebase config & initialization
├── index.html            # Main auth page
├── package.json
├── vite.config.js        # (auto-generated)
├── js/
│   ├── auth-ui.js        # Auth form logic
│   ├── AuthViewModel.js  # State management
│   ├── FirebaseAuthRepository.js
│   ├── PasswordValidator.js
│   └── app.js            # (optional) Firestore demo
└── README.md
```

## Next Steps

1. Test locally with `npm run dev`
2. Verify Firestore rules work as expected
3. Build production bundle with `npm run build`
4. Deploy to Firebase Hosting with `firebase deploy`
5. Test HTTPS connection and real-time sync

## Support

For Firebase issues, refer to:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Console](https://console.firebase.google.com)
- [Firebase Support](https://firebase.google.com/support)
