import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";
import { errorResponse, AuthError, ForbiddenError, AppError } from "@/lib/api/errors";
import { validateOrigin } from "@/lib/api/csrf";

type PremiumContext = {
  user: User;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

type PremiumHandler = (
  req: NextRequest,
  ctx: PremiumContext
) => Promise<Response | NextResponse>;

export function withPremium(handler: PremiumHandler) {
  return async (req: NextRequest): Promise<Response | NextResponse> => {
    try {
      if (!validateOrigin(req)) {
        return errorResponse(
          new AppError(403, "Invalid origin", "CSRF_ERROR")
        );
      }

      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return errorResponse(new AuthError());

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", user.id)
        .single();

      const isPremium = sub?.plan === "premium" && sub?.status === "active";
      if (!isPremium) return errorResponse(new ForbiddenError());

      return await handler(req, { user, supabase });
    } catch (err) {
      return errorResponse(err);
    }
  };
}
