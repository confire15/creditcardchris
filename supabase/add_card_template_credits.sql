-- ============================================================
-- card_template_credits
-- Pre-defined statement credits per card template.
-- Public read (like card_template_rewards).
-- Update this table in Supabase dashboard to add/edit credits
-- without a code deploy.
-- ============================================================

CREATE TABLE IF NOT EXISTS card_template_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_template_id UUID REFERENCES card_templates(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  annual_amount NUMERIC(10,2) NOT NULL,
  cadence TEXT NOT NULL DEFAULT 'annual',   -- annual | monthly | semi-annual | quarterly
  category TEXT NOT NULL DEFAULT 'other',   -- dining | travel | transit | shopping | subscription | lifestyle | business | other
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE card_template_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read card_template_credits"
  ON card_template_credits FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_card_template_credits_template_id
  ON card_template_credits(card_template_id);

-- ============================================================
-- American Express
-- ============================================================

-- Amex Gold Card
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Dining Credit ($10/mo)', 120, 'monthly', 'dining' FROM card_templates WHERE name = 'Amex Gold Card';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Uber Cash ($10/mo)', 120, 'monthly', 'transit' FROM card_templates WHERE name = 'Amex Gold Card';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Resy Credit ($50 semi-annual)', 100, 'semi-annual', 'dining' FROM card_templates WHERE name = 'Amex Gold Card';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Dunkin'' Credit ($7/mo)', 84, 'monthly', 'dining' FROM card_templates WHERE name = 'Amex Gold Card';

-- Amex Platinum Card
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Airline Fee Credit', 200, 'annual', 'travel' FROM card_templates WHERE name = 'Amex Platinum Card';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Fine Hotels + Resorts Credit (FHR)', 200, 'annual', 'travel' FROM card_templates WHERE name = 'Amex Platinum Card';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Digital Entertainment Credit ($20/mo)', 240, 'monthly', 'subscription' FROM card_templates WHERE name = 'Amex Platinum Card';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Uber Cash ($15/mo + $20 Dec)', 200, 'monthly', 'transit' FROM card_templates WHERE name = 'Amex Platinum Card';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Walmart+ Membership', 155, 'annual', 'subscription' FROM card_templates WHERE name = 'Amex Platinum Card';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'CLEAR Plus Credit', 189, 'annual', 'lifestyle' FROM card_templates WHERE name = 'Amex Platinum Card';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Saks Fifth Avenue Credit ($50 semi-annual)', 100, 'semi-annual', 'shopping' FROM card_templates WHERE name = 'Amex Platinum Card';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Equinox Credit ($25/mo)', 300, 'monthly', 'lifestyle' FROM card_templates WHERE name = 'Amex Platinum Card';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Global Entry / TSA PreCheck Credit', 100, 'annual', 'travel' FROM card_templates WHERE name = 'Amex Platinum Card';

-- Amex Green Card
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'CLEAR Plus Credit', 189, 'annual', 'lifestyle' FROM card_templates WHERE name = 'Amex Green Card';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Travel Credit', 100, 'annual', 'travel' FROM card_templates WHERE name = 'Amex Green Card';

-- Amex Business Gold
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Annual Business Credit', 240, 'annual', 'business' FROM card_templates WHERE name = 'Amex Business Gold';

-- Amex Business Platinum
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Dell Technologies Credit ($200 semi-annual)', 400, 'semi-annual', 'business' FROM card_templates WHERE name = 'Amex Business Platinum';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Airline Fee Credit', 200, 'annual', 'travel' FROM card_templates WHERE name = 'Amex Business Platinum';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'CLEAR Plus Credit', 189, 'annual', 'lifestyle' FROM card_templates WHERE name = 'Amex Business Platinum';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Adobe Creative Solutions Credit', 150, 'annual', 'business' FROM card_templates WHERE name = 'Amex Business Platinum';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Wireless Telephone Plan Credit ($10/mo)', 120, 'monthly', 'business' FROM card_templates WHERE name = 'Amex Business Platinum';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Global Entry / TSA PreCheck Credit', 100, 'annual', 'travel' FROM card_templates WHERE name = 'Amex Business Platinum';

-- Amex Hilton Honors Aspire
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Hilton Resort Credit ($250 semi-annual)', 500, 'semi-annual', 'travel' FROM card_templates WHERE name = 'Amex Hilton Honors Aspire';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Airline Fee Credit', 250, 'annual', 'travel' FROM card_templates WHERE name = 'Amex Hilton Honors Aspire';

-- Amex Hilton Honors Business
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Hilton Credit', 60, 'annual', 'travel' FROM card_templates WHERE name = 'Amex Hilton Honors Business';

-- Amex Marriott Bonvoy Brilliant
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Restaurant Credit ($25/mo)', 300, 'monthly', 'dining' FROM card_templates WHERE name = 'Amex Marriott Bonvoy Brilliant';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Global Entry / TSA PreCheck Credit', 100, 'annual', 'travel' FROM card_templates WHERE name = 'Amex Marriott Bonvoy Brilliant';

-- Amex Delta SkyMiles Reserve
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Delta Stays Credit', 200, 'annual', 'travel' FROM card_templates WHERE name = 'Amex Delta SkyMiles Reserve';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Resy Credit ($10/mo)', 120, 'monthly', 'dining' FROM card_templates WHERE name = 'Amex Delta SkyMiles Reserve';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Global Entry / TSA PreCheck Credit', 100, 'annual', 'travel' FROM card_templates WHERE name = 'Amex Delta SkyMiles Reserve';

-- Amex Delta SkyMiles Platinum
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Delta Stays Credit', 150, 'annual', 'travel' FROM card_templates WHERE name = 'Amex Delta SkyMiles Platinum';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Resy Credit ($10/mo)', 120, 'monthly', 'dining' FROM card_templates WHERE name = 'Amex Delta SkyMiles Platinum';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Global Entry / TSA PreCheck Credit', 100, 'annual', 'travel' FROM card_templates WHERE name = 'Amex Delta SkyMiles Platinum';

-- Amex Delta SkyMiles Business Reserve
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Delta Stays Credit', 200, 'annual', 'travel' FROM card_templates WHERE name = 'Amex Delta SkyMiles Business Reserve';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Resy Credit ($10/mo)', 120, 'monthly', 'dining' FROM card_templates WHERE name = 'Amex Delta SkyMiles Business Reserve';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Global Entry / TSA PreCheck Credit', 100, 'annual', 'travel' FROM card_templates WHERE name = 'Amex Delta SkyMiles Business Reserve';

-- Amex Blue Cash Preferred
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Equinox Credit', 120, 'annual', 'lifestyle' FROM card_templates WHERE name = 'Amex Blue Cash Preferred';

-- ============================================================
-- Chase
-- ============================================================

-- Chase Sapphire Reserve
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Travel Credit', 300, 'annual', 'travel' FROM card_templates WHERE name = 'Chase Sapphire Reserve';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Global Entry / TSA PreCheck Credit', 100, 'annual', 'travel' FROM card_templates WHERE name = 'Chase Sapphire Reserve';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Lyft Pink All Access Credit', 60, 'annual', 'transit' FROM card_templates WHERE name = 'Chase Sapphire Reserve';

-- Chase Sapphire Preferred
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Hotel Credit', 50, 'annual', 'travel' FROM card_templates WHERE name = 'Chase Sapphire Preferred';

-- Chase United Club Infinite
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'United Club Membership', 700, 'annual', 'travel' FROM card_templates WHERE name = 'Chase United Club Infinite';

-- Chase United Explorer
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'United TravelBank Cash', 100, 'annual', 'travel' FROM card_templates WHERE name = 'Chase United Explorer';

-- Chase IHG One Rewards Premier
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'IHG Annual Night Award ($200 value)', 200, 'annual', 'travel' FROM card_templates WHERE name = 'Chase IHG One Rewards Premier';

-- Chase World of Hyatt
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Hyatt Annual Category 1-4 Night ($100 value)', 100, 'annual', 'travel' FROM card_templates WHERE name = 'Chase World of Hyatt';

-- Chase Marriott Bonvoy Boundless
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Marriott Annual Night Award ($150 value)', 150, 'annual', 'travel' FROM card_templates WHERE name = 'Chase Marriott Bonvoy Boundless';

-- ============================================================
-- Capital One
-- ============================================================

-- Capital One Venture X
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Travel Credit (Portal)', 300, 'annual', 'travel' FROM card_templates WHERE name = 'Capital One Venture X';
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Anniversary Miles Bonus ($100 value)', 100, 'annual', 'travel' FROM card_templates WHERE name = 'Capital One Venture X';

-- ============================================================
-- Wells Fargo
-- ============================================================

-- Wells Fargo Autograph Journey
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Airline Credit', 50, 'annual', 'travel' FROM card_templates WHERE name = 'Wells Fargo Autograph Journey';

-- ============================================================
-- US Bank
-- ============================================================

-- US Bank Altitude Reserve
INSERT INTO card_template_credits (card_template_id, name, annual_amount, cadence, category)
SELECT id, 'Travel & Mobile Wallet Credit ($325)', 325, 'annual', 'travel' FROM card_templates WHERE name = 'US Bank Altitude Reserve';
