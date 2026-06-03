import { auth, db } from "../firebase.js";
import FirebaseAuthRepository from "./FirebaseAuthRepository.js";
import AuthViewModel from "./AuthViewModel.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const loginForm = document.getElementById("login-form");
const signOutButton = document.getElementById("signout-button");
const authStatus = document.getElementById("auth-status");
const messageForm = document.getElementById("message-form");
const messageList = document.getElementById("message-list");
const firestoreStatus = document.getElementById("firestore-status");
const usersList = document.getElementById("users-list");
const usersStatus = document.getElementById("users-status");

// Initialize repository and view model
const authRepo = new FirebaseAuthRepository(auth, db);
const authViewModel = new AuthViewModel(authRepo);

// Subscribe to view model state changes
authViewModel.subscribe((state) => {
  if (state.uiState === "loading") {
    authStatus.textContent = "Loading...";
  } else if (state.uiState === "success") {
    authStatus.textContent = `Sign in successful. Role: ${state.successRole}`;
  } else if (state.uiState === "error") {
    authStatus.textContent = `Error: ${state.errorMessage}`;
  }
});

const messagesCollection = collection(db, "website_messages");

async function refreshMessages() {
  firestoreStatus.textContent = "Loading items...";
  messageList.innerHTML = "";

  try {
    const q = query(messagesCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      firestoreStatus.textContent = "No messages yet.";
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      const item = document.createElement("li");
      item.textContent = `${data.email || "Anonymous"}: ${data.text}`;
      messageList.appendChild(item);
    });
    firestoreStatus.textContent = "Loaded messages.";
  } catch (error) {
    firestoreStatus.textContent = `Error loading messages: ${error.message}`;
  }
}

// Sign in handler
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  authViewModel.email = document.getElementById("email").value.trim();
  authViewModel.password = document.getElementById("password").value;

  await authViewModel.signIn();
});

// Sign out handler
signOutButton.addEventListener("click", async () => {
  await authViewModel.logout(() => {
    authStatus.textContent = "Signed out successfully.";
  });
});

// Message form handler
messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = document.getElementById("message").value.trim();

  if (!text) return;

  messageForm.querySelector("button").disabled = true;

  try {
    await addDoc(messagesCollection, {
      text,
      createdAt: new Date(),
      email: auth.currentUser?.email || null,
    });
    document.getElementById("message").value = "";
    await refreshMessages();
  } catch (error) {
    firestoreStatus.textContent = `Write error: ${error.message}`;
  } finally {
    messageForm.querySelector("button").disabled = false;
  }
});

// Auth state listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    authStatus.textContent = `Signed in as ${user.email}`;
    signOutButton.disabled = false;
  } else {
    authStatus.textContent = "Not signed in.";
    signOutButton.disabled = true;
  }
});

refreshMessages();

// Real-time sync test for 'users' collection
const usersCollection = collection(db, "users");
const unsubscribeUsers = onSnapshot(
  usersCollection,
  (snapshot) => {
    usersList.innerHTML = "";
    if (snapshot.empty) {
      usersStatus.textContent = "No users found.";
      return;
    }
    snapshot.forEach((doc) => {
      const data = doc.data();
      const item = document.createElement("li");
      item.textContent = `User: ${data.name || data.email || doc.id}`;
      usersList.appendChild(item);
    });
    usersStatus.textContent = "Users loaded (real-time).";
  },
  (error) => {
    usersStatus.textContent = `Error loading users: ${error.message}`;
  }
);
