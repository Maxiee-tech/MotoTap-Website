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
      driverDashboard.classList.add("active");
      setHomeMenuVisible(true);
    }
  } else {
    landingSection.classList.add("active");
    setLandingGuestViewVisible(true);
    setHomeMenuVisible(true);
    updateMenuProfile("Guest", "Not signed in");
  }
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
    : "(default key …p12E — not your Firebase key …pc_4)";
  return (
    `Google Maps could not load. Configure the Maps browser key ${keyHint}: ` +
    `Google Cloud → Credentials → API key used for Maps JavaScript (not the Firebase Auth key). ` +
    `Application restrictions → HTTP referrers → add ${origin}/*, ${origin}/, ` +
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
const messagesPlaceholder = document.getElementById("messages-placeholder");
const chatView = document.getElementById("chat-view");
const chatBackBtn = document.getElementById("chat-back-btn");
const chatHeaderTitle = document.getElementById("chat-header-title");
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
let matchedMechanics = [];
let selectedMechanicEntry = null;
let activeChatConversationId = null;
let activeChatMechanicName = "";
let chatUnsubscribe = null;

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

function showMessagesPage() {
  hideWelcomeScreen();
  closeMenu();
  hideAllSections();
  messagesSection.classList.add("active");
  if (!activeChatConversationId) {
    showMessagesInbox();
  }
}

function showMessagesInbox() {
  messagesInboxView?.classList.remove("hidden");
  chatView?.classList.add("hidden");
}

function showChatView() {
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

function getDriverPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
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

function showNoMechanicsOnMap() {
  showMapNotification(MAP_EMPTY_NOTIFICATION);
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
    const [snapshot, driverPos] = await Promise.all([
      getDocs(
        query(
          collection(db, "users"),
          where("role", "==", "mechanic"),
          where("skills", "array-contains", serviceName)
        )
      ),
      getDriverPosition().catch(() => null),
    ]);

    driverPosition = driverPos;

    if (snapshot.empty) {
      showNoMechanicsOnMap();
      return;
    }

    matchedMechanics = snapshot.docs.map((docItem) => {
      const mechanic = docItem.data();
      const lat = Number(mechanic.latitude);
      const lng = Number(mechanic.longitude);
      const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
      const position = hasCoords ? { lat, lng } : null;
      let dist = null;
      if (driverPos && position) {
        dist = distanceMeters(driverPos.lat, driverPos.lng, lat, lng);
      }
      return {
        id: docItem.id,
        mechanic,
        position,
        distanceMeters: dist,
      };
    });

    const withCoords = matchedMechanics.filter((e) => e.position);
    if (!withCoords.length) {
      showNoMechanicsOnMap();
      return;
    }

    withCoords.sort(
      (a, b) =>
        (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
        (b.distanceMeters ?? Number.MAX_SAFE_INTEGER)
    );

    driverPostServices?.classList.add("map-active");
    if (mapHint) mapHint.style.display = "block";

    const map = await ensureGoogleMap();
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

    if (driverPos) {
      placeDriverMarker(driverPos);
      bounds.extend(driverPos);
      smoothCenterMap(driverPos, MAP_DRIVER_ZOOM);
    } else {
      showMapMatchNotification(
        "Allow location access to see distance and auto-select the closest mechanic."
      );
      googleMap.fitBounds(bounds);
    }

    const closest = withCoords[0];
    if (closest) {
      selectMechanicEntry(closest, {
        autoClosest: Boolean(driverPos),
        zoomDetail: false,
      });
    }

    if (openInMapsBtn && driverPos) {
      openInMapsBtn.style.display = "block";
      openInMapsBtn.onclick = () => {
        const url = `https://www.google.com/maps/@${driverPos.lat},${driverPos.lng},${MAP_DRIVER_ZOOM}z`;
        window.open(url, "_blank");
      };
    }

    showMapMatchNotification(
      driverPos
        ? `${withCoords.length} mechanic(s) nearby for “${serviceName}”. Closest auto-selected.`
        : `${withCoords.length} mechanic(s) on map for “${serviceName}”.`,
      { autoDismissMs: 3000 }
    );
    fixGoogleMapContainerFill();
  } catch (error) {
    showMapMatchNotification(`Unable to load mechanics: ${error.message}`);
  }
}

function stopChatListener() {
  if (chatUnsubscribe) {
    chatUnsubscribe();
    chatUnsubscribe = null;
  }
}

function renderChatMessages(messages) {
  if (!chatMessagesEl) return;
  chatMessagesEl.innerHTML = "";
  const myId = auth.currentUser?.uid;
  messages.forEach((msg) => {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${msg.senderId === myId ? "mine" : "theirs"}`;
    bubble.textContent = msg.text || "";
    chatMessagesEl.appendChild(bubble);
  });
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

async function openChatWithMechanic(mechanicId, mechanicName) {
  if (!auth.currentUser) {
    showLoginForm();
    return;
  }
  activeChatConversationId = buildDriverMechanicConversationId(
    auth.currentUser.uid,
    mechanicId
  );
  activeChatMechanicName = mechanicName || "Mechanic";
  showMessagesPage();
  showChatView();
  if (chatHeaderTitle) {
    chatHeaderTitle.textContent = `Chat · ${activeChatMechanicName}`;
  }
  if (chatMessagesEl) {
    chatMessagesEl.innerHTML = "<p style='color:#888;font-size:13px'>Loading messages…</p>";
  }

  stopChatListener();
  chatUnsubscribe = chatService.listenToMessages(
    activeChatConversationId,
    (snapshot) => {
      const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderChatMessages(messages);
    },
    (err) => {
      if (chatMessagesEl) {
        chatMessagesEl.innerHTML = `<p style='color:#f88'>${err.message}</p>`;
      }
    }
  );
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

    jobsStatus.textContent = "";

    if (availableJobs.length === 0) {
      const noJobsMsg = document.createElement("p");
      noJobsMsg.textContent = "No available jobs matching your services.";
      availableJobsList.appendChild(noJobsMsg);
      return;
    }

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
    jobsStatus.textContent = "Error loading jobs. Please refresh the page.";
  }
}

function renderCatalogFromLocal() {
  serviceCategories = SERVICE_CATEGORIES;
  renderServiceCategories();
  renderMechanicServiceSelection();
}

function syncCatalogToFirestoreInBackground() {
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
  showMessagesInbox();
});

chatComposeForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput?.value?.trim();
  if (!text || !activeChatConversationId || !auth.currentUser) return;
  try {
    await chatService.sendConversationMessage({
      conversationId: activeChatConversationId,
      senderId: auth.currentUser.uid,
      text,
    });
    chatInput.value = "";
  } catch (err) {
    alert(`Could not send message: ${err.message}`);
  }
});

saveServicesBtn.addEventListener("click", handleMechanicSaveServices);

onAuthStateChanged(auth, async (user) => {
  if (user) {
    wasLoggedIn = true;
    clearWelcomeDismissTimer();
    await loadUserProfile(user);
    if (!resumePendingServiceAfterAuth()) {
      showHomePage();
    }
  } else if (wasLoggedIn) {
    clearPendingServiceSelection();
    showHomePage();
    wasLoggedIn = false;
  }
  updateNavAuthButton();
});

renderCatalogFromLocal();
updateNavAuthButton();
setupServiceCardResizeListener();
scheduleServiceCategoryCardBalance();
syncCatalogToFirestoreInBackground();

// First visit: welcome splash for 3 seconds, then HOME
scheduleWelcomeDismiss();
