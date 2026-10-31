"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/types";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { claimItem } from "@/app/team/actions";

export type ClaimPrefill = { id: string; label: string; name: string; phone: string; email: string; other: string };

const FIELDS = { claimant_name: "name", claimant_phone: "phone", claimant_email: "email", claimant_contact: "other" } as const;

export function ClaimForm({ itemId, reports }: { itemId: string; reports: ClaimPrefill[] }) {
  const [state, action] = useActionState<ActionState, FormData>(claimItem, undefined);
  const first = reports[0];

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="item_id" value={itemId} />
      {reports.length > 0 && (
        <div>
          <label className="label" htmlFor="lost_report_id">Linked lost report</label>
          <select
            id="lost_report_id"
            name="lost_report_id"
            className="input"
            defaultValue={first?.id}
            onChange={(e) => {
              const r = reports.find((x) => x.id === e.target.value);
              const form = e.currentTarget.form!;
              for (const [field, key] of Object.entries(FIELDS)) {
                (form.elements.namedItem(field) as HTMLInputElement).value = r ? r[key] : "";
              }
            }}
          >
            <option value="">None: walk-in claim</option>
            {reports.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="claimant_name">Collected by</label>
          <input id="claimant_name" name="claimant_name" required maxLength={120} defaultValue={first?.name} className="input" placeholder="Full name" />
        </div>
        <div>
          <label className="label" htmlFor="claimant_phone">Phone</label>
          <input id="claimant_phone" name="claimant_phone" type="tel" maxLength={40} defaultValue={first?.phone} className="input" placeholder="+91 …" />
        </div>
        <div>
          <label className="label" htmlFor="claimant_email">Email</label>
          <input id="claimant_email" name="claimant_email" type="email" maxLength={200} defaultValue={first?.email} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="claimant_contact">Other contact</label>
          <input id="claimant_contact" name="claimant_contact" maxLength={200} defaultValue={first?.other} className="input" placeholder="Telegram, WhatsApp…" />
        </div>
      </div>
      <p className="hint -mt-2">Name plus at least one of phone, email or other contact.</p>
      <div>
        <label className="label" htmlFor="claim_notes">Verification notes</label>
        <textarea id="claim_notes" name="claim_notes" rows={2} maxLength={2000} className="input" placeholder="How they proved ownership, e.g. described lock screen, showed badge #1234" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Handing over…">✓ Mark as claimed</SubmitButton>
    </form>
  );
}
