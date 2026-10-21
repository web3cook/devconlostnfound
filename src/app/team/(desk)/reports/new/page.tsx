import type { Metadata } from "next";
import { ReportForm } from "@/components/report-form";

export const metadata: Metadata = { title: "File lost report" };

export default function NewReportPage() {
  return (
    <div className="container-page max-w-3xl py-10">
      <p className="eyebrow">Info Desk</p>
      <h1 className="mt-1 text-3xl font-extrabold">File a lost report</h1>
      <p className="mt-2 text-sm text-muted">
        For an attendee at the desk. Check the inventory together first. If it&apos;s not there, file it here and give them
        the reference number shown after saving.
      </p>
      <div className="mt-6">
        <ReportForm />
      </div>
    </div>
  );
}
