"use client";

import { useActionState, useRef } from "react";
import type { ActionState, CloakDeposit } from "@/lib/types";
import { collectDeposit } from "@/app/team/cloakroom-actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";

export function CollectForm({ deposit }: { deposit: CloakDeposit }) {
  const [state, action] = useActionState<ActionState, FormData>(collectDeposit, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  function sameAsDepositor() {
    const f = formRef.current!;
    const set = (name: string, v: string | null) => ((f.elements.namedItem(name) as HTMLInputElement).value = v ?? "");
    set("collector_name", deposit.depositor_name);
    set("collector_phone", deposit.depositor_phone);
    set("collector_telegram", deposit.depositor_telegram);
    set("collector_email", deposit.depositor_email);
  }

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <input type="hidden" name="id" value={deposit.id} />
      <div>
        <label className="label" htmlFor="token_no">Token number they handed back</label>
        <input id="token_no" name="token_no" required maxLength={20} autoCapitalize="characters" autoComplete="off" className="input font-mono text-lg uppercase sm:w-48" />
        <p className="hint">Must match the token on this deposit. Whoever holds the token can collect.</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">Person collecting</p>
        <button type="button" onClick={sameAsDepositor} className="btn-ghost btn-sm">Same as depositor</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="collector_name">Name</label>
          <input id="collector_name" name="collector_name" required maxLength={120} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="collector_phone">Phone / WhatsApp</label>
          <input id="collector_phone" name="collector_phone" type="tel" maxLength={40} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="collector_telegram">Telegram</label>
          <input id="collector_telegram" name="collector_telegram" maxLength={100} className="input" placeholder="@username" />
        </div>
        <div>
          <label className="label" htmlFor="collector_email">Email</label>
          <input id="collector_email" name="collector_email" type="email" maxLength={200} className="input" />
        </div>
      </div>
      <p className="hint -mt-2">Name plus at least one of phone, Telegram or email.</p>
      <div>
        <label className="label" htmlFor="collection_notes">Notes</label>
        <textarea id="collection_notes" name="collection_notes" rows={2} maxLength={2000} className="input" placeholder="e.g. Collected by a friend of the depositor" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">✓ Mark as collected</SubmitButton>
    </form>
  );
}
