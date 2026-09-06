import { escapeHtml } from "./utils/html.js";
import {
  additionalServiceAuthorLabel,
  canAddAdditionalServiceNote,
  createAdditionalServiceNote,
  MAX_ADDITIONAL_SERVICE_TEXT,
  normalizeAdditionalServices,
  resolveAdditionalServiceAuthorRole,
} from "./utils/jobAdditionalServices.js";

function formatNoteTime(millis) {
  const value = Number(millis) || 0;
  if (!value) return "";
  try {
    return new Date(value).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function renderNotesList(listEl, notes) {
  listEl.innerHTML = "";
  if (!notes.length) {
    const empty = document.createElement("p");
    empty.className = "job-additional-empty";
    empty.textContent = "No additional services recorded yet.";
    listEl.appendChild(empty);
    return;
  }

  notes.forEach((note) => {
    const item = document.createElement("li");
    item.className = "job-additional-item";
    const when = formatNoteTime(note.createdAtMillis);
    item.innerHTML = `
      <p class="job-additional-meta">${escapeHtml(additionalServiceAuthorLabel(note))}${
        when ? ` · ${escapeHtml(when)}` : ""
      }</p>
      <p class="job-additional-text">${escapeHtml(note.text)}</p>
    `;
    listEl.appendChild(item);
  });
}

/**
 * Append additional-services notes (and an add form when allowed) to a job card.
 */
export function appendJobAdditionalServicesSection(card, job, options = {}) {
  const notes = normalizeAdditionalServices(job?.additionalServices);
  const canAdd = canAddAdditionalServiceNote(job, options);
  if (!notes.length && !canAdd) return;

  const section = document.createElement("div");
  section.className = "job-additional-section";

  const heading = document.createElement("h5");
  heading.className = "job-additional-heading";
  heading.textContent = "Additional services";
  section.appendChild(heading);

  const hint = document.createElement("p");
  hint.className = "job-additional-hint";
  hint.textContent =
    "Record extra work done beyond the original job so the client and garage share one complete record.";
  section.appendChild(hint);

  const list = document.createElement("ul");
  list.className = "job-additional-list";
  renderNotesList(list, notes);
  section.appendChild(list);

  if (canAdd) {
    const form = document.createElement("form");
    form.className = "job-additional-form";

    const input = document.createElement("textarea");
    input.className = "job-additional-input";
    input.rows = 2;
    input.maxLength = MAX_ADDITIONAL_SERVICE_TEXT;
    input.placeholder = "Describe an additional service carried out…";
    input.setAttribute("aria-label", "Additional service details");

    const row = document.createElement("div");
    row.className = "job-additional-form-row";

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn-secondary";
    submit.textContent = "Add to job card";

    const errorEl = document.createElement("p");
    errorEl.className = "job-additional-error";
    errorEl.hidden = true;

    row.appendChild(submit);
    form.appendChild(input);
    form.appendChild(row);
    form.appendChild(errorEl);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = input.value.trim();
      errorEl.hidden = true;
      errorEl.textContent = "";
      if (!text) {
        errorEl.textContent = "Enter details of the additional service.";
        errorEl.hidden = false;
        return;
      }

      submit.disabled = true;
      submit.textContent = "Saving…";
      try {
        const note = createAdditionalServiceNote({
          userId: options.userId,
          authorRole: resolveAdditionalServiceAuthorRole(job, options),
          authorName: options.authorName,
          text,
        });
        await options.onAdd?.(job.id, note);
        input.value = "";
        notes.push(note);
        renderNotesList(list, notes);
        if (notes.length >= 30) {
          form.remove();
        }
      } catch (error) {
        errorEl.textContent = error.message || "Could not save the note. Please try again.";
        errorEl.hidden = false;
      } finally {
        submit.disabled = false;
        submit.textContent = "Add to job card";
      }
    });

    section.appendChild(form);
  }

  card.appendChild(section);
}
