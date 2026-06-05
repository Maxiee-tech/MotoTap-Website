import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  runTransaction,
} from "firebase/firestore";
import { db } from "../../firebase.js";
import {
  MAX_REVIEW_COMMENT_LENGTH,
  MAX_REVIEW_WRITES_PER_DAY,
} from "../reviewsData.js";

const REVIEWS_COLLECTION = "homeReviews";
const RATE_LIMIT_COLLECTION = "homeReviewRateLimit";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export default class FirebaseReviewService {
  constructor(firestore = db) {
    this.firestore = firestore;
  }

  validateRating(rating) {
    const value = Number(rating);
    if (value < 1 || value > 5) {
      throw new Error("Invalid rating");
    }
    return value;
  }

  validateComment(comment) {
    const trimmed = String(comment || "").trim();
    if (!trimmed) {
      throw new Error("Please enter a comment");
    }
    if (trimmed.length > MAX_REVIEW_COMMENT_LENGTH) {
      throw new Error(
        `Comment must be ${MAX_REVIEW_COMMENT_LENGTH} characters or less`
      );
    }
    return trimmed;
  }

  countRecentWrites(writeLogMillis, since) {
    return (writeLogMillis || []).filter((entry) => entry >= since).length;
  }

  pruneWriteLog(writeLogMillis, since) {
    return (writeLogMillis || []).filter((entry) => entry >= since);
  }

  async getReviewForUser(userId) {
    const reviewRef = doc(this.firestore, REVIEWS_COLLECTION, userId);
    const snap = await getDoc(reviewRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  }

  async listCommunityReviews(maxResults = 12) {
    const q = query(
      collection(this.firestore, REVIEWS_COLLECTION),
      orderBy("reviewedAtMillis", "desc"),
      limit(maxResults)
    );
    const snap = await getDocs(q);
    return snap.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  }

  async submitReview({ userId, displayName, rating, comment }) {
    if (!userId) {
      throw new Error("You must be signed in to leave a review");
    }

    const validRating = this.validateRating(rating);
    const validComment = this.validateComment(comment);

    const now = Date.now();
    const since = now - MS_PER_DAY;
    const reviewRef = doc(this.firestore, REVIEWS_COLLECTION, userId);
    const rateRef = doc(this.firestore, RATE_LIMIT_COLLECTION, userId);

    const payload = {
      userId,
      rating: validRating,
      comment: validComment,
      displayName:
        String(displayName || "Moto Tap user").trim() || "Moto Tap user",
      reviewedAtMillis: now,
      updatedAtMillis: now,
    };

    try {
      await runTransaction(this.firestore, async (transaction) => {
        const rateSnap = await transaction.get(rateRef);
        const reviewSnap = await transaction.get(reviewRef);

        const recentWrites = this.pruneWriteLog(
          rateSnap.exists() ? rateSnap.data().writeLogMillis : [],
          since
        );

        if (recentWrites.length >= MAX_REVIEW_WRITES_PER_DAY) {
          throw new Error(
            "You can submit or update your review up to 3 times per day. Try again tomorrow."
          );
        }

        if (reviewSnap.exists()) {
          payload.createdAtMillis = reviewSnap.data().createdAtMillis || now;
          transaction.update(reviewRef, payload);
        } else {
          payload.createdAtMillis = now;
          transaction.set(reviewRef, payload);
        }

        transaction.set(
          rateRef,
          {
            userId,
            writeLogMillis: [...recentWrites, now],
          },
          { merge: true }
        );
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("3 times per day")) {
        throw error;
      }
      throw new Error(error?.message || "Could not save review. Please try again.");
    }

    return payload;
  }
}
