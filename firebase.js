import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
export default app;
