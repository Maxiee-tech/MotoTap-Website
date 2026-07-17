import {
  getModelsForMake,
  getVehicleMakes,
  resolveCatalogMake,
  resolveCatalogModel,
} from "../vehicleCatalogData.js";

function clearElement(select) {
  while (select.firstChild) {
    select.removeChild(select.firstChild);
  }
}

function appendOption(select, value, label, { selected = false } = {}) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.selected = selected;
  select.appendChild(option);
}

/** Populate a make `<select>` from the vehicle catalog. */
export function populateMakeSelect(select, { selectedMake = "", placeholder = "Select make" } = {}) {
  if (!select) return;

  clearElement(select);
  appendOption(select, "", placeholder);

  const makes = getVehicleMakes();
  const resolvedMake = resolveCatalogMake(selectedMake);
  const customMake =
    selectedMake && !makes.some((make) => make.toLowerCase() === String(selectedMake).toLowerCase())
      ? String(selectedMake).trim()
      : "";

  makes.forEach((make) => {
    appendOption(select, make, make, { selected: make === resolvedMake });
  });

  if (customMake) {
    appendOption(select, customMake, customMake, { selected: true });
  } else if (resolvedMake && !select.value) {
    select.value = resolvedMake;
  }
}

/** Populate a model `<select>` for the chosen make. */
export function populateModelSelect(
  select,
  make,
  { selectedModel = "", placeholder = "Select model" } = {}
) {
  if (!select) return;

  clearElement(select);
  appendOption(select, "", placeholder);

  const resolvedMake = resolveCatalogMake(make);
  if (!resolvedMake) return;

  const models = getModelsForMake(resolvedMake);
  const resolvedModel = resolveCatalogModel(resolvedMake, selectedModel);
  const customModel =
    selectedModel &&
    !models.some((model) => model.toLowerCase() === String(selectedModel).toLowerCase())
      ? String(selectedModel).trim()
      : "";

  models.forEach((model) => {
    appendOption(select, model, model, { selected: model === resolvedModel });
  });

  if (customModel) {
    appendOption(select, customModel, customModel, { selected: true });
  } else if (resolvedModel && !select.value) {
    select.value = resolvedModel;
  }
}

/** Wire make/model selects so the model list updates when make changes. */
export function bindMakeModelPicker(makeSelect, modelSelect, { onChange } = {}) {
  if (!makeSelect || !modelSelect) return;

  const handleMakeChange = () => {
    populateModelSelect(modelSelect, makeSelect.value, {
      selectedModel: "",
      placeholder: makeSelect.value ? "Select model" : "Select make first",
    });
    onChange?.();
  };

  makeSelect.addEventListener("change", handleMakeChange);
  modelSelect.addEventListener("change", () => onChange?.());
}

/** Set make/model on linked selects, preserving custom values not in the catalog. */
export function setMakeModelSelection(makeSelect, modelSelect, make, model) {
  populateMakeSelect(makeSelect, { selectedMake: make });
  populateModelSelect(modelSelect, makeSelect.value || make, { selectedModel: model });
}

/** Create linked make/model `<select>` elements. */
export function createVehicleMakeModelSelects({
  makeClass = "vehicle-make-select",
  modelClass = "vehicle-model-select",
  makeAriaLabel = "Vehicle make",
  modelAriaLabel = "Vehicle model",
  selectedMake = "",
  selectedModel = "",
  onChange,
} = {}) {
  const makeSelect = document.createElement("select");
  makeSelect.className = makeClass;
  makeSelect.setAttribute("aria-label", makeAriaLabel);

  const modelSelect = document.createElement("select");
  modelSelect.className = modelClass;
  modelSelect.setAttribute("aria-label", modelAriaLabel);

  setMakeModelSelection(makeSelect, modelSelect, selectedMake, selectedModel);
  bindMakeModelPicker(makeSelect, modelSelect, { onChange });

  return { makeSelect, modelSelect };
}

/** Read `{ make, model }` from elements located by class name within a container. */
export function readMakeModelFromContainer(container, {
  makeSelector = ".vehicle-make-select, .mechanic-vehicle-make-input",
  modelSelector = ".vehicle-model-select, .mechanic-vehicle-model-input",
} = {}) {
  const makeEl = container?.querySelector(makeSelector);
  const modelEl = container?.querySelector(modelSelector);
  return {
    make: String(makeEl?.value || "").trim(),
    model: String(modelEl?.value || "").trim(),
  };
}

/** Initialize static make/model selects already present in the DOM. */
export function initVehiclePickerPair(makeSelect, modelSelect, { make = "", model = "", onChange } = {}) {
  if (!makeSelect || !modelSelect) return;
  setMakeModelSelection(makeSelect, modelSelect, make, model);
  bindMakeModelPicker(makeSelect, modelSelect, { onChange });
}
