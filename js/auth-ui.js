import { auth, db } from "../firebase.js";
import { collection, query, where, getDocs } from "firebase/firestore";
import FirebaseAuthService from "./services/FirebaseAuthService.js";
import FirebaseJobService from "./services/FirebaseJobService.js";
import FirebaseChatService from "./services/FirebaseChatService.js";
import FirebaseServiceCatalogService from "./services/FirebaseServiceCatalogService.js";
import {
  distanceMeters,
  formatDistanceMeters,
  buildDriverMechanicConversationId,
  getAllConversationIdsForParticipants,
  getMechanicPosition,
  isMechanicRole,
  mechanicOffersService,
} from "./utils/geo.js";
import {
  loadGoogleMapsScript,
  waitForMapLayout,
  isMapsAuthFailed,
  registerMapsAuthFailureHandler,
} from "./googleMapsLoader.js";

registerMapsAuthFailureHandler();
window.addEventListener("mototap-maps-auth-failure", () => {
  resetGoogleMapInstance();
  showMapLoadError();
});
import AuthViewModel from "./AuthViewModel.js";
import {
  SERVICE_CATEGORIES,
  SERVICE_DISPLAY_GROUP_ORDER,
} from "./serviceCatalogData.js";
import {
  createServiceCategoryCardShell,
  scheduleServiceCategoryCardBalance,
  setupServiceCardResizeListener,
} from "./serviceCardLayout.js";
import PasswordValidator from "./PasswordValidator.js";
import {
  initHomeReviews,
  refreshHomeReviews,
  setPendingReviewAfterAuth,
} from "./homeReviews.js";
import { MAX_CHAT_MESSAGE_LENGTH } from "./appConfig.js";
import { escapeHtml } from "./utils/html.js";
import { onAuthStateChanged } from "firebase/auth";

const landingSection = document.getElementById("landing-section");
const loginSection = document.getElementById("login-section");
const signupSection = document.getElementById("signup-section");
const dashboardSection = document.getElementById("dashboard");
const driverDashboard = document.getElementById("driver-dashboard");
const mechanicDashboard = document.getElementById("mechanic-dashboard");
const messagesSection = document.getElementById("messages-section");
const requestsSection = document.getElementById("requests-section");
const mechanicMapSection = document.getElementById("mechanic-map-section");
const requestsDriverIntro = document.getElementById("requests-driver-intro");
const requestsMechanicIntro = document.getElementById("requests-mechanic-intro");
const requestHistoryList = document.getElementById("request-history-list");
const landingGuestView = document.getElementById("landing-guest-view");
const landingGuestActions = document.getElementById("landing-guest-actions");
const homeReviewsMount = document.getElementById("home-reviews-mount");
const landingHero = document.getElementById("landing-hero");
const welcomeScreen = document.getElementById("welcome-screen");
const mainNavbar = document.getElementById("main-navbar");

const menuPanel = document.getElementById("menu-panel");
const menuOverlay = document.getElementById("menu-overlay");
const menuToggle = document.getElementById("menu-toggle");
const homeMenuBtn = document.getElementById("home-menu-btn");
const logoButton = document.getElementById("logo-button");

const WELCOME_DURATION_MS = 3000;
let welcomeDismissTimer = null;

function clearWelcomeDismissTimer() {
  if (welcomeDismissTimer) {
    clearTimeout(welcomeDismissTimer);
    welcomeDismissTimer = null;
  }
}

function scheduleWelcomeDismiss() {
  clearWelcomeDismissTimer();
  welcomeDismissTimer = setTimeout(() => {
    if (welcomeScreen && !welcomeScreen.classList.contains("hidden")) {
      showHomePage();
    }
  }, WELCOME_DURATION_MS);
}

function closeMenu() {
  menuPanel.classList.remove("open");
  menuOverlay.classList.remove("open");
}

function toggleMenu() {
  menuPanel.classList.toggle("open");
  menuOverlay.classList.toggle("open");
}

function showWelcomeScreen() {
  document.body.classList.add("welcome-active");
  welcomeScreen.classList.remove("hidden");
  setHomeMenuVisible(false);
  if (mainNavbar) {
    mainNavbar.hidden = true;
    mainNavbar.style.display = "none";
  }
  if (menuPanel) menuPanel.style.display = "none";
  closeMenu();
  landingSection.classList.remove("active");
  loginSection.classList.remove("active");
  signupSection.classList.remove("active");
  dashboardSection.classList.remove("active");
  messagesSection.classList.remove("active");
  requestsSection.classList.remove("active");
  scheduleWelcomeDismiss();
}

function hideWelcomeScreen() {
  clearWelcomeDismissTimer();
  document.body.classList.remove("welcome-active");
  welcomeScreen.classList.add("hidden");
  if (mainNavbar) {
    mainNavbar.hidden = false;
    mainNavbar.style.display = "flex";
  }
  if (menuPanel) menuPanel.style.display = "";
}

function setHomeMenuVisible(visible) {
  if (!homeMenuBtn) return;
  homeMenuBtn.classList.toggle("is-visible", visible);
  homeMenuBtn.setAttribute("aria-hidden", visible ? "false" : "true");
  document.body.classList.toggle("home-menu-active", visible);
}

function setMechanicMapPageLayout(active) {
  document.body.classList.toggle("mechanic-map-active", active);
  if (mainNavbar) {
    mainNavbar.hidden = active;
    mainNavbar.style.display = active ? "none" : "";
  }
  if (active) {
    setHomeMenuVisible(false);
    requestAnimationFrame(() => fixGoogleMapContainerFill());
  }
}

function hideAllSections() {
  landingSection.classList.remove("active");
  loginSection.classList.remove("active");
  signupSection.classList.remove("active");
  dashboardSection.classList.remove("active");
  messagesSection.classList.remove("active");
  requestsSection.classList.remove("active");
  mechanicMapSection?.classList.remove("active");
  driverDashboard.classList.remove("active");
  mechanicDashboard.classList.remove("active");
  clearMapMatchNotification();
  setMechanicMapPageLayout(false);
  setHomeMenuVisible(false);
}

function showMapNotification(message) {
  if (!mapNotificationEl) return;
  if (message) {
    mapNotificationEl.textContent = message;
    mapNotificationEl.classList.remove("hidden");
  } else {
    mapNotificationEl.textContent = "";
    mapNotificationEl.classList.add("hidden");
  }
}

let mapMatchNotificationTimer = null;

function clearMapMatchNotification() {
  clearTimeout(mapMatchNotificationTimer);
  mapMatchNotificationTimer = null;
  if (matchStatus) {
    matchStatus.textContent = "";
    matchStatus.classList.remove("is-notification");
  }
}

function showMapMatchNotification(message, { autoDismissMs = 0 } = {}) {
  if (!matchStatus) return;
  clearMapMatchNotification();
  if (!message) return;

  matchStatus.textContent = message;
  matchStatus.classList.add("is-notification");

  if (autoDismissMs > 0) {
    mapMatchNotificationTimer = setTimeout(() => {
      clearMapMatchNotification();
    }, autoDismissMs);
  }
}

function showMechanicMapPage(category, serviceName) {
  hideWelcomeScreen();
  closeMenu();
  hideAllSections();
  mechanicMapSection?.classList.add("active");
  setMechanicMapPageLayout(true);

  setSelectedService(category, serviceName);
  if (mechanicMapServiceTitle) {
    mechanicMapServiceTitle.textContent = `MECHANICS: ${serviceName.toUpperCase()}`;
  }
  if (mechanicPanelService) {
    mechanicPanelService.textContent = `Service: ${serviceName}`;
  }

  renderServiceCategories();
  showMapNotification("");
  driverPostServices?.classList.remove("hidden");

  beginDriverPositionLookup();
  fetchMatchingMechanics(serviceName);
}

function triggerMapResize() {
  if (!googleMap) return;
  requestAnimationFrame(() => {
    google.maps.event.trigger(googleMap, "resize");
  });
}

function fixGoogleMapContainerFill() {
  if (!mapElement) return;
  mapElement.style.height = "100%";
  mapElement.style.width = "100%";
  const gmStyle = mapElement.querySelector(".gm-style");
  if (gmStyle) {
    gmStyle.style.height = "100%";
    gmStyle.style.width = "100%";
  }
  triggerMapResize();
}

