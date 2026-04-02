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

  await supabase.from("statement_credits").insert(
    templateCredits.map((c) => ({
      user_card_id: userCardId,
      user_id: userId,
      name: c.name,
      annual_amount: c.annual_amount,
      used_amount: 0,
      reset_month: new Date().getMonth() + 1,
      will_use: willUseNames ? willUseNames.has(c.name) : true,
    }))
  );

  return templateCredits.length;
}
