import { auth, db } from "../firebase.js";
import { collection, query, where, getDocs } from "firebase/firestore";
import FirebaseAuthService from "./services/FirebaseAuthService.js";
import FirebaseJobService from "./services/FirebaseJobService.js";
import FirebaseServiceCatalogService from "./services/FirebaseServiceCatalogService.js";
import AuthViewModel from "./AuthViewModel.js";
import PasswordValidator from "./PasswordValidator.js";
import { onAuthStateChanged } from "firebase/auth";

const landingSection = document.getElementById("landing-section");
const loginSection = document.getElementById("login-section");
const signupSection = document.getElementById("signup-section");
const dashboardSection = document.getElementById("dashboard");
const driverDashboard = document.getElementById("driver-dashboard");
const mechanicDashboard = document.getElementById("mechanic-dashboard");
const messagesSection = document.getElementById("messages-section");
const landingHero = document.getElementById("landing-hero");
const welcomeScreen = document.getElementById("welcome-screen");
const mainNavbar = document.getElementById("main-navbar");

const menuPanel = document.getElementById("menu-panel");
const menuOverlay = document.getElementById("menu-overlay");
const menuToggle = document.getElementById("menu-toggle");
const logoButton = document.getElementById("logo-button");

function closeMenu() {
  menuPanel.classList.remove("open");
  menuOverlay.classList.remove("open");
}

function showWelcomeScreen() {
  welcomeScreen.classList.remove("hidden");
  mainNavbar.style.display = "none";
  menuPanel.style.display = "none";
  closeMenu();
}

function hideWelcomeScreen() {
  welcomeScreen.classList.add("hidden");
  mainNavbar.style.display = "flex";
}

menuToggle.addEventListener("click", () => {
  menuPanel.classList.toggle("open");
  menuOverlay.classList.toggle("open");
});

menuOverlay.addEventListener("click", closeMenu);

// Welcome screen navigation
document.getElementById("landing-to-login").addEventListener("click", (e) => {
  e.preventDefault();
  hideWelcomeScreen();
  showLoginForm();
});

document.getElementById("landing-to-signup").addEventListener("click", (e) => {
  e.preventDefault();
  hideWelcomeScreen();
  showSignupForm();
});

document.getElementById("nav-home").addEventListener("click", (e) => {
  e.preventDefault();
  // Stay on welcome screen
});

document.getElementById("nav-requests").addEventListener("click", (e) => {
  e.preventDefault();
  hideWelcomeScreen();
  if (auth.currentUser) {
    showDashboard(currentUserProfile?.role || "customer", auth.currentUser.email || "");
  } else {
    showLoginForm();
  }
});

document.getElementById("nav-messages").addEventListener("click", (e) => {
  e.preventDefault();
  hideWelcomeScreen();
  if (auth.currentUser) {
    showMessagesPage();
  } else {
    showLoginForm();
  }
});

document.getElementById("nav-signup").addEventListener("click", (e) => {
  e.preventDefault();
  hideWelcomeScreen();
  showSignupForm();
});

// Main navbar navigation
document.getElementById("nav-home-2")?.addEventListener("click", (e) => {
  e.preventDefault();
  showWelcomeScreen();
});

document.getElementById("nav-requests-2")?.addEventListener("click", (e) => {
  e.preventDefault();
  if (auth.currentUser) {
    showDashboard(currentUserProfile?.role || "customer", auth.currentUser.email || "");
  } else {
    showLoginForm();
  }
});

document.getElementById("nav-messages-2")?.addEventListener("click", (e) => {
  e.preventDefault();
  if (auth.currentUser) {
    showMessagesPage();
  } else {
    showLoginForm();
  }
});

document.getElementById("nav-signup-2")?.addEventListener("click", (e) => {
  e.preventDefault();
  showSignupForm();
});

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
const navHomeBtn = document.getElementById("nav-home");
const navRequestsBtn = document.getElementById("nav-requests");
const navMessagesBtn = document.getElementById("nav-messages");
const navSignupBtn = document.getElementById("nav-signup");
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

const dashboardUserEmail = document.getElementById("dashboard-user-email");
const dashboardUserRole = document.getElementById("dashboard-user-role");