function setLandingGuestViewVisible(visible) {
  if (landingGuestView) {
    landingGuestView.classList.toggle("hidden", !visible);
  }
}

function setLandingGuestActionsVisible(visible) {
  if (landingGuestActions) {
    landingGuestActions.classList.toggle("hidden", !visible);
  }
}

function renderRequestHistoryList() {
  if (!requestHistoryList) return;
  if (!auth.currentUser) {
    requestHistoryList.innerHTML =
      "<p>Sign in to submit a request and view your request history here.</p>";
    return;
  }
  requestHistoryList.innerHTML =
    '<p class="request-history-empty">No past requests yet. Your submitted requests will show here.</p>';
}

function showHomePage() {
  hideWelcomeScreen();
  closeMenu();
  hideAllSections();
  if (auth.currentUser) {
    const role = currentUserProfile?.role || "customer";
    updateMenuProfile(role, auth.currentUser.email || "");
    if (role === "mechanic") {
      setHomeMenuVisible(true);
      dashboardSection.classList.add("active");
      mechanicDashboard.classList.add("active");
      renderAvailableJobs();
    } else {
      landingSection.classList.add("active");
      setLandingGuestViewVisible(false);
      setLandingGuestActionsVisible(false);
      driverDashboard.classList.add("active");
      setHomeMenuVisible(true);
    }
  } else {
    landingSection.classList.add("active");
    setLandingGuestViewVisible(true);
    setLandingGuestActionsVisible(true);
    setHomeMenuVisible(true);
    updateMenuProfile("Guest", "Not signed in");
  }
  refreshHomeReviews(auth, homeReviewsMount);
  scheduleServiceCategoryCardBalance();
}

menuToggle?.addEventListener("click", toggleMenu);

homeMenuBtn?.addEventListener("click", toggleMenu);

menuOverlay.addEventListener("click", closeMenu);

function bindNavClick(id, handler) {
  document.getElementById(id)?.addEventListener("click", (e) => {
    e.preventDefault();
    handler();
  });
}

bindNavClick("nav-home", showHomePage);
bindNavClick("nav-home-2", showHomePage);
bindNavClick("nav-home-old", showHomePage);

bindNavClick("nav-requests", showRequestsPage);
bindNavClick("nav-requests-2", showRequestsPage);
bindNavClick("nav-requests-old", showRequestsPage);

bindNavClick("nav-messages", () => {
  if (auth.currentUser) showMessagesPage();
  else showLoginForm();
});
bindNavClick("nav-messages-2", () => {
  if (auth.currentUser) showMessagesPage();
  else showLoginForm();
});
bindNavClick("nav-messages-old", () => {
  if (auth.currentUser) showMessagesPage();
  else showLoginForm();
});

const NAV_AUTH_BUTTON_IDS = ["nav-signup", "nav-signup-2", "nav-signup-old"];

function updateNavAuthButton() {
  const signedIn = Boolean(auth.currentUser);
  const label = signedIn ? "LOG OUT" : "SIGN IN";
  NAV_AUTH_BUTTON_IDS.forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.textContent = label;
      btn.classList.toggle("nav-auth-logout", signedIn);
    }
  });
}

async function handleNavAuthClick() {
  if (auth.currentUser) {
    closeMenu();
    await authViewModel.logout(() => {
      showHomePage();
    });
  } else {
    showLoginForm();
  }
}

bindNavClick("nav-signup", handleNavAuthClick);
bindNavClick("nav-signup-2", handleNavAuthClick);
bindNavClick("nav-signup-old", handleNavAuthClick);

logoButton?.addEventListener("click", () => {
  showWelcomeScreen();
});

const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const toSignupBtn = document.getElementById("to-signup");
const toLoginBtn = document.getElementById("to-login");
const landingToLoginBtn = document.getElementById("landing-to-login");
const landingToSignupBtn = document.getElementById("landing-to-signup");
const landingToLoginSecondaryBtn = document.getElementById("landing-to-login-secondary");
const landingToSignupSecondaryBtn = document.getElementById("landing-to-signup-secondary");
const menuUserRole = document.getElementById("menu-user-role");
const menuUserEmail = document.getElementById("menu-user-email");
const menuContactsBtn = document.getElementById("menu-contacts-btn");
const menuSettingsBtn = document.getElementById("menu-settings-btn");
const menuLogoutBtn = document.getElementById("menu-logout-btn");
const menuDeleteBtn = document.getElementById("menu-delete-btn");

const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const signupNameInput = document.getElementById("signup-name");
const signupEmailInput = document.getElementById("signup-email");
const signupPasswordInput = document.getElementById("signup-password");
const signupPhoneInput = document.getElementById("signup-phone");

const loginErrorDiv = document.getElementById("login-error");
const signupErrorDiv = document.getElementById("signup-error");

const serviceCategoryList = document.getElementById("service-category-list");
const guestServiceCategoryList = document.getElementById("guest-service-category-list");
const driverPostServices = document.getElementById("driver-post-services");
const mapNotificationEl = document.getElementById("map-notification");
const mechanicMapBackBtn = document.getElementById("mechanic-map-back-btn");
const mechanicMapServiceTitle = document.getElementById("mechanic-map-service-title");

const MAP_EMPTY_NOTIFICATION = "No mechanics found for this service on map";
function getMapLoadErrorMessage() {
  const origin = window.location.origin;
  const host = window.location.host;
  const keyHint = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    ? "(from .env VITE_GOOGLE_MAPS_API_KEY)"
    : "(missing VITE_GOOGLE_MAPS_API_KEY at build time)";
  return (
    `Google Maps could not load. Configure the Maps browser key ${keyHint}: ` +
    `Google Cloud → Credentials → API key used for Maps JavaScript (not the Firebase Auth key). ` +
    `Application restrictions → HTTP referrers → add ${origin}/*, ${origin}/, ` +
    `https://mototap-447fe.web.app/*, https://mototap.co.ke/*, ` +
    `https://mototap-447fe.firebaseapp.com/*, http://localhost:5173/*. ` +
    `API restrictions must include Maps JavaScript API. ` +
    `If this key is Android-only, create a new key for the website. Host: ${host}.`
  );
}
const matchStatus = document.getElementById("match-status");
const driverMechanicPanel = document.getElementById("driver-mechanic-panel");
const closestBadge = document.getElementById("closest-badge");
const mechanicPanelName = document.getElementById("mechanic-panel-name");
const mechanicPanelDistance = document.getElementById("mechanic-panel-distance");
const mechanicPanelMeta = document.getElementById("mechanic-panel-meta");
const mechanicPanelService = document.getElementById("mechanic-panel-service");
const mechanicChatBtn = document.getElementById("mechanic-chat-btn");
const mechanicBookBtn = document.getElementById("mechanic-book-btn");
const mechanicCallBtn = document.getElementById("mechanic-call-btn");
const mechanicSmsBtn = document.getElementById("mechanic-sms-btn");
const bookStatus = document.getElementById("book-status");
const bookError = document.getElementById("book-error");
const messagesInboxView = document.getElementById("messages-inbox-view");
const messagesDriverIntro = document.getElementById("messages-driver-intro");
const messagesMechanicIntro = document.getElementById("messages-mechanic-intro");
const messagesDriverPlaceholder = document.getElementById("messages-driver-placeholder");
const messagesMechanicPlaceholder = document.getElementById("messages-mechanic-placeholder");
const messagesInboxList = document.getElementById("messages-inbox-list");
const chatView = document.getElementById("chat-view");
const chatBackBtn = document.getElementById("chat-back-btn");
const chatHeaderTitle = document.getElementById("chat-header-title");
const chatTypingIndicator = document.getElementById("chat-typing-indicator");
const chatTypingLabel = chatTypingIndicator?.querySelector(".chat-typing-label");
const chatMessagesEl = document.getElementById("chat-messages");
const chatComposeForm = document.getElementById("chat-compose-form");
const chatInput = document.getElementById("chat-input");
const mechanicServiceList = document.getElementById("mechanic-service-list");
const selectedCategoryInput = document.getElementById("selected-category");
const selectedSubserviceInput = document.getElementById("selected-subservice");
const saveServicesBtn = document.getElementById("save-services-btn");
const mechanicStatus = document.getElementById("mechanic-status");
const mechanicError = document.getElementById("mechanic-error");
const availableJobsList = document.getElementById("available-jobs-list");
const jobsStatus = document.getElementById("jobs-status");

