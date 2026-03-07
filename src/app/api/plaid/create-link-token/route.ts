import { NextResponse } from "next/server";
import { Products, CountryCode } from "plaid";
import { plaidClient } from "@/lib/plaid";
import { withPremium } from "@/lib/api/with-premium";

export const POST = withPremium(async (_req, { user }) => {
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: user.id },
    client_name: "Credit Card Chris",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
  });

  return NextResponse.json({ link_token: response.data.link_token });
});
