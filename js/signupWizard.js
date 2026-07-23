import { uploadUserImage } from "./services/CloudinaryStorageService.js";
import { loadGoogleMapsScript, waitForMapLayout } from "./googleMapsLoader.js";
import { isProfileOnboardingComplete } from "./models/UserProfile.js";
import { isBusinessRole, normalizeUserRole } from "./utils/geo.js";
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
  validatePartsDealerStep3,
} from "./utils/signupValidation.js";
import { initVehiclePickerPair } from "./utils/vehiclePicker.js";

const DEFAULT_MAP_CENTER = { lat: -1.286389, lng: 36.817223 };

const STEP3_PANEL_BY_ROLE = {
  driver: "signup-step-3-driver",
  mechanic: "signup-step-3-mechanic",
  parts_dealer: "signup-step-3-parts-dealer",
};

const LOCATION_MAP_BY_ROLE = {
  mechanic: "signup-location-map",
  parts_dealer: "signup-parts-location-map",
};

const ADDRESS_INPUT_BY_ROLE = {
  mechanic: "signup-garage-address",
  parts_dealer: "signup-parts-shop-address",
};

let wizardState = {
  step: 1,
  role: "driver",
  garageMode: "own",
  verifiedInvite: null,
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

function getAddressInputId(role = wizardState.role) {
  return ADDRESS_INPUT_BY_ROLE[normalizeUserRole(role)] || ADDRESS_INPUT_BY_ROLE.mechanic;
}

function initSignupVehiclePicker() {
  const makeSelect = document.getElementById("signup-vehicle-make");
  const modelSelect = document.getElementById("signup-vehicle-model");
  if (!makeSelect || !modelSelect || makeSelect.dataset.pickerReady) return;

  initVehiclePickerPair(makeSelect, modelSelect);
  makeSelect.dataset.pickerReady = "true";
  modelSelect.dataset.pickerReady = "true";
}

function getSignupGarageMode() {
  const selected = document.querySelector('input[name="signup-garage-mode"]:checked');
  return selected?.value === "join" ? "join" : "own";
}

function syncSignupGarageModeUi() {
  const role = normalizeUserRole(wizardState.role);
  const isMechanic = role === "mechanic";
  const joinMode = isMechanic && getSignupGarageMode() === "join";
  wizardState.garageMode = joinMode ? "join" : "own";

  document.getElementById("signup-step1-garage-mode")?.toggleAttribute("hidden", !isMechanic);
  document.getElementById("signup-step1-invite-group")?.toggleAttribute("hidden", !joinMode);

  // Step 2: joiners only need a profile photo.
  document.getElementById("signup-id-number-group")?.toggleAttribute("hidden", joinMode);
  document.getElementById("signup-id-front-photo-group")?.toggleAttribute("hidden", joinMode);

  // Step 3: joiners skip garage docs + personal cert.
  document.getElementById("signup-institution-group")?.toggleAttribute("hidden", joinMode);
  document.getElementById("signup-certificate-photo-group")?.toggleAttribute("hidden", joinMode);
  document.getElementById("signup-garage-photo-group")?.toggleAttribute("hidden", joinMode);
  document.getElementById("signup-garage-location-group")?.toggleAttribute("hidden", joinMode);

  const banner = document.getElementById("signup-join-garage-banner");
  if (banner) {
    if (joinMode && wizardState.verifiedInvite?.garageName) {
      banner.hidden = false;
      banner.textContent = `Joining ${wizardState.verifiedInvite.garageName}. The owner will approve your request.`;
    } else if (joinMode) {
      banner.hidden = false;
      banner.textContent = "Verify your garage invite code in step 1 before finishing.";
    } else {
      banner.hidden = true;
      banner.textContent = "";
    }
  }

  const verifiedEl = document.getElementById("signup-invite-verified");
  if (verifiedEl) {
    if (joinMode && wizardState.verifiedInvite?.garageName) {
      verifiedEl.hidden = false;
      verifiedEl.textContent = `Verified: ${wizardState.verifiedInvite.garageName}`;
    } else {
      verifiedEl.hidden = true;
      verifiedEl.textContent = "";
    }
  }
}

function clearVerifiedInvite() {
  wizardState.verifiedInvite = null;
  const verifiedEl = document.getElementById("signup-invite-verified");
  if (verifiedEl) {
    verifiedEl.hidden = true;
    verifiedEl.textContent = "";
  }
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
    syncSignupGarageModeUi();
  } else if (step === 3) {
    const panelId = STEP3_PANEL_BY_ROLE[wizardState.role] || STEP3_PANEL_BY_ROLE.driver;
    document.getElementById(panelId)?.classList.add("active");
    if (wizardState.role === "driver") {
      initSignupVehiclePicker();
    }
    if (wizardState.role === "mechanic") {
      syncSignupGarageModeUi();
      if (getSignupGarageMode() !== "join") {
        initBusinessLocationMap("mechanic");
      }
    }
    if (wizardState.role === "parts_dealer") {
      initBusinessLocationMap("parts_dealer");
    }
  }

  updateStepIndicators(step);
  setWizardError("");
}

