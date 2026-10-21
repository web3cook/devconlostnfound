"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/lib/types";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { addTeamMember } from "@/app/team/actions";

export function AddMemberForm() {
  const [state, action] = useActionState<ActionState, FormData>(addTeamMember, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card space-y-3 p-5">
      <label className="label" htmlFor="email">Add a team member</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id="email" name="email" type="email" required maxLength={200} placeholder="volunteer@gmail.com" className="input sm:flex-1" />
        <SubmitButton pendingText="Adding…">Add</SubmitButton>
      </div>
      <p className="hint">Use the Google account they&apos;ll sign in with.</p>
      <FormMessage state={state} />
    </form>
  );
}
