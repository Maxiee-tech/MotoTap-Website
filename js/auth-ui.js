import { auth, db } from "../firebase.js";
import { collection, query, where, getDocs } from "firebase/firestore";
import FirebaseAuthService from "./services/FirebaseAuthService.js";
import FirebaseJobService from "./services/FirebaseJobService.js";
import FirebaseChatService from "./services/FirebaseChatService.js";
import FirebaseServiceCatalogService from "./services/FirebaseServiceCatalogService.js";
import {
  filterDriverHistoryJobs,
  filterMechanicAvailableJobs,
  filterMechanicHistoryJobs,
  getJobIssueType,
  normalizeJob,
  sortJobsNewestFirst,
} from "./utils/jobSync.js";
import {
  buildServicePricesPayload,
  formatKsh,
  getMechanicServicePrice,
  normalizeServicePrices,
} from "./utils/mechanicServicePrices.js";
import {
  buildPartPricesPayload,
  getPartsDealerPartPrice,
  normalizePartPrices,
} from "./utils/partsDealerPrices.js";
import {
  distanceMeters,
  formatDistanceMeters,
  buildDriverMechanicConversationId,
  getAllConversationIdsForParticipants,
  getMechanicPosition,
  isBusinessRole,
  isMechanicRole,
  formatUserRoleLabel,
  mechanicOffersService,
  partsDealerOffersPart,
  normalizeUserRole,
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
  PARTS_CATEGORIES,
  PARTS_DISPLAY_GROUP_ORDER,
  getPartsCategoryIcon,
} from "./partsCatalogData.js";
import {
  createServiceCategoryCardShell,
  scheduleServiceCategoryCardBalance,
  setupServiceCardResizeListener,
} from "./serviceCardLayout.js";
import PasswordValidator from "./PasswordValidator.js";
import { appendDriverJobReviewSection } from "./jobReviewUi.js";
import { renderProfilePage } from "./profileUi.js";
import { paintDriverActiveVehicleCard, paintDriverActiveVehicleSkeleton } from "./activeVehicleUi.js";
import {
  initSignupWizard,
  showSignupWizard,
  resumeSignupWizardFromProfile,
  isProfileOnboardingComplete,
} from "./signupWizard.js";
import { computeLoyalty } from "./utils/loyalty.js";
import { MAX_CHAT_MESSAGE_LENGTH } from "./appConfig.js";
import { escapeHtml } from "./utils/html.js";
import { PUBLIC_PROFILES_COLLECTION } from "./utils/publicProfile.js";
import { accountRequiresEmailVerification } from "./utils/emailVerification.js";
import { onAuthStateChanged } from "firebase/auth";

const landingSection = document.getElementById("landing-section");
const loginSection = document.getElementById("login-section");
const signupSection = document.getElementById("signup-section");
const forgotPasswordSection = document.getElementById("forgot-password-section");
const emailVerificationSection = document.getElementById("email-verification-section");
const dashboardSection = document.getElementById("dashboard");
const driverDashboard = document.getElementById("driver-dashboard");
const driverActiveVehicleRoot = document.getElementById("driver-active-vehicle-root");
const mechanicDashboard = document.getElementById("mechanic-dashboard");
const partsDealerDashboard = document.getElementById("parts-dealer-dashboard");
const messagesSection = document.getElementById("messages-section");
const requestsSection = document.getElementById("requests-section");
const aboutSection = document.getElementById("about-section");
const profileSection = document.getElementById("profile-section");
const profilePageRoot = document.getElementById("profile-page-root");
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
  forgotPasswordSection?.classList.remove("active");
  emailVerificationSection?.classList.remove("active");
  dashboardSection.classList.remove("active");
  messagesSection.classList.remove("active");
  requestsSection.classList.remove("active");
  aboutSection?.classList.remove("active");
  profileSection?.classList.remove("active");
  stopProfileJobSync();
  updateNavActiveState(null);
}

function hideWelcomeScreen() {
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
  document.body.classList.remove("auth-screen-active");
  landingSection.classList.remove("active");
  loginSection.classList.remove("active");
  signupSection.classList.remove("active");
  forgotPasswordSection?.classList.remove("active");
  emailVerificationSection?.classList.remove("active");
  dashboardSection.classList.remove("active");
  messagesSection.classList.remove("active");
  requestsSection.classList.remove("active");
  aboutSection?.classList.remove("active");
  profileSection?.classList.remove("active");
  mechanicMapSection?.classList.remove("active");
  driverDashboard.classList.remove("active");
  mechanicDashboard.classList.remove("active");
  partsDealerDashboard?.classList.remove("active");
  clearMapMatchNotification();
  setMechanicMapPageLayout(false);
  setHomeMenuVisible(false);
  stopProfileJobSync();
}

const NAV_ACTIVE_MAP = {
  home: ["nav-home", "nav-home-2", "nav-home-old"],
  requests: ["nav-requests", "nav-requests-2", "nav-requests-old"],
  messages: ["nav-messages", "nav-messages-2", "nav-messages-old"],
  auth: ["nav-signup", "nav-signup-2", "nav-signup-old"],
};

function updateNavActiveState(section) {
  const allIds = Object.values(NAV_ACTIVE_MAP).flat();
  allIds.forEach((id) => {
    document.getElementById(id)?.classList.remove("is-nav-active");
  });
  if (!section) return;
  (NAV_ACTIVE_MAP[section] || []).forEach((id) => {
    document.getElementById(id)?.classList.add("is-nav-active");
  });
}

let mapNotificationTimer = null;

function clearMapNotification() {
  clearTimeout(mapNotificationTimer);
  mapNotificationTimer = null;
  if (!mapNotificationEl) return;
  mapNotificationEl.textContent = "";
  mapNotificationEl.classList.add("hidden");
}

