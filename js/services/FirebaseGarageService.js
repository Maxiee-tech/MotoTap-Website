import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase.js";
import {
  GARAGES_COLLECTION,
  GARAGE_INVITES_COLLECTION,
  GarageMemberRole,
  GarageMemberStatus,
  GarageStatus,
  generateInviteCode,
  normalizeGarage,
  normalizeGarageMember,
  normalizeInviteCode,
} from "../models/Garage.js";

const DEFAULT_TIMEOUT_MS = 25000;

function withTimeout(promise, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Network timeout. Please try again.")), timeoutMs)
    ),
  ]);
}

export default class FirebaseGarageService {
  constructor(firestore = db) {
    this.firestore = firestore;
  }

  garageRef(garageId) {
    return doc(this.firestore, GARAGES_COLLECTION, garageId);
  }

  memberRef(garageId, uid) {
    return doc(this.firestore, GARAGES_COLLECTION, garageId, "members", uid);
  }

  inviteRef(code) {
    return doc(this.firestore, GARAGE_INVITES_COLLECTION, normalizeInviteCode(code));
  }

  async getGarage(garageId) {
    if (!garageId) return null;
    const snap = await withTimeout(getDoc(this.garageRef(garageId)));
    if (!snap.exists()) return null;
    return normalizeGarage({ id: snap.id, ...snap.data() });
  }

  async listMembers(garageId) {
    if (!garageId) return [];
    const snap = await withTimeout(
      getDocs(collection(this.firestore, GARAGES_COLLECTION, garageId, "members"))
    );
    return snap.docs
      .map((docItem) => normalizeGarageMember({ uid: docItem.id, ...docItem.data() }))
      .filter((member) => member.status !== GarageMemberStatus.REMOVED)
      .sort((a, b) => {
        if (a.role === GarageMemberRole.OWNER && b.role !== GarageMemberRole.OWNER) return -1;
        if (b.role === GarageMemberRole.OWNER && a.role !== GarageMemberRole.OWNER) return 1;
        return a.displayName.localeCompare(b.displayName);
      });
  }

  async lookupInvite(code) {
    const inviteCode = normalizeInviteCode(code);
    if (!inviteCode) return null;

    const inviteSnap = await withTimeout(getDoc(this.inviteRef(inviteCode)));
    if (!inviteSnap.exists()) return null;

    const invite = inviteSnap.data() || {};
    if (invite.active === false) return null;

    const garageId = String(invite.garageId || "").trim();
    if (!garageId) return null;

    const garage = await this.getGarage(garageId);
    if (!garage || garage.status === GarageStatus.REJECTED) return null;

    return { inviteCode, garage, invite };
  }

  /**
   * Create a garage owned by the given mechanic (garage-of-one).
   * Writes garage first, then membership, invite mapping, and user garage links.
   */
  async createGarageForOwner(ownerId, profile = {}) {
    const uid = String(ownerId || "").trim();
    if (!uid) return { success: false, error: "Missing owner id." };

    const existingUser = await withTimeout(getDoc(doc(this.firestore, "users", uid)));
    if (existingUser.exists() && existingUser.data()?.garageId) {
      const garage = await this.getGarage(existingUser.data().garageId);
      return { success: true, garage, alreadyExists: true };
    }

    const inviteCode = await this.allocateInviteCode();
    const garageRef = doc(collection(this.firestore, GARAGES_COLLECTION));
    const now = Date.now();
    const name =
      String(profile.institutionName || profile.name || "Garage").trim().slice(0, 120) ||
      "Garage";
    const garageData = {
      name,
      address: String(profile.address || "").trim().slice(0, 300),
      latitude:
        typeof profile.latitude === "number" && Number.isFinite(profile.latitude)
          ? profile.latitude
          : null,
      longitude:
        typeof profile.longitude === "number" && Number.isFinite(profile.longitude)
          ? profile.longitude
          : null,
      garagePhotos: Array.isArray(profile.garagePhotos)
        ? profile.garagePhotos.slice(0, 5)
        : [],
      ownerId: uid,
      status: GarageStatus.PENDING,
      inviteCode,
      memberCount: 1,
      skills: [],
      servicePrices: {},
      createdAtMillis: now,
      updatedAtMillis: now,
    };

    // Garage must exist before invite/member rules can verify ownership.
    await withTimeout(setDoc(garageRef, garageData));

    const batch = writeBatch(this.firestore);
    batch.set(this.memberRef(garageRef.id, uid), {
      uid,
      displayName: String(profile.name || "").trim().slice(0, 120),
      role: GarageMemberRole.OWNER,
      status: GarageMemberStatus.ACTIVE,
      joinedAtMillis: now,
    });
    batch.set(this.inviteRef(inviteCode), {
      garageId: garageRef.id,
      ownerId: uid,
      active: true,
      createdAtMillis: now,
    });
    batch.update(doc(this.firestore, "users", uid), {
      garageId: garageRef.id,
      garageRole: GarageMemberRole.OWNER,
      institutionName: name,
    });

    await withTimeout(batch.commit());

    return {
      success: true,
      garage: normalizeGarage({ id: garageRef.id, ...garageData }),
    };
  }

