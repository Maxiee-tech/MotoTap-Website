import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { MAX_REVIEW_COMMENT_LENGTH } from "../reviewsData.js";

export default class FirebaseJobReviewService {
  constructor(firestore = db) {
    this.firestore = firestore;
  }

  validateRating(rating) {
    const value = Number(rating);
    if (value < 1 || value > 5) {
      throw new Error("Please select a star rating");
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

  async submitDriverReview({ jobId, rating, comment }) {
    if (!jobId) {
      throw new Error("Missing job");
    }

    const validRating = this.validateRating(rating);
    const validComment = this.validateComment(comment);
    const now = Date.now();

    try {
      await updateDoc(doc(this.firestore, "jobs", jobId), {
        driverReviewRating: validRating,
        driverReviewComment: validComment,
        driverReviewedAtMillis: now,
      });
    } catch (error) {
      throw new Error(error?.message || "Could not save review. Please try again.");
    }

    return {
      driverReviewRating: validRating,
      driverReviewComment: validComment,
      driverReviewedAtMillis: now,
    };
  }
}
