import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Seeds statement_credits for a user card from card_template_credits.
 * @param willUseNames - set of credit names the user plans to use. If omitted, all credits default to will_use = true.
 * Returns the number of credits inserted (0 if none found).
 */
export async function seedCreditsFromTemplate(
  supabase: SupabaseClient,
  userCardId: string,
  userId: string,
  cardTemplateId: string,
  willUseNames?: Set<string>
): Promise<number> {
  const { data: templateCredits } = await supabase
    .from("card_template_credits")
    .select("name, annual_amount")
    .eq("card_template_id", cardTemplateId);

  if (!templateCredits?.length) return 0;

  const { data: existingCredits } = await supabase
    .from("statement_credits")
    .select("name")
    .eq("user_card_id", userCardId);

  const existingNames = new Set(
    (existingCredits ?? []).map((credit) => credit.name.trim().toLowerCase())
  );

  const missingCredits = templateCredits.filter(
    (credit) => !existingNames.has(credit.name.trim().toLowerCase())
  );

  if (missingCredits.length === 0) return 0;

  await supabase.from("statement_credits").insert(
    missingCredits.map((c) => ({
      user_card_id: userCardId,
      user_id: userId,
      name: c.name,
      annual_amount: c.annual_amount,
      used_amount: 0,
      reset_month: new Date().getMonth() + 1,
      will_use: willUseNames ? willUseNames.has(c.name) : true,
    }))
  );

  return missingCredits.length;
}
