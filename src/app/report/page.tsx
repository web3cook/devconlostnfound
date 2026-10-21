import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { ReportForm } from "./report-form";

export const metadata: Metadata = { title: "Report a lost item" };

export default async function ReportPage() {
  const viewer = await requireViewer("/report");
  return (
    <div className="container-page max-w-3xl py-12">
      <p className="eyebrow">Report a lost item</p>
      <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Let&apos;s find it</h1>
      <p className="mt-2">
        First, check the <Link href="/items" className="font-semibold text-brand hover:underline">found items</Link> —
        it may already be at the Info Desk. If not, tell us about it and we&apos;ll get in touch if it turns up.
      </p>
      <div className="mt-8">
        <ReportForm defaultName={viewer.name ?? ""} defaultEmail={viewer.email} />
      </div>
    </div>
  );
}