const mapElement = document.getElementById("map");
const openInMapsBtn = document.getElementById("open-in-google-maps-btn");
const mapHint = document.getElementById("map-hint");
let googleMap = null;
let mapMarkers = [];
let driverMarker = null;
let driverPosition = null;
let activeDriverPositionRequest = null;
let matchedMechanics = [];
let autoSelectedMechanicId = null;
let selectedMechanicEntry = null;
let activeChatConversationId = null;
let activeChatPartnerName = "";
let chatUnsubscribe = null;
let chatRoomUnsubscribe = null;
let chatPartnerTypingUnsubscribe = null;
let chatInboxUnsubscribe = null;
let roomTypingActive = false;
let partnerInboxTypingActive = false;
const chatPartnerNameCache = new Map();
let chatTypingDebounceTimer = null;
let optimisticChatMessages = [];
let serverChatMessages = [];
let activeChatPartnerId = null;
let activeChatRoomIds = [];

const MAP_DRIVER_ZOOM = 14;
const MAP_MECHANIC_DETAIL_ZOOM = 17;

const passwordStrengthDiv = document.getElementById("password-strength");
const strengthFill = document.getElementById("strength-fill");
const strengthText = document.getElementById("strength-text");

const authService = new FirebaseAuthService();
const jobService = new FirebaseJobService();
const chatService = new FirebaseChatService();
const serviceCatalogService = new FirebaseServiceCatalogService();
const authViewModel = new AuthViewModel(authService);

let serviceCategories = SERVICE_CATEGORIES;
let selectedCategory = null;
let selectedSubservice = null;
let pendingServiceSelection = null;
let currentUserProfile = null;
let wasLoggedIn = false;

function setPendingServiceSelection(category, serviceName) {
  pendingServiceSelection = {
    categoryId: category.id,
    serviceName,
  };
}

function clearPendingServiceSelection() {
  pendingServiceSelection = null;
}

function resumePendingServiceAfterAuth() {
  if (!pendingServiceSelection || !auth.currentUser) return false;

  const role = currentUserProfile?.role || "customer";
  if (role === "mechanic") {
    clearPendingServiceSelection();
    return false;
  }

  const { categoryId, serviceName } = pendingServiceSelection;
  clearPendingServiceSelection();
  const category = serviceCategories.find((c) => c.id === categoryId);
  if (!category) return false;

  showMechanicMapPage(category, serviceName);
  return true;
}

function setLoadingState(isLoading) {
  loginBtn.disabled = isLoading;
  signupBtn.disabled = isLoading;
  if (isLoading) {
    loginBtn.innerHTML = '<span class="loading-spinner"></span>Loading...';
    signupBtn.innerHTML = '<span class="loading-spinner"></span>Processing...';
  } else {
    loginBtn.textContent = "Sign In";
    signupBtn.textContent = "Create Account";
  }
}

function showLoginForm() {
  hideWelcomeScreen();
  closeMenu();
  hideAllSections();
  loginSection.classList.add("active");
  loginErrorDiv.textContent = "";
  signupErrorDiv.textContent = "";
  bookStatus.textContent = "";
  bookError.textContent = "";
  mechanicStatus.textContent = "";
  mechanicError.textContent = "";
}

function showSignupForm() {
  hideWelcomeScreen();
  closeMenu();
  hideAllSections();
  signupSection.classList.add("active");
  bookStatus.textContent = "";
  bookError.textContent = "";
  mechanicStatus.textContent = "";
  mechanicError.textContent = "";
}


function showDashboard(role, email) {
  hideWelcomeScreen();
  closeMenu();
  hideAllSections();
  dashboardSection.classList.add("active");
  updateMenuProfile(role, email);
  if (role === "mechanic") {
    mechanicDashboard.classList.add("active");
  }
}

function updateMessagesIntro() {
  const role = currentUserProfile?.role || "customer";
  const isMechanic = auth.currentUser && role === "mechanic";

  messagesDriverIntro?.classList.toggle("hidden", isMechanic);
  messagesMechanicIntro?.classList.toggle("hidden", !isMechanic);
  messagesDriverPlaceholder?.classList.toggle("hidden", isMechanic);
  messagesMechanicPlaceholder?.classList.toggle("hidden", !isMechanic);
}

function showMessagesPage() {
  hideWelcomeScreen();
  closeMenu();
  hideAllSections();
  messagesSection.classList.add("active");
  updateMessagesIntro();
  if (!activeChatConversationId) {
    showMessagesInbox();
  }
}

function stopChatInboxListener() {
  if (chatInboxUnsubscribe) {
    chatInboxUnsubscribe();
    chatInboxUnsubscribe = null;
  }
}

function getChatPartnerId(room, myId) {
  return (room.participants || []).find((id) => id !== myId) || null;
}

function getChatRoomActivityMillis(room) {
  return room.lastActiveMillis || room.lastActive || room.lastMessageMillis || 0;
}

function dedupeInboxByPartner(entries) {
  const byPartner = new Map();
  for (const entry of entries) {
    const partnerId = entry.partnerId || entry.id;
    if (!partnerId) continue;
    const existing = byPartner.get(partnerId);
    if (!existing || getChatRoomActivityMillis(entry) > getChatRoomActivityMillis(existing)) {
      byPartner.set(partnerId, entry);
    }
  }
  return [...byPartner.values()].sort(
    (a, b) => getChatRoomActivityMillis(b) - getChatRoomActivityMillis(a)
  );
}

async function resolveChatPartnerName(partnerId, room) {
  if (!partnerId) return "User";
  const cached = room?.participantNames?.[partnerId] || chatPartnerNameCache.get(partnerId);
  if (cached) return cached;

  const profile = await authService.getUserProfile(partnerId);
  const name = profile?.name || "User";
  chatPartnerNameCache.set(partnerId, name);
  return name;
}

function setMessagesInboxEmptyState(hasConversations) {
  messagesInboxList?.classList.toggle("hidden", !hasConversations);
  if (hasConversations) {
    messagesDriverPlaceholder?.classList.add("hidden");
    messagesMechanicPlaceholder?.classList.add("hidden");
  } else {
    updateMessagesIntro();
  }
}

function escapeInboxPreviewText(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatInboxPreview(message, myId, partnerId) {
  const text = String(message?.text || "").trim();
  if (!text) return "No messages yet";
  if (message.senderId === partnerId) {
    return escapeInboxPreviewText(text);
  }
  if (message.senderId === myId) {
    return `You: ${escapeInboxPreviewText(text)}`;
  }
  return escapeInboxPreviewText(text);
}

async function resolveInboxPreview(entry, partnerId, myId) {
  try {
    const message = await chatService.getInboxPreviewMessage({
      myId,
      partnerId,
      entry,
    });
    if (message?.text && !String(entry.lastMessageText || "").trim()) {
      chatService
        .syncChatPartnerEntries({
          participantIds: [myId, partnerId],
          preview: message.text,
          millis: message.timestampMillis || Date.now(),
          senderId: message.senderId || "",
        })
        .catch(() => {});
    }
    return formatInboxPreview(message, myId, partnerId);
  } catch (error) {
    console.error("Inbox preview error:", error);
    return "No messages yet";
  }
}

async function renderMessagesInbox(entries) {
  if (!messagesInboxList || !auth.currentUser) return;

  setMessagesInboxEmptyState(entries.length > 0);
  if (!entries.length) {
    messagesInboxList.innerHTML = "";
    return;
  }

  messagesInboxList.innerHTML = "";
  const myId = auth.currentUser.uid;

  const rows = await Promise.all(
    entries.map(async (entry) => {
      const partnerId = entry.partnerId || entry.id;
      const partnerName = await resolveChatPartnerName(partnerId, entry);
      const preview = await resolveInboxPreview(entry, partnerId, myId);
      return { partnerId, partnerName, preview };
    })
  );

  for (const row of rows) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "messages-inbox-item";
    button.innerHTML = `
      <span class="messages-inbox-item-name">${escapeHtml(row.partnerName)}</span>
      <span class="messages-inbox-item-preview">${row.preview}</span>
    `;
    button.addEventListener("click", () => {
      openChatWithPartner(row.partnerId, row.partnerName);
    });
    item.appendChild(button);
    messagesInboxList.appendChild(item);
  }
}

