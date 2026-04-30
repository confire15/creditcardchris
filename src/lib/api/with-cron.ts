import { NextRequest, NextResponse } from "next/server";
import { errorResponse, AuthError } from "@/lib/api/errors";
import { serverEnv } from "@/lib/env";

type CronHandler = (
  req: NextRequest
) => Promise<Response | NextResponse>;

function getCronSecrets() {
  const env = serverEnv();
  return [
    env.CRON_SECRET,
    env.CRON_SECRET_PREVIOUS,
    ...(env.CRON_SECRETS?.split(",") ?? []),
  ]
    .map((secret) => secret?.trim())
    .filter((secret): secret is string => Boolean(secret));
}

export function withCron(handler: CronHandler) {
  return async (req: NextRequest): Promise<Response | NextResponse> => {
    try {
      const auth = req.headers.get("authorization");
      const accepted = getCronSecrets().some((secret) => auth === `Bearer ${secret}`);
      if (!accepted) {
        return errorResponse(new AuthError("Invalid cron secret"));
      }
      return await handler(req);
    } catch (err) {
      return errorResponse(err);
    }
  };
}
