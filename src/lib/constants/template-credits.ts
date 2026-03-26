// Maps card template name → default statement credits to auto-create
// Names must exactly match card_templates.name in the database
export const TEMPLATE_CREDITS: Record<string, Array<{ name: string; annual_amount: number }>> = {
  // American Express
  "Amex Gold Card": [
    { name: "Dining Credit ($10/mo)", annual_amount: 120 },
    { name: "Uber Cash ($10/mo)", annual_amount: 120 },
    { name: "Resy Credit ($50 semi-annual)", annual_amount: 100 },
    { name: "Dunkin' Credit ($7/mo)", annual_amount: 84 },
  ],
  "Amex Platinum Card": [
    { name: "Airline Fee Credit", annual_amount: 200 },
    { name: "Fine Hotels + Resorts Credit (FHR)", annual_amount: 200 },
    { name: "Digital Entertainment Credit ($20/mo)", annual_amount: 240 },
    { name: "Uber Cash ($15/mo + $20 Dec)", annual_amount: 200 },
    { name: "Walmart+ Membership", annual_amount: 155 },
    { name: "CLEAR Plus Credit", annual_amount: 189 },
    { name: "Saks Fifth Avenue Credit ($50 semi-annual)", annual_amount: 100 },
    { name: "Equinox Credit ($25/mo)", annual_amount: 300 },
    { name: "Global Entry / TSA PreCheck Credit", annual_amount: 100 },
  ],
  "Amex Green Card": [
    { name: "CLEAR Plus Credit", annual_amount: 189 },
    { name: "Travel Credit", annual_amount: 100 },
  ],
  "Amex Business Gold": [
    { name: "Annual Business Credit", annual_amount: 240 },
  ],
  "Amex Business Platinum": [
    { name: "Dell Technologies Credit ($200 semi-annual)", annual_amount: 400 },
    { name: "Airline Fee Credit", annual_amount: 200 },
    { name: "CLEAR Plus Credit", annual_amount: 189 },
    { name: "Adobe Creative Solutions Credit", annual_amount: 150 },
    { name: "Wireless Telephone Plan Credit ($10/mo)", annual_amount: 120 },
    { name: "Global Entry / TSA PreCheck Credit", annual_amount: 100 },
  ],
  "Amex Hilton Honors Aspire": [
    { name: "Hilton Resort Credit ($250 semi-annual)", annual_amount: 500 },
    { name: "Airline Fee Credit", annual_amount: 250 },
  ],
  "Amex Hilton Honors Business": [
    { name: "Hilton Credit", annual_amount: 60 },
  ],
  "Amex Marriott Bonvoy Brilliant": [
    { name: "Restaurant Credit ($25/mo)", annual_amount: 300 },
    { name: "Global Entry / TSA PreCheck Credit", annual_amount: 100 },
  ],
  "Amex Delta SkyMiles Reserve": [
    { name: "Delta Stays Credit", annual_amount: 200 },
    { name: "Resy Credit ($10/mo)", annual_amount: 120 },
    { name: "Global Entry / TSA PreCheck Credit", annual_amount: 100 },
  ],
  "Amex Delta SkyMiles Platinum": [
    { name: "Delta Stays Credit", annual_amount: 150 },
    { name: "Resy Credit ($10/mo)", annual_amount: 120 },
    { name: "Global Entry / TSA PreCheck Credit", annual_amount: 100 },
  ],
  "Amex Delta SkyMiles Business Reserve": [
    { name: "Delta Stays Credit", annual_amount: 200 },
    { name: "Resy Credit ($10/mo)", annual_amount: 120 },
    { name: "Global Entry / TSA PreCheck Credit", annual_amount: 100 },
  ],
  "Amex Blue Cash Preferred": [
    { name: "Equinox Credit", annual_amount: 120 },
  ],
  // Chase
  "Chase Sapphire Reserve": [
    { name: "Travel Credit", annual_amount: 300 },
    { name: "Global Entry / TSA PreCheck Credit", annual_amount: 100 },
    { name: "Lyft Pink All Access Credit", annual_amount: 60 },
  ],
  "Chase Sapphire Preferred": [
    { name: "Hotel Credit", annual_amount: 50 },
  ],
  "Chase United Club Infinite": [
    { name: "United Club Membership", annual_amount: 700 },
  ],
  "Chase United Explorer": [
    { name: "United TravelBank Cash", annual_amount: 100 },
  ],
  "Chase IHG One Rewards Premier": [
    { name: "IHG Annual Night Award ($200 value)", annual_amount: 200 },
  ],
  "Chase World of Hyatt": [
    { name: "Hyatt Annual Category 1-4 Night ($100 value)", annual_amount: 100 },
  ],
  "Chase Marriott Bonvoy Boundless": [
    { name: "Marriott Annual Night Award ($150 value)", annual_amount: 150 },
  ],
  // Capital One
  "Capital One Venture X": [
    { name: "Travel Credit (Portal)", annual_amount: 300 },
    { name: "Anniversary Miles Bonus ($100 value)", annual_amount: 100 },
  ],
  // Wells Fargo
  "Wells Fargo Autograph Journey": [
    { name: "Airline Credit", annual_amount: 50 },
  ],
  // US Bank
  "US Bank Altitude Reserve": [
    { name: "Travel & Mobile Wallet Credit ($325)", annual_amount: 325 },
  ],
};
