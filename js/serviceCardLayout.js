import { getServiceCategoryIcon } from "./serviceCatalogData.js";

export const SERVICE_CARD_REFERENCE_ID = "ac-services";

let resizeListenerBound = false;

export function createServiceCategoryCardShell(category) {
  const card = document.createElement("div");
  card.className = "service-category-card";
  card.dataset.categoryId = category.id;

  const header = document.createElement("div");
  header.className = "service-category-card-header";

  const icon = document.createElement("span");
  icon.className = "service-category-icon material-symbols-outlined";
  icon.textContent = getServiceCategoryIcon(category.id);
  icon.setAttribute("aria-hidden", "true");

  const title = document.createElement("h3");
  title.className = "service-category-title";
  title.textContent = category.name;

  header.appendChild(icon);
  header.appendChild(title);

  const body = document.createElement("div");
  body.className = "service-card-body";

  const seeMore = document.createElement("button");
  seeMore.type = "button";
  seeMore.className = "service-card-see-more";
  seeMore.textContent = "View all services";
  seeMore.addEventListener("click", (event) => {
    event.stopPropagation();
    const expanded = card.classList.toggle("is-expanded");
    seeMore.textContent = expanded ? "Show less" : "View all services";
    if (expanded) {
      card.classList.remove("is-balanced", "has-overflow");
      card.style.minHeight = "";
      card.style.maxHeight = "";
      seeMore.classList.remove("is-visible");
    } else {
      balanceServiceCategoryCards();
    }
  });

  card.appendChild(header);
  card.appendChild(body);
  card.appendChild(seeMore);

  return { card, body };
}

function getCatalogLists() {
  return document.querySelectorAll(
    ".service-category-list, .mechanic-service-list"
  );
}

function getDirectCards(list) {
  return [...list.querySelectorAll(":scope > .service-category-card")];
}

function resetCardSizing(card) {
  card.style.minHeight = "";
  card.style.maxHeight = "";
  if (!card.classList.contains("is-expanded")) {
    card.classList.remove("is-balanced", "has-overflow");
  }
}

function isCatalogListVisible(list) {
  return list.getClientRects().length > 0;
}

function measureReferenceCard(reference) {
  const body = reference.querySelector(".service-card-body");
  return {
    cardHeight: reference.offsetHeight,
    bodyHeight: body ? body.scrollHeight : 0,
  };
}

function updateOverflowState(card, referenceBodyHeight) {
  const body = card.querySelector(".service-card-body");
  const seeMore = card.querySelector(".service-card-see-more");
  if (!body || !seeMore || card.classList.contains("is-expanded")) return;

  const overflows =
    body.scrollHeight > referenceBodyHeight + 4 ||
    body.scrollHeight > body.clientHeight + 4;
  card.classList.toggle("has-overflow", overflows);
  seeMore.classList.toggle("is-visible", overflows);
}

function balanceListCards(list) {
  const cards = getDirectCards(list);
  if (!cards.length || !isCatalogListVisible(list)) return;

  cards.forEach(resetCardSizing);
  void list.offsetHeight;

  const reference =
    list.querySelector(
      `:scope > .service-category-card[data-category-id="${SERVICE_CARD_REFERENCE_ID}"]`
    ) || cards.reduce((shortest, card) =>
      card.offsetHeight < shortest.offsetHeight ? card : shortest
    );

  const { cardHeight, bodyHeight } = measureReferenceCard(reference);
  const targetHeight = Math.max(cardHeight, 180);
  const referenceBodyHeight = Math.max(bodyHeight, 120);

  list.style.setProperty("--service-card-target-height", `${targetHeight}px`);
  list.style.setProperty(
    "--service-card-body-max-height",
    `${referenceBodyHeight}px`
  );

  cards.forEach((card) => {
    if (card.classList.contains("is-expanded")) return;
    card.classList.add("is-balanced");
    card.style.minHeight = `${targetHeight}px`;
    card.style.maxHeight = `${targetHeight}px`;
    updateOverflowState(card, referenceBodyHeight);
  });
}

export function balanceServiceCategoryCards() {
  getCatalogLists().forEach(balanceListCards);
}

export function scheduleServiceCategoryCardBalance() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      balanceServiceCategoryCards();
    });
  });
}

export function setupServiceCardResizeListener() {
  if (resizeListenerBound) return;
  resizeListenerBound = true;

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(balanceServiceCategoryCards, 150);
  });
}
