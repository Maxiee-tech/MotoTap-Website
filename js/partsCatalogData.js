/**
 * Spare parts catalog for driver discovery and parts dealer inventory.
 */
export const PARTS_CATALOG_VERSION = 2;

export const PARTS_DISPLAY_GROUP_ORDER = [
  "Engine & Drivetrain",
  "Brakes & Suspension",
  "Electrical & Electronics",
  "Vehicle Electronics & Security",
  "Filters & Fluids",
  "Body & Exterior",
  "Tyres & Wheels",
];

export const PARTS_CATEGORY_MATERIAL_ICONS = {
  "engine-drivetrain": "settings",
  brakes: "stop_circle",
  electrical: "bolt",
  "filters-fluids": "water_drop",
  "body-exterior": "directions_car",
  "tyres-wheels": "tire_repair",
  "vehicle-electronics-security": "key",
};

export function getPartsCategoryIcon(categoryId) {
  return PARTS_CATEGORY_MATERIAL_ICONS[categoryId] || "inventory_2";
}

export const PARTS_CATEGORIES = [
  {
    id: "engine-drivetrain",
    name: "Engine & Drivetrain",
    displayGroup: "Engine & Drivetrain",
    groups: [
      {
        title: "Engine",
        items: ["Spark plugs", "Timing belt", "Oil pump", "Gasket set", "Piston rings"],
      },
      {
        title: "Drivetrain",
        items: ["Clutch kit", "Drive shaft", "CV joint", "Gearbox mount"],
      },
    ],
  },
  {
    id: "brakes",
    name: "Brakes & Suspension",
    displayGroup: "Brakes & Suspension",
    groups: [
      {
        title: "Brakes",
        items: ["Brake pads", "Brake discs", "Brake fluid", "Brake caliper"],
      },
      {
        title: "Suspension",
        items: ["Shock absorber", "Coil spring", "Control arm", "Bushings"],
      },
    ],
  },
  {
    id: "electrical",
    name: "Electrical & Electronics",
    displayGroup: "Electrical & Electronics",
    groups: [
      {
        title: "Electrical",
        items: ["Car battery", "Alternator", "Starter motor", "Fuses & relays"],
      },
      {
        title: "Lighting",
        items: ["Headlight bulb", "Tail light", "Indicator bulb", "Fog lamp"],
      },
    ],
  },
  {
    id: "vehicle-electronics-security",
    name: "Vehicle Electronics & Security",
    displayGroup: "Vehicle Electronics & Security",
    groups: [
      {
        title: "Key Programming",
        items: [
          "Transponder chip",
          "Key blank",
          "Key fob shell",
          "Key fob battery",
          "Remote key pad",
        ],
      },
      {
        title: "Dashboard & Display",
        items: [
          "Instrument cluster unit",
          "Dashboard LCD screen",
          "Touchscreen module",
          "Display cable harness",
          "Cluster bulb",
        ],
      },
      {
        title: "Trackers & Security",
        items: [
          "GPS tracker unit",
          "Tracker SIM card",
          "Immobilizer unit",
          "Car alarm siren",
          "Door sensor",
          "Shock sensor",
        ],
      },
    ],
  },
  {
    id: "filters-fluids",
    name: "Filters & Fluids",
    displayGroup: "Filters & Fluids",
    groups: [
      {
        title: "Filters",
        items: ["Oil filter", "Air filter", "Fuel filter", "Cabin filter"],
      },
      {
        title: "Fluids",
        items: ["Engine oil", "Coolant", "Transmission fluid", "Power steering fluid"],
      },
    ],
  },
  {
    id: "body-exterior",
    name: "Body & Exterior",
    displayGroup: "Body & Exterior",
    groups: [
      {
        title: "Body",
        items: ["Side mirror", "Bumper", "Door handle", "Windscreen"],
      },
      {
        title: "Exterior",
        items: ["Wiper blades", "Number plate holder", "Mud flaps"],
      },
    ],
  },
  {
    id: "tyres-wheels",
    name: "Tyres & Wheels",
    displayGroup: "Tyres & Wheels",
    groups: [
      {
        title: "Tyres",
        items: ["Tyre (new)", "Tyre (used)", "Tube", "Valve stem"],
      },
      {
        title: "Wheels",
        items: ["Alloy rim", "Steel rim", "Wheel bearing", "Wheel nuts"],
      },
    ],
  },
];