const serviceCategoryList = document.getElementById("service-category-list");
const guestServiceCategoryList = document.getElementById("guest-service-category-list");
const matchingMechanicsList = document.getElementById("matching-mechanics-list");
const matchStatus = document.getElementById("match-status");
const mechanicServiceList = document.getElementById("mechanic-service-list");
const selectedCategoryInput = document.getElementById("selected-category");
const selectedSubserviceInput = document.getElementById("selected-subservice");
const requestLocationInput = document.getElementById("request-location");
const requestDescriptionInput = document.getElementById("request-description");
const requestPriceInput = document.getElementById("request-price");
const requestForm = document.getElementById("service-request-form");
const submitRequestBtn = document.getElementById("submit-request-btn");
const requestStatus = document.getElementById("request-status");
const requestError = document.getElementById("request-error");
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

const passwordStrengthDiv = document.getElementById("password-strength");
const strengthFill = document.getElementById("strength-fill");
const strengthText = document.getElementById("strength-text");

const authService = new FirebaseAuthService();
const jobService = new FirebaseJobService();
const serviceCatalogService = new FirebaseServiceCatalogService();
const authViewModel = new AuthViewModel(authService);

let serviceCategories = [];
let selectedCategory = null;
let selectedSubservice = null;
let currentUserProfile = null;

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
  landingSection.classList.remove("active");
  loginSection.classList.add("active");
  signupSection.classList.remove("active");
  dashboardSection.classList.remove("active");
  messagesSection.classList.remove("active");
  driverDashboard.classList.remove("active");
  mechanicDashboard.classList.remove("active");
  loginErrorDiv.textContent = "";
  signupErrorDiv.textContent = "";
  requestStatus.textContent = "";
  requestError.textContent = "";
  mechanicStatus.textContent = "";
  mechanicError.textContent = "";
}

function showSignupForm() {
  hideWelcomeScreen();
  closeMenu();
  landingSection.classList.remove("active");
  loginSection.classList.remove("active");
  signupSection.classList.add("active");
  dashboardSection.classList.remove("active");
  messagesSection.classList.remove("active");
  requestStatus.textContent = "";
  requestError.textContent = "";
  mechanicStatus.textContent = "";
  mechanicError.textContent = "";
}

function showLandingPage() {
  closeMenu();
  showWelcomeScreen();
  landingSection.classList.add("active");
  loginSection.classList.remove("active");
  signupSection.classList.remove("active");
  dashboardSection.classList.remove("active");
  messagesSection.classList.remove("active");
  updateMenuProfile("Guest", "Not signed in");
}

function showDashboard(role, email) {
  hideWelcomeScreen();
  closeMenu();
  dashboardUserEmail.textContent = email || "";
  dashboardUserRole.textContent = role || "customer";
  landingSection.classList.remove("active");
  loginSection.classList.remove("active");
  signupSection.classList.remove("active");
  messagesSection.classList.remove("active");
  dashboardSection.classList.add("active");
  updateMenuProfile(role, email);
  if (role === "mechanic") {
    driverDashboard.classList.remove("active");
    mechanicDashboard.classList.add("active");
  } else {
    mechanicDashboard.classList.remove("active");
    driverDashboard.classList.add("active");
  }
}

function showMessagesPage() {
  hideWelcomeScreen();
  closeMenu();
  landingSection.classList.remove("active");
  loginSection.classList.remove("active");
  signupSection.classList.remove("active");
  dashboardSection.classList.remove("active");
  messagesSection.classList.add("active");
}

function showRequestsPage() {
  hideWelcomeScreen();
  closeMenu();
  if (auth.currentUser) {
    showDashboard(currentUserProfile?.role || "customer", auth.currentUser.email || "");
  } else {
    showLoginForm();
  }
}

function updateMenuProfile(role, email) {
  menuUserRole.textContent = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Guest";
  menuUserEmail.textContent = email || "Not signed in";
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
  matchingMechanicsList.innerHTML = "";
  matchStatus.textContent = "";
}

function setSelectedService(category, subservice) {
  selectedCategory = category;
  selectedSubservice = subservice;
  selectedCategoryInput.value = category.name;
  selectedSubserviceInput.value = subservice;
}

function initMap() {
  if (typeof google === 'undefined') return;
  googleMap = new google.maps.Map(mapElement, {
    center: { lat: -1.286389, lng: 36.817223 }, // Default to Nairobi
    zoom: 12,
    styles: [
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
    ],
  });
}

function clearMarkers() {
  mapMarkers.forEach(marker => marker.setMap(null));
  mapMarkers = [];
}