function startChatInboxListener() {
  if (!auth.currentUser) return;
  stopChatInboxListener();
  chatInboxUnsubscribe = chatService.listenToUserChatPartners(
    auth.currentUser.uid,
    (entries) => {
      renderMessagesInbox(dedupeInboxByPartner(entries));
    },
    (err) => {
      console.error("Chat inbox error:", err);
      setMessagesInboxEmptyState(false);
    }
  );
}

function showMessagesInbox() {
  messagesInboxView?.classList.remove("hidden");
  chatView?.classList.add("hidden");
  startChatInboxListener();
}

function showChatView() {
  stopChatInboxListener();
  messagesInboxView?.classList.add("hidden");
  chatView?.classList.remove("hidden");
}

function showRequestsPage() {
  hideWelcomeScreen();
  closeMenu();
  hideAllSections();
  requestsSection.classList.add("active");
  renderRequestHistoryList();

  const role = currentUserProfile?.role || "customer";
  const isMechanic = auth.currentUser && role === "mechanic";

  if (requestsDriverIntro) {
    requestsDriverIntro.classList.toggle("hidden", isMechanic);
  }
  if (requestsMechanicIntro) {
    requestsMechanicIntro.classList.toggle("hidden", !isMechanic);
  }

  if (auth.currentUser) {
    updateMenuProfile(role, auth.currentUser.email || "");
  }
}

function updateMenuProfile(role, email) {
  if (menuUserRole) menuUserRole.textContent = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Guest";
  if (menuUserEmail) menuUserEmail.textContent = email || "Not signed in";
  updateNavAuthButton();
}

function updatePasswordStrength(password) {
  if (!password) {
    passwordStrengthDiv.style.display = "none";
    return;
  }
  const validation = PasswordValidator.validate(password);
  const strength = validation.strength;
  strengthFill.className = `strength-fill strength-${strength}`;
  strengthText.textContent = `Password strength: ${PasswordValidator.getStrengthLabel(
    strength
  )}`;
  passwordStrengthDiv.style.display = "block";
}

function clearRequestSelection() {
  selectedCategory = null;
  selectedSubservice = null;
  selectedCategoryInput.value = "";
  selectedSubserviceInput.value = "";
  clearMapMatchNotification();
  hideDriverMechanicPanel();
  clearMechanicMapState();
}

function hideDriverMechanicPanel() {
  driverMechanicPanel?.classList.add("hidden");
  closestBadge?.classList.add("hidden");
  selectedMechanicEntry = null;
  autoSelectedMechanicId = null;
}

function resetGoogleMapInstance() {
  googleMap = null;
  if (mapElement) {
    mapElement.replaceChildren();
  }
}

let mapErrorObserver = null;

function stopMapErrorObserver() {
  if (mapErrorObserver) {
    mapErrorObserver.disconnect();
    mapErrorObserver = null;
  }
}

function watchMapForGoogleErrorOverlay() {
  stopMapErrorObserver();
  if (!mapElement) return;

  mapErrorObserver = new MutationObserver(() => {
    const errTitle = mapElement.querySelector(".gm-err-title");
    if (errTitle?.textContent?.toLowerCase().includes("went wrong")) {
      stopMapErrorObserver();
      resetGoogleMapInstance();
      showMapLoadError();
    }
  });

  mapErrorObserver.observe(mapElement, { childList: true, subtree: true });
}

function clearMechanicMapState({ keepMapVisible = false } = {}) {
  clearMarkers();
  if (driverMarker) {
    driverMarker.setMap(null);
    driverMarker = null;
  }
  driverPosition = null;
  matchedMechanics = [];
  if (!keepMapVisible) {
    mapElement?.classList.remove("active");
  }
  driverPostServices?.classList.remove("map-active");
}

function beginDriverPositionLookup() {
  activeDriverPositionRequest = getDriverPosition().catch(() => null);
  return activeDriverPositionRequest;
}

async function getDriverPosition() {
  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported in this browser.");
  }

  const readCoords = (pos) => ({
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
  });

  const tryOnce = (options) =>
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(readCoords(pos)),
        reject,
        options
      );
    });

  try {
    return await tryOnce({
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 300000,
    });
  } catch {
    return tryOnce({
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 60000,
    });
  }
}

function buildMechanicEntries(docs, driverPos = null) {
  return docs.map((docItem) => {
    const mechanic = docItem.data();
    const position = getMechanicPosition(mechanic);
    let dist = null;
    if (driverPos && position) {
      dist = distanceMeters(
        driverPos.lat,
        driverPos.lng,
        position.lat,
        position.lng
      );
    }
    return {
      id: docItem.id,
      mechanic,
      position,
      distanceMeters: dist,
    };
  });
}

function sortMechanicsByDistance(entries) {
  return [...entries].sort(
    (a, b) =>
      (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
      (b.distanceMeters ?? Number.MAX_SAFE_INTEGER)
  );
}

async function applyDriverPositionToMap(serviceName) {
  try {
    const driverPos = await (activeDriverPositionRequest || beginDriverPositionLookup());
    if (!driverPos || !googleMap || !matchedMechanics.length) return;

    driverPosition = driverPos;
    matchedMechanics.forEach((entry) => {
      if (entry.position) {
        entry.distanceMeters = distanceMeters(
          driverPos.lat,
          driverPos.lng,
          entry.position.lat,
          entry.position.lng
        );
      }
    });

    const withCoords = sortMechanicsByDistance(
      matchedMechanics.filter((entry) => entry.position)
    );
    const closest = withCoords[0];
    if (!closest) return;

    placeDriverMarker(driverPos);
    smoothCenterMap(driverPos, MAP_DRIVER_ZOOM);

    const keepAutoSelection =
      !selectedMechanicEntry ||
      selectedMechanicEntry.id === autoSelectedMechanicId;

    if (keepAutoSelection) {
      autoSelectedMechanicId = closest.id;
      selectMechanicEntry(closest, { autoClosest: true });
    } else {
      const updated = matchedMechanics.find(
        (entry) => entry.id === selectedMechanicEntry.id
      );
      if (updated) {
        selectedMechanicEntry = updated;
        renderMechanicPanel(updated, { showClosestBadge: false });
      }
    }

    if (openInMapsBtn) {
      openInMapsBtn.style.display = "block";
      openInMapsBtn.onclick = () => {
        const url = `https://www.google.com/maps/@${driverPos.lat},${driverPos.lng},${MAP_DRIVER_ZOOM}z`;
        window.open(url, "_blank");
      };
    }

    showMapMatchNotification(
      `${withCoords.length} mechanic(s) nearby for “${serviceName}”. Closest auto-selected.`,
      { autoDismissMs: 3000 }
    );
  } catch {
    // Map is already usable without location.
  }
}

function smoothCenterMap(position, zoom = MAP_DRIVER_ZOOM) {
  if (!googleMap || !position) return;
  googleMap.panTo(position);
  const currentZoom = googleMap.getZoom();
  if (currentZoom !== zoom) {
    googleMap.setZoom(zoom);
  }
}

function updateAdminContactButtons(mechanic) {
  const isAdmin = currentUserProfile?.isAdmin === true;
  const phone = mechanic?.phoneNumber || mechanic?.phone || "";
  if (mechanicCallBtn) {
    mechanicCallBtn.classList.toggle("hidden", !isAdmin || !phone);
    if (isAdmin && phone) {
      mechanicCallBtn.href = `tel:${phone}`;
    }
  }
  if (mechanicSmsBtn) {
    mechanicSmsBtn.classList.toggle("hidden", !isAdmin || !phone);
    if (isAdmin && phone) {
      mechanicSmsBtn.href = `sms:${phone}`;
    }
  }
}

function renderMechanicPanel(entry, { showClosestBadge = false } = {}) {
  if (!entry || !driverMechanicPanel) return;
  const { mechanic, distanceMeters: dist } = entry;
  driverMechanicPanel.classList.remove("hidden");
  closestBadge?.classList.toggle("hidden", !showClosestBadge);
  if (mechanicPanelName) {
    mechanicPanelName.textContent = mechanic.name || "Mechanic";
  }
  if (mechanicPanelDistance) {
    mechanicPanelDistance.textContent = Number.isFinite(dist)
      ? formatDistanceMeters(dist)
      : "Distance unavailable";
  }
  if (mechanicPanelMeta) {
    mechanicPanelMeta.textContent =
      mechanic.city || mechanic.location
        ? `Area: ${mechanic.city || mechanic.location}`
        : "Location shared on map";
  }
  if (mechanicPanelService) {
    mechanicPanelService.textContent = selectedSubservice
      ? `Service: ${selectedSubservice}`
      : "";
  }
  updateAdminContactButtons(mechanic);
}

function selectMechanicEntry(entry, { autoClosest = false, zoomDetail = false } = {}) {
  if (!entry) return;
  selectedMechanicEntry = entry;
  renderMechanicPanel(entry, { showClosestBadge: autoClosest });

  mapMarkers.forEach(({ marker, entry: markerEntry }) => {
    const isSelected = markerEntry.id === entry.id;
    marker.setIcon({
      path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
      scale: isSelected ? 7 : 5,
      fillColor: isSelected ? "#ff4444" : "#ff0000",
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: "#ffffff",
    });
    marker.setZIndex(isSelected ? 1000 : 1);
  });

  if (zoomDetail && entry.position) {
    smoothCenterMap(entry.position, MAP_MECHANIC_DETAIL_ZOOM);
  }
}

function placeDriverMarker(position) {
  if (!googleMap || !position) return;
  if (driverMarker) driverMarker.setMap(null);
  driverMarker = new google.maps.Marker({
    position,
    map: googleMap,
    title: "You",
    zIndex: 2000,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 9,
      fillColor: "#4285F4",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
    },
  });
}