  /**
   * Join an existing garage via invite code.
   * Copies garage location onto the mechanic profile for map discovery.
   * If this user accidentally owns a solo garage (e.g. created mid-signup), abandon it and join.
   */
  async joinGarageWithInvite(userId, inviteCode, profile = {}) {
    const uid = String(userId || "").trim();
    if (!uid) return { success: false, error: "Missing user id." };

    const lookup = await this.lookupInvite(inviteCode);
    if (!lookup) {
      return { success: false, error: "Invalid or expired garage invite code." };
    }

    const { garage } = lookup;
    const userRef = doc(this.firestore, "users", uid);
    const userSnap = await withTimeout(getDoc(userRef));
    if (!userSnap.exists()) {
      return { success: false, error: "Complete account setup before joining a garage." };
    }

    let existingGarageId = String(userSnap.data()?.garageId || "").trim();
    if (existingGarageId && existingGarageId !== garage.id) {
      const existingGarage = await this.getGarage(existingGarageId);
      const ownsSoloGarage =
        existingGarage &&
        existingGarage.ownerId === uid &&
        Number(existingGarage.memberCount || 1) <= 1;

      if (!ownsSoloGarage) {
        return { success: false, error: "You already belong to another garage." };
      }

      // Abandon the accidental solo garage so invite join can proceed.
      try {
        await withTimeout(
          setDoc(
            this.memberRef(existingGarageId, uid),
            {
              uid,
              displayName: String(userSnap.data()?.name || "").trim().slice(0, 120),
              role: GarageMemberRole.OWNER,
              status: GarageMemberStatus.REMOVED,
              joinedAtMillis: Date.now(),
            },
            { merge: true }
          )
        );
      } catch (error) {
        console.warn("Could not mark solo garage membership removed:", error);
      }

      await withTimeout(
        updateDoc(userRef, {
          garageId: "",
          garageRole: "",
        })
      );
      existingGarageId = "";
    }

    if (existingGarageId === garage.id) {
      const existingMember = await this.getMember(garage.id, uid);
      if (existingMember?.status === GarageMemberStatus.ACTIVE) {
        return { success: true, garage, alreadyMember: true };
      }
      if (existingMember?.status === GarageMemberStatus.PENDING) {
        return { success: true, garage, pendingApproval: true };
      }
    }

    if (garage.ownerId === uid) {
      return { success: true, garage, alreadyMember: true };
    }

    const now = Date.now();
    const memberRef = this.memberRef(garage.id, uid);

    await withTimeout(
      setDoc(
        memberRef,
        {
          uid,
          displayName: String(profile.name || userSnap.data()?.name || "").trim().slice(0, 120),
          role: GarageMemberRole.MECHANIC,
          status: GarageMemberStatus.PENDING,
          joinedAtMillis: now,
        },
        { merge: true }
      )
    );

    await withTimeout(
      updateDoc(userRef, {
        garageId: garage.id,
        garageRole: GarageMemberRole.MECHANIC,
        garageMemberStatus: GarageMemberStatus.PENDING,
        institutionName: garage.name,
        address: garage.address || "",
        latitude: garage.latitude,
        longitude: garage.longitude,
        garagePhotos: garage.garagePhotos || [],
      })
    );

    return { success: true, garage, pendingApproval: true };
  }

  async getMember(garageId, memberId) {
    if (!garageId || !memberId) return null;
    const snap = await withTimeout(getDoc(this.memberRef(garageId, memberId)));
    if (!snap.exists()) return null;
    return normalizeGarageMember({ uid: snap.id, ...snap.data() });
  }

