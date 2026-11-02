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
  public_label: optional(80),
  category: z.enum(categoryValues),
  found_at: isoOrNull,
  title: z.string().trim().min(2, "Give the item a short name").max(120),
  description: optional(2000),
  color: optional(60),
  photo_path: optional(300),
  found_location: optional(200),
  finder_name: optional(120),
  finder_phone: optional(40),
  finder_email: optional(200).refine((v) => v === null || z.email().safeParse(v).success, "Finder email looks invalid"),
  finder_contact: optional(200),
  verification_details: optional(2000),
  internal_notes: optional(2000),
});

export const claimSchema = z
  .object({
    claimant_name: z.string().trim().min(1, "Name of the person collecting is required").max(120),
    claimant_phone: optional(40),
    claimant_email: optional(200).refine((v) => v === null || z.email().safeParse(v).success, "Email looks invalid"),
    claimant_contact: optional(200),
    claim_notes: optional(2000),
    lost_report_id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  })
  .refine((d) => d.claimant_phone || d.claimant_email || d.claimant_contact, {
    message: "Add at least one way to contact them: phone, email or other contact",
  });

const email = (max: number, msg: string) =>
  optional(max).refine((v) => v === null || z.email().safeParse(v).success, msg);
const telegram = optional(100).transform((v) => (v ? v.replace(/^@+/, "") : v));

const photoPaths = z
  .string()
  .optional()
  .transform((v, ctx) => {
    try {
      const arr = JSON.parse(v || "[]");
      if (Array.isArray(arr) && arr.every((p) => typeof p === "string" && p.length <= 300)) return arr as string[];
    } catch {}
    ctx.addIssue({ code: "custom", message: "Invalid photos" });
    return z.NEVER;
  });

export const depositSchema = z
  .object({
    token_no: z.string().trim().min(1, "Enter the token number").max(20).transform((v) => v.toUpperCase()),
    bag_count: z.coerce.number().int().min(1, "At least one bag").max(50),
    bag_description: optional(1000),
    deposited_at: isoOrNull,
    depositor_name: z.string().trim().min(1, "Depositor's name is required").max(120),
    depositor_phone: optional(40),
    depositor_telegram: telegram,
    depositor_email: email(200, "Depositor email looks invalid"),
    notes: optional(2000),
    bag_photo_paths: photoPaths.refine((a) => a.length >= 1, "Take at least one photo of the bags").refine((a) => a.length <= 20, "Up to 20 bag photos"),
    token_photo_path: z.string().trim().min(1, "Take a photo of the token").max(300),
  })
  .refine((d) => d.depositor_phone || d.depositor_telegram || d.depositor_email, {
    message: "Add at least one way to reach the depositor: phone, Telegram or email",
  });

export const collectSchema = z
  .object({
    token_no: z.string().trim().min(1, "Enter the token number the person handed back").max(20),
    collector_name: z.string().trim().min(1, "Name of the person collecting is required").max(120),
    collector_phone: optional(40),
    collector_telegram: telegram,
    collector_email: email(200, "Email looks invalid"),
    collection_notes: optional(2000),
  })
  .refine((d) => d.collector_phone || d.collector_telegram || d.collector_email, {
    message: "Add at least one way to contact them: phone, Telegram or email",
  });

export function formToObject(fd: FormData) {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

export function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Please check the form";
}