function updateStep2Labels(role) {
  const normalized = normalizeUserRole(role);
  const idLabel = document.getElementById("signup-id-number-label");
  const idInput = document.getElementById("signup-id-number");
  const photoLabel = document.getElementById("signup-id-front-photo-label");
  const photoHint = document.getElementById("signup-id-front-photo-hint");
  const labelByRole = {
    mechanic: "Certificate of Corporation Number",
    parts_dealer: "Business License Number",
    driver: "Driving License Number",
  };
  const placeholderByRole = {
    mechanic: "Certificate of Corporation number",
    parts_dealer: "Business license number",
    driver: "License number",
  };
  const photoLabelByRole = {
    mechanic: "Certificate of Corporation",
    parts_dealer: "Business License Photo",
    driver: "ID Front Photo",
  };
  const photoHintByRole = {
    mechanic:
      "Upload a photo or PDF of your Certificate of Corporation from your device.",
    parts_dealer:
      "Upload a photo or PDF of your business license from your device.",
    driver:
      "Upload a photo or PDF of the front of your license from your device.",
  };
  if (idLabel) {
    idLabel.textContent = labelByRole[normalized] || labelByRole.driver;
  }
  if (idInput) {
    idInput.placeholder = placeholderByRole[normalized] || placeholderByRole.driver;
  }
  if (photoLabel) {
    photoLabel.textContent =
      photoLabelByRole[normalized] || photoLabelByRole.driver;
  }
  if (photoHint) {
    photoHint.textContent =
      photoHintByRole[normalized] || photoHintByRole.driver;
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

async function setBusinessPin(lat, lng, { reverseLookup = true, role = wizardState.role } = {}) {
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
      await setBusinessPin(pos.lat(), pos.lng());
    });
  }
  if (reverseLookup) {
    wizardState.location.address = await reverseGeocode(lat, lng);
    const addressInput = document.getElementById(getAddressInputId(role));
    if (addressInput) addressInput.value = wizardState.location.address;
  }
}

