import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";

class FirebaseAuthRepository {
  constructor(auth, firestore) {
    this.auth = auth;
    this.firestore = firestore;
  }

  // Sign in with email/password
  async signIn(email, password) {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      return { success: true };
    } catch (error) {
      console.error("Sign in error:", error.message);
      return { success: false, error: this.mapError(error) };
    }
  }

  // Sign up with email/password and save profile to Firestore
  async signUp(email, password, name, role, phoneNumber) {
    try {
      const result = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      const userId = result.user.uid;

      const userData = {
        uid: userId,
        name: name,
        email: email,
        role: role.toLowerCase().trim(),
        phoneNumber: phoneNumber || null,
      };

      const usersCollection = collection(this.firestore, "users");
      await setDoc(doc(usersCollection, userId), userData);
      return { success: true };
    } catch (error) {
      console.error("Sign up error:", error.message);
      return { success: false, error: this.mapError(error) };
    }
  }

  // Sign out
  async signOut() {
    try {
      await firebaseSignOut(this.auth);
    } catch (error) {
      console.error("Sign out error:", error.message);
    }
  }

  // Get user role from Firestore
  async getUserRole(userId) {
    try {
      const usersCollection = collection(this.firestore, "users");
      const docSnap = await getDoc(doc(usersCollection, userId));
      if (!docSnap.exists()) return null;
      const role = docSnap.data().role;
      return role ? role.toLowerCase().trim() : null;
    } catch (error) {
      console.error("Get user role error:", error.message);
      return null;
    }
  }

  // Get user profile
  async getUserProfile(userId) {
    try {
      const usersCollection = collection(this.firestore, "users");
      const docSnap = await getDoc(doc(usersCollection, userId));
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
      };
    } catch (error) {
      console.error("Get user profile error:", error.message);
      return null;
    }
  }

  // Delete account (requires re-auth)
  async deleteAccount(currentPassword) {
    const user = this.auth.currentUser;
    if (!user || !user.email) {
      return {
        success: false,
        error: "No user signed in or missing email.",
      };
    }

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // Delete Firestore doc
      const usersCollection = collection(this.firestore, "users");
      await deleteDoc(doc(usersCollection, user.uid));

      // Delete Auth account
      await user.delete();
      return { success: true };
    } catch (error) {
      console.error("Delete account error:", error.message);
      return { success: false, error: this.mapError(error) };
    }
  }

  // Helper to map Firebase errors to user-friendly messages
  mapError(error) {
    if (
      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-found"
    ) {
      return "Wrong Email or Password.";
    } else if (error.code === "auth/email-already-in-use") {
      return "This email is already registered.";
    } else if (error.code === "auth/network-request-failed") {
      return "Network error. Please check your connection.";
    }
    return "An error occurred. Please try again.";
  }
}

export default FirebaseAuthRepository;
