export const concerns = [
  "Heavy rain",
  "Flooding",
  "Power outages",
  "Heat",
  "Water shortages",
] as const;
export type Concern = (typeof concerns)[number];
export const homeActions = [
  {
    id: "home-alerts",
    name: "Find your official local alerts",
    why: "Save your local weather service and emergency management contacts. Enable emergency alerts on your phone and agree on how your household will receive warnings.",
    concerns: [] as string[],
    source: "https://www.ready.gov/plan",
  },
  {
    id: "home-alarms",
    name: "Test smoke and carbon monoxide alarms",
    why: "Use the test button on each smoke and carbon monoxide alarm. Replace batteries or the alarm itself according to its instructions, and ask your landlord about missing alarms.",
    concerns: [] as string[],
    source:
      "https://www.usfa.fema.gov/prevention/home-fires/prepare-for-fire/smoke-alarms/index.html",
  },
  {
    id: "home-lights",
    name: "Check your flashlights and charge devices",
    why: "Test the flashlights you already own, check compatible batteries, and charge phones and power banks. Keep them somewhere everyone can find.",
    concerns: ["Power outages"],
    source: "https://www.ready.gov/power-outages",
  },
  {
    id: "home-gutters",
    name: "Check gutters and downspouts",
    why: "From the ground, look for leaves, debris, or loose downspouts. Clear only what you can reach safely or arrange help. Make sure downspouts direct rainwater away from your home.",
    concerns: ["Heavy rain", "Flooding"],
    source:
      "https://www.fema.gov/sites/default/files/2020-10/low-cost-projects_protect-home-flood.pdf",
  },
  {
    id: "home-secure-outdoors",
    name: "Secure outdoor furniture and loose items",
    why: "Before strong winds, bring in or secure outdoor furniture, planters, toys, and other loose items that could be blown away. Follow local guidance about when to do this.",
    concerns: [] as string[],
    source:
      "https://www.fema.gov/sites/default/files/documents/fema_protect-your-property-storm-surge.pdf",
  },
  {
    id: "home-entry-drains",
    name: "Check window wells, lower entries, and exterior drains",
    why: "If your home has a basement or window wells, check for visible debris and make sure drains are clear. Ask your landlord or property manager about shared drainage. Stay out of floodwater and flooded drainage areas.",
    concerns: [] as string[],
    source:
      "https://www.fema.gov/sites/default/files/documents/fema_urban_flooding_guidance_for_homeowners_and_renters.pdf",
  },
  {
    id: "home-inventory",
    name: "Make a home inventory and check insurance contacts",
    why: "Photograph or video your belongings and save a basic inventory with insurance contact details somewhere you can reach if you leave home. Review coverage questions with your insurer; don’t enter policy numbers or personal details in this checklist.",
    concerns: [] as string[],
    source:
      "https://www.ready.gov/sites/default/files/2020-03/ready_document-and-insure-your-property.pdf",
  },
  {
    id: "home-contacts",
    name: "Agree on a contact and meeting place",
    why: "Choose an out-of-area contact and two meeting places. Write down the numbers, share them with your household, and add them to your household plan.",
    concerns: [] as string[],
    source: "https://www.ready.gov/plan",
  },
  {
    id: "home-documents",
    name: "Protect copies of important documents",
    why: "Keep copies of essential contacts, identification, and insurance information in a waterproof container. Record where to find them in your plan, rather than entering document numbers here.",
    concerns: ["Heavy rain", "Flooding"],
    source: "https://www.weather.gov/safety/flood-before",
  },
  {
    id: "home-routes",
    name: "Review a route to higher ground",
    why: "Use local emergency guidance to identify evacuation routes and a destination. Discuss transportation before you need it. Never walk or drive through floodwater.",
    concerns: ["Heavy rain", "Flooding"],
    source: "https://www.weather.gov/safety/flood-before",
  },
  {
    id: "home-cooling",
    name: "Choose a place to cool down",
    why: "Arrange an air-conditioned place you can reach if your home becomes too hot or loses power. Confirm hours and transportation with the location before relying on it; plan check-ins with people who need support.",
    concerns: ["Heat"],
    source: "https://www.weather.gov/safety/heat-ww",
  },
  {
    id: "home-water",
    name: "Check stored water and local water notices",
    why: "Check container condition and storage dates. Save your water utility’s official notices. Store at least one gallon per person per day for three days; consider two weeks if possible. Pets and some household needs require additional water.",
    concerns: ["Water shortages"],
    source:
      "https://www.cdc.gov/water-emergency/about/how-to-create-and-store-an-emergency-water-supply.html",
  },
];