function setSelectedService(category, subservice) {
  selectedCategory = category;
  selectedSubservice = subservice;
  selectedCategoryInput.value = category.name;
  selectedSubserviceInput.value = subservice;
}

const MAP_STYLES = [
      { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
      {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
      },
      {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
      },
      {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#263c3f" }],
      },
      {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#6b9a76" }],
      },
      {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#38414e" }],
      },
      {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#212a37" }],
      },
      {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#9ca5b3" }],
      },
      {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#746855" }],
      },
      {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers: [{ color: "#1f2835" }],
      },
      {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#f3d19c" }],
      },
      {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: "#2f3948" }],
      },
      {
        featureType: "transit.station",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#17263c" }],
      },
      {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#515c6d" }],
      },
      {
        featureType: "water",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#17263c" }],
      },
];

function showMapLoadError() {
  showMapNotification(getMapLoadErrorMessage());
  driverPostServices?.classList.add("hidden");
  clearMapMatchNotification();
  stopMapErrorObserver();
}

async function ensureGoogleMap() {
  if (!mapElement) return null;

  mapElement.classList.add("active");
  await waitForMapLayout(mapElement);

  try {
    await loadGoogleMapsScript();
  } catch (err) {
    console.error("Google Maps load failed:", err);
    showMapLoadError();
    return null;
  }

  if (isMapsAuthFailed()) {
    showMapLoadError();
    return null;
  }

  if (!googleMap) {
    try {
      googleMap = new google.maps.Map(mapElement, {
        center: { lat: -1.286389, lng: 36.817223 },
        zoom: 12,
        styles: MAP_STYLES,
        backgroundColor: "#202124",
      });
      watchMapForGoogleErrorOverlay();
    } catch (err) {
      console.error("Google Maps init failed:", err);
      showMapLoadError();
      return null;
    }
  }

  await new Promise((resolve) => {
    requestAnimationFrame(() => {
      fixGoogleMapContainerFill();
      resolve();
    });
  });

  return googleMap;
}

function clearMarkers() {
  mapMarkers.forEach(({ marker }) => marker.setMap(null));
  mapMarkers = [];
}

function showNoMechanicsOnMap(message = MAP_EMPTY_NOTIFICATION) {
  showMapNotification(message);
  clearMapMatchNotification();
  mapElement?.classList.remove("active");
  driverPostServices?.classList.remove("map-active");
  driverPostServices?.classList.add("hidden");
  hideDriverMechanicPanel();
}

async function fetchMatchingMechanics(serviceName) {
  hideDriverMechanicPanel();
  showMapNotification("");
  driverPostServices?.classList.remove("hidden");
  showMapMatchNotification("Finding mechanics for your service…");
  bookStatus.textContent = "";
  bookError.textContent = "";
  clearMechanicMapState({ keepMapVisible: true });

  if (openInMapsBtn) openInMapsBtn.style.display = "none";
  if (mapHint) mapHint.style.display = "none";

  try {
    const [snapshot, map] = await Promise.all([
      getDocs(
        query(collection(db, "users"), where("role", "in", ["mechanic", "MECHANIC"]))
      ),
      ensureGoogleMap(),
    ]);

    const matchingDocs = snapshot.docs.filter((docItem) => {
      const profile = docItem.data();
      return isMechanicRole(profile.role) && mechanicOffersService(profile, serviceName);
    });

    if (!matchingDocs.length) {
      showNoMechanicsOnMap(
        `No mechanics currently offer "${serviceName}". Check that mechanic accounts have this service selected in the app.`
      );
      return;
    }

    matchedMechanics = buildMechanicEntries(matchingDocs);
    const withCoords = matchedMechanics.filter((entry) => entry.position);
    if (!withCoords.length) {
      showNoMechanicsOnMap(
        `Mechanics offer "${serviceName}" but none have a map location yet. Open the Android app as a mechanic, enable location, and stay online so coordinates sync to Firestore.`
      );
      return;
    }

    driverPostServices?.classList.add("map-active");
    if (mapHint) mapHint.style.display = "block";
    if (!map) return;

    const bounds = new google.maps.LatLngBounds();

    withCoords.forEach((entry) => {
      const marker = new google.maps.Marker({
        position: entry.position,
        map: googleMap,
        title: entry.mechanic.name || "Mechanic",
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: "#ff0000",
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "#ffffff",
        },
      });

      marker.addListener("click", () => {
        selectMechanicEntry(entry, { zoomDetail: true });
      });

      mapMarkers.push({ marker, entry });
      bounds.extend(entry.position);
    });

    googleMap.fitBounds(bounds);

    const initialSelection = withCoords[0];
    if (initialSelection) {
      autoSelectedMechanicId = initialSelection.id;
      selectMechanicEntry(initialSelection, {
        autoClosest: true,
        zoomDetail: false,
      });
    }

    showMapMatchNotification(
      `${withCoords.length} mechanic(s) on map for “${serviceName}”.`,
      { autoDismissMs: 3000 }
    );
    fixGoogleMapContainerFill();
    applyDriverPositionToMap(serviceName);
  } catch (error) {
    showMapMatchNotification(`Unable to load mechanics: ${error.message}`);
  }
}

function stopChatListener() {
  if (chatTypingDebounceTimer) {
    clearTimeout(chatTypingDebounceTimer);
    chatTypingDebounceTimer = null;
  }
  if (activeChatRoomIds.length && auth.currentUser) {
    broadcastTypingStatus(false);
  }
  if (chatUnsubscribe) {
    chatUnsubscribe();
    chatUnsubscribe = null;
  }
  if (chatRoomUnsubscribe) {
    chatRoomUnsubscribe();
    chatRoomUnsubscribe = null;
  }
  if (chatPartnerTypingUnsubscribe) {
    chatPartnerTypingUnsubscribe();
    chatPartnerTypingUnsubscribe = null;
  }
  optimisticChatMessages = [];
  serverChatMessages = [];
  activeChatPartnerId = null;
  activeChatRoomIds = [];
  roomTypingActive = false;
  partnerInboxTypingActive = false;
  chatTypingIndicator?.classList.add("hidden");
}

function isMatchingServerMessage(optimisticMessage, serverMessage) {
  return (
    optimisticMessage.senderId === serverMessage.senderId &&
    optimisticMessage.text === serverMessage.text &&
    Math.abs(
      (optimisticMessage.timestampMillis || 0) -
        (serverMessage.timestampMillis || 0)
    ) < 60000
  );
}

function mergeChatMessages() {
  const pending = optimisticChatMessages.filter(
    (message) =>
      message.pending &&
      !serverChatMessages.some((serverMessage) =>
        isMatchingServerMessage(message, serverMessage)
      )
  );
  return chatService.sortMessages([...serverChatMessages, ...pending]);
}