async function fetchMatchingMechanics(serviceName) {
  matchingMechanicsList.innerHTML = "";
  matchStatus.textContent = "Finding mechanics...";
  clearMarkers();
  
  if (openInMapsBtn) openInMapsBtn.style.display = "none";
  if (mapHint) mapHint.style.display = "none";

  try {
    const mechanicsQuery = query(
      collection(db, "users"),
      where("role", "==", "mechanic"),
      where("skills", "array-contains", serviceName)
    );
    const snapshot = await getDocs(mechanicsQuery);
    
    if (snapshot.empty) {
      matchStatus.textContent = "No mechanics currently offer this service.";
      mapElement.classList.remove("active");
      return;
    }

    mapElement.classList.add("active");
    if (mapHint) mapHint.style.display = "block";
    if (!googleMap) initMap();

    const bounds = new google.maps.LatLngBounds();
    let hasValidLocation = false;
    let locationsString = "";

    snapshot.forEach((docItem) => {
      const mechanic = docItem.data();
      
      // UI Card
      const card = document.createElement("div");
      card.className = "mechanic-card";
      const name = document.createElement("h4");
      name.textContent = mechanic.name || "Unnamed mechanic";
      card.appendChild(name);
      const rating = document.createElement("p");
      rating.textContent = `Location: ${mechanic.city || mechanic.location || "Unknown"}`;
      card.appendChild(rating);
      const services = document.createElement("p");
      services.textContent = `Services: ${mechanic.skills?.join(", ") || "Not provided"}`;
      card.appendChild(services);
      matchingMechanicsList.appendChild(card);

      // Map Marker
      if (mechanic.latitude && mechanic.longitude) {
        const pos = { lat: Number(mechanic.latitude), lng: Number(mechanic.longitude) };
        const marker = new google.maps.Marker({
          position: pos,
          map: googleMap,
          title: mechanic.name,
          icon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 5,
            fillColor: "#ff0000",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#ffffff",
          }
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `<div style="color:black"><strong>${mechanic.name}</strong><br>${mechanic.phoneNumber || ""}</div>`
        });

        marker.addListener("click", () => {
          infoWindow.open(googleMap, marker);
        });

        mapMarkers.push(marker);
        bounds.extend(pos);
        hasValidLocation = true;
        
        locationsString += `${pos.lat},${pos.lng}/`;
      }
    });

    if (hasValidLocation) {
      googleMap.fitBounds(bounds);
      
      if (openInMapsBtn) {
        openInMapsBtn.style.display = "block";
        openInMapsBtn.onclick = () => {
          // Construct Google Maps URL with multiple markers (using search or dir)
          // Simplified: open search for the service in the area
          const url = `https://www.google.com/maps/search/${encodeURIComponent(serviceName + " mechanic")}`;
          window.open(url, '_blank');
        };
      }
    } else {
      // If no coords found, just show the list
      console.log("No coordinates found for these mechanics.");
    }

    matchStatus.textContent = "Mechanics offering this sub-service:";
  } catch (error) {
    matchStatus.textContent = `Unable to load mechanics: ${error.message}`;
  }
}

function renderServiceCategories() {
  serviceCategoryList.innerHTML = "";
  guestServiceCategoryList.innerHTML = "";

  serviceCategories.forEach((category) => {
    const card = document.createElement("div");
    card.className = "service-category-card";

    const title = document.createElement("h3");
    title.textContent = category.name;
    card.appendChild(title);

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
          selectedCategory?.id === category.id &&
          selectedSubservice === serviceName
        ) {
          tag.classList.add("selected");
        }
        tag.addEventListener("click", async () => {
          if (!auth.currentUser) {
            showLoginForm();
            return;
          }
          setSelectedService(category, serviceName);
          renderServiceCategories();
          await fetchMatchingMechanics(serviceName);
        });
        groupCard.appendChild(tag);
      });

      card.appendChild(groupCard);
    });

    serviceCategoryList.appendChild(card.cloneNode(true));
    
    // Re-attach listeners for the guest list because cloneNode doesn't copy listeners
    const guestCard = card.cloneNode(true);
    const guestTags = guestCard.querySelectorAll(".service-tag");
    category.groups.forEach((group, gIdx) => {
      group.items.forEach((serviceName, sIdx) => {
        // Find the tag index in the flattened tags list of the card
        let flatIdx = 0;
        for(let i=0; i<gIdx; i++) flatIdx += category.groups[i].items.length;
        flatIdx += sIdx;
        
        guestTags[flatIdx].addEventListener("click", () => {
          showLoginForm();
        });
      });
    });
    guestServiceCategoryList.appendChild(guestCard);
  });
}

