import { z } from "zod";

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_ID: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  PLAID_CLIENT_ID: z.string().min(1),
  PLAID_SECRET: z.string().min(1),
  PLAID_ENV: z
    .enum(["sandbox", "development", "production"])
    .default("sandbox"),
  PLAID_ENCRYPTION_KEY: z.string().length(64).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  TWILIO_PHONE_NUMBER: z.string().min(1).optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default("https://creditcardchris.com"),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default("https://creditcardchris.com"),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
});

function validateEnv<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  label: string
): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Missing or invalid ${label} environment variables:\n${formatted}\n\nCheck .env.local or Vercel env settings.`
    );
  }
  return result.data;
}

let _serverEnv: z.infer<typeof serverSchema> | null = null;
let _publicEnv: z.infer<typeof publicSchema> | null = null;

export function serverEnv() {
  if (!_serverEnv) _serverEnv = validateEnv(serverSchema, "server");
  return _serverEnv;
}

export function publicEnv() {
  if (!_publicEnv) _publicEnv = validateEnv(publicSchema, "public");
  return _publicEnv;
}
