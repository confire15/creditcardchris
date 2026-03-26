// Maps card template name → default statement credits to auto-create
export const TEMPLATE_CREDITS: Record<string, Array<{ name: string; annual_amount: number }>> = {
  // American Express
  "American Express® Gold Card": [
    { name: "Dining Credit ($10/mo)", annual_amount: 120 },
    { name: "Uber Cash ($10/mo)", annual_amount: 120 },
  ],
  "The Platinum Card® from American Express": [
    { name: "Airline Fee Credit", annual_amount: 200 },
    { name: "Prepaid Hotel Credit (FHR)", annual_amount: 200 },
    { name: "Digital Entertainment Credit ($20/mo)", annual_amount: 240 },
    { name: "Uber Cash ($15/mo + $20 Dec)", annual_amount: 200 },
    { name: "Walmart+ Membership", annual_amount: 155 },
    { name: "CLEAR Plus Credit", annual_amount: 189 },
    { name: "Saks Fifth Avenue Credit ($50 semi-annual)", annual_amount: 100 },
  ],
  "American Express® Green Card": [
    { name: "CLEAR Plus Credit", annual_amount: 189 },
    { name: "LoungeBuddy Credit", annual_amount: 100 },
  ],
  "American Express® Business Gold Card": [
    { name: "Annual Business Credit", annual_amount: 240 },
  ],
  "The Business Platinum Card® from American Express": [
    { name: "Dell Technologies Credit ($200 semi-annual)", annual_amount: 400 },
    { name: "Airline Fee Credit", annual_amount: 200 },
    { name: "CLEAR Plus Credit", annual_amount: 189 },
    { name: "Adobe Creative Solutions Credit", annual_amount: 150 },
  ],
  "Hilton Honors American Express Aspire Card": [
    { name: "Hilton Resort Credit ($250 semi-annual)", annual_amount: 500 },
    { name: "Airline Fee Credit", annual_amount: 250 },
    { name: "Hilton Resort Credit ($100)", annual_amount: 100 },
  ],
  "Hilton Honors American Express Business Card": [
    { name: "Hilton Credit", annual_amount: 60 },
  ],
  "Marriott Bonvoy Brilliant® American Express® Card": [
    { name: "Restaurant Credit ($25/mo)", annual_amount: 300 },
  ],
  "Delta SkyMiles® Reserve American Express Card": [
    { name: "Delta Stays Credit", annual_amount: 200 },
    { name: "Resy Credit", annual_amount: 120 },
  ],
  "Delta SkyMiles® Platinum American Express Card": [
    { name: "Delta Stays Credit", annual_amount: 150 },
    { name: "Resy Credit", annual_amount: 120 },
  ],
  // Chase
  "Chase Sapphire Reserve®": [
    { name: "Travel Credit", annual_amount: 300 },
  ],
  "Chase Sapphire Preferred® Card": [
    { name: "Hotel Credit", annual_amount: 50 },
  ],
  "United Club℠ Infinite Card": [
    { name: "United Club Membership", annual_amount: 700 },
  ],
  "United℠ Explorer Card": [
    { name: "United TravelBank Cash", annual_amount: 100 },
  ],
  "IHG One Rewards Premier Credit Card": [
    { name: "IHG Annual Night Award ($200 value)", annual_amount: 200 },
  ],
  "World of Hyatt Credit Card": [
    { name: "Hyatt Annual Category 1-4 Night ($100 value)", annual_amount: 100 },
  ],
  // Capital One
  "Capital One Venture X Rewards Credit Card": [
    { name: "Travel Credit (Portal)", annual_amount: 300 },
    { name: "Anniversary Miles Bonus ($100 value)", annual_amount: 100 },
  ],
  // Citi
  "Citi Prestige® Card": [
    { name: "Travel Credit", annual_amount: 250 },
  ],
  "Citi® / AAdvantage® Executive World Elite Mastercard®": [
    { name: "Admirals Club Membership", annual_amount: 850 },
  ],
  // Wells Fargo
  "Wells Fargo Autograph Journey℠ Card": [
    { name: "Airline Credit", annual_amount: 50 },
  ],
  // Bank of America
  "Bank of America® Premium Rewards® Elite Credit Card": [
    { name: "Airline Incidentals Credit", annual_amount: 150 },
    { name: "Lifestyle Credit", annual_amount: 150 },
  ],
};
