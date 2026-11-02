import type { Metadata } from "next";
import { DepositForm } from "@/components/deposit-form";

export const metadata: Metadata = { title: "Check in bags" };

export default function NewDepositPage() {
  return (
    <div className="container-page max-w-3xl py-10">
      <p className="eyebrow">Cloakroom</p>
      <h1 className="mt-1 text-3xl font-extrabold">Check in bags</h1>
      <p className="mt-2 text-sm text-muted">
        Hand the person a token, enter its number here, and photograph the bags and the token. They&apos;ll need the token
        to collect.
      </p>
      <div className="mt-6">
        <DepositForm />
      </div>
    </div>
  );
}