function showMapNotification(message, { autoDismissMs = 0 } = {}) {
  if (!mapNotificationEl) return;
  clearMapNotification();
  if (!message) return;

  mapNotificationEl.textContent = message;
  mapNotificationEl.classList.remove("hidden");

  if (autoDismissMs > 0) {
    mapNotificationTimer = setTimeout(() => {
      clearMapNotification();
    }, autoDismissMs);
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
  if (enforceDriverEmailVerificationGate()) return;

  driverMapDiscoveryMode = "mechanics";
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
  mechanicBookBtn?.classList.remove("hidden");

  renderServiceCategories();
  showMapNotification("");
  driverPostServices?.classList.remove("hidden");

  beginDriverPositionLookup();
  fetchMatchingMechanics(serviceName);
}

function showPartsDealerMapPage(category, partName) {
  if (enforceDriverEmailVerificationGate()) return;

  driverMapDiscoveryMode = "parts_dealers";
  hideWelcomeScreen();
  closeMenu();
  hideAllSections();
  mechanicMapSection?.classList.add("active");
  setMechanicMapPageLayout(true);

  setSelectedService(category, partName);
  if (mechanicMapServiceTitle) {
    mechanicMapServiceTitle.textContent = `PARTS DEALERS: ${partName.toUpperCase()}`;
  }
  if (mechanicPanelService) {
    mechanicPanelService.textContent = `Part: ${partName}`;
  }
  mechanicBookBtn?.classList.add("hidden");
  bookStatus.textContent = "";
  bookError.textContent = "";

  renderPartsCategories();
  showMapNotification("");
  driverPostServices?.classList.remove("hidden");

  beginDriverPositionLookup();
  fetchMatchingPartsDealers(partName);
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
  if (visible) {
    setGuestMarketplaceMode(guestMarketplaceMode);
  }
}

function setGuestMarketplaceMode(mode = "mechanics") {
  guestMarketplaceMode = mode === "parts_dealers" ? "parts_dealers" : "mechanics";
  const isMechanics = guestMarketplaceMode === "mechanics";

  guestMechanicsView?.classList.toggle("hidden", !isMechanics);
  guestPartsView?.classList.toggle("hidden", isMechanics);
  guestModeMechanicsBtn?.classList.toggle("is-active", isMechanics);
  guestModePartsDealersBtn?.classList.toggle("is-active", !isMechanics);
  guestModeMechanicsBtn?.setAttribute("aria-selected", isMechanics ? "true" : "false");
  guestModePartsDealersBtn?.setAttribute("aria-selected", !isMechanics ? "true" : "false");

  if (isMechanics) {
    renderServiceCategories();
  } else {
    renderPartsCategories();
  }
  scheduleServiceCategoryCardBalance();
}

function setDriverMarketplaceMode(mode = "mechanics") {
  driverMarketplaceMode = mode === "parts_dealers" ? "parts_dealers" : "mechanics";
  const isMechanics = driverMarketplaceMode === "mechanics";

  driverMechanicsView?.classList.toggle("hidden", !isMechanics);
  driverPartsView?.classList.toggle("hidden", isMechanics);
  driverModeMechanicsBtn?.classList.toggle("is-active", isMechanics);
  driverModePartsDealersBtn?.classList.toggle("is-active", !isMechanics);
  driverModeMechanicsBtn?.setAttribute("aria-selected", isMechanics ? "true" : "false");
  driverModePartsDealersBtn?.setAttribute("aria-selected", !isMechanics ? "true" : "false");

  if (isMechanics) {
    renderServiceCategories();
  } else {
    renderPartsCategories();
  }
  scheduleServiceCategoryCardBalance();
}

function renderRequestHistoryList() {
  if (!requestHistoryList) return;
  if (!auth.currentUser) {
    requestHistoryList.innerHTML =
      "<p>Sign in to submit a request and view your request history here.</p>";
    return;
  }

  requestHistoryList.innerHTML =
    '<p class="request-history-empty">Loading request history…</p>';
  startJobSync();
}

function formatJobStatus(status) {
  const labels = {
    REQUESTED: "Requested",
    MATCHING: "Matching",
    ASSIGNED: "Assigned",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    PAID: "Paid",
    CLOSED: "Closed",
  };
  return labels[status] || status || "Unknown";
}

function formatJobCreatedAt(createdAtMillis) {
  if (!createdAtMillis) return "";
  return new Date(createdAtMillis).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildJobCard(job, { includeStatus = false, actionButton = null, role = null } = {}) {
  const normalized = normalizeJob(job);
  const card = document.createElement("article");
  card.className = "job-card";

  const title = document.createElement("h4");
  const issueType = getJobIssueType(normalized);
  title.textContent = normalized.serviceCategory
    ? `${issueType} - ${normalized.serviceCategory}`
    : issueType;
  card.appendChild(title);

  if (includeStatus) {
    const status = document.createElement("p");
    status.className = "job-card-status";
    status.textContent = `Status: ${formatJobStatus(normalized.status)}`;
    card.appendChild(status);
  }

  const createdAt = document.createElement("p");
  const when = formatJobCreatedAt(normalized.createdAtMillis);
  if (when) {
    createdAt.textContent = `Submitted: ${when}`;
    card.appendChild(createdAt);
  }

  const location = document.createElement("p");
  location.textContent = `Location: ${normalized.locationLabel || "Not provided"}`;
  card.appendChild(location);

  const description = document.createElement("p");
  description.textContent = `Details: ${normalized.description || "No additional details"}`;
  card.appendChild(description);

  const price = document.createElement("p");
  price.textContent = `Offered Price: KSh ${normalized.price ?? 0}`;
  card.appendChild(price);

  if (actionButton) {
    card.appendChild(actionButton);
  }

  if (role === "driver") {
    appendDriverJobReviewSection(card, normalized);
  }

  return card;
}

function paintRequestHistory(jobs, role) {
  if (!requestHistoryList) return;

  const sorted = sortJobsNewestFirst(jobs);
  if (!sorted.length) {
    const emptyMsg =
      role === "mechanic"
        ? "No accepted jobs yet. Jobs you accept in the app or on the web will appear here."
        : "No past requests yet. Your submitted requests will show here.";
    requestHistoryList.innerHTML = `<p class="request-history-empty">${emptyMsg}</p>`;
    return;
  }

  requestHistoryList.innerHTML = "";
  sorted.forEach((job) => {
    requestHistoryList.appendChild(buildJobCard(job, { includeStatus: true, role }));
  });
}

function paintAvailableJobs(jobs) {
  if (!availableJobsList || !currentUserProfile || currentUserProfile.role !== "mechanic") {
    return;
  }

  const availableJobs = filterMechanicAvailableJobs(jobs, currentUserProfile);
  jobsStatus.textContent = "";

  if (!availableJobs.length) {
    showNoCurrentJobsAvailable();
    return;
  }

  availableJobsList.innerHTML = "";
  sortJobsNewestFirst(availableJobs).forEach((job) => {
    const acceptBtn = document.createElement("button");
    acceptBtn.className = "btn-secondary";
    acceptBtn.textContent = job.mechanicId ? "Confirm Job" : "Accept Job";
    acceptBtn.addEventListener("click", async () => {
      try {
        await jobService.acceptJob(job.id, currentUserProfile.id);
        jobsStatus.textContent = "Job accepted successfully!";
      } catch (error) {
        console.error("Error accepting job:", error);
        jobsStatus.textContent = "Error accepting job. Please try again.";
      }
    });

    availableJobsList.appendChild(buildJobCard(job, { actionButton: acceptBtn }));
  });
}

let openJobsUnsubscribe = null;
let requestHistoryUnsubscribe = null;
let profileJobsUnsubscribe = null;

function stopProfileJobSync() {
  profileJobsUnsubscribe?.();
  profileJobsUnsubscribe = null;
}

function stopJobSync() {
  openJobsUnsubscribe?.();
  openJobsUnsubscribe = null;
  requestHistoryUnsubscribe?.();
  requestHistoryUnsubscribe = null;
}

function startJobSync() {
  stopJobSync();

  if (!auth.currentUser || !currentUserProfile) return;

  const role = normalizeUserRole(currentUserProfile.role);
  const uid = auth.currentUser.uid;

  if (role === "mechanic") {
    if (availableJobsList) {
      jobsStatus.textContent = "Loading available jobs...";
    }

    openJobsUnsubscribe = jobService.subscribeOpenJobs(
      (jobs) => paintAvailableJobs(jobs),
      () => showNoCurrentJobsAvailable()
    );

    requestHistoryUnsubscribe = jobService.subscribeMechanicJobs(
      uid,
      (jobs) =>
        paintRequestHistory(
          filterMechanicHistoryJobs(jobs, uid),
          "mechanic"
        ),
      () => {
        if (requestHistoryList) {
          requestHistoryList.innerHTML =
            '<p class="request-history-empty">Unable to load request history. Please try again.</p>';
        }
      }
    );
    return;
  }

  requestHistoryUnsubscribe = jobService.subscribeDriverJobs(
    uid,
    (jobs) => paintRequestHistory(filterDriverHistoryJobs(jobs), "driver"),
    () => {
      if (requestHistoryList) {
        requestHistoryList.innerHTML =
          '<p class="request-history-empty">Unable to load request history. Please try again.</p>';
      }
    }
  );
}

function scrollToHomeContactsFooter() {
  window.requestAnimationFrame(() => {
    const footer =
      document.getElementById("site-contacts-footer") ||
      landingSection?.querySelector(".page-footer");
    footer?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function showContactsFromMenu() {
  closeMenu();
  hideWelcomeScreen();
  hideAllSections();
  landingSection.classList.add("active");
  setHomeMenuVisible(true);

  if (auth.currentUser) {
    const role = normalizeUserRole(currentUserProfile?.role);
    updateMenuProfile(role, auth.currentUser.email || "");
    if (isBusinessRole(role)) {
      setLandingGuestViewVisible(true);
      driverDashboard.classList.remove("active");
      dashboardSection.classList.remove("active");
      mechanicDashboard.classList.remove("active");
      partsDealerDashboard?.classList.remove("active");
    } else {
      setLandingGuestViewVisible(false);
      driverDashboard.classList.add("active");
      paintDriverHomeActiveVehicle();
    }
  } else {
    setLandingGuestViewVisible(true);
    updateMenuProfile("Guest", "Not signed in");
  }

  scheduleServiceCategoryCardBalance();
  updateNavActiveState("home");
  scrollToHomeContactsFooter();
}

function showAboutFromMenu() {
  closeMenu();
  hideWelcomeScreen();
  hideAllSections();
  aboutSection?.classList.add("active");
  setHomeMenuVisible(true);
  updateNavActiveState(null);

  if (auth.currentUser) {
    const role = normalizeUserRole(currentUserProfile?.role);
    updateMenuProfile(role, auth.currentUser.email || "");
  } else {
    updateMenuProfile("Guest", "Not signed in");
  }

  window.requestAnimationFrame(() => {
    aboutSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function paintProfilePage(jobs = []) {
  if (!profilePageRoot) return;
  lastProfileJobs = jobs;
  renderProfilePage(profilePageRoot, {
    profile: currentUserProfile,
    email: auth.currentUser?.email || "",
    jobs,
    activeHubTab: profileHubActiveTab,
    loyaltyNotice: profileLoyaltyNotice,
    onViewAllRequests: showRequestsPage,
    onBookMaintenance: () => {
      const category = serviceCategories.find((c) => c.id === "preventive-routine-maintenance");
      if (category) showMechanicMapPage(category, "General Request");
    },
    onRedeemReward: async (reward) => {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        profileLoyaltyNotice = {
          type: "error",
          message: "You must be signed in to redeem rewards.",
        };
        profileHubActiveTab = "loyalty";
        paintProfilePage(lastProfileJobs);
        return { success: false };
      }

      const available = computeLoyalty(currentUserProfile, lastProfileJobs).available;
      const result = await authService.redeemLoyaltyReward(userId, reward, {
        availablePoints: available,
      });

      if (!result.success) {
        profileLoyaltyNotice = {
          type: "error",
          message: result.error || "Unable to redeem reward. Please try again.",
        };
        profileHubActiveTab = "loyalty";
        paintProfilePage(lastProfileJobs);
        return result;
      }

      currentUserProfile = {
        ...currentUserProfile,
        redeemedRewards: result.redeemedRewards,
        loyaltyPoints: Math.max(0, available - (Number(reward.pointsRequired) || 0)),
      };
      profileHubActiveTab = "loyalty";
      profileLoyaltyNotice = {
        type: "success",
        message: `"${reward.title}" redeemed! Show this in your next visit.`,
      };
      paintProfilePage(lastProfileJobs);
      return result;
    },
    onSaveVehicles: async (vehicles) => {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        return { success: false, error: "You must be signed in to save vehicles." };
      }
      const result = await authService.updateUserVehicles(userId, vehicles);
      if (result.success) {
        currentUserProfile = {
          ...currentUserProfile,
          vehicles: result.vehicles || vehicles,
        };
        paintProfilePage(lastProfileJobs);
        paintDriverHomeActiveVehicle();
      }
      return result;
    },
    onLogout: async () => {
      await authViewModel.logout(() => {
        showHomePage();
      });
    },
    onDeleteAccount: async (password) => {
      await authViewModel.deleteAccount(password, () => {
        showHomePage();
      });
      if (authViewModel.uiState === "error") {
        const errorEl = profilePageRoot.querySelector("#profile-delete-error");
        if (errorEl) {
          errorEl.textContent =
            authViewModel.errorMessage || "Unable to delete account. Please try again.";
          errorEl.classList.remove("hidden");
        }
      }
    },
  });
}

function paintDriverHomeActiveVehicle() {
  if (!driverActiveVehicleRoot) return;

  const role = normalizeUserRole(currentUserProfile?.role);
  if (role !== "driver" || !auth.currentUser) {
    driverActiveVehicleRoot.innerHTML = "";
    return;
  }

  if (!currentUserProfile) {
    paintDriverActiveVehicleSkeleton(driverActiveVehicleRoot);
    return;
  }

  paintDriverActiveVehicleCard(driverActiveVehicleRoot, {
    profile: currentUserProfile,
    onNavigateToVehicles: () => showProfilePage({ focusVehicles: true }),
  });
}

async function showProfilePage({ focusVehicles = false } = {}) {
  closeMenu();
  hideWelcomeScreen();
  hideAllSections();
  profileSection?.classList.add("active");
  setHomeMenuVisible(true);
  updateNavActiveState(null);

  if (!auth.currentUser) {
    showLoginForm();
    return;
  }

  await loadUserProfile(auth.currentUser);

  if (!isProfileOnboardingComplete(currentUserProfile)) {
    document.body.classList.add("auth-screen-active");
    if (mainNavbar) {
      mainNavbar.hidden = true;
      mainNavbar.style.display = "none";
    }
    setHomeMenuVisible(false);
    signupSection.classList.add("active");
    resumeSignupWizardFromProfile(currentUserProfile);
    updateNavActiveState("auth");
    return;
  }

  if (enforceDriverEmailVerificationGate()) return;

  const role = normalizeUserRole(currentUserProfile?.role);
  updateMenuProfile(role, auth.currentUser.email || "");

  if (profilePageRoot) {
    profilePageRoot.innerHTML = '<p class="profile-page-loading">Loading profile…</p>';
  }

  stopProfileJobSync();
  const uid = auth.currentUser.uid;
  let scrollToVehiclesOnPaint = focusVehicles;

  const handleJobs = (jobs) => {
    if (!profileSection?.classList.contains("active")) return;
    paintProfilePage(jobs);
    if (scrollToVehiclesOnPaint) {
      scrollToVehiclesOnPaint = false;
      window.requestAnimationFrame(() => {
        document.getElementById("profile-vehicles-block")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  if (role === "mechanic") {
    profileJobsUnsubscribe = jobService.subscribeMechanicJobs(
      uid,
      (jobs) => handleJobs(filterMechanicHistoryJobs(jobs, uid)),
      () => handleJobs([])
    );
  } else if (role === "driver") {
    profileJobsUnsubscribe = jobService.subscribeDriverJobs(
      uid,
      (jobs) => handleJobs(filterDriverHistoryJobs(jobs)),
      () => handleJobs([])
    );
  } else {
    handleJobs([]);
  }

  window.requestAnimationFrame(() => {
    profileSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function showBusinessDashboard(role) {
  dashboardSection.classList.add("active");
  if (role === "parts_dealer") {
    partsDealerDashboard?.classList.add("active");
    renderPartsDealerSelection();
  } else {
    mechanicDashboard.classList.add("active");
    startJobSync();
  }
}

function showHomePage() {
  if (
    auth.currentUser &&
    currentUserProfile &&
    isProfileOnboardingComplete(currentUserProfile) &&
    enforceDriverEmailVerificationGate()
  ) {
    return;
  }

  hideWelcomeScreen();
  closeMenu();
  hideAllSections();
  if (auth.currentUser) {
    const role = normalizeUserRole(currentUserProfile?.role);
    updateMenuProfile(role, auth.currentUser.email || "");
    if (isBusinessRole(role)) {
      setHomeMenuVisible(true);
      showBusinessDashboard(role);
    } else {
      landingSection.classList.add("active");
      setLandingGuestViewVisible(false);
      driverDashboard.classList.add("active");
      setHomeMenuVisible(true);
      setDriverMarketplaceMode(driverMarketplaceMode);
      paintDriverHomeActiveVehicle();
      if (!currentUserProfile) {
        void loadUserProfile(auth.currentUser).then(() => {
          if (driverDashboard.classList.contains("active")) {
            paintDriverHomeActiveVehicle();
          }
        });
      }
    }
  } else {
    landingSection.classList.add("active");
    setLandingGuestViewVisible(true);
    setHomeMenuVisible(true);
    updateMenuProfile("Guest", "Not signed in");
  }
  scheduleServiceCategoryCardBalance();
  updateNavActiveState("home");
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
const signupBtn = document.getElementById("signup-step1-btn");
const logoutBtn = document.getElementById("logout-btn");
const toSignupBtn = document.getElementById("to-signup");
const toLoginBtn = document.getElementById("to-login");
const landingToLoginBtn = document.getElementById("landing-to-login");
const landingToSignupBtn = document.getElementById("landing-to-signup");
const menuUserRole = document.getElementById("menu-user-role");
const menuUserEmail = document.getElementById("menu-user-email");
const menuUserAvatar = document.getElementById("menu-user-avatar");
const menuContactsBtn = document.getElementById("menu-contacts-btn");
const menuAboutBtn = document.getElementById("menu-about-btn");
const menuProfileLinkBtn = document.getElementById("menu-profile-link-btn");
const menuSettingsBtn = document.getElementById("menu-settings-btn");
const menuLogoutBtn = document.getElementById("menu-logout-btn");
const menuDeleteBtn = document.getElementById("menu-delete-btn");

const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const forgotPasswordLink = document.getElementById("forgot-password-link");
const forgotPasswordEmailInput = document.getElementById("forgot-password-email");
const forgotPasswordSubmitBtn = document.getElementById("forgot-password-submit-btn");
const forgotPasswordBackBtn = document.getElementById("forgot-password-back-btn");
const forgotPasswordErrorDiv = document.getElementById("forgot-password-error");
const forgotPasswordStatusDiv = document.getElementById("forgot-password-status");
const emailVerificationAddressEl = document.getElementById("email-verification-address");
const emailVerificationResendBtn = document.getElementById("email-verification-resend-btn");
const emailVerificationCheckBtn = document.getElementById("email-verification-check-btn");
const emailVerificationLogoutBtn = document.getElementById("email-verification-logout-btn");
const emailVerificationErrorDiv = document.getElementById("email-verification-error");
const emailVerificationStatusDiv = document.getElementById("email-verification-status");
const signupNameInput = document.getElementById("signup-name");
const signupEmailInput = document.getElementById("signup-email");
const signupPasswordInput = document.getElementById("signup-password");
const loginBackBtn = document.getElementById("login-back-btn");
const signupBackBtn = document.getElementById("signup-back-btn");

const loginErrorDiv = document.getElementById("login-error");
const signupErrorDiv = document.getElementById("signup-error");

const serviceCategoryList = document.getElementById("service-category-list");
const partsCategoryList = document.getElementById("parts-category-list");
const guestServiceCategoryList = document.getElementById("guest-service-category-list");
const guestPartsCategoryList = document.getElementById("guest-parts-category-list");
const guestMarketplaceToggle = document.getElementById("guest-marketplace-toggle");
const guestModeMechanicsBtn = document.getElementById("guest-mode-mechanics");
const guestModePartsDealersBtn = document.getElementById("guest-mode-parts-dealers");
const guestMechanicsView = document.getElementById("guest-mechanics-view");
const guestPartsView = document.getElementById("guest-parts-view");
const driverMarketplaceToggle = document.getElementById("driver-marketplace-toggle");
const driverModeMechanicsBtn = document.getElementById("driver-mode-mechanics");
const driverModePartsDealersBtn = document.getElementById("driver-mode-parts-dealers");
const driverMechanicsView = document.getElementById("driver-mechanics-view");
const driverPartsView = document.getElementById("driver-parts-view");
const driverPostServices = document.getElementById("driver-post-services");
const mapNotificationEl = document.getElementById("map-notification");
const mechanicMapBackBtn = document.getElementById("mechanic-map-back-btn");
const mechanicMapServiceTitle = document.getElementById("mechanic-map-service-title");

const MAP_EMPTY_NOTIFICATION = "No mechanics found for this service on map";
function getMapLoadErrorMessage() {
  const origin = window.location.origin;
  const host = window.location.host;
  const hostname = window.location.hostname;
  const keyHint = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    ? "(from .env VITE_GOOGLE_MAPS_API_KEY)"
    : "(missing VITE_GOOGLE_MAPS_API_KEY at build time)";
  const devTips =
    import.meta.env.DEV
      ? " After editing .env, restart `npm run dev`. In Google Cloud, allow both http://127.0.0.1:5173/* and http://localhost:5173/* — they are different referrers."
      : "";
  const altOriginTip =
    hostname === "127.0.0.1"
      ? " You can also try http://localhost:5173 in the browser."
      : hostname === "localhost"
        ? " You can also try http://127.0.0.1:5173 in the browser."
        : "";
  return (
    `Google Maps could not load. Configure the Maps browser key ${keyHint}: ` +
    `Google Cloud → Credentials → API key used for Maps JavaScript (not the Firebase Auth key). ` +
    `Application restrictions → HTTP referrers → add ${origin}/*, ${origin}/, ` +
    `https://mototap-447fe.web.app/*, https://mototap.co.ke/*, ` +
    `https://mototap-447fe.firebaseapp.com/*, http://localhost:5173/*, http://127.0.0.1:5173/*, http://localhost:5174/*. ` +
    `API restrictions must include Maps JavaScript API. ` +
    `If this key is Android-only, create a new key for the website.${devTips}${altOriginTip} Host: ${host}.`
  );
}
const matchStatus = document.getElementById("match-status");
const driverMechanicPanel = document.getElementById("driver-mechanic-panel");
const closestBadge = document.getElementById("closest-badge");
const mechanicPanelName = document.getElementById("mechanic-panel-name");
const mechanicPanelPhoto = document.getElementById("mechanic-panel-photo");
const mechanicPanelDistance = document.getElementById("mechanic-panel-distance");
const mechanicPanelMeta = document.getElementById("mechanic-panel-meta");
const mechanicPanelService = document.getElementById("mechanic-panel-service");
const mechanicPanelPrice = document.getElementById("mechanic-panel-price");
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
const partsDealerPartsList = document.getElementById("parts-dealer-parts-list");
const savePartsBtn = document.getElementById("save-parts-btn");
const partsDealerStatus = document.getElementById("parts-dealer-status");
const partsDealerError = document.getElementById("parts-dealer-error");
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
let driverLocationStatus = "idle";
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
let partsCategories = PARTS_CATEGORIES;
let driverMarketplaceMode = "mechanics";
let guestMarketplaceMode = "mechanics";
let driverMapDiscoveryMode = "mechanics";
let selectedCategory = null;
let selectedSubservice = null;
let pendingServiceSelection = null;
let currentUserProfile = null;
let wasLoggedIn = false;
let lastProfileJobs = [];
let profileHubActiveTab = "overview";
let profileLoyaltyNotice = null;

function setPendingServiceSelection(category, serviceName, discoveryMode = "mechanics") {
  pendingServiceSelection = {
    categoryId: category.id,
    serviceName,
    discoveryMode,
  };
}

function clearPendingServiceSelection() {
  pendingServiceSelection = null;
}

function resumePendingServiceAfterAuth() {
  if (!pendingServiceSelection || !auth.currentUser) return false;

  const role = normalizeUserRole(currentUserProfile?.role);
  if (role === "mechanic" || role === "parts_dealer") {
    clearPendingServiceSelection();
    return false;
  }

  const { categoryId, serviceName, discoveryMode = "mechanics" } = pendingServiceSelection;
  clearPendingServiceSelection();
  const category = serviceCategories.find((c) => c.id === categoryId)
    || partsCategories.find((c) => c.id === categoryId);
  if (!category) return false;

  setDriverMarketplaceMode(discoveryMode === "parts_dealers" ? "parts_dealers" : "mechanics");
  if (discoveryMode === "parts_dealers") {
    showPartsDealerMapPage(category, serviceName);
  } else {
    showMechanicMapPage(category, serviceName);
  }
  return true;
}

function setLoadingState(isLoading) {
  loginBtn.disabled = isLoading;
  if (signupBtn) signupBtn.disabled = isLoading;
  if (isLoading) {
    loginBtn.innerHTML = '<span class="loading-spinner"></span>Loading...';
    if (signupBtn && signupBtn.id === "signup-step1-btn") {
      signupBtn.innerHTML = '<span class="loading-spinner"></span>Processing...';
    }
  } else {
    loginBtn.textContent = "Sign In";
    if (signupBtn && signupBtn.id === "signup-step1-btn") {
      signupBtn.textContent = "Continue";
    }
  }
}

function showLoginForm() {
  hideWelcomeScreen();
  closeMenu();
  hideAllSections();
  document.body.classList.add("auth-screen-active");
  if (mainNavbar) {
    mainNavbar.hidden = true;
    mainNavbar.style.display = "none";
  }
  setHomeMenuVisible(false);
  loginSection.classList.add("active");
  loginErrorDiv.textContent = "";
  signupErrorDiv.textContent = "";
  forgotPasswordErrorDiv.textContent = "";
  forgotPasswordStatusDiv.textContent = "";
  bookStatus.textContent = "";
  bookError.textContent = "";
  mechanicStatus.textContent = "";
  mechanicError.textContent = "";
  updateNavActiveState("auth");
}

function showForgotPasswordForm(prefillEmail = "") {
  hideWelcomeScreen();
  closeMenu();
  hideAllSections();
  forgotPasswordSection?.classList.add("active");
  loginErrorDiv.textContent = "";
  signupErrorDiv.textContent = "";
  forgotPasswordErrorDiv.textContent = "";
  forgotPasswordStatusDiv.textContent = "";

  const email = prefillEmail || loginEmailInput?.value?.trim() || "";
  if (forgotPasswordEmailInput) {
    forgotPasswordEmailInput.value = email;
  }
  forgotPasswordEmailInput?.focus();
  updateNavActiveState("auth");
}

function showSignupForm({ step = 1, role = "driver" } = {}) {
  hideWelcomeScreen();
  closeMenu();
  hideAllSections();
  document.body.classList.add("auth-screen-active");
  if (mainNavbar) {
    mainNavbar.hidden = true;
    mainNavbar.style.display = "none";
  }
  setHomeMenuVisible(false);
  signupSection.classList.add("active");
  bookStatus.textContent = "";
  bookError.textContent = "";
  mechanicStatus.textContent = "";
  mechanicError.textContent = "";
  showSignupWizard({ step, role });
  updateNavActiveState("auth");
}

function showEmailVerificationScreen() {
  hideWelcomeScreen();
  closeMenu();
  hideAllSections();
  document.body.classList.add("auth-screen-active");
  if (mainNavbar) {
    mainNavbar.hidden = true;
    mainNavbar.style.display = "none";
  }
  setHomeMenuVisible(false);
  emailVerificationSection?.classList.add("active");
  if (emailVerificationAddressEl) {
    emailVerificationAddressEl.textContent = auth.currentUser?.email || "your email";
  }
  if (emailVerificationErrorDiv) emailVerificationErrorDiv.textContent = "";
  if (emailVerificationStatusDiv) {
    emailVerificationStatusDiv.textContent =
      "We sent a verification link when you signed up. Open it, then tap the button below.";
  }
  updateNavActiveState("auth");
}

function enforceDriverEmailVerificationGate() {
  if (!auth.currentUser || !currentUserProfile) return false;
  if (!isProfileOnboardingComplete(currentUserProfile)) return false;
  if (!accountRequiresEmailVerification(auth.currentUser, currentUserProfile)) {
    return false;
  }
  showEmailVerificationScreen();
  return true;
}

async function proceedAfterAuthenticatedSession() {
  if (!auth.currentUser) return;

  await loadUserProfile(auth.currentUser);

  if (!isProfileOnboardingComplete(currentUserProfile)) {
    hideWelcomeScreen();
    closeMenu();
    hideAllSections();
    document.body.classList.add("auth-screen-active");
    if (mainNavbar) {
      mainNavbar.hidden = true;
      mainNavbar.style.display = "none";
    }
    setHomeMenuVisible(false);
    signupSection.classList.add("active");
    resumeSignupWizardFromProfile(currentUserProfile);
    updateNavActiveState("auth");
    return;
  }

  if (enforceDriverEmailVerificationGate()) return;

  if (!resumePendingServiceAfterAuth()) {
    showHomePage();
  }
}


function showDashboard(role, email) {
  hideWelcomeScreen();
  closeMenu();
  hideAllSections();
  dashboardSection.classList.add("active");
  updateMenuProfile(role, email);
  if (isBusinessRole(role)) {
    showBusinessDashboard(role);
  }
}

function updateMessagesIntro() {
  const role = normalizeUserRole(currentUserProfile?.role);
  const isBusinessUser = isBusinessRole(role);

  messagesDriverIntro?.classList.toggle("hidden", isBusinessUser);
  messagesMechanicIntro?.classList.toggle("hidden", !isBusinessUser);
  messagesDriverPlaceholder?.classList.toggle("hidden", isBusinessUser);
  messagesMechanicPlaceholder?.classList.toggle("hidden", !isBusinessUser);
}

function showMessagesPage() {
  if (enforceDriverEmailVerificationGate()) return;

  hideWelcomeScreen();
  closeMenu();
  hideAllSections();
  messagesSection.classList.add("active");
  updateMessagesIntro();
  if (!activeChatConversationId) {
    showMessagesInbox();
  }
  updateNavActiveState("messages");
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

function pickPartnerDisplayName(...candidates) {
  for (const value of candidates) {
    const name = String(value || "").trim();
    if (name && name !== "User") return name;
  }
  return "";
}

async function resolveChatPartnerInfo(partnerId, context = {}) {
  const fallbackRole = context.fallbackRole || "driver";
  if (!partnerId) return { name: "User", role: fallbackRole };

  let name = pickPartnerDisplayName(
    context.partnerName,
    context.participantNames?.[partnerId],
    chatPartnerNameCache.get(partnerId)
  );

  let role = String(context.partnerRole || "").trim();

  const myId = auth.currentUser?.uid;
  if (!name && myId) {
    const entry =
      context.chatPartnerEntry ||
      (await chatService.getChatPartnerEntry(myId, partnerId));
    name = pickPartnerDisplayName(entry?.partnerName);
  }

  if (!name && context.roomIds?.length) {
    name = pickPartnerDisplayName(
      await chatService.getChatRoomParticipantName(context.roomIds, partnerId)
    );
  }

  const profile = await authService.getPublicProfile(partnerId);
  if (!name) name = pickPartnerDisplayName(profile?.name);
  if (!role) role = profile?.role || "";

  if (!role && currentUserProfile?.role) {
    role = isBusinessRole(currentUserProfile.role) ? "driver" : "mechanic";
  }

  const finalName = name || "User";
  if (finalName !== "User") {
    chatPartnerNameCache.set(partnerId, finalName);
  }

  return {
    name: finalName,
    role: role || fallbackRole,
  };
}

function formatChatRoleLabel(role) {
  return formatUserRoleLabel(role);
}

function formatChatHeaderTitle(partnerName, partnerRole) {
  const name = pickPartnerDisplayName(partnerName) || "User";
  return `Chat · ${formatChatRoleLabel(partnerRole)} · ${name}`;
}

function formatInboxPartnerLabel(partnerName, partnerRole) {
  const name = pickPartnerDisplayName(partnerName) || "User";
  return `${formatChatRoleLabel(partnerRole)} · ${name}`;
}

async function resolveChatPartnerRole(partnerId, fallbackRole = "driver") {
  const info = await resolveChatPartnerInfo(partnerId, { fallbackRole });
  return info.role;
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
      const roomIds = entry?.roomId
        ? [entry.roomId]
        : getAllConversationIdsForParticipants(myId, partnerId);
      const partnerInfo = await resolveChatPartnerInfo(partnerId, {
        partnerName: entry?.partnerName,
        participantNames: entry?.participantNames,
        roomIds,
        chatPartnerEntry: entry,
      });
      const preview = await resolveInboxPreview(entry, partnerId, myId);
      return {
        partnerId,
        partnerName: partnerInfo.name,
        partnerLabel: formatInboxPartnerLabel(partnerInfo.name, partnerInfo.role),
        preview,
      };
    })
  );

  for (const row of rows) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "messages-inbox-item";
    button.innerHTML = `
      <span class="messages-inbox-item-name">${escapeHtml(row.partnerLabel)}</span>
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
  if (enforceDriverEmailVerificationGate()) return;

  hideWelcomeScreen();
  closeMenu();
  hideAllSections();
  requestsSection.classList.add("active");
  renderRequestHistoryList();

  const role = normalizeUserRole(currentUserProfile?.role);
  const isBusinessUser = auth.currentUser && isBusinessRole(role);

  if (requestsDriverIntro) {
    requestsDriverIntro.classList.toggle("hidden", isBusinessUser);
  }
  if (requestsMechanicIntro) {
    requestsMechanicIntro.classList.toggle("hidden", !isBusinessUser);
  }

  if (auth.currentUser) {
    updateMenuProfile(role, auth.currentUser.email || "");
  }
  updateNavActiveState("requests");
}

function getProfileInitial(name, email) {
  const source = String(name || email || "G").trim();
  return source.charAt(0).toUpperCase() || "G";
}

function updateMenuAvatar({ profilePhotoUrl, name, email } = {}) {
  if (!menuUserAvatar) return;

  const initial = getProfileInitial(name, email);
  const url = String(profilePhotoUrl || "").trim();

  menuUserAvatar.replaceChildren();

  if (url) {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "Profile photo";
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener(
      "error",
      () => {
        menuUserAvatar.classList.remove("has-photo");
        menuUserAvatar.textContent = initial;
      },
      { once: true }
    );
    menuUserAvatar.appendChild(img);
    menuUserAvatar.classList.add("has-photo");
    menuUserAvatar.setAttribute("aria-label", "Profile photo");
  } else {
    menuUserAvatar.classList.remove("has-photo");
    menuUserAvatar.textContent = initial;
    menuUserAvatar.setAttribute("aria-label", `Profile initial ${initial}`);
  }
}

function updateMenuProfile(role, email) {
  const displayRole = role ? formatUserRoleLabel(role) : "Guest";
  if (menuUserRole) menuUserRole.textContent = displayRole;
  if (menuUserEmail) menuUserEmail.textContent = email || "Not signed in";

  const signedIn = Boolean(auth.currentUser) && displayRole !== "Guest";
  updateMenuAvatar({
    profilePhotoUrl: signedIn ? currentUserProfile?.profilePhotoUrl : "",
    name: signedIn ? currentUserProfile?.name : "",
    email,
  });
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
    const errTitle = mapElement.querySelector(".gm-err-title")?.textContent?.toLowerCase() || "";
    const errMessage = mapElement.querySelector(".gm-err-message")?.textContent?.toLowerCase() || "";
    const errText = `${errTitle} ${errMessage}`;
    if (
      errText.includes("went wrong") ||
      errText.includes("can't load google maps") ||
      errText.includes("do you own this website")
    ) {
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
  driverLocationStatus = "locating";
  activeDriverPositionRequest = getDriverPosition()
    .then((pos) => {
      driverLocationStatus = "ready";
      return pos;
    })
    .catch((error) => {
      driverLocationStatus =
        error?.code === 1 ? "denied" : "unavailable";
      return null;
    });
  return activeDriverPositionRequest;
}

async function getDriverPosition() {
  if (!navigator.geolocation) {
    const err = new Error("Geolocation is not supported in this browser.");
    err.code = 2;
    throw err;
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

function refreshSelectedMechanicPanel() {
  if (!selectedMechanicEntry) return;
  const updated =
    matchedMechanics.find((entry) => entry.id === selectedMechanicEntry.id) ||
    selectedMechanicEntry;
  selectedMechanicEntry = updated;
  renderMechanicPanel(updated, {
    showClosestBadge: updated.id === autoSelectedMechanicId,
  });
}

async function applyDriverPositionToMap(serviceName) {
  try {
    if (selectedMechanicEntry) refreshSelectedMechanicPanel();
    const driverPos = await (activeDriverPositionRequest || beginDriverPositionLookup());
    if (!driverPos || !googleMap || !matchedMechanics.length) {
      refreshSelectedMechanicPanel();
      return;
    }

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
      `${withCoords.length} ${driverMapDiscoveryMode === "parts_dealers" ? "parts dealer(s)" : "mechanic(s)"} nearby for “${serviceName}”. Closest auto-selected.`,
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

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].charAt(0);
  return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
}

function setMechanicPanelPhoto(photoUrl, displayName) {
  if (!mechanicPanelPhoto) return;
  const url = String(photoUrl || "").trim();
  if (url) {
    mechanicPanelPhoto.style.backgroundImage = `url("${encodeURI(url)}")`;
    mechanicPanelPhoto.textContent = "";
  } else {
    mechanicPanelPhoto.style.backgroundImage = "none";
    mechanicPanelPhoto.textContent = getInitials(displayName);
  }
}

function retryDriverLocation() {
  activeDriverPositionRequest = null;
  driverLocationStatus = "locating";
  driverPosition = null;
  refreshSelectedMechanicPanel();
  applyDriverPositionToMap(selectedSubservice || "");
}

function applyDistanceLabel(el, dist, entry) {
  el.classList.remove("is-retry");
  el.onclick = null;

  if (Number.isFinite(dist)) {
    el.textContent = formatDistanceMeters(dist);
    return;
  }

  if (entry && !entry.position) {
    el.textContent = "Location not shared yet";
    return;
  }

  if (driverLocationStatus === "locating") {
    el.textContent = "Calculating distance...";
    return;
  }

  if (driverLocationStatus === "denied") {
    el.textContent = "Enable location to see distance — tap to retry";
    el.classList.add("is-retry");
    el.onclick = retryDriverLocation;
    return;
  }

  if (driverLocationStatus === "unavailable") {
    el.textContent = "Your location unavailable — tap to retry";
    el.classList.add("is-retry");
    el.onclick = retryDriverLocation;
    return;
  }

  el.textContent = "Calculating distance...";
}

function renderMechanicPanel(entry, { showClosestBadge = false } = {}) {
  if (!entry || !driverMechanicPanel) return;
  const { mechanic, distanceMeters: dist } = entry;
  const isPartsMode = driverMapDiscoveryMode === "parts_dealers";
  const fallbackName = isPartsMode ? "Parts Dealer" : "Mechanic";
  driverMechanicPanel.classList.remove("hidden");
  closestBadge?.classList.toggle("hidden", !showClosestBadge);
  const displayName = mechanic.name || fallbackName;
  if (mechanicPanelName) {
    mechanicPanelName.textContent = displayName;
  }
  setMechanicPanelPhoto(mechanic.profilePhotoUrl, displayName);
  if (mechanicPanelDistance) {
    applyDistanceLabel(mechanicPanelDistance, dist, entry);
  }
  if (mechanicPanelMeta) {
    mechanicPanelMeta.textContent =
      mechanic.city || mechanic.location
        ? `Area: ${mechanic.city || mechanic.location}`
        : "Location shared on map";
  }
  if (mechanicPanelService) {
    mechanicPanelService.textContent = selectedSubservice
      ? `${isPartsMode ? "Part" : "Service"}: ${selectedSubservice}`
      : "";
  }
  if (mechanicPanelPrice) {
    const price = selectedSubservice
      ? isPartsMode
        ? getPartsDealerPartPrice(mechanic, selectedSubservice)
        : getMechanicServicePrice(mechanic, selectedSubservice)
      : null;
    if (price != null && price > 0) {
      mechanicPanelPrice.textContent = `Price: KSh ${formatKsh(price)}`;
      mechanicPanelPrice.classList.remove("hidden");
    } else {
      mechanicPanelPrice.textContent = "";
      mechanicPanelPrice.classList.add("hidden");
    }
  }
  mechanicBookBtn?.classList.toggle("hidden", isPartsMode);
  updateAdminContactButtons(mechanic);
}

function selectMechanicEntry(entry, { autoClosest = false, zoomDetail = false } = {}) {
  if (!entry) return;
  selectedMechanicEntry = entry;
  renderMechanicPanel(entry, { showClosestBadge: autoClosest });

  const isPartsMode = driverMapDiscoveryMode === "parts_dealers";
  const markerColor = isPartsMode ? "#ff8800" : "#ff0000";
  const selectedColor = isPartsMode ? "#ffaa33" : "#ff4444";

  mapMarkers.forEach(({ marker, entry: markerEntry }) => {
    const isSelected = markerEntry.id === entry.id;
    marker.setIcon({
      path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
      scale: isSelected ? 7 : 5,
      fillColor: isSelected ? selectedColor : markerColor,
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
  mapElement?.classList.remove("active");
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
      google.maps.event.addListenerOnce(googleMap, "idle", () => {
        fixGoogleMapContainerFill();
      });
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
  showMapNotification(message, { autoDismissMs: 3000 });
  clearMapMatchNotification();
  driverPostServices?.classList.remove("hidden");
  driverPostServices?.classList.add("map-active");
  mapElement?.classList.add("active");
  hideDriverMechanicPanel();
  if (googleMap) {
    googleMap.setCenter({ lat: -1.286389, lng: 36.817223 });
    googleMap.setZoom(12);
  }
  fixGoogleMapContainerFill();
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
        query(
          collection(db, PUBLIC_PROFILES_COLLECTION),
          where("role", "in", ["mechanic", "MECHANIC"]),
          where("status", "==", "APPROVED")
        )
      ),
      ensureGoogleMap(),
    ]);

    const matchingDocs = snapshot.docs.filter((docItem) => {
      const profile = docItem.data();
      return isMechanicRole(profile.role) && mechanicOffersService(profile, serviceName);
    });

    if (!matchingDocs.length) {
      showNoMechanicsOnMap(
        `No mechanics currently offer "${serviceName}".`
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

async function fetchMatchingPartsDealers(partName) {
  hideDriverMechanicPanel();
  showMapNotification("");
  driverPostServices?.classList.remove("hidden");
  showMapMatchNotification("Finding parts dealers for your selection…");
  bookStatus.textContent = "";
  bookError.textContent = "";
  clearMechanicMapState({ keepMapVisible: true });
  mechanicBookBtn?.classList.add("hidden");

  if (openInMapsBtn) openInMapsBtn.style.display = "none";
  if (mapHint) mapHint.style.display = "none";

  try {
    const [snapshot, map] = await Promise.all([
      getDocs(
        query(
          collection(db, PUBLIC_PROFILES_COLLECTION),
          where("role", "in", ["parts_dealer", "PARTS_DEALER"]),
          where("status", "==", "APPROVED")
        )
      ),
      ensureGoogleMap(),
    ]);

    const matchingDocs = snapshot.docs.filter((docItem) => {
      const profile = docItem.data();
      return partsDealerOffersPart(profile, partName);
    });

    if (!matchingDocs.length) {
      showNoMechanicsOnMap(`No parts dealers currently stock "${partName}".`);
      return;
    }

    matchedMechanics = buildMechanicEntries(matchingDocs);
    const withCoords = matchedMechanics.filter((entry) => entry.position);
    if (!withCoords.length) {
      showNoMechanicsOnMap(
        `Parts dealers stock "${partName}" but none have a map location yet. Ask dealers to pin their shop location in the app.`
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
        title: entry.mechanic.name || "Parts Dealer",
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: "#ff8800",
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
      `${withCoords.length} parts dealer(s) on map for “${partName}”.`,
      { autoDismissMs: 3000 }
    );
    fixGoogleMapContainerFill();
    applyDriverPositionToMap(partName);
  } catch (error) {
    showMapMatchNotification(`Unable to load parts dealers: ${error.message}`);
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

async function openChatWithPartner(partnerId, partnerName, { fallbackRole = "driver" } = {}) {
  if (!auth.currentUser || !partnerId) {
    showLoginForm();
    return;
  }

  stopChatListener();
  const myId = auth.currentUser.uid;
  activeChatPartnerId = partnerId;
  activeChatRoomIds = getAllConversationIdsForParticipants(myId, partnerId);
  activeChatConversationId = buildDriverMechanicConversationId(myId, partnerId);

  const partnerInfo = await resolveChatPartnerInfo(partnerId, {
    partnerName: pickPartnerDisplayName(partnerName) || undefined,
    roomIds: activeChatRoomIds,
    fallbackRole,
  });
  activeChatPartnerName = partnerInfo.name;
  optimisticChatMessages = [];
  serverChatMessages = [];
  showMessagesPage();
  showChatView();

  if (chatHeaderTitle) {
    chatHeaderTitle.textContent = formatChatHeaderTitle(
      partnerInfo.name,
      partnerInfo.role
    );
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
        [partnerId]: partnerInfo.name,
      }
    );
  } catch (err) {
    if (chatMessagesEl) {
      chatMessagesEl.innerHTML = `<p style='color:#f88'>${escapeHtml(err.message)}</p>`;
    }
    return;
  }

  chatUnsubscribe = chatService.listenForMessagesMerged(
    {
      roomIds: activeChatRoomIds,
      conversationIds: activeChatRoomIds,
      participantIds: [myId, partnerId],
      currentUserId: myId,
    },
    handleServerChatMessages,
    (err) => {
      if (serverChatMessages.length > 0) {
        console.error("Chat listener error (messages already loaded):", err);
        return;
      }
      if (chatMessagesEl) {
        chatMessagesEl.innerHTML = `<p style='color:#f88'>${escapeHtml(err.message)}</p>`;
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
  return openChatWithPartner(mechanicId, mechanicName || "Mechanic", {
    fallbackRole: "mechanic",
  });
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
  const suggestedPrice =
    getMechanicServicePrice(selectedMechanicEntry.mechanic, selectedSubservice) ?? 0;

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

function appendPartsGroups(body, category, { guest = false } = {}) {
  category.groups.forEach((group) => {
    const groupCard = document.createElement("div");
    groupCard.className = "service-group-card";

    const groupTitle = document.createElement("h4");
    groupTitle.textContent = group.title;
    groupCard.appendChild(groupTitle);

    group.items.forEach((partName) => {
      const tag = document.createElement("span");
      tag.className = "service-tag";
      tag.textContent = partName;
      if (
        !guest &&
        selectedCategory?.id === category.id &&
        selectedSubservice === partName
      ) {
        tag.classList.add("selected");
      }
      tag.addEventListener("click", () => {
        if (!auth.currentUser) {
          setPendingServiceSelection(category, partName, "parts_dealers");
          showLoginForm();
          return;
        }
        showPartsDealerMapPage(category, partName);
      });
      groupCard.appendChild(tag);
    });

    body.appendChild(groupCard);
  });
}

function buildPartsCategoryCard(category, { guest = false } = {}) {
  const { card, body } = createServiceCategoryCardShell(category);
  const icon = card.querySelector(".service-category-icon");
  if (icon) icon.textContent = getPartsCategoryIcon(category.id);
  appendPartsGroups(body, category, { guest });
  return card;
}

function appendPartsCatalogByDisplayGroup(container, buildCard) {
  const grouped = new Map();
  partsCategories.forEach((category) => {
    const groupName = category.displayGroup || "Parts";
    if (!grouped.has(groupName)) grouped.set(groupName, []);
    grouped.get(groupName).push(category);
  });

  PARTS_DISPLAY_GROUP_ORDER.forEach((groupName) => {
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

function appendPartsCatalogInColumns(container, buildCard) {
  partsCategories.forEach((category) => {
    const column = document.createElement("div");
    column.className = "parts-catalog-column";

    const header = document.createElement("div");
    header.className = "service-display-group";
    const heading = document.createElement("h2");
    heading.className = "service-display-group-title";
    heading.textContent = category.displayGroup || category.name;
    header.appendChild(heading);
    column.appendChild(header);
    column.appendChild(buildCard(category));

    container.appendChild(column);
  });
}

function renderPartsCategories() {
  if (partsCategoryList) {
    partsCategoryList.innerHTML = "";
    appendPartsCatalogInColumns(partsCategoryList, (category) =>
      buildPartsCategoryCard(category, { guest: false })
    );
  }
  if (guestPartsCategoryList) {
    guestPartsCategoryList.innerHTML = "";
    appendPartsCatalogInColumns(guestPartsCategoryList, (category) =>
      buildPartsCategoryCard(category, { guest: true })
    );
  }
  scheduleServiceCategoryCardBalance();
}

function buildPartsDealerCategoryCard(category, existingParts, existingPrices = {}) {
  const { card, body } = createServiceCategoryCardShell(category);
  const icon = card.querySelector(".service-category-icon");
  if (icon) icon.textContent = getPartsCategoryIcon(category.id);

  category.groups.forEach((group) => {
    const groupCard = document.createElement("div");
    groupCard.className = "service-group-card";

    const groupTitle = document.createElement("h4");
    groupTitle.textContent = group.title;
    groupCard.appendChild(groupTitle);

    group.items.forEach((partName) => {
      const row = document.createElement("div");
      row.className = "mechanic-service-offer-row";

      const label = document.createElement("label");
      label.className = "mechanic-service-offer-label";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = partName;
      checkbox.checked = existingParts.has(partName);

      const nameSpan = document.createElement("span");
      nameSpan.className = "mechanic-service-offer-name";
      nameSpan.textContent = partName;

      const priceInput = document.createElement("input");
      priceInput.type = "number";
      priceInput.min = "0";
      priceInput.step = "1";
      priceInput.inputMode = "numeric";
      priceInput.className = "mechanic-service-price-input";
      priceInput.placeholder = "Ksh";
      priceInput.setAttribute("aria-label", `Price for ${partName} in Kenyan Shillings`);
      const savedPrice = existingPrices[partName];
      if (savedPrice != null && savedPrice !== "") {
        priceInput.value = String(savedPrice);
      }
      priceInput.disabled = !checkbox.checked;

      checkbox.addEventListener("change", () => {
        priceInput.disabled = !checkbox.checked;
        if (!checkbox.checked) {
          priceInput.value = "";
        } else {
          priceInput.focus();
        }
      });

      label.appendChild(checkbox);
      label.appendChild(nameSpan);
      row.appendChild(label);
      row.appendChild(priceInput);
      groupCard.appendChild(row);
    });

    body.appendChild(groupCard);
  });

  return card;
}

function renderPartsDealerSelection() {
  if (!partsDealerPartsList) return;
  partsDealerPartsList.innerHTML = "";
  const existingParts = new Set(currentUserProfile?.parts || []);
  const existingPrices = normalizePartPrices(currentUserProfile?.partPrices);

  appendPartsCatalogByDisplayGroup(partsDealerPartsList, (category) =>
    buildPartsDealerCategoryCard(category, existingParts, existingPrices)
  );

  scheduleServiceCategoryCardBalance();
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

function buildMechanicCategoryCard(category, existingSkills, existingPrices = {}) {
  const { card, body } = createServiceCategoryCardShell(category);

  category.groups.forEach((group) => {
    const groupCard = document.createElement("div");
    groupCard.className = "service-group-card";

    const groupTitle = document.createElement("h4");
    groupTitle.textContent = group.title;
    groupCard.appendChild(groupTitle);

    group.items.forEach((serviceName) => {
      const row = document.createElement("div");
      row.className = "mechanic-service-offer-row";

      const label = document.createElement("label");
      label.className = "mechanic-service-offer-label";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = serviceName;
      checkbox.checked = existingSkills.has(serviceName);

      const nameSpan = document.createElement("span");
      nameSpan.className = "mechanic-service-offer-name";
      nameSpan.textContent = serviceName;

      const priceInput = document.createElement("input");
      priceInput.type = "number";
      priceInput.min = "0";
      priceInput.step = "1";
      priceInput.inputMode = "numeric";
      priceInput.className = "mechanic-service-price-input";
      priceInput.placeholder = "Ksh";
      priceInput.setAttribute("aria-label", `Price for ${serviceName} in Kenyan Shillings`);
      const savedPrice = existingPrices[serviceName];
      if (savedPrice != null && savedPrice !== "") {
        priceInput.value = String(savedPrice);
      }
      priceInput.disabled = !checkbox.checked;

      checkbox.addEventListener("change", () => {
        priceInput.disabled = !checkbox.checked;
        if (!checkbox.checked) {
          priceInput.value = "";
        } else {
          priceInput.focus();
        }
      });

      label.appendChild(checkbox);
      label.appendChild(nameSpan);
      row.appendChild(label);
      row.appendChild(priceInput);
      groupCard.appendChild(row);
    });

    body.appendChild(groupCard);
  });

  return card;
}

function renderMechanicServiceSelection() {
  mechanicServiceList.innerHTML = "";
  const existingSkills = new Set(currentUserProfile?.skills || []);
  const existingPrices = normalizeServicePrices(currentUserProfile?.servicePrices);

  appendCatalogByDisplayGroup(mechanicServiceList, (category) =>
    buildMechanicCategoryCard(category, existingSkills, existingPrices)
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

function renderCatalogFromLocal() {
  serviceCategories = SERVICE_CATEGORIES;
  partsCategories = PARTS_CATEGORIES;
  renderServiceCategories();
  renderPartsCategories();
  renderMechanicServiceSelection();
  renderPartsDealerSelection();
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
    stopJobSync();
    return;
  }

  currentUserProfile = await authService.getUserProfile(user.uid);
  if (!currentUserProfile) {
    currentUserProfile = {
      id: user.uid,
      name: user.email || "",
      role: "driver",
      skills: [],
      isAdmin: false,
    };
  }

  renderMechanicServiceSelection();
  renderPartsDealerSelection();
  startJobSync();
  syncCatalogToFirestoreInBackground();
  paintDriverHomeActiveVehicle();

  if (auth.currentUser) {
    const role = normalizeUserRole(currentUserProfile?.role);
    updateMenuProfile(role, auth.currentUser.email || "");
  }
}

async function handlePartsDealerSaveParts() {
  partsDealerStatus.textContent = "";
  partsDealerError.textContent = "";

  if (!auth.currentUser) {
    partsDealerError.textContent = "You must be signed in to update your inventory.";
    return;
  }

  const selectedParts = [];
  const pricesByName = {};

  partsDealerPartsList?.querySelectorAll(".mechanic-service-offer-row").forEach((row) => {
    const checkbox = row.querySelector("input[type='checkbox']");
    if (!checkbox?.checked) return;

    const partName = String(checkbox.value || "").trim();
    if (!partName) return;

    selectedParts.push(partName);
    const priceInput = row.querySelector(".mechanic-service-price-input");
    const price = Number(priceInput?.value);
    if (Number.isFinite(price) && price >= 0) {
      pricesByName[partName] = price;
    }
  });

  const partPrices = buildPartPricesPayload(selectedParts, pricesByName);

  savePartsBtn.disabled = true;
  savePartsBtn.textContent = "Saving…";

  try {
    const result = await authService.updatePartsDealerInventory(
      auth.currentUser.uid,
      selectedParts,
      partPrices
    );
    if (!result.success) {
      partsDealerError.textContent = result.error;
      return;
    }
    currentUserProfile = {
      ...currentUserProfile,
      parts: selectedParts,
      partPrices,
    };
    partsDealerStatus.textContent = "Parts inventory saved.";
    renderPartsDealerSelection();
  } catch (error) {
    partsDealerError.textContent = error.message || "Failed to save parts inventory.";
  } finally {
    savePartsBtn.disabled = false;
    savePartsBtn.textContent = "Save Parts Inventory";
  }
}

async function handleMechanicSaveServices() {
  mechanicStatus.textContent = "";
  mechanicError.textContent = "";

  if (!auth.currentUser) {
    mechanicError.textContent = "You must be signed in to update your services.";
    return;
  }

  const selectedSkills = [];
  const pricesByName = {};

  mechanicServiceList.querySelectorAll(".mechanic-service-offer-row").forEach((row) => {
    const checkbox = row.querySelector("input[type='checkbox']");
    if (!checkbox?.checked) return;

    const serviceName = String(checkbox.value || "").trim();
    if (!serviceName) return;

    selectedSkills.push(serviceName);
    const priceInput = row.querySelector(".mechanic-service-price-input");
    const price = Number(priceInput?.value);
    if (Number.isFinite(price) && price >= 0) {
      pricesByName[serviceName] = price;
    }
  });

  const servicePrices = buildServicePricesPayload(selectedSkills, pricesByName);

  saveServicesBtn.disabled = true;
  saveServicesBtn.textContent = "Saving...";

  try {
    const result = await authService.updateMechanicSkills(
      auth.currentUser.uid,
      selectedSkills,
      servicePrices
    );
    if (!result.success) {
      throw new Error(result.error || "Failed to save services.");
    }
    mechanicStatus.textContent = `Saved ${selectedSkills.length} offered service(s) with prices.`;
    mechanicError.textContent = "";
    currentUserProfile.skills = selectedSkills;
    currentUserProfile.servicePrices = servicePrices;
    startJobSync();
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

forgotPasswordLink?.addEventListener("click", (e) => {
  e.preventDefault();
  showForgotPasswordForm(loginEmailInput?.value?.trim() || "");
});

forgotPasswordBackBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  showLoginForm();
});

forgotPasswordSubmitBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  forgotPasswordErrorDiv.textContent = "";
  forgotPasswordStatusDiv.textContent = "";

  const email = forgotPasswordEmailInput?.value?.trim() || "";
  if (!email) {
    forgotPasswordErrorDiv.textContent = "Please enter your email address.";
    return;
  }

  forgotPasswordSubmitBtn.disabled = true;
  forgotPasswordSubmitBtn.textContent = "Sending…";

  const result = await authService.sendPasswordReset(email);

  forgotPasswordSubmitBtn.disabled = false;
  forgotPasswordSubmitBtn.textContent = "Send reset link";

  if (!result.success) {
    forgotPasswordErrorDiv.textContent = result.error || "Unable to send reset email.";
    return;
  }

  forgotPasswordStatusDiv.textContent =
    "If an account exists for that email, a reset link has been sent. Check your inbox and spam folder, then sign in with your new password.";
});

emailVerificationResendBtn?.addEventListener("click", async () => {
  if (!auth.currentUser) {
    showLoginForm();
    return;
  }

  if (emailVerificationErrorDiv) emailVerificationErrorDiv.textContent = "";
  if (emailVerificationStatusDiv) emailVerificationStatusDiv.textContent = "";

  emailVerificationResendBtn.disabled = true;
  emailVerificationResendBtn.textContent = "Sending…";

  const result = await authService.sendDriverEmailVerification();

  emailVerificationResendBtn.disabled = false;
  emailVerificationResendBtn.textContent = "Resend verification email";

  if (!result.success) {
    if (emailVerificationErrorDiv) {
      emailVerificationErrorDiv.textContent =
        result.error || "Unable to send verification email.";
    }
    return;
  }

  if (emailVerificationStatusDiv) {
    emailVerificationStatusDiv.textContent = result.alreadyVerified
      ? "Your email is already verified."
      : "Verification email sent. Check your inbox and spam folder.";
  }
});

emailVerificationCheckBtn?.addEventListener("click", async () => {
  if (!auth.currentUser) {
    showLoginForm();
    return;
  }

  if (emailVerificationErrorDiv) emailVerificationErrorDiv.textContent = "";
  if (emailVerificationStatusDiv) emailVerificationStatusDiv.textContent = "Checking verification status…";

  emailVerificationCheckBtn.disabled = true;
  const result = await authService.reloadCurrentUser();
  emailVerificationCheckBtn.disabled = false;

  if (!result.success) {
    if (emailVerificationErrorDiv) {
      emailVerificationErrorDiv.textContent =
        result.error || "Unable to refresh your account. Please try again.";
    }
    if (emailVerificationStatusDiv) emailVerificationStatusDiv.textContent = "";
    return;
  }

  if (result.verified) {
    if (emailVerificationStatusDiv) {
      emailVerificationStatusDiv.textContent = "Email verified! Opening your dashboard…";
    }
    showHomePage();
    return;
  }

  if (emailVerificationStatusDiv) emailVerificationStatusDiv.textContent = "";
  if (emailVerificationErrorDiv) {
    emailVerificationErrorDiv.textContent =
      "Email not verified yet. Open the link we sent, then tap this button again.";
  }
});

emailVerificationLogoutBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  await authViewModel.logout(() => {
    showHomePage();
  });
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

document.getElementById("welcome-get-started")?.addEventListener("click", (e) => {
  e.preventDefault();
  showHomePage();
});

loginBackBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  showHomePage();
});

signupBackBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  showHomePage();
});

document.getElementById("menu-welcome-btn")?.addEventListener("click", () => {
  closeMenu();
  showWelcomeScreen();
});

menuContactsBtn?.addEventListener("click", showContactsFromMenu);

menuAboutBtn?.addEventListener("click", showAboutFromMenu);

menuProfileLinkBtn?.addEventListener("click", showProfilePage);

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
  setDriverMarketplaceMode(driverMapDiscoveryMode === "parts_dealers" ? "parts_dealers" : "mechanics");
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
savePartsBtn?.addEventListener("click", handlePartsDealerSaveParts);

driverModeMechanicsBtn?.addEventListener("click", () => {
  setDriverMarketplaceMode("mechanics");
});

driverModePartsDealersBtn?.addEventListener("click", () => {
  setDriverMarketplaceMode("parts_dealers");
});

guestModeMechanicsBtn?.addEventListener("click", () => {
  setGuestMarketplaceMode("mechanics");
});

guestModePartsDealersBtn?.addEventListener("click", () => {
  setGuestMarketplaceMode("parts_dealers");
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    wasLoggedIn = true;
    await proceedAfterAuthenticatedSession();
  } else if (wasLoggedIn) {
    currentUserProfile = null;
    clearPendingServiceSelection();
    stopJobSync();
    showHomePage();
    wasLoggedIn = false;
  }
  updateNavAuthButton();
});

initSignupWizard({
  authService,
  authViewModel,
  onProfileSaved: async () => {
    if (auth.currentUser) {
      await loadUserProfile(auth.currentUser);
    }
  },
  onComplete: async () => {
    if (auth.currentUser) {
      await loadUserProfile(auth.currentUser);
    }
    if (enforceDriverEmailVerificationGate()) return;
    showHomePage();
  },
});

function mountPageFooters() {
  const template = document.getElementById("page-footer-template");
  if (!template) return;

  [landingSection, dashboardSection, requestsSection, messagesSection, aboutSection].forEach((section) => {
    if (!section || section.querySelector(".page-footer")) return;

    const fragment = template.content.cloneNode(true);
    const footer = fragment.querySelector(".page-footer");
    if (!footer) return;

    if (section === landingSection) {
      footer.id = "site-contacts-footer";
    }

    section.appendChild(footer);
  });

  document.querySelectorAll(".page-footer-social-link.is-placeholder").forEach((link) => {
    if (link.dataset.placeholderBound === "1") return;
    link.dataset.placeholderBound = "1";
    link.addEventListener("click", (event) => {
      event.preventDefault();
    });
  });
}

mountPageFooters();
renderCatalogFromLocal();
updateNavAuthButton();
setupServiceCardResizeListener();
scheduleServiceCategoryCardBalance();
syncCatalogToFirestoreInBackground();
