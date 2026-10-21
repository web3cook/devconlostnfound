import { z } from "zod";
import { CATEGORIES } from "@/lib/config";

const categoryValues = CATEGORIES.map((c) => c.value) as [string, ...string[]];

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

const isoOrNull = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || !Number.isNaN(Date.parse(v)), "Invalid date");

export const lostReportSchema = z
  .object({
    title: z.string().trim().min(2, "Give the item a short name").max(120),
    description: z.string().trim().min(5, "Describe the item so we can recognise it").max(2000),
    category: z.enum(categoryValues),
    color: optional(60),
    lost_location: optional(200),
    lost_at: isoOrNull,
    contact_name: z.string().trim().min(1, "Your name is required").max(120),
    contact_email: optional(200).refine((v) => v === null || z.email().safeParse(v).success, "Invalid email"),
    contact_telegram: optional(100).transform((v) => (v ? v.replace(/^@+/, "") : v)),
    contact_phone: optional(40),
  })
  .refine((d) => d.contact_email || d.contact_telegram || d.contact_phone, {
    message: "Add at least one way to reach you (email, Telegram or phone)",
  });

export const foundItemSchema = z.object({
  title: z.string().trim().min(2, "Give the item a short name").max(120),
  description: optional(2000),
  category: z.enum(categoryValues),
  color: optional(60),
  found_location: optional(200),
  found_at: isoOrNull,
  photo_path: optional(300),
  photo_public: z.string().optional().transform((v) => v === "on" || v === "true"),
  finder_name: optional(120),
  finder_contact: optional(200),
  verification_details: optional(2000),
  internal_notes: optional(2000),
});

export const claimSchema = z.object({
  claimant_name: z.string().trim().min(1, "Name of the person collecting is required").max(120),
  claimant_contact: z.string().trim().min(1, "Contact (Telegram, phone or email) is required").max(200),
  claim_notes: optional(2000),
  lost_report_id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
});

export function formToObject(fd: FormData) {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

export function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Please check the form";
}
