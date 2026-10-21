import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reportRef } from "@/lib/format";
import type { LostReport } from "@/lib/types";
import { ReportForm } from "@/components/report-form";

export const metadata: Metadata = { title: "Edit lost report" };

export default async function EditReportPage({ params }: PageProps<"/team/reports/[id]/edit">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: report } = await supabase.from("lost_reports").select("*").eq("id", id).maybeSingle<LostReport>();
  if (!report) notFound();

  return (
    <div className="container-page max-w-3xl py-10">
      <p className="eyebrow">{reportRef(report.ref_no)}</p>
      <h1 className="mt-1 text-3xl font-extrabold">Edit lost report</h1>
      <div className="mt-6">
        <ReportForm report={report} />
      </div>
    </div>
  );
}