function isUserTyping(typingStatus, userId) {
  const value = typingStatus?.[userId];
  return (
    value === true ||
    value === 1 ||
    (typeof value === "string" && value.toLowerCase() === "true")
  );
}

function getActiveChatParticipantIds() {
  if (!auth.currentUser?.uid || !activeChatPartnerId) return [];
  return [auth.currentUser.uid, activeChatPartnerId];
}

function broadcastTypingStatus(isTyping) {
  if (!auth.currentUser) return;
  const roomIds = activeChatRoomIds.length
    ? activeChatRoomIds
    : activeChatConversationId
      ? [activeChatConversationId]
      : [];
  if (!roomIds.length) return;

  chatService
    .setTypingStatus({
      roomIds,
      userId: auth.currentUser.uid,
      isTyping,
      participantIds: getActiveChatParticipantIds(),
    })
    .catch((err) => console.error("Could not update typing status:", err));
}

function isPartnerTypingFromInbox(partnerData) {
  if (!partnerData?.partnerIsTyping) return false;
  const age = Date.now() - (partnerData.partnerTypingAtMillis || 0);
  return age < 10000;
}

function refreshTypingIndicator() {
  if (!chatTypingIndicator || !activeChatPartnerId || !auth.currentUser) return;
  const isTyping = roomTypingActive || partnerInboxTypingActive;
  if (isTyping) {
    if (chatTypingLabel) {
      chatTypingLabel.textContent = `${activeChatPartnerName || "They"} is typing`;
    }
    chatTypingIndicator.classList.remove("hidden");
  } else {
    if (chatTypingLabel) {
      chatTypingLabel.textContent = "";
    }
    chatTypingIndicator.classList.add("hidden");
  }
}

function updateTypingIndicator(roomData) {
  roomTypingActive = isUserTyping(roomData?.typingStatus, activeChatPartnerId);
  refreshTypingIndicator();
}

function updatePartnerTypingIndicator(partnerData) {
  partnerInboxTypingActive = isPartnerTypingFromInbox(partnerData);
  refreshTypingIndicator();
}

function createReadReceipt(isRead) {
  const receipt = document.createElement("span");
  receipt.className = `chat-read-receipt${isRead ? " is-read" : ""}`;
  receipt.setAttribute("aria-label", isRead ? "Read" : "Sent");

  const icon = document.createElement("span");
  icon.className = "material-symbols-outlined chat-tick-icon";
  icon.textContent = isRead ? "done_all" : "done";
  receipt.appendChild(icon);
  return receipt;
}

function renderChatMessages(messages) {
  if (!chatMessagesEl) return;
  chatMessagesEl.innerHTML = "";
  const myId = auth.currentUser?.uid;
  messages.forEach((msg) => {
    const bubble = document.createElement("div");
    const side = msg.senderId === myId ? "mine" : "theirs";
    const stateClass = msg.failed ? "failed" : msg.pending ? "pending" : "";
    bubble.className = `chat-bubble ${side}${stateClass ? ` ${stateClass}` : ""}`;

    const displayText = msg.failed
      ? `${msg.text || ""} (failed to send)`
      : msg.text || "";

    if (side === "mine" && !msg.failed) {
      const inner = document.createElement("div");
      inner.className = "chat-bubble-inner";
      const text = document.createElement("span");
      text.className = "chat-bubble-text";
      text.textContent = displayText;
      inner.appendChild(text);
      inner.appendChild(createReadReceipt(msg.read === true && !msg.pending));
      bubble.appendChild(inner);
    } else {
      bubble.textContent = displayText;
    }

    chatMessagesEl.appendChild(bubble);
  });
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

async function markActiveChatAsRead(messages) {
  if (!activeChatConversationId || !auth.currentUser || !messages?.length) return;
  try {
    await chatService.markMessagesAsRead(
      activeChatConversationId,
      auth.currentUser.uid,
      messages
    );
  } catch (err) {
    console.error("Could not mark messages as read:", err);
  }
}

function handleServerChatMessages(messages) {
  serverChatMessages = messages;
  optimisticChatMessages = optimisticChatMessages.filter(
    (message) =>
      !message.pending ||
      !serverChatMessages.some((serverMessage) =>
        isMatchingServerMessage(message, serverMessage)
      )
  );
  renderChatMessages(mergeChatMessages());
  markActiveChatAsRead(messages);
}

async function openChatWithPartner(partnerId, partnerName) {
  if (!auth.currentUser || !partnerId) {
    showLoginForm();
    return;
  }

  stopChatListener();
  const myId = auth.currentUser.uid;
  activeChatPartnerId = partnerId;
  activeChatRoomIds = getAllConversationIdsForParticipants(myId, partnerId);
  activeChatConversationId = buildDriverMechanicConversationId(myId, partnerId);
  activeChatPartnerName = partnerName || "User";
  chatPartnerNameCache.set(partnerId, activeChatPartnerName);
  optimisticChatMessages = [];
  serverChatMessages = [];
  showMessagesPage();
  showChatView();

  if (chatHeaderTitle) {
    chatHeaderTitle.textContent = `Chat · ${activeChatPartnerName}`;
  }
  if (chatTypingLabel) {
    chatTypingLabel.textContent = "";
  }
  if (chatTypingIndicator) {
    chatTypingIndicator.classList.add("hidden");
  }
  if (chatMessagesEl) {
    chatMessagesEl.innerHTML = "<p style='color:#888;font-size:13px'>Loading messages…</p>";
  }

  const myName =
    currentUserProfile?.name ||
    auth.currentUser.displayName ||
    auth.currentUser.email?.split("@")[0] ||
    "User";

  try {
    await chatService.ensureChatRooms(
      activeChatRoomIds,
      [auth.currentUser.uid, partnerId],
      {
        [auth.currentUser.uid]: myName,
        [partnerId]: activeChatPartnerName,
      }
    );
  } catch (err) {
    if (chatMessagesEl) {
      chatMessagesEl.innerHTML = `<p style='color:#f88'>${err.message}</p>`;
    }
    return;
  }

  chatUnsubscribe = chatService.listenForMessagesMerged(
    {
      roomIds: activeChatRoomIds,
      conversationIds: activeChatRoomIds,
      participantIds: [myId, partnerId],
    },
    handleServerChatMessages,
    (err) => {
      if (chatMessagesEl) {
        chatMessagesEl.innerHTML = `<p style='color:#f88'>${err.message}</p>`;
      }
    }
  );

  chatRoomUnsubscribe = chatService.listenToChatRoomsMerged(
    activeChatRoomIds,
    updateTypingIndicator,
    (err) => console.error("Chat room typing listener failed:", err)
  );

  chatPartnerTypingUnsubscribe = chatService.listenToPartnerTyping(
    myId,
    partnerId,
    updatePartnerTypingIndicator,
    (err) => console.error("Partner inbox typing listener failed:", err)
  );
}

function openChatWithMechanic(mechanicId, mechanicName) {
  return openChatWithPartner(mechanicId, mechanicName || "Mechanic");
}

async function handleBookNow() {
  bookError.textContent = "";
  bookStatus.textContent = "";

  if (!selectedCategory || !selectedSubservice) {
    bookError.textContent = "Select a service first.";
    return;
  }
  if (!selectedMechanicEntry) {
    bookError.textContent = "Select a mechanic on the map first.";
    return;
  }
  if (!auth.currentUser) {
    bookError.textContent = "You must be signed in to book.";
    return;
  }

  const locationLabel = driverPosition
    ? `GPS: ${driverPosition.lat.toFixed(5)}, ${driverPosition.lng.toFixed(5)}`
    : "Location not provided";
  const description = "";
  const suggestedPrice = 0;

  mechanicBookBtn.disabled = true;
  mechanicBookBtn.textContent = "Booking…";

  try {
    const jobId = await jobService.createJob(
      auth.currentUser.uid,
      selectedCategory.displayGroup || selectedCategory.name,
      selectedSubservice,
      description,
      locationLabel,
      suggestedPrice,
      selectedMechanicEntry.id
    );
    bookStatus.textContent = `Booked with ${selectedMechanicEntry.mechanic.name || "mechanic"}. Job #${jobId.slice(0, 8)}… — loyalty tracking started.`;
    bookError.textContent = "";
  } catch (error) {
    bookError.textContent = `Booking failed: ${error.message}`;
  } finally {
    mechanicBookBtn.disabled = false;
    mechanicBookBtn.textContent = "Book Now";
  }
}

function appendServiceGroups(body, category, { guest = false } = {}) {
  category.groups.forEach((group) => {
    const groupCard = document.createElement("div");
    groupCard.className = "service-group-card";

    const groupTitle = document.createElement("h4");
    groupTitle.textContent = group.title;
    groupCard.appendChild(groupTitle);

    group.items.forEach((serviceName) => {
      const tag = document.createElement("span");
      tag.className = "service-tag";
      tag.textContent = serviceName;
      if (
        !guest &&
        selectedCategory?.id === category.id &&
        selectedSubservice === serviceName
      ) {
        tag.classList.add("selected");
      }
      tag.addEventListener("click", () => {
        if (!auth.currentUser) {
          setPendingServiceSelection(category, serviceName);
          showLoginForm();
          return;
        }
        showMechanicMapPage(category, serviceName);
      });
      groupCard.appendChild(tag);
    });

    body.appendChild(groupCard);
  });
}

function buildServiceCategoryCard(category, { guest = false } = {}) {
  const { card, body } = createServiceCategoryCardShell(category);
  appendServiceGroups(body, category, { guest });
  return card;
}

function appendCatalogByDisplayGroup(container, buildCard) {
  const grouped = new Map();
  serviceCategories.forEach((category) => {
    const groupName = category.displayGroup || "Services";
    if (!grouped.has(groupName)) grouped.set(groupName, []);
    grouped.get(groupName).push(category);
  });

  SERVICE_DISPLAY_GROUP_ORDER.forEach((groupName) => {
    const categories = grouped.get(groupName);
    if (!categories?.length) return;

    const header = document.createElement("div");
    header.className = "service-display-group";
    const heading = document.createElement("h2");
    heading.className = "service-display-group-title";
    heading.textContent = groupName;
    header.appendChild(heading);
    container.appendChild(header);

    categories.forEach((category) => {
      container.appendChild(buildCard(category));
    });

    grouped.delete(groupName);
  });

  grouped.forEach((categories, groupName) => {
    const header = document.createElement("div");
    header.className = "service-display-group";
    const heading = document.createElement("h2");
    heading.className = "service-display-group-title";
    heading.textContent = groupName;
    header.appendChild(heading);
    container.appendChild(header);
    categories.forEach((category) => container.appendChild(buildCard(category)));
  });
}

function renderServiceCategories() {
  serviceCategoryList.innerHTML = "";
  guestServiceCategoryList.innerHTML = "";

  appendCatalogByDisplayGroup(serviceCategoryList, (category) =>
    buildServiceCategoryCard(category, { guest: false })
  );
  appendCatalogByDisplayGroup(guestServiceCategoryList, (category) =>
    buildServiceCategoryCard(category, { guest: true })
  );

  scheduleServiceCategoryCardBalance();
}

function buildMechanicCategoryCard(category, existingSkills) {
  const { card, body } = createServiceCategoryCardShell(category);

  category.groups.forEach((group) => {
    const groupCard = document.createElement("div");
    groupCard.className = "service-group-card";

    const groupTitle = document.createElement("h4");
    groupTitle.textContent = group.title;
    groupCard.appendChild(groupTitle);

    group.items.forEach((serviceName) => {
      const label = document.createElement("label");
      label.className = "service-checkbox-label";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = serviceName;
      checkbox.checked = existingSkills.has(serviceName);
      checkbox.style.cursor = "pointer";
      checkbox.style.marginRight = "8px";

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(serviceName));
      groupCard.appendChild(label);
    });

    body.appendChild(groupCard);
  });

  return card;
}

