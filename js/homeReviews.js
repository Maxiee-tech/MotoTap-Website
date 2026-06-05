import FirebaseReviewService from "./services/FirebaseReviewService.js";
import {
  STATIC_HOME_REVIEWS,
  MAX_REVIEW_COMMENT_LENGTH,
} from "./reviewsData.js";

const reviewService = new FirebaseReviewService();

let pendingReviewAfterAuth = false;
let selectedRating = 0;

function formatReviewDate(millis) {
  if (!millis) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(millis));
  } catch {
    return new Date(millis).toLocaleString();
  }
}

function renderStars(rating, { interactive = false, inputName = "review-rating" } = {}) {
  const stars = [];
  for (let i = 1; i <= 5; i += 1) {
    const filled = i <= rating;
    if (interactive) {
      stars.push(
        `<button type="button" class="review-star-btn${filled ? " is-filled" : ""}" data-rating="${i}" aria-label="${i} star${i === 1 ? "" : "s"}">★</button>`
      );
    } else {
      stars.push(`<span class="review-star${filled ? " is-filled" : ""}" aria-hidden="true">★</span>`);
    }
  }
  if (interactive) {
    return `<div class="review-stars review-stars-input" role="radiogroup" aria-label="Rating">${stars.join("")}<input type="hidden" id="${inputName}" name="${inputName}" value="${rating || ""}" /></div>`;
  }
  return `<div class="review-stars" aria-label="${rating} out of 5 stars">${stars.join("")}</div>`;
}

function renderStaticReviewCard(review) {
  return `
    <article class="review-card review-card-static">
      <div class="review-card-top">
        ${renderStars(review.rating)}
        <span class="review-card-meta">${review.dateLabel}</span>
      </div>
      <p class="review-card-comment">"${review.comment}"</p>
      <p class="review-card-author">— ${review.name}</p>
    </article>
  `;
}

function renderCommunityReviewCard(review) {
  const label = review.displayName || "Moto Tap user";
  const when = formatReviewDate(review.reviewedAtMillis);
  return `
    <article class="review-card review-card-community">
      <div class="review-card-top">
        ${renderStars(review.rating)}
        <span class="review-card-meta">${when}</span>
      </div>
      <p class="review-card-comment">"${review.comment}"</p>
      <p class="review-card-author">— ${label}</p>
    </article>
  `;
}

function setReviewFormRating(container, rating) {
  selectedRating = rating;
  const hidden = container.querySelector('input[name="review-rating"]');
  if (hidden) hidden.value = String(rating);
  container.querySelectorAll(".review-star-btn").forEach((btn) => {
    const value = Number(btn.dataset.rating);
    btn.classList.toggle("is-filled", value <= rating);
    btn.setAttribute("aria-pressed", value <= rating ? "true" : "false");
  });
}

function bindStarRating(container) {
  container.querySelectorAll(".review-star-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      setReviewFormRating(container, Number(btn.dataset.rating));
    });
  });
}

function renderReviewForm({ user, existingReview, onSignIn }) {
  const isSignedIn = Boolean(user);
  const initialRating = existingReview?.rating || 0;
  const initialComment = existingReview?.comment || "";
  selectedRating = initialRating;

  const formBlock = isSignedIn
    ? `
      <form id="home-review-form" class="home-review-form" novalidate>
        <p class="home-review-form-note">${
          existingReview
            ? "You already shared a review — update it below (one review per account)."
            : "Share your experience with Moto Tap."
        }</p>
        ${renderStars(initialRating, { interactive: true })}
        <label class="home-review-label" for="home-review-comment">Your comment</label>
        <textarea
          id="home-review-comment"
          class="home-review-comment"
          maxlength="${MAX_REVIEW_COMMENT_LENGTH}"
          rows="3"
          placeholder="What went well? (max ${MAX_REVIEW_COMMENT_LENGTH} characters)"
          required
        >${initialComment}</textarea>
        <div class="home-review-form-footer">
          <span id="home-review-char-count" class="home-review-char-count">${initialComment.length}/${MAX_REVIEW_COMMENT_LENGTH}</span>
          <button type="submit" class="btn-primary home-review-submit">${
            existingReview ? "Update review" : "Post review"
          }</button>
        </div>
        <p id="home-review-error" class="home-review-error" role="alert"></p>
        <p id="home-review-success" class="home-review-success" role="status"></p>
      </form>
    `
    : `
      <div class="home-review-guest-cta">
        <p>Sign in to leave your own review. Guests can read what others say below.</p>
        <button type="button" class="btn-primary" id="home-review-sign-in-btn">Sign in to review</button>
      </div>
    `;

  return `
    <section id="home-reviews-section" class="home-reviews-section" aria-labelledby="home-reviews-title">
      <div class="panel-header home-reviews-header">
        <h3 id="home-reviews-title">What people say</h3>
        <p>Real feedback from drivers using Moto Tap for roadside help and maintenance.</p>
      </div>
      <div id="home-reviews-static" class="home-reviews-grid">
        ${STATIC_HOME_REVIEWS.map(renderStaticReviewCard).join("")}
      </div>
      <div id="home-reviews-community-wrap" class="home-reviews-community-wrap hidden">
        <h4 class="home-reviews-subtitle">From the community</h4>
        <div id="home-reviews-community" class="home-reviews-grid"></div>
      </div>
      <div id="home-review-compose" class="home-review-compose">
        ${formBlock}
      </div>
    </section>
  `;
}

