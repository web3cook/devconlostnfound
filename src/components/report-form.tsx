"use client";

import { useActionState, useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/config";
import { isoToLocalInput, localInputToIso } from "@/lib/datetime-client";
import type { ActionState, LostReport } from "@/lib/types";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { saveLostReport } from "@/app/team/actions";

/** Team-only: file a lost report for an attendee at the desk, or edit one. */
export function ReportForm({ report }: { report?: LostReport }) {
  // Convert to the device's zone in the browser; the server may run in UTC.
  const [lostAt, setLostAt] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLostAt(isoToLocalInput(report?.lost_at));
  }, [report?.lost_at]);

  const [state, action] = useActionState(async (prev: ActionState, fd: FormData) => {
    localInputToIso(fd, "lost_at");
    return saveLostReport(prev, fd);
  }, undefined);

  return (
    <form action={action} className="space-y-8">
      {report && <input type="hidden" name="id" value={report.id} />}
      <fieldset className="card space-y-5 p-6">
        <legend className="sr-only">About the item</legend>
        <h2 className="text-lg font-bold">What did they lose?</h2>
        <div>
          <label className="label" htmlFor="title">Item</label>
          <input id="title" name="title" required maxLength={120} defaultValue={report?.title} className="input" placeholder="e.g. AirPods Pro in white case" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select id="category" name="category" className="input" defaultValue={report?.category ?? "other"}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="color">Colour</label>
            <input id="color" name="color" maxLength={60} defaultValue={report?.color ?? ""} className="input" placeholder="e.g. Black with yellow sticker" />
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
            defaultValue={report?.description}
            className="input"
            placeholder="Brand, model, stickers, scratches, what's inside… The more detail, the easier it is to match."
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="lost_location">Where they last had it</label>
            <input id="lost_location" name="lost_location" maxLength={200} defaultValue={report?.lost_location ?? ""} className="input" placeholder="e.g. Main stage, row 5" />
          </div>
          <div>
            <label className="label" htmlFor="lost_at">When (roughly)</label>
            <input id="lost_at" name="lost_at" type="datetime-local" value={lostAt} onChange={(e) => setLostAt(e.target.value)} className="input" />
          </div>
        </div>
      </fieldset>

      <fieldset className="card space-y-5 p-6">
        <h2 className="text-lg font-bold">Attendee&apos;s contact</h2>
        <p className="-mt-3 text-sm text-muted">Name plus at least one way to reach them. Only the team sees this.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="contact_name">Name</label>
            <input id="contact_name" name="contact_name" required maxLength={120} defaultValue={report?.contact_name} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="contact_email">Email</label>
            <input id="contact_email" name="contact_email" type="email" maxLength={200} defaultValue={report?.contact_email ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="contact_telegram">Telegram</label>
            <input id="contact_telegram" name="contact_telegram" maxLength={100} defaultValue={report?.contact_telegram ?? ""} className="input" placeholder="@username" />
          </div>
          <div>
            <label className="label" htmlFor="contact_phone">Phone / WhatsApp</label>
            <input id="contact_phone" name="contact_phone" type="tel" maxLength={40} defaultValue={report?.contact_phone ?? ""} className="input" placeholder="+91 …" />
          </div>
        </div>
      </fieldset>

      <FormMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton pendingText="Saving…">{report ? "Save changes" : "File report"}</SubmitButton>
      </div>
    </form>
  );
}
