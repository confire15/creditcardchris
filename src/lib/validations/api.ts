import { z } from "zod";

export const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(10000),
      })
    )
    .min(1)
    .max(50),
});

export const recommendAiSchema = z.object({
  query: z.string().min(1).max(500).trim(),
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export const pushSendSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  url: z.string().max(500).optional(),
});

export const plaidExchangeTokenSchema = z.object({
  public_token: z.string().min(1),
  institution: z
    .object({
      name: z.string().optional(),
      institution_id: z.string().optional(),
    })
    .optional(),
});

export const plaidSyncSchema = z.object({
  item_id: z.string().optional(),
});

export const plaidDisconnectSchema = z.object({
  item_id: z.string().min(1),
});