function renderMechanicServiceSelection() {
  mechanicServiceList.innerHTML = "";
  const existingSkills = new Set(currentUserProfile?.skills || []);

  appendCatalogByDisplayGroup(mechanicServiceList, (category) =>
    buildMechanicCategoryCard(category, existingSkills)
  );

  scheduleServiceCategoryCardBalance();
}

function showNoCurrentJobsAvailable() {
  jobsStatus.textContent = "";
  availableJobsList.innerHTML = "";
  const noJobsMsg = document.createElement("p");
  noJobsMsg.textContent = "No current jobs available.";
  availableJobsList.appendChild(noJobsMsg);
}

async function renderAvailableJobs() {
  if (!currentUserProfile || currentUserProfile.role !== "mechanic") {
    return;
  }

  availableJobsList.innerHTML = "";
  jobsStatus.textContent = "Loading available jobs...";

  try {
    // Get jobs that match the mechanic's skills and are in REQUESTED status
    const mechanicSkills = new Set(currentUserProfile.skills || []);
    const allJobs = await jobService.listJobRequests({ status: "REQUESTED" });
    
    const availableJobs = allJobs.filter(job => 
      mechanicSkills.has(job.serviceName)
    );

    if (availableJobs.length === 0) {
      showNoCurrentJobsAvailable();
      return;
    }

    jobsStatus.textContent = "";

    availableJobs.forEach((job) => {
      const jobCard = document.createElement("div");
      jobCard.className = "job-card";

      const title = document.createElement("h4");
      title.textContent = `${job.serviceName} - ${job.serviceCategory}`;
      jobCard.appendChild(title);

      const location = document.createElement("p");
      location.textContent = `Location: ${job.locationLabel}`;
      jobCard.appendChild(location);

      const description = document.createElement("p");
      description.textContent = `Details: ${job.description}`;
      jobCard.appendChild(description);

      const price = document.createElement("p");
      price.textContent = `Offered Price: KSh ${job.suggestedPrice}`;
      jobCard.appendChild(price);

      const acceptBtn = document.createElement("button");
      acceptBtn.className = "btn-secondary";
      acceptBtn.textContent = "Accept Job";
      acceptBtn.addEventListener("click", async () => {
        try {
          await jobService.acceptJob(job.id, currentUserProfile.id);
          jobsStatus.textContent = "Job accepted successfully!";
          await renderAvailableJobs(); // Refresh the list
        } catch (error) {
          console.error("Error accepting job:", error);
          jobsStatus.textContent = "Error accepting job. Please try again.";
        }
      });
      jobCard.appendChild(acceptBtn);

      availableJobsList.appendChild(jobCard);
    });
  } catch (error) {
    console.error("Error loading available jobs:", error);
    showNoCurrentJobsAvailable();
  }
}

function renderCatalogFromLocal() {
  serviceCategories = SERVICE_CATEGORIES;
  renderServiceCategories();
  renderMechanicServiceSelection();
}

function syncCatalogToFirestoreInBackground() {
  if (currentUserProfile?.isAdmin !== true) return;

  const run = () => {
    serviceCatalogService.seedServiceCatalogIfMissing().catch((err) => {
      console.error("Background catalog sync failed:", err);
    });
  };
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(run, { timeout: 3000 });
  } else {
    setTimeout(run, 0);
  }
}

async function loadUserProfile(user) {
  if (!user) {
    currentUserProfile = null;
    return;
  }

  currentUserProfile = await authService.getUserProfile(user.uid);
  if (!currentUserProfile) {
    currentUserProfile = {
      id: user.uid,
      name: user.email || "",
      role: "customer",
      skills: [],
      isAdmin: false,
    };
  }

  renderMechanicServiceSelection();
  renderAvailableJobs();
  syncCatalogToFirestoreInBackground();
}

async function handleMechanicSaveServices() {
  mechanicStatus.textContent = "";
  mechanicError.textContent = "";

  if (!auth.currentUser) {
    mechanicError.textContent = "You must be signed in to update your services.";
    return;
  }

  const selectedSkills = Array.from(
    mechanicServiceList.querySelectorAll("input[type='checkbox']")
  )
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);

  saveServicesBtn.disabled = true;
  saveServicesBtn.textContent = "Saving...";

  try {
    await authService.updateMechanicSkills(auth.currentUser.uid, selectedSkills);
    mechanicStatus.textContent = `Saved ${selectedSkills.length} offered service(s).`;
    mechanicError.textContent = "";
    currentUserProfile.skills = selectedSkills;
    await renderAvailableJobs(); // Refresh available jobs after skills update
  } catch (error) {
    mechanicError.textContent = `Unable to save services: ${error.message}`;
  } finally {
    saveServicesBtn.disabled = false;
    saveServicesBtn.textContent = "Save Offered Services";
  }
}