async function loadCommunityReviews(communityGrid, communityWrap) {
  if (!communityGrid || !communityWrap) return;
  try {
    const reviews = await reviewService.listCommunityReviews();
    if (!reviews.length) {
      communityWrap.classList.add("hidden");
      return;
    }
    communityGrid.innerHTML = reviews.map(renderCommunityReviewCard).join("");
    communityWrap.classList.remove("hidden");
  } catch {
    communityWrap.classList.add("hidden");
  }
}

function bindReviewForm(auth, mountEl) {
  const form = mountEl.querySelector("#home-review-form");
  const commentInput = mountEl.querySelector("#home-review-comment");
  const charCount = mountEl.querySelector("#home-review-char-count");
  const errorEl = mountEl.querySelector("#home-review-error");
  const successEl = mountEl.querySelector("#home-review-success");
  const starsWrap = mountEl.querySelector(".review-stars-input");

  if (starsWrap) bindStarRating(starsWrap);

  commentInput?.addEventListener("input", () => {
    if (charCount) {
      charCount.textContent = `${commentInput.value.length}/${MAX_REVIEW_COMMENT_LENGTH}`;
    }
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorEl) errorEl.textContent = "";
    if (successEl) successEl.textContent = "";

    const user = auth.currentUser;
    if (!user) return;

    const rating = Number(selectedRating);
    const comment = commentInput?.value || "";

    try {
      await reviewService.submitReview({
        userId: user.uid,
        displayName: user.displayName || user.email?.split("@")[0] || "Moto Tap user",
        rating,
        comment,
      });
      if (successEl) {
        successEl.textContent = "Thanks — your review was saved.";
      }
      await refreshHomeReviews(auth, mountEl);
    } catch (err) {
      if (errorEl) errorEl.textContent = err.message || "Could not save review.";
    }
  });
}

export function setPendingReviewAfterAuth(value = true) {
  pendingReviewAfterAuth = value;
}

export function consumePendingReviewAfterAuth() {
  if (!pendingReviewAfterAuth) return false;
  pendingReviewAfterAuth = false;
  return true;
}

export async function refreshHomeReviews(auth, mountEl) {
  if (!mountEl) return;

  const user = auth.currentUser;
  let existingReview = null;
  if (user) {
    try {
      existingReview = await reviewService.getReviewForUser(user.uid);
    } catch {
      existingReview = null;
    }
  }

  const showSignIn = () => {
    setPendingReviewAfterAuth(true);
    mountEl.dispatchEvent(new CustomEvent("home-review-request-sign-in"));
  };

  mountEl.innerHTML = renderReviewForm({
    user,
    existingReview,
    onSignIn: showSignIn,
  });

  bindReviewForm(auth, mountEl);

  mountEl.querySelector("#home-review-sign-in-btn")?.addEventListener("click", showSignIn);

  const communityGrid = mountEl.querySelector("#home-reviews-community");
  const communityWrap = mountEl.querySelector("#home-reviews-community-wrap");
  await loadCommunityReviews(communityGrid, communityWrap);

  if (consumePendingReviewAfterAuth() && user) {
    mountEl.querySelector("#home-review-comment")?.focus();
  }
}

export function initHomeReviews(auth, mountEl) {
  if (!mountEl) return;

  mountEl.addEventListener("home-review-request-sign-in", () => {
    setPendingReviewAfterAuth(true);
  });

  refreshHomeReviews(auth, mountEl);
}