  /**
   * Owner approves a pending joiner. The joiner's client upgrades their own
   * user.status to APPROVED when they see membership become active.
   */
  async approveMember(garageId, ownerId, memberId) {
    const garage = await this.getGarage(garageId);
    if (!garage) return { success: false, error: "Garage not found." };
    if (garage.ownerId !== ownerId) {
      return { success: false, error: "Only the garage owner can approve join requests." };
    }
    const member = await this.getMember(garageId, memberId);
    if (!member || member.status === GarageMemberStatus.REMOVED) {
      return { success: false, error: "Join request not found." };
    }
    if (member.status === GarageMemberStatus.ACTIVE) {
      return { success: true, alreadyActive: true };
    }

    await withTimeout(
      setDoc(
        this.memberRef(garageId, memberId),
        {
          uid: memberId,
          displayName: member.displayName,
          role: GarageMemberRole.MECHANIC,
          status: GarageMemberStatus.ACTIVE,
          joinedAtMillis: member.joinedAtMillis || Date.now(),
          approvedAtMillis: Date.now(),
        },
        { merge: true }
      )
    );

    // Best-effort memberCount bump (owner can write garage doc).
    try {
      await withTimeout(
        updateDoc(this.garageRef(garageId), {
          memberCount: Math.max(1, Number(garage.memberCount || 1)) + 1,
          updatedAtMillis: Date.now(),
        })
      );
    } catch (error) {
      console.warn("Could not bump garage memberCount:", error);
    }

    return { success: true };
  }

  async rejectMember(garageId, ownerId, memberId) {
    const garage = await this.getGarage(garageId);
    if (!garage) return { success: false, error: "Garage not found." };
    if (garage.ownerId !== ownerId) {
      return { success: false, error: "Only the garage owner can reject join requests." };
    }
    const member = await this.getMember(garageId, memberId);
    if (!member) {
      return { success: false, error: "Join request not found." };
    }

    await withTimeout(
      setDoc(
        this.memberRef(garageId, memberId),
        {
          uid: memberId,
          displayName: member.displayName,
          role: member.role || GarageMemberRole.MECHANIC,
          status: GarageMemberStatus.REMOVED,
          joinedAtMillis: member.joinedAtMillis || Date.now(),
          rejectedAtMillis: Date.now(),
        },
        { merge: true }
      )
    );

    return { success: true };
  }

  async regenerateInviteCode(garageId, ownerId) {
    const garage = await this.getGarage(garageId);
    if (!garage) return { success: false, error: "Garage not found." };
    if (garage.ownerId !== ownerId) {
      return { success: false, error: "Only the garage owner can refresh the invite code." };
    }

    const newCode = await this.allocateInviteCode();
    const now = Date.now();
    const batch = writeBatch(this.firestore);

    if (garage.inviteCode) {
      batch.set(
        this.inviteRef(garage.inviteCode),
        { active: false, garageId: garage.id, ownerId, updatedAtMillis: now },
        { merge: true }
      );
    }

    batch.set(this.inviteRef(newCode), {
      garageId: garage.id,
      ownerId,
      active: true,
      createdAtMillis: now,
    });
    batch.update(this.garageRef(garage.id), {
      inviteCode: newCode,
      updatedAtMillis: now,
    });

    await withTimeout(batch.commit());
    return { success: true, inviteCode: newCode };
  }

  /**
   * Owner updates garage-wide skills and default service prices.
   * Mechanics keep personal overrides; discovery falls back to these defaults.
   */
  async updateGarageCatalog(garageId, ownerId, { skills = [], servicePrices = {} } = {}) {
    const garage = await this.getGarage(garageId);
    if (!garage) return { success: false, error: "Garage not found." };
    if (garage.ownerId !== ownerId) {
      return { success: false, error: "Only the garage owner can update garage prices." };
    }

    const nextSkills = Array.isArray(skills)
      ? skills.map((s) => String(s || "").trim()).filter(Boolean).slice(0, 50)
      : [];
    const nextPrices =
      servicePrices && typeof servicePrices === "object" && !Array.isArray(servicePrices)
        ? servicePrices
        : {};

    await withTimeout(
      updateDoc(this.garageRef(garageId), {
        skills: nextSkills,
        servicePrices: nextPrices,
        updatedAtMillis: Date.now(),
      })
    );

    return {
      success: true,
      garage: {
        ...garage,
        skills: nextSkills,
        servicePrices: nextPrices,
      },
    };
  }

  async allocateInviteCode(maxAttempts = 8) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const code = generateInviteCode();
      const snap = await withTimeout(getDoc(this.inviteRef(code)));
      if (!snap.exists()) return code;
    }
    throw new Error("Could not allocate a unique invite code. Please try again.");
  }

  /** Ensure a solo mechanic has a garage document (lazy migration). */
  async ensureOwnerGarage(userId, profile = {}) {
    const uid = String(userId || "").trim();
    if (!uid) return { success: false, error: "Missing user id." };

    if (profile.garageId) {
      const garage = await this.getGarage(profile.garageId);
      if (garage) return { success: true, garage, alreadyExists: true };
    }

    return this.createGarageForOwner(uid, profile);
  }
}
