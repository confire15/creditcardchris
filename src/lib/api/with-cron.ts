import { NextRequest, NextResponse } from "next/server";
import { errorResponse, AuthError } from "@/lib/api/errors";
import { serverEnv } from "@/lib/env";

type CronHandler = (
  req: NextRequest
) => Promise<Response | NextResponse>;

export function withCron(handler: CronHandler) {
  return async (req: NextRequest): Promise<Response | NextResponse> => {
    try {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${serverEnv().CRON_SECRET}`) {
        return errorResponse(new AuthError("Invalid cron secret"));
      }
      return await handler(req);
    } catch (err) {
      return errorResponse(err);
    }
  };
}
