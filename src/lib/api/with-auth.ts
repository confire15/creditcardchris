import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";
import { errorResponse, AuthError, AppError } from "@/lib/api/errors";
import { validateOrigin } from "@/lib/api/csrf";

type AuthContext = {
  user: User;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

type AuthHandler = (
  req: NextRequest,
  ctx: AuthContext
) => Promise<Response | NextResponse>;

export function withAuth(handler: AuthHandler) {
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

      return await handler(req, { user, supabase });
    } catch (err) {
      return errorResponse(err);
    }
  };
}
