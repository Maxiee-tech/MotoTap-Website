import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
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
import { normalizeUserRole } from "../utils/geo.js";
import {
  mapFirestoreUserDoc,
  toFirestoreRole,
  ProfileStatus,
  defaultProfileStatusForRole,
  UserRole,
} from "../models/UserProfile.js";
import { vehiclesForFirestore } from "../models/VehicleProfile.js";
import {
  buildPublicProfileData,
  PUBLIC_PROFILES_COLLECTION,
} from "../utils/publicProfile.js";

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

  userDocRef(userId) {
    return doc(collection(this.firestore, "users"), userId);
  }

  publicProfileDocRef(userId) {
    return doc(collection(this.firestore, PUBLIC_PROFILES_COLLECTION), userId);
  }

  async getPublicProfile(userId) {
    try {
      const docSnap = await withTimeout(getDoc(this.publicProfileDocRef(userId)));
      if (!docSnap.exists()) return null;
      return { id: userId, ...docSnap.data() };
    } catch (error) {
      console.error("FirebaseAuthService.getPublicProfile error:", error);
      return null;
    }
  }

  /** Spark plan: sync non-PII fields to publicProfiles (no Cloud Functions required). */
  async syncPublicProfile(userId, profileData) {
    const publicRef = this.publicProfileDocRef(userId);
    const existing = await withTimeout(getDoc(publicRef));
    const payload = buildPublicProfileData(
      { ...profileData, id: userId, uid: userId },
      { forCreate: !existing.exists() }
    );
    if (!payload.userId || !payload.name) return;
    await withTimeout(setDoc(publicRef, payload, { merge: true }));
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

  /** Step 1: Firebase Auth account + minimal Firestore profile (Android-aligned). */
  async signUp(email, password, name, role, phoneNumber) {
    try {
      const result = await withTimeout(
        createUserWithEmailAndPassword(this.auth, email, password)
      );
      const userId = result.user.uid;
      const phone = String(phoneNumber || "").trim();
      const firestoreRole = toFirestoreRole(role);
      const userData = {
        uid: userId,
        id: userId,
        name: String(name || "").trim(),
        email: String(email || "").trim(),
        phone,
        phoneNumber: phone,
        role: firestoreRole,
        status: defaultProfileStatusForRole(firestoreRole),
        onboardingStep: 1,
        onboardingComplete: false,
        rating: 0,
        reviewCount: 0,
        skills: [],
      };
      await withTimeout(setDoc(this.userDocRef(userId), userData));
      if (firestoreRole === UserRole.DRIVER) {
        await withTimeout(
          sendEmailVerification(result.user, {
            url: `${window.location.origin}/`,
            handleCodeInApp: false,
          })
        ).catch((error) => {
          console.error("FirebaseAuthService.sendEmailVerification error:", error);
        });
      }
      await this.syncPublicProfile(userId, userData);
      return { success: true, userId };
    } catch (error) {
      console.error("FirebaseAuthService.signUp error:", error);
      return { success: false, error: this.mapError(error) };
    }
  }

  async updateSignupProfile(userId, partialData) {
    try {
      await withTimeout(updateDoc(this.userDocRef(userId), partialData));
      const docSnap = await withTimeout(getDoc(this.userDocRef(userId)));
      if (docSnap.exists()) {
        await this.syncPublicProfile(userId, mapFirestoreUserDoc(userId, docSnap.data()));
      }
      return { success: true };
    } catch (error) {
      console.error("FirebaseAuthService.updateSignupProfile error:", error);
      return { success: false, error: "Failed to save profile. Please try again." };
    }
  }

  async completeSignupStep2(userId, { profilePhotoUrl, idNumber, idPhotoUrl, role }) {
    const firestoreRole = toFirestoreRole(role);
    const payload = {
      profilePhotoUrl,
      idPhotoUrl,
      idNumber: String(idNumber || "").trim(),
      onboardingStep: 2,
    };
    if (firestoreRole === "MECHANIC" || firestoreRole === "PARTS_DEALER") {
      payload.certificateNumber = payload.idNumber;
    }
    return this.updateSignupProfile(userId, payload);
  }

  async completeSignupStep3Driver(userId, data) {
    return this.updateSignupProfile(userId, {
      vehicleType: String(data.vehicleType || "").trim(),
      vehicleModel: String(data.vehicleModel || "").trim(),
      numberPlate: String(data.numberPlate || "").trim(),
      vehiclePhotoUrl: data.vehiclePhotoUrl,
      onboardingStep: 3,
      onboardingComplete: true,
      status: ProfileStatus.APPROVED,
    });
  }

  async completeSignupStep3Mechanic(userId, data) {
    return this.updateSignupProfile(userId, {
      institutionName: String(data.institutionName || "").trim(),
      experienceYears: String(data.experienceYears || "").trim(),
      certificatePhotoUrl: data.certificatePhotoUrl,
      garagePhotos: Array.isArray(data.garagePhotos) ? data.garagePhotos : [],
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      address: String(data.address || "").trim(),
      onboardingStep: 3,
      onboardingComplete: true,
      status: ProfileStatus.PENDING,
    });
  }

  async completeSignupStep3PartsDealer(userId, data) {
    return this.completeSignupStep3Mechanic(userId, data);
  }

  async sendDriverEmailVerification() {
    const user = this.auth.currentUser;
    if (!user) {
      return { success: false, error: "No user signed in." };
    }
    if (user.emailVerified) {
      return { success: true, alreadyVerified: true };
    }

    try {
      await withTimeout(
        sendEmailVerification(user, {
          url: `${window.location.origin}/`,
          handleCodeInApp: false,
        })
      );
      return { success: true };
    } catch (error) {
      console.error("FirebaseAuthService.sendDriverEmailVerification error:", error);
      return { success: false, error: this.mapError(error) };
    }
  }

  async reloadCurrentUser() {
    const user = this.auth.currentUser;
    if (!user) {
      return { success: false, verified: false };
    }

    try {
      await withTimeout(reload(user));
      return { success: true, verified: user.emailVerified === true };
    } catch (error) {
      console.error("FirebaseAuthService.reloadCurrentUser error:", error);
      return { success: false, verified: false, error: this.mapError(error) };
    }
  }

  async sendPasswordReset(email) {
    const trimmed = String(email || "").trim();
    if (!trimmed) {
      return { success: false, error: "Please enter your email address." };
    }

    try {
      await withTimeout(
        sendPasswordResetEmail(this.auth, trimmed, {
          url: `${window.location.origin}/`,
          handleCodeInApp: false,
        })
      );
      return { success: true };
    } catch (error) {
      console.error("FirebaseAuthService.sendPasswordReset error:", error);
      // Don't reveal whether an account exists: treat "user not found" as success
      // so the neutral "if an account exists, a link was sent" message is shown.
      if (error?.code === "auth/user-not-found") {
        return { success: true };
      }
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
      const docSnap = await withTimeout(getDoc(this.userDocRef(userId)));
      if (!docSnap.exists()) return null;
      return normalizeUserRole(docSnap.data().role);
    } catch (error) {
      console.error("FirebaseAuthService.getUserRole error:", error);
      return null;
    }
  }

  async getUserProfile(userId) {
    try {
      const docSnap = await withTimeout(getDoc(this.userDocRef(userId)));
      if (!docSnap.exists()) return null;
      const profile = mapFirestoreUserDoc(userId, docSnap.data());
      if (userId === this.auth.currentUser?.uid) {
        const role = normalizeUserRole(profile.role);
        if (role === "driver" && profile.status === ProfileStatus.PENDING) {
          profile.status = ProfileStatus.APPROVED;
          updateDoc(this.userDocRef(userId), { status: ProfileStatus.APPROVED }).catch(() => {});
        }
        this.syncPublicProfile(userId, profile).catch(() => {});
      }
      return {
        ...profile,
        phone: profile.phone || docSnap.data().phoneNumber || "",
        role: normalizeUserRole(profile.role),
      };
    } catch (error) {
      console.error("FirebaseAuthService.getUserProfile error:", error);
      return null;
    }
  }

  async updateMechanicSkills(userId, skills, servicePrices = null) {
    try {
      const payload = {
        skills,
        availableServices: skills,
      };
      if (servicePrices !== null) {
        payload.servicePrices = servicePrices;
      }
      await withTimeout(updateDoc(this.userDocRef(userId), payload));
      const docSnap = await withTimeout(getDoc(this.userDocRef(userId)));
      if (docSnap.exists()) {
        await this.syncPublicProfile(userId, mapFirestoreUserDoc(userId, docSnap.data()));
      }
      return { success: true };
    } catch (error) {
      console.error("FirebaseAuthService.updateMechanicSkills error:", error);
      return { success: false, error: "Failed to update skills" };
    }
  }

  async updatePartsDealerInventory(userId, parts, partPrices = null) {
    try {
      const payload = {
        parts,
        availableParts: parts,
      };
      if (partPrices !== null) {
        payload.partPrices = partPrices;
      }
      await withTimeout(updateDoc(this.userDocRef(userId), payload));
      const docSnap = await withTimeout(getDoc(this.userDocRef(userId)));
      if (docSnap.exists()) {
        await this.syncPublicProfile(userId, mapFirestoreUserDoc(userId, docSnap.data()));
      }
      return { success: true };
    } catch (error) {
      console.error("FirebaseAuthService.updatePartsDealerInventory error:", error);
      return { success: false, error: "Failed to update parts inventory" };
    }
  }

  /** Persist the driver's vehicles[] array (Android-aligned fleet management). */
  async updateUserVehicles(userId, vehicles) {
    try {
      const payload = vehiclesForFirestore(vehicles);
      await withTimeout(
        updateDoc(this.userDocRef(userId), {
          vehicles: payload,
        })
      );
      return { success: true, vehicles: payload };
    } catch (error) {
      console.error("FirebaseAuthService.updateUserVehicles error:", error);
      return { success: false, error: "Failed to save vehicles. Please try again." };
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

      await withTimeout(deleteDoc(this.userDocRef(currentUser.uid)));
      await withTimeout(deleteDoc(this.publicProfileDocRef(currentUser.uid))).catch(() => {});

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
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/email-already-in-use":
        return "This email is already registered.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a few minutes and try again.";
      case "auth/network-request-failed":
        return "Network error. Please check your connection.";
      case "auth/weak-password":
        return "Password is too weak. Use at least 8 characters.";
      default:
        return error.message || "An error occurred. Please try again.";
    }
  }
}
