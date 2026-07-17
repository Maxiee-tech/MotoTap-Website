/**
 * Vehicle make/model catalog for MotoTap pickers.
 * Grouped by body type; merged at runtime for make → model dropdowns.
 */
export const VEHICLE_CATALOG_VERSION = 1;

export const VEHICLE_CATEGORIES = [
  {
    id: "hatchbacks",
    name: "Hatchbacks (Small Cars)",
    makes: [
      { name: "Toyota", models: ["Aqua", "Passo", "Vitz", "Ractis", "Yaris", "Blade", "Raum", "IST", "Porte", "Spade"] },
      { name: "Honda", models: ["Fit", "Jazz", "Brio"] },
      { name: "Nissan", models: ["Note", "March", "Micra", "Tiida"] },
      { name: "Mazda", models: ["Demio", "Verisa"] },
      { name: "Suzuki", models: ["Swift", "Alto", "Celerio", "Wagon R", "Splash", "Baleno", "Ignis"] },
      { name: "Mitsubishi", models: ["Mirage", "Colt"] },
      { name: "Volkswagen", models: ["Polo", "Golf"] },
      { name: "Peugeot", models: ["208", "207"] },
      { name: "Kia", models: ["Picanto", "Rio Hatchback"] },
      { name: "Hyundai", models: ["i10", "i20"] },
    ],
  },
  {
    id: "sedans",
    name: "Sedans (Saloons)",
    makes: [
      { name: "Toyota", models: ["Premio", "Allion", "Corolla", "Axio", "Belta", "Camry", "Crown", "Mark X", "Avensis", "Sai", "Crown Majesta"] },
      { name: "Nissan", models: ["Sunny", "Almera", "Bluebird", "Bluebird Sylphy", "Sylphy", "Teana", "Fuga", "Skyline"] },
      { name: "Honda", models: ["Civic", "Accord", "Grace", "Insight"] },
      { name: "Mazda", models: ["Axela", "Atenza", "Familia"] },
      { name: "Subaru", models: ["Legacy B4", "Impreza G4"] },
      { name: "Mitsubishi", models: ["Galant", "Lancer", "Attrage"] },
      { name: "Mercedes-Benz", models: ["A-Class Sedan", "C-Class", "CLA", "E-Class", "S-Class"] },
      { name: "BMW", models: ["1 Series Sedan", "3 Series", "5 Series", "7 Series"] },
      { name: "Audi", models: ["A3", "A4", "A5", "A6", "A8"] },
      { name: "Volkswagen", models: ["Passat", "Jetta"] },
      { name: "Lexus", models: ["IS", "ES", "LS", "GS"] },
    ],
  },
  {
    id: "station-wagons",
    name: "Station Wagons",
    makes: [
      { name: "Toyota", models: ["Corolla Fielder", "Probox", "Succeed", "Caldina", "Wish"] },
      { name: "Nissan", models: ["Wingroad", "AD Van", "Stagea"] },
      { name: "Subaru", models: ["Legacy Wagon", "Levorg", "Outback"] },
      { name: "Mazda", models: ["Atenza Wagon"] },
      { name: "Volkswagen", models: ["Golf Variant", "Passat Variant"] },
      { name: "Volvo", models: ["V40", "V60", "V90"] },
    ],
  },
  {
    id: "suvs",
    name: "SUVs",
    makes: [
      { name: "Toyota", models: ["RAV4", "Harrier", "Land Cruiser", "Prado", "Fortuner", "Rush", "Kluger", "Vanguard", "C-HR", "Raize"] },
      { name: "Nissan", models: ["X-Trail", "Qashqai", "Dualis", "Patrol", "Murano", "Juke", "Kicks"] },
      { name: "Honda", models: ["CR-V", "HR-V", "Vezel", "ZR-V"] },
      { name: "Mazda", models: ["CX-3", "CX-5", "CX-8", "CX-9", "CX-30", "CX-60"] },
      { name: "Subaru", models: ["Forester", "XV", "Crosstrek", "Outback", "Ascent"] },
      { name: "Mitsubishi", models: ["Pajero", "Pajero Sport", "Outlander", "Eclipse Cross", "RVR"] },
      { name: "Ford", models: ["Everest", "Escape", "Explorer", "Edge", "Bronco"] },
      { name: "Hyundai", models: ["Tucson", "Santa Fe", "Palisade", "Creta"] },
      { name: "Kia", models: ["Sportage", "Sorento", "Seltos", "Telluride"] },
      { name: "Volkswagen", models: ["Tiguan", "Touareg", "T-Cross"] },
      { name: "Land Rover", models: ["Defender", "Discovery", "Discovery Sport", "Range Rover", "Range Rover Sport", "Evoque", "Velar"] },
      { name: "Jeep", models: ["Wrangler", "Grand Cherokee", "Compass", "Renegade"] },
      { name: "Lexus", models: ["UX", "NX", "RX", "GX", "LX"] },
    ],
  },
  {
    id: "pickup-trucks",
    name: "Pickup Trucks",
    makes: [
      { name: "Toyota", models: ["Hilux", "Land Cruiser Pickup"] },
      { name: "Isuzu", models: ["D-Max"] },
      { name: "Ford", models: ["Ranger", "F-150"] },
      { name: "Nissan", models: ["Navara", "Hardbody"] },
      { name: "Mitsubishi", models: ["L200", "Triton"] },
      { name: "Mazda", models: ["BT-50"] },
      { name: "Volkswagen", models: ["Amarok"] },
      { name: "Mahindra", models: ["Pik Up"] },
      { name: "GWM", models: ["P-Series", "Steed"] },
    ],
  },
  {
    id: "vans-minivans",
    name: "Vans & Minivans",
    makes: [
      { name: "Toyota", models: ["Hiace", "Noah", "Voxy", "Alphard", "Vellfire", "Esquire", "Sienta", "Wish", "Isis"] },
      { name: "Nissan", models: ["Serena", "Caravan", "NV200", "Elgrand"] },
      { name: "Honda", models: ["Stepwgn", "Freed", "Odyssey", "Mobilio"] },
      { name: "Mazda", models: ["Bongo", "Premacy"] },
      { name: "Mitsubishi", models: ["Delica"] },
      { name: "Suzuki", models: ["Every"] },
    ],
  },
  {
    id: "commercial-trucks",
    name: "Commercial Trucks",
    makes: [
      { name: "Isuzu", models: ["N-Series", "F-Series", "Giga"] },
      { name: "Hino", models: ["300", "500", "700"] },
      { name: "Mitsubishi Fuso", models: ["Canter", "Fighter", "Super Great"] },
      { name: "Mercedes-Benz", models: ["Actros", "Atego", "Axor"] },
      { name: "Scania", models: ["P-Series", "G-Series", "R-Series"] },
      { name: "Volvo", models: ["FH", "FM", "FMX"] },
      { name: "MAN", models: ["TGS", "TGX"] },
      { name: "FAW", models: ["J5", "J6"] },
      { name: "Sinotruk", models: ["Howo", "Tata", "LPT Series"] },
    ],
  },
  {
    id: "buses-coaches",
    name: "Buses & Coaches",
    makes: [
      { name: "Toyota", models: ["Coaster"] },
      { name: "Nissan", models: ["Civilian"] },
      { name: "Isuzu", models: ["FRR", "NQR"] },
      { name: "Hino", models: ["AK", "RK", "Rainbow"] },
      { name: "Scania", models: ["Touring Coach"] },
      { name: "Volvo", models: ["9700", "9800"] },
      { name: "Yutong", models: ["ZK Series"] },
      { name: "Zhongtong", models: ["LCK Series"] },
      { name: "King Long", models: ["XMQ Series"] },
    ],
  },
  {
    id: "luxury-cars",
    name: "Luxury Cars",
    makes: [
      { name: "Mercedes-Benz", models: ["S-Class", "CLS", "Maybach S-Class", "G-Class"] },
      { name: "BMW", models: ["7 Series", "X5", "X6", "X7", "XM"] },
      { name: "Audi", models: ["A8", "Q7", "Q8"] },
      { name: "Lexus", models: ["LS", "LX", "GX", "RX"] },
      { name: "Porsche", models: ["Cayenne", "Macan", "Panamera", "Taycan"] },
      { name: "Maserati", models: ["Levante", "Ghibli", "Quattroporte"] },
      { name: "Bentley", models: ["Bentayga", "Flying Spur", "Continental GT"] },
      { name: "Rolls-Royce", models: ["Ghost", "Phantom", "Cullinan"] },
    ],
  },
  {
    id: "sports-cars",
    name: "Sports Cars",
    makes: [
      { name: "Toyota", models: ["Supra", "GR86", "MR2"] },
      { name: "Nissan", models: ["GT-R", "350Z", "370Z"] },
      { name: "Subaru", models: ["BRZ"] },
      { name: "Mazda", models: ["MX-5 Miata"] },
      { name: "Ford", models: ["Mustang"] },
      { name: "Chevrolet", models: ["Camaro", "Corvette"] },
      { name: "Porsche", models: ["718 Cayman", "911"] },
    ],
  },
  {
    id: "electric-vehicles",
    name: "Electric Vehicles (EVs)",
    makes: [
      { name: "BYD", models: ["Atto 3", "Dolphin", "Seal", "Sealion", "Yuan Plus"] },
      { name: "Tesla", models: ["Model 3", "Model Y", "Model S", "Model X"] },
      { name: "Nissan", models: ["Leaf", "Ariya"] },
      { name: "Hyundai", models: ["Kona Electric", "Ioniq 5", "Ioniq 6"] },
      { name: "Kia", models: ["EV6", "EV9", "Niro EV"] },
      { name: "BMW", models: ["i3", "i4", "i5", "i7", "iX"] },
      { name: "Mercedes-Benz", models: ["EQA", "EQB", "EQE", "EQS"] },
      { name: "Volkswagen", models: ["ID.3", "ID.4", "ID.5"] },
    ],
  },
  {
    id: "motorcycles",
    name: "Motorcycles",
    makes: [
      { name: "Bajaj", models: ["Boxer BM100", "Boxer BM125", "Boxer X150"] },
      { name: "TVS", models: ["HLX 100", "Star", "Apache"] },
      { name: "Honda", models: ["Ace CB125", "CG125", "XR150L"] },
      { name: "Yamaha", models: ["Crux", "YBR125", "FZ", "MT-15"] },
      { name: "Suzuki", models: ["GN125", "Gixxer"] },
      { name: "Hero", models: ["Splendor", "Hunk"] },
      { name: "Haojue", models: ["HJ125"] },
      { name: "Dayun", models: ["DY125"] },
      { name: "Senke", models: ["SK125"] },
    ],
  },
  {
    id: "three-wheelers",
    name: "Three-Wheelers (Tuk Tuks)",
    makes: [
      { name: "Bajaj", models: ["RE"] },
      { name: "TVS", models: ["King Deluxe", "King Cargo"] },
      { name: "Piaggio", models: ["Ape City", "Ape Xtra"] },
      { name: "Mahindra", models: ["Alfa"] },
      { name: "Lohia", models: ["Narain Cargo"] },
    ],
  },
];

