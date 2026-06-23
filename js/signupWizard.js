import { uploadUserImage } from "./services/CloudinaryStorageService.js";
import { loadGoogleMapsScript, waitForMapLayout } from "./googleMapsLoader.js";
import { isProfileOnboardingComplete } from "./models/UserProfile.js";
import { normalizeUserRole } from "./utils/geo.js";
import PasswordValidator from "./PasswordValidator.js";
import {
  validateFullName,
  validateEmail,
  validatePhone,
  sanitizeKenyanPhoneInput,
  validateRole,
  validateSignupFile,
  validateIdNumber,
  validateDriverStep3,
  validateMechanicStep3,
} from "./utils/signupValidation.js";

const DEFAULT_MAP_CENTER = { lat: -1.286389, lng: 36.817223 };

let wizardState = {
  step: 1,
  role: "driver",
  location: { latitude: null, longitude: null, address: "" },
};

let locationMap = null;
let locationMarker = null;
let locationGeocoder = null;

export function getSignupResumeStep(profile) {
  if (!profile || isProfileOnboardingComplete(profile)) return null;
  const completedStep = Number(profile.onboardingStep) || 0;
  if (completedStep >= 2) return 3;
  if (completedStep >= 1) return 2;
  return 1;
}

function setWizardError(message) {
  const errorEl = document.getElementById("signup-error");
  if (errorEl) errorEl.textContent = message || "";
}

function setWizardLoading(isLoading, buttonId, defaultLabel) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.disabled = isLoading;
  btn.innerHTML = isLoading
    ? '<span class="loading-spinner"></span>Processing...'
    : defaultLabel;
}

function updateStepIndicators(activeStep) {
  document.querySelectorAll(".signup-step-dot").forEach((dot) => {
    const step = Number(dot.dataset.step);
    dot.classList.toggle("active", step === activeStep);
    dot.classList.toggle("completed", step < activeStep);
  });
  document.querySelectorAll(".signup-step-label").forEach((label) => {
    const step = Number(label.dataset.step);
    label.classList.toggle("active", step === activeStep);
  });
}

function showWizardStep(step, role) {
  wizardState.step = step;
  wizardState.role = normalizeUserRole(role || wizardState.role);

  document.querySelectorAll(".signup-wizard-step").forEach((panel) => {
    panel.classList.remove("active");
  });

  if (step === 1) {
    document.getElementById("signup-step-1")?.classList.add("active");
  } else if (step === 2) {
    document.getElementById("signup-step-2")?.classList.add("active");
    updateStep2Labels(wizardState.role);
  } else if (step === 3) {
    const panelId =
      wizardState.role === "mechanic" ? "signup-step-3-mechanic" : "signup-step-3-driver";
    document.getElementById(panelId)?.classList.add("active");
    if (wizardState.role === "mechanic") {
      initMechanicLocationMap();
    }
  }

  updateStepIndicators(step);
  setWizardError("");
}

function updateStep2Labels(role) {
  const isMechanic = normalizeUserRole(role) === "mechanic";
  const idLabel = document.getElementById("signup-id-number-label");
  const idInput = document.getElementById("signup-id-number");
  if (idLabel) {
    idLabel.textContent = isMechanic
      ? "Mechanic Certification Number"
      : "Driving License Number";
  }
  if (idInput) {
    idInput.placeholder = isMechanic ? "Certification number" : "License number";
  }
}

function readStep1Fields() {
  return {
    name: document.getElementById("signup-name")?.value?.trim() || "",
    email: document.getElementById("signup-email")?.value?.trim() || "",
    password: document.getElementById("signup-password")?.value || "",
    phone: sanitizeKenyanPhoneInput(document.getElementById("signup-phone")?.value || ""),
    role:
      document.querySelector('input[name="role"]:checked')?.value || wizardState.role,
  };
}

function validateStep1(fields) {
  return (
    validateFullName(fields.name) ||
    validateEmail(fields.email) ||
    validatePhone(fields.phone) ||
    validateRole(fields.role) ||
    (PasswordValidator.validate(fields.password).isValid
      ? ""
      : PasswordValidator.validate(fields.password).errors[0])
  );
}

async function reverseGeocode(lat, lng) {
  if (!locationGeocoder) return "";
  return new Promise((resolve) => {
    locationGeocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.[0]?.formatted_address) {
        resolve(results[0].formatted_address);
      } else {
        resolve(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    });
  });
}

async function setMechanicPin(lat, lng, { reverseLookup = true } = {}) {
  wizardState.location.latitude = lat;
  wizardState.location.longitude = lng;
  if (locationMarker) {
    locationMarker.setPosition({ lat, lng });
  } else if (locationMap) {
    locationMarker = new google.maps.Marker({
      map: locationMap,
      position: { lat, lng },
      draggable: true,
    });
    locationMarker.addListener("dragend", async () => {
      const pos = locationMarker.getPosition();
      await setMechanicPin(pos.lat(), pos.lng());
    });
  }
  if (reverseLookup) {
    wizardState.location.address = await reverseGeocode(lat, lng);
    const addressInput = document.getElementById("signup-garage-address");
    if (addressInput) addressInput.value = wizardState.location.address;
  }
}