authViewModel.subscribe((state) => {
  setLoadingState(state.uiState === "loading");

  if (state.uiState === "error") {
    const errorMsg = state.errorMessage || "An error occurred.";
    if (signupSection.classList.contains("active")) {
      signupErrorDiv.textContent = errorMsg;
    } else {
      loginErrorDiv.textContent = errorMsg;
    }
  }
});

toSignupBtn.addEventListener("click", (e) => {
  e.preventDefault();
  showSignupForm();
});

toLoginBtn.addEventListener("click", (e) => {
  e.preventDefault();
  showLoginForm();
});

loginBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  loginErrorDiv.textContent = "";

  authViewModel.email = loginEmailInput.value.trim();
  authViewModel.password = loginPasswordInput.value;

  if (!authViewModel.email || !authViewModel.password) {
    loginErrorDiv.textContent = "Please fill in all fields.";
    return;
  }

  await authViewModel.signIn();
});

signupPasswordInput.addEventListener("input", (e) => {
  updatePasswordStrength(e.target.value);
});

signupBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  signupErrorDiv.textContent = "";

  authViewModel.name = signupNameInput.value.trim();
  authViewModel.email = signupEmailInput.value.trim();
  authViewModel.password = signupPasswordInput.value;
  authViewModel.phoneNumber = signupPhoneInput.value.trim();
  authViewModel.role = document.querySelector(
    'input[name="role"]:checked'
  ).value;

  if (!authViewModel.name || !authViewModel.email || !authViewModel.password) {
    signupErrorDiv.textContent = "Please fill in all required fields.";
    return;
  }

  const validation = PasswordValidator.validate(authViewModel.password);
  if (!validation.isValid) {
    signupErrorDiv.textContent = validation.errors[0];
    return;
  }

  await authViewModel.signUp();
});

logoutBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  await authViewModel.logout(() => {
    showHomePage();
  });
});

landingToLoginBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  showLoginForm();
});

landingToSignupBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  showSignupForm();
});

landingToLoginSecondaryBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  showLoginForm();
});

landingToSignupSecondaryBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  showSignupForm();
});

document.getElementById("menu-welcome-btn")?.addEventListener("click", () => {
  closeMenu();
  showWelcomeScreen();
});

menuContactsBtn?.addEventListener("click", () => {
  alert("Contacts are coming soon. Stay tuned for driver and mechanic support.");
});

menuSettingsBtn?.addEventListener("click", () => {
  alert("Settings will be available soon in the dashboard.");
});

menuLogoutBtn?.addEventListener("click", async () => {
  if (auth.currentUser) {
    await authViewModel.logout(() => {
      showHomePage();
    });
  } else {
    showHomePage();
  }
});

menuDeleteBtn?.addEventListener("click", async () => {
  if (!auth.currentUser) {
    alert("No active account to delete.");
    return;
  }
  const confirmed = confirm("Delete your account permanently? This cannot be undone.");
  if (!confirmed) return;
  try {
    await auth.currentUser.delete();
    alert("Account deleted.");
    showHomePage();
  } catch (error) {
    alert(
      "Unable to delete account directly. Please sign in again and retry or use account settings."
    );
  }
});

mechanicPanelName?.addEventListener("click", () => {
  if (selectedMechanicEntry?.position) {
    selectMechanicEntry(selectedMechanicEntry, { zoomDetail: true });
  }
});

mechanicChatBtn?.addEventListener("click", () => {
  if (!selectedMechanicEntry) {
    bookError.textContent = "Select a mechanic on the map first.";
    return;
  }
  openChatWithMechanic(
    selectedMechanicEntry.id,
    selectedMechanicEntry.mechanic.name
  );
});

mechanicBookBtn?.addEventListener("click", handleBookNow);

mechanicMapBackBtn?.addEventListener("click", () => {
  showMapNotification("");
  showHomePage();
});

chatBackBtn?.addEventListener("click", () => {
  stopChatListener();
  activeChatConversationId = null;
  activeChatPartnerId = null;
  activeChatRoomIds = [];
  activeChatPartnerName = "";
  showMessagesInbox();
});

chatInput?.addEventListener("input", () => {
  if (!activeChatConversationId || !auth.currentUser) return;
  broadcastTypingStatus(true);
  if (chatTypingDebounceTimer) {
    clearTimeout(chatTypingDebounceTimer);
  }
  chatTypingDebounceTimer = setTimeout(() => {
    broadcastTypingStatus(false);
    chatTypingDebounceTimer = null;
  }, 2000);
});

chatComposeForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput?.value?.trim();
  if (!text || !activeChatConversationId || !auth.currentUser) return;
  if (text.length > MAX_CHAT_MESSAGE_LENGTH) {
    if (chatMessagesEl) {
      const notice = document.createElement("p");
      notice.style.color = "#f88";
      notice.style.fontSize = "13px";
      notice.textContent = `Message is too long (max ${MAX_CHAT_MESSAGE_LENGTH} characters).`;
      chatMessagesEl.appendChild(notice);
    }
    return;
  }

  const optimisticMessage = {
    id: `pending_${Date.now()}`,
    senderId: auth.currentUser.uid,
    text,
    timestampMillis: Date.now(),
    pending: true,
  };

  optimisticChatMessages.push(optimisticMessage);
  renderChatMessages(mergeChatMessages());
  chatInput.value = "";

  broadcastTypingStatus(false);

  try {
    const myName =
      currentUserProfile?.name ||
      auth.currentUser.displayName ||
      auth.currentUser.email?.split("@")[0] ||
      "User";

    await chatService.sendConversationMessage({
      roomId: activeChatConversationId,
      senderId: auth.currentUser.uid,
      text,
      participantIds: [auth.currentUser.uid, activeChatPartnerId],
      participantNames: {
        [auth.currentUser.uid]: myName,
        [activeChatPartnerId]: activeChatPartnerName,
      },
    });
  } catch (err) {
    optimisticMessage.pending = false;
    optimisticMessage.failed = true;
    renderChatMessages(mergeChatMessages());
    alert(`Could not send message: ${err.message}`);
  }
});

function initPasswordToggles() {
  document.querySelectorAll(".password-toggle-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.target || "");
      if (!input) return;

      const showPassword = input.type === "password";
      input.type = showPassword ? "text" : "password";

      const icon = button.querySelector(".material-symbols-outlined");
      if (icon) {
        icon.textContent = showPassword ? "visibility_off" : "visibility";
      }
      button.setAttribute(
        "aria-label",
        showPassword ? "Hide password" : "Show password"
      );
    });
  });
}

initPasswordToggles();

saveServicesBtn.addEventListener("click", handleMechanicSaveServices);

homeReviewsMount?.addEventListener("home-review-request-sign-in", () => {
  setPendingReviewAfterAuth(true);
  showLoginForm();
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    wasLoggedIn = true;
    clearWelcomeDismissTimer();
    await loadUserProfile(user);
    await refreshHomeReviews(auth, homeReviewsMount);
    if (!resumePendingServiceAfterAuth()) {
      showHomePage();
    }
  } else if (wasLoggedIn) {
    clearPendingServiceSelection();
    showHomePage();
    wasLoggedIn = false;
  } else {
    await refreshHomeReviews(auth, homeReviewsMount);
  }
  updateNavAuthButton();
});

function mountPageFooters() {
  const template = document.getElementById("page-footer-template");
  if (!template) return;

  [landingSection, requestsSection].forEach((section) => {
    if (!section || section.querySelector(".page-footer")) return;
    section.appendChild(template.content.cloneNode(true));
  });

  document.querySelectorAll(".page-footer-social-link.is-placeholder").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
    });
  });
}

initHomeReviews(auth, homeReviewsMount);
mountPageFooters();
renderCatalogFromLocal();
updateNavAuthButton();
setupServiceCardResizeListener();
scheduleServiceCategoryCardBalance();
syncCatalogToFirestoreInBackground();

// First visit: welcome splash for 3 seconds, then HOME
scheduleWelcomeDismiss();
