import { NextRequest, NextResponse } from "next/server";
import { withPremium } from "@/lib/api/with-premium";

export const PATCH = withPremium(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json().catch(() => null);
  const cardId = typeof body?.cardId === "string" ? body.cardId : "";
  const customCppRaw = body?.customCpp;
  const cppRedemptionModeRaw = body?.cppRedemptionMode;

  if (!cardId) {
    return NextResponse.json({ error: "Missing cardId" }, { status: 400 });
  }

  const customCpp =
    customCppRaw == null || customCppRaw === ""
      ? null
      : typeof customCppRaw === "number"
      ? customCppRaw
      : Number(customCppRaw);
  if (customCpp != null && (!Number.isFinite(customCpp) || customCpp < 0.5 || customCpp > 5.0)) {
    return NextResponse.json({ error: "CPP must be between 0.5 and 5.0" }, { status: 400 });
  }

  const cppRedemptionMode =
    typeof cppRedemptionModeRaw === "string" && cppRedemptionModeRaw.trim().length > 0
      ? cppRedemptionModeRaw.trim().slice(0, 80)
      : null;

  const { data, error } = await supabase
    .from("user_cards")
    .update({
      custom_cpp: customCpp,
      cpp_redemption_mode: cppRedemptionMode,
    })
    .eq("id", cardId)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
});
