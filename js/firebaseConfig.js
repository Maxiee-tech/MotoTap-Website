import { initializeApp } from "https://www.gstatic.com/firebasejs/9.34.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.34.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.34.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.34.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDpbfjsBQ8My221Yzw6hdKvERt9Dm7pc_4",
  authDomain: "mototap-447fe.firebaseapp.com",
  projectId: "mototap-447fe",
  storageBucket: "mototap-447fe.firebasestorage.app",
  messagingSenderId: "359527347402",
  appId: "1:359527347402:web:7e88776bde7e801269f033",
  measurementId: "G-KGPLZ5BB4Z"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };
