const REDACTED = "[redacted]";
const SENSITIVE_KEY_PATTERN =
  /token|secret|password|authorization|cookie|key|signature|endpoint|p256dh|auth|phone|email/i;

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (depth > 3) return "[truncated]";

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }

  if (typeof value === "string") {
    if (value.length > 160) return `${value.slice(0, 160)}...`;
    return value;
  }

  if (typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.slice(0, 10).map((item) => sanitizeValue(item, depth + 1));
  }

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    output[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? REDACTED
      : sanitizeValue(nested, depth + 1);
  }
  return output;
}

export function logSecurityEvent(message: string, details?: unknown) {
  if (details === undefined) {
    console.error(message);
    return;
  }

  console.error(message, sanitizeValue(details));
}

export function auditSafeMeta(meta: Record<string, unknown>) {
  return sanitizeValue(meta) as Record<string, unknown>;
}
