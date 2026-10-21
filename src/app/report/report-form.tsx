"use client";

import { useActionState } from "react";
import { CATEGORIES } from "@/lib/config";
import { localInputToIso } from "@/lib/datetime-client";
import type { ActionState } from "@/lib/types";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { createLostReport } from "./actions";

export function ReportForm({ defaultName, defaultEmail }: { defaultName: string; defaultEmail: string }) {
  const [state, action] = useActionState(async (prev: ActionState, fd: FormData) => {
    localInputToIso(fd, "lost_at");
    return createLostReport(prev, fd);
  }, undefined);

  return (
    <form action={action} className="space-y-8">
      <fieldset className="card space-y-5 p-6">
        <legend className="sr-only">About the item</legend>
        <h2 className="text-lg font-bold">What did you lose?</h2>
        <div>
          <label className="label" htmlFor="title">Item</label>
          <input id="title" name="title" required maxLength={120} className="input" placeholder="e.g. AirPods Pro in white case" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select id="category" name="category" className="input" defaultValue="other">
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="color">Colour</label>
            <input id="color" name="color" maxLength={60} className="input" placeholder="e.g. Black with yellow sticker" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            required
            rows={4}
            maxLength={2000}
            className="input"
            placeholder="Brand, model, stickers, scratches, what's inside… The more detail, the easier it is to match."
          />
          <p className="hint">This is only visible to you and the Info Desk team.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="lost_location">Where did you last have it?</label>
            <input id="lost_location" name="lost_location" maxLength={200} className="input" placeholder="e.g. Main stage, row 5" />
          </div>
          <div>
            <label className="label" htmlFor="lost_at">When (roughly)?</label>
            <input id="lost_at" name="lost_at" type="datetime-local" className="input" />
          </div>
        </div>
      </fieldset>

      <fieldset className="card space-y-5 p-6">
        <h2 className="text-lg font-bold">How can we reach you?</h2>
        <p className="-mt-3 text-sm text-muted">At least one way to contact you. Only the Info Desk team sees this.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="contact_name">Your name</label>
            <input id="contact_name" name="contact_name" required maxLength={120} defaultValue={defaultName} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="contact_email">Email</label>
            <input id="contact_email" name="contact_email" type="email" maxLength={200} defaultValue={defaultEmail} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="contact_telegram">Telegram</label>
            <input id="contact_telegram" name="contact_telegram" maxLength={100} className="input" placeholder="@username" />
          </div>
          <div>
            <label className="label" htmlFor="contact_phone">Phone / WhatsApp</label>
            <input id="contact_phone" name="contact_phone" type="tel" maxLength={40} className="input" placeholder="+91 …" />
          </div>
        </div>
      </fieldset>

      <FormMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton pendingText="Submitting…">Submit report</SubmitButton>
      </div>
    </form>
  );
}