const makeModelIndex = buildMakeModelIndex(VEHICLE_CATEGORIES);

function buildMakeModelIndex(categories) {
  /** @type {Map<string, { displayName: string, models: Set<string> }>} */
  const byLowerMake = new Map();

  categories.forEach((category) => {
    category.makes.forEach(({ name, models }) => {
      const make = String(name || "").trim();
      if (!make) return;

      const key = make.toLowerCase();
      if (!byLowerMake.has(key)) {
        byLowerMake.set(key, { displayName: make, models: new Set() });
      }

      const entry = byLowerMake.get(key);
      models.forEach((model) => {
        const modelName = String(model || "").trim();
        if (modelName) entry.models.add(modelName);
      });
    });
  });

  return byLowerMake;
}

function compareLabels(a, b) {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

/** Sorted list of all makes in the catalog. */
export function getVehicleMakes() {
  return Array.from(makeModelIndex.values())
    .map((entry) => entry.displayName)
    .sort(compareLabels);
}

/** Sorted models for a make (case-insensitive). */
export function getModelsForMake(make) {
  const key = String(make || "").trim().toLowerCase();
  if (!key || !makeModelIndex.has(key)) return [];

  return Array.from(makeModelIndex.get(key).models).sort(compareLabels);
}

/** Resolve a stored make to the catalog display name, if possible. */
export function resolveCatalogMake(make) {
  const key = String(make || "").trim().toLowerCase();
  if (!key) return "";
  return makeModelIndex.get(key)?.displayName || String(make).trim();
}

/** Resolve a stored model for a make to the catalog display name, if possible. */
export function resolveCatalogModel(make, model) {
  const resolvedMake = resolveCatalogMake(make);
  const models = getModelsForMake(resolvedMake);
  const target = String(model || "").trim().toLowerCase();
  if (!target) return "";

  const match = models.find((name) => name.toLowerCase() === target);
  return match || String(model).trim();
}
