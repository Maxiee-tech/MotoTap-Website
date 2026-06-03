# Mototap Website

This is a secure web application that uses the same Firebase backend as your Android app, with proper state management and authentication.

## Features

- **Repository Pattern**: `FirebaseAuthRepository` handles all Firebase operations
- **ViewModel Architecture**: `AuthViewModel` manages authentication state
- **Strong Password Validation**: Real-time password strength feedback
- **Real-time Sync**: Instant data updates across devices using Firestore listeners
- **Role-based Routing**: Automatic redirection based on user role (Driver/Mechanic)
- **Responsive Design**: Dark theme matching MOTO TAP branding
- **Session Persistence**: Auto-loads user dashboard if already signed in

## Quick Start

### 1. Install dependencies:

```bash
npm install
```

### 2. Start dev server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### 3. Build for production:

```bash
npm run build
npm run preview  # Preview the build locally
```

## Project Structure

```
mototap_web/
├── firebase.js                      # Firebase config & SDK initialization
├── index.html                       # Main authentication page
├── vite.config.js                   # Vite build configuration
├── package.json                     # Dependencies & scripts
├── SETUP.md                         # Comprehensive setup & security guide
├── README.md                        # This file
└── js/
    ├── auth-ui.js                   # Authentication UI logic
    ├── AuthViewModel.js             # State management for auth
    ├── PasswordValidator.js         # Password strength validation
    ├── models/                      # Domain model definitions
    │   ├── ChatMessage.js
    │   ├── JobRequest.js
    │   └── UserProfile.js
    ├── repositories/                # Abstract repository interfaces
    │   ├── AuthRepository.js
    │   ├── ChatRepository.js
    │   └── JobRepository.js
    ├── services/                    # Firebase implementation classes
    │   ├── FirebaseAuthService.js
    │   ├── FirebaseChatService.js
    │   └── FirebaseJobService.js
    ├── hooks/                       # React-style hooks for state management
    │   ├── useChat.js
    │   ├── useJobs.js
    │   └── useProfile.js
    └── app.js                       # (Optional) Firestore demo
```

## Architecture

### Repository Pattern
`FirebaseAuthService` implements the abstract repository interface and encapsulates Firebase API calls:
- `signIn()` - Authenticate with email/password
- `signUp()` - Create account and save user profile
- `signOut()` - Terminate session
- `getUserRole()` - Fetch user role from Firestore
- `updateMechanicSkills()` - Update mechanic skills array
- `deleteAccount()` - Delete account with re-authentication

### Service Layer
Firebase services handle all write operations:
- **FirebaseAuthService**: User profile CRUD operations
- **FirebaseJobService**: Job request lifecycle management
- **FirebaseChatService**: Real-time messaging

### Hooks Pattern (React-style)
Custom hooks provide state management for operations:
- `useJobs()` - Job creation, status updates, acceptance
- `useChat()` - Message sending
- `useProfile()` - Profile updates and account deletion

### Write Operations Implemented

#### User Profile Operations
- ✅ Create: User registration with profile data
- ✅ Update: Mechanic skills modification
- ✅ Delete: Account deletion (Firestore + Auth)

#### Job Operations
- ✅ Create: New service requests
- ✅ Update: Status changes, job acceptance
- ✅ Delete: Cancel requests

#### Chat Operations
- ✅ Create: Send messages in job conversations

## Usage Examples

### Using Services Directly
```javascript
import FirebaseJobService, { JobStatus } from "./js/services/FirebaseJobService.js";

const jobService = new FirebaseJobService();

// Create a job
const jobId = await jobService.createJob(
  "driverId", 
  "Engine Issue", 
  "Car won't start", 
  "Downtown", 
  50
);

// Update job status
await jobService.updateJobStatus(jobId, JobStatus.IN_PROGRESS);

// Accept job
await jobService.acceptJob(jobId, "mechanicId");
```

### Using Hooks (React-style)
```javascript
import { useJobs } from "./js/hooks/useJobs.js";

function JobComponent() {
  const { createJob, updateJobStatus, acceptJob, loading, error } = useJobs();
  
  const handleCreate = async () => {
    try {
      const jobId = await createJob(
        currentUser.uid,
        "Brake Issue",
        "Brakes squeaking",
        "Main St",
        75
      );
    } catch (err) {
      console.error("Error:", error);
    }
  };
}
```

### UI Layer
- `auth-ui.js` - Binds UI events to view model methods
- `index.html` - Login form, signup form, and dashboard views

## Security Features

✅ **Password Strength Validation**
- Minimum 8 characters
- Mixed case (uppercase + lowercase)
- Numeric character required
- Special character required
- Real-time feedback during input

✅ **HTTPS Only (Production)**
- Firebase Auth requires HTTPS
- Dev server (HTTP) works locally
- Production deployments must use HTTPS

✅ **Firestore Security Rules**
- Users can only read/write their own data
- Messages are readable by all authenticated users
- Delete restricted to message author

✅ **Re-authentication for Sensitive Operations**
- Account deletion requires password confirmation
- Prevents accidental data loss

## Testing Real-time Sync

1. Open website in browser → Sign up/in
2. Open Android app on another device → Sign in
3. Modify user data in app (e.g., update profile)
4. Watch website update instantly without refresh

If updates appear real-time, sync is working correctly!

## Deployment

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase init hosting
npm run build
firebase deploy
```

Your site will be live at `https://<your-project-id>.web.app`

### Custom Domain

1. Go to Firebase Console → Hosting
2. Click "Connect Custom Domain"
3. Follow DNS verification steps
4. Updates deploy automatically to custom domain

## Configuration

All configuration is in `firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

For sensitive projects, use environment variables (see `SETUP.md`).

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Requires ES2020 support

## Troubleshooting

**"Auth requires HTTPS" error**
- Local dev: Use `http://localhost:5173` (exempt)
- Production: Must deploy with HTTPS

**Password strength not showing**
- Clear browser cache
- Check browser console for import errors

**Real-time updates not working**
- Verify Firestore security rules allow authenticated read
- Check user is properly authenticated
- Open browser DevTools → Network tab for errors

**Build failures**
- Run `npm install` to ensure all dependencies installed
- Delete `node_modules` and reinstall if persistent

For more detailed setup instructions, see `SETUP.md`.

## Next Steps

1. ✅ Local testing with `npm run dev`
2. ✅ Verify Firestore security rules
3. ✅ Build production bundle with `npm run build`
4. ✅ Deploy to Firebase Hosting
5. ✅ Test HTTPS connection and real-time sync

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Vite Documentation](https://vitejs.dev)
- [ES6 JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
