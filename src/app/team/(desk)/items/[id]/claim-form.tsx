"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/types";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { claimItem } from "@/app/team/actions";

export function ClaimForm({
  itemId,
  reports,
}: {
  itemId: string;
  reports: { id: string; label: string; name: string; contact: string }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(claimItem, undefined);

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
            defaultValue={reports[0]?.id}
            onChange={(e) => {
              const r = reports.find((x) => x.id === e.target.value);
              const form = e.currentTarget.form!;
              if (r) {
                (form.elements.namedItem("claimant_name") as HTMLInputElement).value = r.name;
                (form.elements.namedItem("claimant_contact") as HTMLInputElement).value = r.contact;
              }
            }}
          >
            <option value="">None — walk-in claim</option>
            {reports.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="claimant_name">Collected by</label>
          <input id="claimant_name" name="claimant_name" required maxLength={120} defaultValue={reports[0]?.name} className="input" placeholder="Full name" />
        </div>
        <div>
          <label className="label" htmlFor="claimant_contact">Contact</label>
          <input id="claimant_contact" name="claimant_contact" required maxLength={200} defaultValue={reports[0]?.contact} className="input" placeholder="@telegram / phone / email" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="claim_notes">Verification notes</label>
        <textarea id="claim_notes" name="claim_notes" rows={2} maxLength={2000} className="input" placeholder="How they proved ownership, e.g. described lock screen, showed badge #1234" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Handing over…">✓ Mark as claimed</SubmitButton>
    </form>
  );
}
