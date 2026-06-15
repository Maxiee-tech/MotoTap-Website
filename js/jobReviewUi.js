import { MAX_REVIEW_COMMENT_LENGTH } from "./reviewsData.js";
import FirebaseJobReviewService from "./services/FirebaseJobReviewService.js";

const jobReviewService = new FirebaseJobReviewService();

export const REVIEWABLE_JOB_STATUSES = ["COMPLETED", "PAID", "CLOSED"];

export function isJobReviewable(job) {
  return Boolean(job?.mechanicId) && REVIEWABLE_JOB_STATUSES.includes(job?.status);
}

export function hasDriverReview(job) {
  return Number(job?.driverReviewRating) >= 1;
}

function buildStarsDisplay(rating) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  const stars = [];
  for (let i = 1; i <= 5; i += 1) {
    stars.push(
      `<span class="review-star${i <= value ? " is-filled" : ""}" aria-hidden="true">★</span>`
    );
  }
  return `<div class="review-stars" aria-label="${value} out of 5 stars">${stars.join("")}</div>`;
}

function buildSubmittedReviewBlock(job) {
  const block = document.createElement("div");
  block.className = "job-review-submitted";
  block.innerHTML = `
    <p class="job-review-label">Your rating</p>
    ${buildStarsDisplay(job.driverReviewRating)}
    <p class="job-review-comment-display">"${job.driverReviewComment || ""}"</p>
  `;
  return block;
}

function bindStarRating(container, onChange) {
  let selected = 0;
  container.querySelectorAll(".review-star-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      selected = Number(btn.dataset.rating);
      container.querySelectorAll(".review-star-btn").forEach((starBtn) => {
        const value = Number(starBtn.dataset.rating);
        starBtn.classList.toggle("is-filled", value <= selected);
        starBtn.setAttribute("aria-pressed", value <= selected ? "true" : "false");
      });
      onChange(selected);
    });
  });
  return () => selected;
}

export function appendDriverJobReviewSection(card, job) {
  if (!isJobReviewable(job)) return;

  const section = document.createElement("div");
  section.className = "job-review-section";

  if (hasDriverReview(job)) {
    section.appendChild(buildSubmittedReviewBlock(job));
    card.appendChild(section);
    return;
  }

  const prompt = document.createElement("p");
  prompt.className = "job-review-prompt";
  prompt.textContent = "Job complete — rate your mechanic and leave a review.";
  section.appendChild(prompt);

  const starsWrap = document.createElement("div");
  starsWrap.className = "review-stars review-stars-input";
  starsWrap.setAttribute("role", "radiogroup");
  starsWrap.setAttribute("aria-label", "Rating");
  for (let i = 1; i <= 5; i += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "review-star-btn";
    btn.dataset.rating = String(i);
    btn.setAttribute("aria-label", `${i} star${i === 1 ? "" : "s"}`);
    btn.textContent = "★";
    starsWrap.appendChild(btn);
  }
  section.appendChild(starsWrap);

  const getRating = bindStarRating(starsWrap, () => {});

  const label = document.createElement("label");
  label.className = "job-review-label";
  label.htmlFor = `job-review-comment-${job.id}`;
  label.textContent = "Your review";
  section.appendChild(label);

  const textarea = document.createElement("textarea");
  textarea.id = `job-review-comment-${job.id}`;
  textarea.className = "job-review-comment";
  textarea.maxLength = MAX_REVIEW_COMMENT_LENGTH;
  textarea.rows = 3;
  textarea.placeholder = `How did it go? (max ${MAX_REVIEW_COMMENT_LENGTH} characters)`;
  section.appendChild(textarea);

  const footer = document.createElement("div");
  footer.className = "job-review-form-footer";

  const charCount = document.createElement("span");
  charCount.className = "job-review-char-count";
  charCount.textContent = `0/${MAX_REVIEW_COMMENT_LENGTH}`;

  const submitBtn = document.createElement("button");
  submitBtn.type = "button";
  submitBtn.className = "btn-primary job-review-submit";
  submitBtn.textContent = "Submit review";

  const errorEl = document.createElement("p");
  errorEl.className = "job-review-error";
  errorEl.setAttribute("role", "alert");

  textarea.addEventListener("input", () => {
    charCount.textContent = `${textarea.value.length}/${MAX_REVIEW_COMMENT_LENGTH}`;
  });

  submitBtn.addEventListener("click", async () => {
    errorEl.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";

    try {
      const result = await jobReviewService.submitDriverReview({
        jobId: job.id,
        rating: getRating(),
        comment: textarea.value,
      });
      const submitted = document.createElement("div");
      submitted.className = "job-review-section";
      submitted.appendChild(
        buildSubmittedReviewBlock({
          ...job,
          ...result,
        })
      );
      section.replaceWith(submitted);
    } catch (err) {
      errorEl.textContent = err.message || "Could not save review.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit review";
    }
  });

  footer.append(charCount, submitBtn);
  section.append(footer, errorEl);
  card.appendChild(section);
}
