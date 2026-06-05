/**
 * Moto Tap service catalog — must match mobile app strings exactly for
 * mechanic skills filtering and jobs.issueType / jobs.serviceName.
 */
export const SERVICE_CATALOG_VERSION = 2;

export const SERVICE_DISPLAY_GROUP_ORDER = [
  "Emergency Services",
  "Maintenance Services",
  "Upgrades & Value-Added",
];

/** Material Symbols names — matches mobile app Icons.Default.* usage */
export const SERVICE_CATEGORY_MATERIAL_ICONS = {
  "road-assistance": "warning",
  "towing-services": "build",
  "mobile-mechanic": "settings",
  "emergency-tire-services": "info",
  "emergency-battery-services": "face",
  "garage-services": "home",
  "preventive-routine-maintenance": "refresh",
  "vehicle-diagnostics": "search",
  "auto-electrical-services": "info",
  "ac-services": "star",
  "tire-wheel-services": "settings",
  "car-wash-services": "shopping_cart",
  "car-body-cosmetic-services": "edit",
  "car-customization-upgrades": "add",
};

export function getServiceCategoryIcon(categoryId) {
  return SERVICE_CATEGORY_MATERIAL_ICONS[categoryId] || "settings";
}

export const SERVICE_CATEGORIES = [
  // —— Category 1: Emergency Services ——
  {
    id: "road-assistance",
    name: "Road Assistance",
    displayGroup: "Emergency Services",
    groups: [
      {
        title: "Road Assistance",
        items: ["Jumpstart", "Fuel delivery", "Lockout assistance"],
      },
    ],
  },
  {
    id: "towing-services",
    name: "Towing Services",
    displayGroup: "Emergency Services",
    groups: [
      {
        title: "Core Types",
        items: ["Flatbed towing", "Wheel-lift towing", "Dolly towing"],
      },
      {
        title: "Situation-Based",
        items: [
          "Accident towing",
          "Breakdown towing",
          "Long-distance towing",
          "Off-road recovery",
        ],
      },
      {
        title: "Specialized",
        items: [
          "Motorcycle towing",
          "Heavy vehicle towing",
          "Low-clearance vehicle towing",
        ],
      },
    ],
  },
  {
    id: "mobile-mechanic",
    name: "Mobile Mechanic",
    displayGroup: "Emergency Services",
    groups: [
      {
        title: "Diagnostics",
        items: [
          "On-site vehicle diagnostics",
          "Battery & electrical check",
          "Engine fault identification",
        ],
      },
      {
        title: "Quick Repairs",
        items: [
          "Battery replacement",
          "Spark plug replacement",
          "Belt replacement",
          "Hose leak fixes",
        ],
      },
      {
        title: "Emergency Fixes",
        items: [
          "Overheating assistance",
          "Brake issue temporary fix",
          "Engine won't start troubleshooting",
        ],
      },
      {
        title: "Mobile Fluids",
        items: [
          "Engine oil top-up/change",
          "Coolant refill",
          "Brake fluid top-up",
        ],
      },
      {
        title: "Mobile Tires",
        items: ["Puncture repair", "Tire change"],
      },
    ],
  },
  {
    id: "emergency-tire-services",
    name: "Emergency Tire Services",
    displayGroup: "Emergency Services",
    groups: [
      {
        title: "Emergency Tire Services",
        items: ["General Request", "Puncture Repair"],
      },
    ],
  },
  {
    id: "emergency-battery-services",
    name: "Emergency Battery Services",
    displayGroup: "Emergency Services",
    groups: [
      {
        title: "Emergency Battery Services",
        items: ["General Request", "Battery Jumpstart"],
      },
    ],
  },

  // —— Category 2: Maintenance Services ——
  {
    id: "garage-services",
    name: "Garage Services",
    displayGroup: "Maintenance Services",
    groups: [
      {
        title: "Engine & Mechanical",
        items: [
          "Engine overhaul",
          "Timing belt replacement",
          "Fuel system repair",
          "Exhaust system repair",
        ],
      },
      {
        title: "Transmission",
        items: [
          "Gearbox repair",
          "Clutch replacement",
          "Transmission fluid service",
        ],
      },
      {
        title: "Brake System",
        items: [
          "Brake pad replacement",
          "Disc skimming",
          "Full brake system repair",
        ],
      },
      {
        title: "Suspension & Steering",
        items: [
          "Shock absorber replacement",
          "Steering rack repair",
          "Wheel alignment",
        ],
      },
      {
        title: "Auto Electrical",
        items: [
          "Wiring overhaul",
          "ECU repair",
          "Alternator & starter repair",
        ],
      },
      {
        title: "AC & Cooling",
        items: [
          "AC repair & servicing",
          "Radiator repair",
          "Cooling system flush",
        ],
      },
    ],
  },
  {
    id: "preventive-routine-maintenance",
    name: "Preventive & Routine Maintenance",
    displayGroup: "Maintenance Services",
    groups: [
      {
        title: "Preventive & Routine Maintenance",
        items: [
          "Engine oil top-up/change",
          "General Request",
          "Coolant refill",
          "Brake fluid top-up",
        ],
      },
    ],
  },
  {
    id: "vehicle-diagnostics",
    name: "Vehicle Diagnostics",
    displayGroup: "Maintenance Services",
    groups: [
      {
        title: "Vehicle Diagnostics",
        items: [
          "On-site vehicle diagnostics",
          "General Request",
          "Battery & electrical check",
          "Engine fault identification",
        ],
      },
    ],
  },
  {
    id: "auto-electrical-services",
    name: "Auto Electrical Services",
    displayGroup: "Maintenance Services",
    groups: [
      {
        title: "Auto Electrical Services",
        items: ["Wiring repair", "ECU scanning", "Battery health check"],
      },
    ],
  },
  {
    id: "ac-services",
    name: "AC Services",
    displayGroup: "Maintenance Services",
    groups: [
      {
        title: "AC Services",
        items: ["Refrigerant refill", "Leak detection", "Compressor repair"],
      },
    ],
  },
  {
    id: "tire-wheel-services",
    name: "Tire & Wheel Services",
    displayGroup: "Maintenance Services",
    groups: [
      {
        title: "Tire & Wheel Services",
        items: ["Alignment", "Balancing", "New tire fitting"],
      },
    ],
  },

  // —— Category 3: Upgrades & Value-Added ——
  {
    id: "car-wash-services",
    name: "Car Wash Services",
    displayGroup: "Upgrades & Value-Added",
    groups: [
      {
        title: "Basic",
        items: ["Exterior wash", "Interior vacuum", "Tire cleaning"],
      },
      {
        title: "Standard",
        items: [
          "Exterior + interior cleaning",
          "Dashboard polish",
          "Window cleaning",
        ],
      },
      {
        title: "Premium",
        items: [
          "Full car detailing",
          "Engine cleaning",
          "Underbody wash",
        ],
      },
      {
        title: "Specialized",
        items: [
          "Seat shampoo (fabric)",
          "Leather conditioning",
          "Odor removal",
        ],
      },
      {
        title: "Add-ons",
        items: [
          "Waxing & polishing",
          "Ceramic coating",
          "Headlight restoration",
        ],
      },
    ],
  },
  {
    id: "car-body-cosmetic-services",
    name: "Car Body & Cosmetic Services",
    displayGroup: "Upgrades & Value-Added",
    groups: [
      {
        title: "Car Body & Cosmetic Services",
        items: ["Dent removal", "Respraying", "Buffing"],
      },
    ],
  },
  {
    id: "car-customization-upgrades",
    name: "Car Customization & Upgrades",
    displayGroup: "Upgrades & Value-Added",
    groups: [
      {
        title: "Car Customization & Upgrades",
        items: ["Audio systems", "Tinting", "Performance tuning"],
      },
    ],
  },
];
