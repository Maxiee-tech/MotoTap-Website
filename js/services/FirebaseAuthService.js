import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebase.js";
import AuthRepository from "../repositories/AuthRepository.js";

const DEFAULT_TIMEOUT_MS = 25000;

function withTimeout(promise, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Network timeout. Please try again.")), timeoutMs)
    ),
  ]);
}

export default class FirebaseAuthService extends AuthRepository {
  constructor(authInstance = auth, firestore = db) {
    super();
    this.auth = authInstance;
    this.firestore = firestore;
  }

  async signIn(email, password) {
    try {
      await withTimeout(signInWithEmailAndPassword(this.auth, email, password));
      return { success: true };
    } catch (error) {
      console.error("FirebaseAuthService.signIn error:", error);
      return { success: false, error: this.mapError(error) };
    }
  }

  async signUp(email, password, name, role, phoneNumber) {
    try {
      const result = await withTimeout(
        createUserWithEmailAndPassword(this.auth, email, password)
      );
      const userId = result.user.uid;
      const userData = {
        uid: userId,
        name,
        email,
        role: role.toLowerCase().trim(),
        phoneNumber: phoneNumber || "",
        skills: [],
      };
      await withTimeout(
        setDoc(doc(collection(this.firestore, "users"), userId), userData)
      );
      return { success: true };
    } catch (error) {
      console.error("FirebaseAuthService.signUp error:", error);
      return { success: false, error: this.mapError(error) };
    }
  }

  async signOut() {
    try {
      await withTimeout(firebaseSignOut(this.auth));
      return { success: true };
    } catch (error) {
      console.error("FirebaseAuthService.signOut error:", error);
      return { success: false, error: "Unable to sign out. Please try again." };
    }
  }

  async getUserRole(userId) {
    try {
      const docSnap = await withTimeout(
        getDoc(doc(collection(this.firestore, "users"), userId))
      );
      if (!docSnap.exists()) return null;
      return docSnap.data().role?.toLowerCase().trim() || null;
    } catch (error) {
      console.error("FirebaseAuthService.getUserRole error:", error);
      return null;
    }
  }

  async getUserProfile(userId) {
    try {
      const docSnap = await withTimeout(
        getDoc(doc(collection(this.firestore, "users"), userId))
      );
      if (!docSnap.exists()) return null;
      const data = docSnap.data();
      return {
        id: userId,
        name: data.name || "",
        phone: data.phoneNumber || "",
        role:
          String(data.role || "").trim().toLowerCase() === "mechanic"
            ? "mechanic"
            : "customer",
        skills: data.skills || [],
        isAdmin: data.isAdmin === true,
      };
    } catch (error) {
      console.error("FirebaseAuthService.getUserProfile error:", error);
      return null;
    }
  }

  async updateMechanicSkills(userId, skills) {
    try {
      await withTimeout(
        updateDoc(doc(collection(this.firestore, "users"), userId), {
          skills: skills
        })
      );
      return { success: true };
    } catch (error) {
      console.error("FirebaseAuthService.updateMechanicSkills error:", error);
      return { success: false, error: "Failed to update skills" };
    }
  }

  async deleteAccount(currentPassword) {
    const currentUser = this.auth.currentUser;
    if (!currentUser || !currentUser.email) {
      return { success: false, error: "No user signed in." };
    }

    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await withTimeout(
        reauthenticateWithCredential(currentUser, credential)
      );

      await withTimeout(
        deleteDoc(doc(collection(this.firestore, "users"), currentUser.uid))
      );

      await withTimeout(deleteUser(currentUser));
      return { success: true };
    } catch (error) {
      console.error("FirebaseAuthService.deleteAccount error:", error);
      return { success: false, error: this.mapError(error) };
    }
  }

  mapError(error) {
    if (!error || !error.code) return "An error occurred. Please try again.";
    switch (error.code) {
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Wrong Email or Password.";
      case "auth/email-already-in-use":
        return "This email is already registered.";
      case "auth/network-request-failed":
        return "Network error. Please check your connection.";
      case "auth/weak-password":
        return "Password is too weak. Use at least 8 characters.";
      default:
        return error.message || "An error occurred. Please try again.";
    }
  }
}