function renderMechanicServiceSelection() {
  mechanicServiceList.innerHTML = "";
  const existingSkills = new Set(currentUserProfile?.skills || []);

  serviceCategories.forEach((category) => {
    const card = document.createElement("div");
    card.className = "service-category-card";

    const title = document.createElement("h3");
    title.textContent = category.name;
    card.appendChild(title);

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

      card.appendChild(groupCard);
    });

    mechanicServiceList.appendChild(card);
  });
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

async function initializeCatalogAndProfile() {
  await serviceCatalogService.seedServiceCatalogIfMissing();
  serviceCategories = await serviceCatalogService.getServiceCategories();
  renderServiceCategories();
  renderMechanicServiceSelection();
  await renderAvailableJobs();
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
    };
  }

  await initializeCatalogAndProfile();
}

async function handleServiceRequestSubmit(event) {
  event.preventDefault();
  requestError.textContent = "";
  requestStatus.textContent = "";

  if (!selectedCategory || !selectedSubservice) {
    requestError.textContent = "Select a category and sub-service first.";
    return;
  }

  const locationLabel = requestLocationInput.value.trim();
  const description = requestDescriptionInput.value.trim();
  const suggestedPrice = requestPriceInput.value
    ? Number(requestPriceInput.value)
    : 0;

  if (!locationLabel) {
    requestError.textContent = "Please add a pickup location or landmark.";
    return;
  }

  if (!auth.currentUser) {
    requestError.textContent = "You must be signed in to submit a request.";
    return;
  }

  submitRequestBtn.disabled = true;
  submitRequestBtn.textContent = "Submitting...";

  try {
    await jobService.createJob(
      auth.currentUser.uid,
      selectedCategory.name,
      selectedSubservice,
      description,
      locationLabel,
      suggestedPrice
    );
    requestStatus.textContent = "Request submitted successfully. Mechanics can now match your service.";
    requestError.textContent = "";
    requestLocationInput.value = "";
    requestDescriptionInput.value = "";
    requestPriceInput.value = "";
    clearRequestSelection();
    renderServiceCategories();
  } catch (error) {
    requestError.textContent = `Error submitting request: ${error.message}`;
  } finally {
    submitRequestBtn.disabled = false;
    submitRequestBtn.textContent = "Submit Service Request";
  }
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
    showLandingPage();
  });
});

landingToLoginBtn.addEventListener("click", (e) => {
  e.preventDefault();
  showLoginForm();
});

landingToSignupBtn.addEventListener("click", (e) => {
  e.preventDefault();
  showSignupForm();
});

landingToLoginSecondaryBtn.addEventListener("click", (e) => {
  e.preventDefault();
  showLoginForm();
});

landingToSignupSecondaryBtn.addEventListener("click", (e) => {
  e.preventDefault();
  showSignupForm();
});

navHomeBtn.addEventListener("click", (e) => {
  e.preventDefault();
  showLandingPage();
});

navRequestsBtn.addEventListener("click", (e) => {
  e.preventDefault();
  showRequestsPage();
});

navMessagesBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (auth.currentUser) {
    showMessagesPage();
  } else {
    showLoginForm();
  }
});

navSignupBtn.addEventListener("click", (e) => {
  e.preventDefault();
  showSignupForm();
});

menuContactsBtn.addEventListener("click", () => {
  alert("Contacts are coming soon. Stay tuned for driver and mechanic support.");
});

menuSettingsBtn.addEventListener("click", () => {
  alert("Settings will be available soon in the dashboard.");
});

menuLogoutBtn.addEventListener("click", async () => {
  if (auth.currentUser) {
    await authViewModel.logout(() => {
      showLandingPage();
    });
  } else {
    showLandingPage();
  }
});

menuDeleteBtn.addEventListener("click", async () => {
  if (!auth.currentUser) {
    alert("No active account to delete.");
    return;
  }
  const confirmed = confirm("Delete your account permanently? This cannot be undone.");
  if (!confirmed) return;
  try {
    await auth.currentUser.delete();
    alert("Account deleted.");
    showLandingPage();
  } catch (error) {
    alert(
      "Unable to delete account directly. Please sign in again and retry or use account settings."
    );
  }
});

requestForm.addEventListener("submit", handleServiceRequestSubmit);
saveServicesBtn.addEventListener("click", handleMechanicSaveServices);

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const role = await authService.getUserRole(user.uid);
    showDashboard(role || "customer", user.email || "");
    await loadUserProfile(user);
  } else {
    showLandingPage();
    await initializeCatalogAndProfile();
  }
});
