export const concerns = [
  "Heavy rain",
  "Flooding",
  "Power outages",
  "Heat",
  "Water shortages",
] as const;
export type Concern = (typeof concerns)[number];
export const preparationGroups = ["Home", "Car & transportation", "People & pets", "Phone & documents"] as const;
export type PreparationGroup = (typeof preparationGroups)[number];
export type PreparationAction = {
  id: string;
  name: string;
  why: string;
  concerns: string[];
  source: string;
  group: PreparationGroup;
  supplies: string;
  general?: boolean;
  link?: "plan" | "supplies";
};
export const preparationSubtitle = "Practical steps for your home, transportation, and the people you care about.";
export const homeActions: PreparationAction[] = [
  {
    id: "home-alerts",
    group: "Phone & documents",
    supplies: "Phone with emergency alert settings",
    link: "plan",
    general: true,
    name: "Find your official local alerts",
    why: "Save your local weather service and emergency management contacts. Enable emergency alerts on your phone and agree on how your household will receive warnings.",
    concerns: [] as string[],
    source: "https://www.ready.gov/plan",
  },
  {
    id: "home-alarms",
    group: "Home",
    supplies: "Installed alarms; replacement batteries if required",
    general: true,
    name: "Test smoke and carbon monoxide alarms",
    why: "Use the test button on each smoke and carbon monoxide alarm. Replace batteries or the alarm itself according to its instructions, and ask your landlord about missing alarms.",
    concerns: [] as string[],
    source:
      "https://www.usfa.fema.gov/prevention/home-fires/prepare-for-fire/smoke-alarms/index.html",
  },
  {
    id: "home-lights",
    group: "Home",
    supplies: "Flashlights and compatible batteries or charging cables",
    link: "supplies",
    general: true,
    name: "Check your flashlights",
    why: "Test the flashlights you already own, check compatible batteries, and charge rechargeable flashlights. Keep them somewhere everyone can find.",
    concerns: ["Power outages"],
    source: "https://www.ready.gov/power-outages",
  },
  {
    id: "home-gutters",
    group: "Home",
    supplies: "Safe ground-level access; professional help if needed",
    general: true,
    name: "Check gutters and downspouts",
    why: "From the ground, look for leaves, debris, or loose downspouts. Clear only what you can reach safely or arrange help. Make sure downspouts direct rainwater away from your home.",
    concerns: ["Heavy rain", "Flooding"],
    source:
      "https://www.fema.gov/sites/default/files/2020-10/low-cost-projects_protect-home-flood.pdf",
  },
  {
    id: "home-secure-outdoors",
    group: "Home",
    supplies: "Indoor storage space or suitable tie-downs",
    general: true,
    name: "Secure outdoor furniture and loose items",
    why: "Before strong winds, bring in or secure outdoor furniture, planters, toys, and other loose items that could be blown away. Follow local guidance about when to do this.",
    concerns: [] as string[],
    source:
      "https://www.fema.gov/sites/default/files/documents/fema_protect-your-property-storm-surge.pdf",
  },
  {
    id: "home-entry-drains",
    group: "Home",
    supplies: "Gloves and safe access; property manager help if needed",
    general: true,
    name: "Check window wells, lower entries, and exterior drains",
    why: "If your home has a basement or window wells, check for visible debris and make sure drains are clear. Ask your landlord or property manager about shared drainage. Stay out of floodwater and flooded drainage areas.",
    concerns: [] as string[],
    source:
      "https://www.fema.gov/sites/default/files/documents/fema_urban_flooding_guidance_for_homeowners_and_renters.pdf",
  },
  {
    id: "home-inventory",
    group: "Phone & documents",
    supplies: "Camera or phone and a secure place for records",
    link: "plan",
    general: true,
    name: "Make a home inventory and check insurance contacts",
    why: "Photograph or video your belongings and save a basic inventory with insurance contact details somewhere you can reach if you leave home. Review coverage questions with your insurer; don’t enter policy numbers or personal details in this checklist.",
    concerns: [] as string[],
    source:
      "https://www.ready.gov/sites/default/files/2020-03/ready_document-and-insure-your-property.pdf",
  },
  {
    id: "home-contacts",
    group: "People & pets",
    supplies: "Household plan and paper contact cards",
    link: "plan",
    general: true,
    name: "Confirm emergency contacts and meeting places",
    why: "Choose an out-of-area contact and two meeting places. Write down the numbers, share them with your household, and add them to your household plan.",
    concerns: [] as string[],
    source: "https://www.ready.gov/plan",
  },
  {
    id: "home-documents",
    group: "Phone & documents",
    supplies: "Document copies and waterproof storage",
    link: "plan",
    general: true,
    name: "Review and protect essential document copies",
    why: "Review where your copies are stored. Keep copies of essential contacts, identification, and insurance information in a waterproof container. Record where to find them in your plan, rather than entering document numbers here.",
    concerns: ["Heavy rain", "Flooding"],
    source: "https://www.weather.gov/safety/flood-before",
  },
  {
    id: "home-routes",
    group: "Car & transportation",
    supplies: "Local evacuation map and household plan",
    link: "plan",
    name: "Review a route to higher ground",
    why: "Use local emergency guidance to identify evacuation routes and a destination. Discuss transportation before you need it. Never walk or drive through floodwater.",
    concerns: ["Heavy rain", "Flooding"],
    source: "https://www.weather.gov/safety/flood-before",
  },
  {
    id: "home-cooling",
    group: "People & pets",
    supplies: "Confirmed cooling location and transportation",
    link: "plan",
    name: "Choose a place to cool down",
    why: "Arrange an air-conditioned place you can reach if your home becomes too hot or loses power. Confirm hours and transportation with the location before relying on it; plan check-ins with people who need support.",
    concerns: ["Heat"],
    source: "https://www.weather.gov/safety/heat-ww",
  },
  {
    id: "home-water",
    group: "Home",
    supplies: "Stored drinking water and labeled containers",
    link: "supplies",
    name: "Check stored water and local water notices",
    why: "Check container condition and storage dates. Save your water utility’s official notices. Store at least one gallon per person per day for three days; consider two weeks if possible. Pets and some household needs require additional water.",
    concerns: ["Water shortages"],
    source:
      "https://www.cdc.gov/water-emergency/about/how-to-create-and-store-an-emergency-water-supply.html",
  },
  {
    id: "car-pressure",
    name: "Check your car’s tire pressure",
    why: "Low pressure affects handling. Check cold tires (not driven for at least three hours) with a gauge. Use the vehicle manufacturer’s pressure on the door placard or in the owner’s manual, not the tire sidewall.",
    supplies: "Tire pressure gauge and access to an air pump",
    source: "https://www.nhtsa.gov/winter-driving-tips",
    group: "Car & transportation",
    concerns: [],
    general: true
  },
  {
    id: "car-tires",
    name: "Inspect tires for wear or damage",
    why: "Look for worn tread, cracks, cuts, or bulges; have damage checked by a tire professional before travel.",
    supplies: "Safe parked access to tires",
    source: "https://www.nhtsa.gov/winter-driving-tips",
    group: "Car & transportation",
    concerns: [],
    general: true
  },
  {
    id: "car-wipers",
    name: "Check wipers and washer fluid",
    why: "Clear visibility matters in storms. Test wipers, replace worn blades, and fill with washer fluid suitable for local temperatures.",
    supplies: "Suitable washer fluid; replacement blades if worn",
    source: "https://www.nhtsa.gov/winter-driving-tips",
    group: "Car & transportation",
    concerns: [
      "Heavy rain"
    ],
    general: true
  },
  {
    id: "car-lights",
    name: "Check headlights, brake lights, and turn signals",
    why: "Make sure other drivers can see you. Test each light while parked safely; arrange replacement or repair for failures.",
    supplies: "A helper or safe reflective surface; bulbs or service if needed",
    source: "https://www.nhtsa.gov/winter-driving-tips",
    group: "Car & transportation",
    concerns: [],
    general: true
  },
  {
    id: "car-spare",
    name: "Locate your spare tire or repair kit",
    why: "Avoid searching during a breakdown. Locate the spare or repair kit and read the vehicle and kit instructions, including limitations; arrange assistance if unsure.",
    supplies: "Vehicle manual and fitted spare or repair kit",
    source: "https://www.nhtsa.gov/vehicle-safety/tires",
    group: "Car & transportation",
    concerns: [],
    general: true
  },
  {
    id: "car-roadside",
    name: "Save roadside assistance details",
    why: "Keep your provider’s number and membership details accessible offline so you can request help during a breakdown.",
    supplies: "Provider contact details and paper or offline copy",
    source: "https://www.weather.gov/owlie/communicationsplan",
    group: "Car & transportation",
    concerns: [],
    general: true,
    link: "plan"
  },
  {
    id: "car-fuel",
    name: "Review your fuel or EV charging plan",
    why: "Prepare before severe weather: keep fuel near full or your EV charged, and identify stops along planned routes.",
    supplies: "Fuel or charging access and vehicle charging cable if needed",
    source: "https://www.nhtsa.gov/winter-driving-tips",
    group: "Car & transportation",
    concerns: [
      "Power outages"
    ],
    general: true,
    link: "plan"
  },
  {
    id: "car-supplies",
    name: "Review emergency supplies for your car",
    why: "Check your car’s water, food, flashlight, charger, and weather-appropriate supplies. Use Your supplies to track what you own and where it is stored.",
    supplies: "Existing emergency supplies; review gaps in Your supplies",
    source: "https://www.nhtsa.gov/winter-driving-tips",
    group: "Car & transportation",
    concerns: [],
    general: true,
    link: "supplies"
  },
  {
    id: "car-backup",
    name: "Arrange backup transportation",
    why: "If you cannot drive or do not own a car, agree on a ride with someone or contact local emergency management about accessible evacuation transport. Record arrangements in your plan.",
    supplies: "Confirmed ride and offline contact details",
    source: "https://www.ready.gov/evacuation",
    group: "Car & transportation",
    concerns: [],
    general: true,
    link: "plan"
  },
  {
    id: "people-pickup",
    name: "Review school or childcare pickup plans",
    why: "Ask about emergency pickup locations, authorized adults, and how updates are sent. Share the arrangements with caregivers.",
    supplies: "School or childcare emergency procedures",
    source: "https://www.weather.gov/owlie/communicationsplan",
    group: "People & pets",
    concerns: [],
    general: true,
    link: "plan"
  },
  {
    id: "people-checkins",
    name: "Arrange check-ins with people needing help",
    why: "Agree who will check in, how, and what to do if contact fails. Discuss transportation and accessibility needs in advance.",
    supplies: "Agreed contacts and household plan",
    source: "https://www.ready.gov/disability",
    group: "People & pets",
    concerns: [],
    general: true,
    link: "plan"
  },
  {
    id: "people-pets",
    name: "Plan pet transportation",
    why: "Choose who will transport each pet. Locate carriers or leashes and practice using them; confirm your destination accepts pets.",
    supplies: "Suitable carriers or restraints and leashes",
    source: "https://www.redcross.org/get-help/how-to-prepare-for-emergencies/pet-travel-safety.html",
    group: "People & pets",
    concerns: [],
    general: true,
    link: "plan"
  },
  {
    id: "phone-maps",
    name: "Download offline maps",
    why: "Download your area and planned routes in your map app before losing service. Check the download works offline; live closures and traffic may be unavailable. Follow local evacuation instructions.",
    supplies: "Phone, map app, storage space, and internet for download",
    source: "https://support.google.com/maps/answer/6291838",
    group: "Phone & documents",
    concerns: [],
    general: true,
    link: "plan"
  },
  {
    id: "phone-contacts",
    name: "Save essential contacts offline",
    why: "Copy essential numbers from your household plan to your phone and a paper card. Check you can open them without internet so a network outage does not cut off your contact list.",
    supplies: "Phone and paper contact card",
    source: "https://www.weather.gov/owlie/communicationsplan",
    group: "Phone & documents",
    concerns: [],
    general: true,
    link: "plan"
  },
  {
    id: "phone-emergency",
    name: "Check phone emergency contacts",
    why: "Review emergency contacts in your phone’s emergency settings so responders can reach your chosen people. Check lock-screen visibility and share only what you intend.",
    supplies: "Phone and chosen emergency contacts",
    source: "https://support.apple.com/en-us/105072",
    group: "Phone & documents",
    concerns: [],
    general: true
  },
  {
    id: "phone-power",
    name: "Test and charge power banks",
    why: "Charge your power banks and test that they charge your phone with the cables you will carry. Track chargers and their storage in Your supplies.",
    supplies: "Power banks, compatible cables, and power outlet",
    source: "https://www.ready.gov/power-outages",
    group: "Phone & documents",
    concerns: [
      "Power outages"
    ],
    general: true,
    link: "supplies"
  },
];
