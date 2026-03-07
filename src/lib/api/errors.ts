import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly userMessage: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(userMessage);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class AuthError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message, "AUTH_ERROR");
    this.name = "AuthError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Premium subscription required") {
    super(403, message, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests. Please try again later.") {
    super(429, message, "RATE_LIMIT");
    this.name = "RateLimitError";
  }
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof AppError) {
    console.error(
      `[${err.name}] ${err.statusCode}: ${err.userMessage}`,
      err.details ?? ""
    );
    return NextResponse.json(
      { error: err.userMessage, code: err.code },
      { status: err.statusCode }
    );
  }

  if (err instanceof ZodError) {
    const message = err.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    console.error("[ValidationError]", message);
    return NextResponse.json(
      { error: "Invalid request data", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  console.error("[UnhandledError]", err);
  return NextResponse.json(
    { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