async function initMechanicLocationMap() {
  const mapEl = document.getElementById("signup-location-map");
  if (!mapEl) return;

  try {
    await loadGoogleMapsScript();
    await waitForMapLayout(mapEl);

    if (!locationMap) {
      locationMap = new google.maps.Map(mapEl, {
        center: DEFAULT_MAP_CENTER,
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      locationGeocoder = new google.maps.Geocoder();
      locationMap.addListener("click", async (event) => {
        await setMechanicPin(event.latLng.lat(), event.latLng.lng());
      });
    } else {
      google.maps.event.trigger(locationMap, "resize");
    }

    if (wizardState.location.latitude != null && wizardState.location.longitude != null) {
      const lat = wizardState.location.latitude;
      const lng = wizardState.location.longitude;
      locationMap.setCenter({ lat, lng });
      await setMechanicPin(lat, lng, { reverseLookup: false });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          locationMap.setCenter({ lat, lng });
          await setMechanicPin(lat, lng);
        },
        () => {
          locationMap.setCenter(DEFAULT_MAP_CENTER);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  } catch (error) {
    setWizardError("Unable to load the map. Check your connection and try again.");
    console.error("signup location map error:", error);
  }
}

export function showSignupWizard({ step = 1, role = "driver" } = {}) {
  wizardState.role = normalizeUserRole(role);
  showWizardStep(step, wizardState.role);
}

export function resumeSignupWizardFromProfile(profile) {
  const step = getSignupResumeStep(profile);
  if (!step) return false;
  wizardState.role = normalizeUserRole(profile.role);
  if (profile.latitude != null && profile.longitude != null) {
    wizardState.location = {
      latitude: profile.latitude,
      longitude: profile.longitude,
      address: profile.address || "",
    };
    const addressInput = document.getElementById("signup-garage-address");
    if (addressInput && profile.address) addressInput.value = profile.address;
  }
  showWizardStep(step, wizardState.role);
  return true;
}

export function initSignupWizard({ authService, authViewModel, onComplete, onProfileSaved }) {
  const phoneInput = document.getElementById("signup-phone");
  phoneInput?.addEventListener("input", () => {
    const sanitized = sanitizeKenyanPhoneInput(phoneInput.value);
    if (phoneInput.value !== sanitized) {
      phoneInput.value = sanitized;
    }
  });
  phoneInput?.addEventListener("paste", (event) => {
    event.preventDefault();
    const pasted = event.clipboardData?.getData("text") || "";
    phoneInput.value = sanitizeKenyanPhoneInput(pasted);
  });

  const step1Btn = document.getElementById("signup-step1-btn");
  const step2Btn = document.getElementById("signup-step2-btn");
  const step2BackBtn = document.getElementById("signup-step2-back");
  const step3DriverBtn = document.getElementById("signup-step3-driver-btn");
  const step3DriverBackBtn = document.getElementById("signup-step3-driver-back");
  const step3MechanicBtn = document.getElementById("signup-step3-mechanic-btn");
  const step3MechanicBackBtn = document.getElementById("signup-step3-mechanic-back");

  step1Btn?.addEventListener("click", async (e) => {
    e.preventDefault();
    setWizardError("");

    const fields = readStep1Fields();
    const validationError = validateStep1(fields);
    if (validationError) {
      setWizardError(validationError);
      return;
    }

    wizardState.role = normalizeUserRole(fields.role);
    authViewModel.name = fields.name;
    authViewModel.email = fields.email;
    authViewModel.password = fields.password;
    authViewModel.phoneNumber = fields.phone;
    authViewModel.role = fields.role;

    setWizardLoading(true, "signup-step1-btn", "Continue");
    await authViewModel.signUp();
    setWizardLoading(false, "signup-step1-btn", "Continue");

    if (authViewModel.uiState === "error") {
      setWizardError(authViewModel.errorMessage);
      return;
    }

    showWizardStep(2, wizardState.role);
  });

  step2BackBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    if (authService.auth.currentUser) {
      setWizardError("Account created. Complete identity verification to continue.");
      return;
    }
    showWizardStep(1, wizardState.role);
  });

  step2Btn?.addEventListener("click", async (e) => {
    e.preventDefault();
    setWizardError("");

    const user = authService.auth.currentUser;
    if (!user) {
      setWizardError("Please complete step 1 first.");
      showWizardStep(1, wizardState.role);
      return;
    }

    const profilePhotoFile = document.getElementById("signup-profile-photo")?.files?.[0];
    const idPhotoFile = document.getElementById("signup-id-front-photo")?.files?.[0];
    const idNumber = document.getElementById("signup-id-number")?.value?.trim() || "";

    const photoErr =
      validateSignupFile("profile", profilePhotoFile, "Profile photo") ||
      validateIdNumber(idNumber, wizardState.role) ||
      validateSignupFile("id_front", idPhotoFile, "ID front photo");
    if (photoErr) {
      setWizardError(photoErr);
      return;
    }

    setWizardLoading(true, "signup-step2-btn", "Continue");
    try {
      const [profilePhotoUrl, idPhotoUrl] = await Promise.all([
        uploadUserImage(user.uid, "profile", profilePhotoFile, { role: wizardState.role }),
        uploadUserImage(user.uid, "id_front", idPhotoFile, { role: wizardState.role }),
      ]);

      const result = await authService.completeSignupStep2(user.uid, {
        profilePhotoUrl,
        idPhotoUrl,
        idNumber,
        role: wizardState.role,
      });

      if (!result.success) {
        setWizardError(result.error);
        return;
      }

      await onProfileSaved?.();
      showWizardStep(3, wizardState.role);
    } catch (error) {
      setWizardError(error.message || "Upload failed. Please try again.");
    } finally {
      setWizardLoading(false, "signup-step2-btn", "Continue");
    }
  });

  step3DriverBackBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    showWizardStep(2, wizardState.role);
  });

  step3DriverBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    setWizardError("");

    const user = authService.auth.currentUser;
    if (!user) {
      setWizardError("Session expired. Please sign in again.");
      return;
    }

    const vehicleType = document.getElementById("signup-vehicle-type")?.value || "";
    const vehicleModel = document.getElementById("signup-vehicle-model")?.value?.trim() || "";
    const numberPlate = document.getElementById("signup-number-plate")?.value?.trim() || "";
    const vehiclePhotoFile = document.getElementById("signup-vehicle-photo")?.files?.[0];

    const validationError = validateDriverStep3({
      vehicleType,
      vehicleModel,
      numberPlate,
      vehiclePhotoFile,
    });
    if (validationError) {
      setWizardError(validationError);
      return;
    }

    setWizardLoading(true, "signup-step3-driver-btn", "Finish Sign Up");
    try {
      const vehiclePhotoUrl = await uploadUserImage(user.uid, "vehicle", vehiclePhotoFile, {
        role: wizardState.role,
      });
      const result = await authService.completeSignupStep3Driver(user.uid, {
        vehicleType,
        vehicleModel,
        numberPlate,
        vehiclePhotoUrl,
      });
      if (!result.success) {
        setWizardError(result.error);
        return;
      }
      onComplete?.();
    } catch (error) {
      setWizardError(error.message || "Unable to finish sign up.");
    } finally {
      setWizardLoading(false, "signup-step3-driver-btn", "Finish Sign Up");
    }
  });

  step3MechanicBackBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    showWizardStep(2, wizardState.role);
  });

  step3MechanicBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    setWizardError("");

    const user = authService.auth.currentUser;
    if (!user) {
      setWizardError("Session expired. Please sign in again.");
      return;
    }

    const institutionName =
      document.getElementById("signup-institution-name")?.value?.trim() || "";
    const experienceYears =
      document.getElementById("signup-experience-years")?.value || "";
    const certificatePhotoFile =
      document.getElementById("signup-certificate-photo")?.files?.[0];
    const garagePhotoFile = document.getElementById("signup-garage-photo")?.files?.[0];

    const validationError = validateMechanicStep3({
      institutionName,
      experienceYears,
      certificatePhotoFile,
      garagePhotoFile,
      latitude: wizardState.location.latitude,
      longitude: wizardState.location.longitude,
      address: wizardState.location.address,
    });
    if (validationError) {
      setWizardError(validationError);
      return;
    }

    setWizardLoading(true, "signup-step3-mechanic-btn", "Finish Sign Up");
    try {
      const [certificatePhotoUrl, garagePhotoUrl] = await Promise.all([
        uploadUserImage(user.uid, "certificate", certificatePhotoFile, {
          role: wizardState.role,
        }),
        uploadUserImage(user.uid, "garage", garagePhotoFile, { role: wizardState.role }),
      ]);

      const result = await authService.completeSignupStep3Mechanic(user.uid, {
        institutionName,
        experienceYears,
        certificatePhotoUrl,
        garagePhotos: [garagePhotoUrl],
        latitude: wizardState.location.latitude,
        longitude: wizardState.location.longitude,
        address: wizardState.location.address,
      });

      if (!result.success) {
        setWizardError(result.error);
        return;
      }
      onComplete?.();
    } catch (error) {
      setWizardError(error.message || "Unable to finish sign up.");
    } finally {
      setWizardLoading(false, "signup-step3-mechanic-btn", "Finish Sign Up");
    }
  });

  document.querySelectorAll('input[name="role"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      wizardState.role = normalizeUserRole(radio.value);
      updateStep2Labels(wizardState.role);
    });
  });
}

export { isProfileOnboardingComplete, getSignupResumeStep as getResumeStep };