async function initBusinessLocationMap(role = wizardState.role) {
  const normalized = normalizeUserRole(role);
  const mapId = LOCATION_MAP_BY_ROLE[normalized];
  const mapEl = mapId ? document.getElementById(mapId) : null;
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
        await setBusinessPin(event.latLng.lat(), event.latLng.lng());
      });
      google.maps.event.addListenerOnce(locationMap, "idle", () => {
        google.maps.event.trigger(locationMap, "resize");
      });
    } else {
      google.maps.event.trigger(locationMap, "resize");
    }

    if (wizardState.location.latitude != null && wizardState.location.longitude != null) {
      const lat = wizardState.location.latitude;
      const lng = wizardState.location.longitude;
      locationMap.setCenter({ lat, lng });
      await setBusinessPin(lat, lng, { reverseLookup: false, role: normalized });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          locationMap.setCenter({ lat, lng });
          await setBusinessPin(lat, lng);
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
    const addressInputId = getAddressInputId(wizardState.role);
    const addressInput = document.getElementById(addressInputId);
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
  const step3PartsDealerBtn = document.getElementById("signup-step3-parts-dealer-btn");
  const step3PartsDealerBackBtn = document.getElementById("signup-step3-parts-dealer-back");

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
    wizardState.garageMode = getSignupGarageMode();
    authViewModel.name = fields.name;
    authViewModel.email = fields.email;
    authViewModel.password = fields.password;
    authViewModel.phoneNumber = fields.phone;
    authViewModel.role = fields.role;

    if (wizardState.role === "mechanic" && wizardState.garageMode === "join") {
      const code = document.getElementById("signup-garage-invite-code")?.value || "";
      if (!wizardState.verifiedInvite?.inviteCode) {
        setWizardError("Verify your garage invite code before continuing.");
        return;
      }
      const normalizedCode = String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (normalizedCode !== wizardState.verifiedInvite.inviteCode) {
        clearVerifiedInvite();
        setWizardError("Invite code changed. Verify it again before continuing.");
        return;
      }
    } else {
      clearVerifiedInvite();
      wizardState.garageMode = "own";
    }

    setWizardLoading(true, "signup-step1-btn", "Continue");
    await authViewModel.signUp();

    if (authViewModel.uiState === "error") {
      setWizardLoading(false, "signup-step1-btn", "Continue");
      setWizardError(authViewModel.errorMessage);
      return;
    }

    // Re-verify after auth so the invite still resolves for the signed-in user.
    if (wizardState.role === "mechanic" && wizardState.garageMode === "join") {
      try {
        const lookup = await authService.garageService.lookupInvite(
          wizardState.verifiedInvite.inviteCode
        );
        if (!lookup?.garage) {
          clearVerifiedInvite();
          setWizardLoading(false, "signup-step1-btn", "Continue");
          setWizardError("Invalid or expired garage invite code.");
          return;
        }
        wizardState.verifiedInvite = {
          inviteCode: lookup.inviteCode,
          garageId: lookup.garage.id,
          garageName: lookup.garage.name || "Garage",
        };
      } catch (error) {
        setWizardLoading(false, "signup-step1-btn", "Continue");
        setWizardError(error.message || "Could not verify invite code.");
        return;
      }
    }

    setWizardLoading(false, "signup-step1-btn", "Continue");
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
    const joinMode =
      normalizeUserRole(wizardState.role) === "mechanic" && getSignupGarageMode() === "join";

    const role = normalizeUserRole(wizardState.role);
    const idDocLabel =
      role === "mechanic"
        ? "Certificate of Corporation"
        : role === "parts_dealer"
          ? "Business license photo"
          : "ID front photo";
    let photoErr = validateSignupFile("profile", profilePhotoFile, "Profile photo");
    if (!joinMode) {
      photoErr =
        photoErr ||
        validateIdNumber(idNumber, wizardState.role) ||
        validateSignupFile("id_front", idPhotoFile, idDocLabel);
    }
    if (photoErr) {
      setWizardError(photoErr);
      return;
    }

    setWizardLoading(true, "signup-step2-btn", "Continue");
    try {
      const profilePhotoUrl = await uploadUserImage(user.uid, "profile", profilePhotoFile, {
        role: wizardState.role,
      });
      let idPhotoUrl = "";
      if (!joinMode) {
        idPhotoUrl = await uploadUserImage(user.uid, "id_front", idPhotoFile, {
          role: wizardState.role,
        });
      }

      const result = await authService.completeSignupStep2(user.uid, {
        profilePhotoUrl,
        idPhotoUrl,
        idNumber: joinMode ? "" : idNumber,
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

    const vehicleType = document.getElementById("signup-vehicle-make")?.value || "";
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

  document.querySelectorAll('input[name="signup-garage-mode"]').forEach((input) => {
    input.addEventListener("change", () => {
      clearVerifiedInvite();
      syncSignupGarageModeUi();
      if (getSignupGarageMode() !== "join") {
        initBusinessLocationMap("mechanic");
      }
    });
  });

  document.getElementById("signup-garage-invite-code")?.addEventListener("input", () => {
    if (wizardState.verifiedInvite) clearVerifiedInvite();
  });

  document.getElementById("signup-verify-invite-btn")?.addEventListener("click", async (e) => {
    e.preventDefault();
    setWizardError("");
    const code = document.getElementById("signup-garage-invite-code")?.value || "";
    const normalized = String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (normalized.length < 4) {
      setWizardError("Enter a valid garage invite code.");
      return;
    }

    const btn = document.getElementById("signup-verify-invite-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Checking…";
    }
    try {
      // Invite lookup requires auth. If not signed in yet, accept format and verify after account creation.
      if (!authService.auth.currentUser) {
        wizardState.verifiedInvite = {
          inviteCode: normalized,
          garageId: "",
          garageName: "",
          pendingAuthVerify: true,
        };
        const verifiedEl = document.getElementById("signup-invite-verified");
        if (verifiedEl) {
          verifiedEl.hidden = false;
          verifiedEl.textContent = `Code ${normalized} ready. It will be confirmed after account creation.`;
        }
        return;
      }
      const lookup = await authService.garageService.lookupInvite(normalized);
      if (!lookup?.garage) {
        clearVerifiedInvite();
        setWizardError("Invalid or expired garage invite code.");
        return;
      }
      wizardState.verifiedInvite = {
        inviteCode: lookup.inviteCode,
        garageId: lookup.garage.id,
        garageName: lookup.garage.name || "Garage",
      };
      syncSignupGarageModeUi();
    } catch (error) {
      clearVerifiedInvite();
      setWizardError(error.message || "Could not verify invite code.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Verify";
      }
    }
  });

  step3MechanicBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    setWizardError("");

    const user = authService.auth.currentUser;
    if (!user) {
      setWizardError("Session expired. Please sign in again.");
      return;
    }

    const garageMode = getSignupGarageMode();
    const inviteCode =
      wizardState.verifiedInvite?.inviteCode ||
      document.getElementById("signup-garage-invite-code")?.value ||
      "";
    const institutionName =
      document.getElementById("signup-institution-name")?.value?.trim() || "";
    const experienceYears =
      document.getElementById("signup-experience-years")?.value || "";
    const certificatePhotoFile =
      document.getElementById("signup-certificate-photo")?.files?.[0];
    const garagePhotoFile = document.getElementById("signup-garage-photo")?.files?.[0];

    const validationError = validateMechanicStep3({
      garageMode,
      inviteCode,
      institutionName,
      experienceYears,
      certificatePhotoFile,
      garagePhotoFile,
      latitude: wizardState.location.latitude,
      longitude: wizardState.location.longitude,
      address: wizardState.location.address,
      inviteVerified: Boolean(wizardState.verifiedInvite?.inviteCode),
    });
    if (validationError) {
      setWizardError(validationError);
      return;
    }

    setWizardLoading(true, "signup-step3-mechanic-btn", "Finish Sign Up");
    try {
      let certificatePhotoUrl = "";
      let garagePhotos = [];
      if (garageMode !== "join") {
        certificatePhotoUrl = await uploadUserImage(user.uid, "certificate", certificatePhotoFile, {
          role: wizardState.role,
        });
        const garagePhotoUrl = await uploadUserImage(user.uid, "garage", garagePhotoFile, {
          role: wizardState.role,
        });
        garagePhotos = [garagePhotoUrl];
      }

      const result = await authService.completeSignupStep3Mechanic(user.uid, {
        garageMode,
        inviteCode,
        institutionName,
        experienceYears,
        certificatePhotoUrl,
        garagePhotos,
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

  step3PartsDealerBackBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    showWizardStep(2, wizardState.role);
  });

  step3PartsDealerBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    setWizardError("");

    const user = authService.auth.currentUser;
    if (!user) {
      setWizardError("Session expired. Please sign in again.");
      return;
    }

    const shopName = document.getElementById("signup-parts-shop-name")?.value?.trim() || "";
    const experienceYears =
      document.getElementById("signup-parts-experience-years")?.value || "";
    const licensePhotoFile = document.getElementById("signup-parts-license-photo")?.files?.[0];
    const shopPhotoFile = document.getElementById("signup-parts-shop-photo")?.files?.[0];

    const validationError = validatePartsDealerStep3({
      shopName,
      experienceYears,
      licensePhotoFile,
      shopPhotoFile,
      latitude: wizardState.location.latitude,
      longitude: wizardState.location.longitude,
      address: wizardState.location.address,
    });
    if (validationError) {
      setWizardError(validationError);
      return;
    }

    setWizardLoading(true, "signup-step3-parts-dealer-btn", "Finish Sign Up");
    try {
      const [certificatePhotoUrl, garagePhotoUrl] = await Promise.all([
        uploadUserImage(user.uid, "certificate", licensePhotoFile, {
          role: wizardState.role,
        }),
        uploadUserImage(user.uid, "garage", shopPhotoFile, { role: wizardState.role }),
      ]);

      const result = await authService.completeSignupStep3PartsDealer(user.uid, {
        institutionName: shopName,
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
      setWizardLoading(false, "signup-step3-parts-dealer-btn", "Finish Sign Up");
    }
  });

  document.querySelectorAll('input[name="role"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      wizardState.role = normalizeUserRole(radio.value);
      clearVerifiedInvite();
      updateStep2Labels(wizardState.role);
      syncSignupGarageModeUi();
    });
  });

  syncSignupGarageModeUi();
}

export { isProfileOnboardingComplete, getSignupResumeStep as getResumeStep };
