import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/photos";
import { EVENT, INFO_DESK } from "@/lib/config";
import type { FoundItemWithDetails } from "@/lib/types";
import { ItemCard } from "@/components/item-card";

const STEPS = [
  {
    n: "01",
    title: "Lost something?",
    body: "Check the found items below first. Not there? Report it with a description, where you last had it, and how to reach you. We'll contact you if it turns up.",
    cta: { href: "/report", label: "Report a lost item" },
  },
  {
    n: "02",
    title: "Found something?",
    body: `Bring it to the ${INFO_DESK.location} right away. We'll log it with a photo, note where it was found, and store it safely.`,
    cta: { href: "/items", label: "See what's been handed in" },
  },
  {
    n: "03",
    title: "Claiming an item",
    body: "Items are listed with a generic label only. Come to the Info Desk with the reference number (e.g. F-0042) and describe it in detail. We'll check it's yours before handing it over.",
    cta: { href: "/items", label: "Browse found items" },
  },
];

export default async function Home() {
  const supabase = await createClient();
  const [{ data: recent }, { count: inCustody }, { count: returned }] = await Promise.all([
    supabase
      .from("found_items")
      .select("*, found_item_details(*)")
      .eq("status", "in_custody")
      .order("found_at", { ascending: false })
      .limit(8)
      .returns<FoundItemWithDetails[]>(),
    supabase.from("found_items").select("*", { count: "exact", head: true }).eq("status", "in_custody"),
    supabase.from("found_items").select("*", { count: "exact", head: true }).eq("status", "claimed"),
  ]);
  const photos = await signPhotoUrls(supabase, (recent ?? []).map((i) => i.found_item_details?.photo_path));

  return (
    <>
      <section className="relative overflow-hidden bg-night text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(600px 320px at 78% 30%, rgba(94,200,216,.35), transparent 70%), radial-gradient(700px 400px at 15% 90%, rgba(160,119,243,.45), transparent 70%), radial-gradient(500px 500px at 80% 120%, rgba(114,53,237,.6), transparent 70%)",
          }}
        />
        <div aria-hidden className="pointer-events-none absolute top-1/2 right-[8%] hidden -translate-y-1/2 lg:block">
          <div className="h-72 w-72 rounded-full bg-gradient-to-br from-teal/80 via-brand-soft/50 to-transparent blur-[2px] shadow-[0_0_120px_40px_rgba(94,200,216,.35)]" />
        </div>
        <div className="container-page relative py-16 sm:py-24">
          <p className="eyebrow !text-mint">
            {EVENT.name} · {EVENT.city}
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold !text-white sm:text-5xl">
            Lost &amp; Found
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/80">
            Misplaced your laptop between talks? Found a stray water bottle? Everything handed in at the Info
            Desk is listed here.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/items" className="btn-primary">
              Browse found items →
            </Link>
            <Link href="/report" className="btn border border-white/25 text-white hover:bg-white/10">
              I lost something
            </Link>
          </div>
          <dl className="mt-10 flex gap-8 text-sm">
            <div>
              <dt className="text-white/60">At the Info Desk</dt>
              <dd className="text-2xl font-bold">{inCustody ?? 0}</dd>
            </div>
            <div>
              <dt className="text-white/60">Reunited with owners</dt>
              <dd className="text-2xl font-bold">{returned ?? 0}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="container-page py-14">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-2 text-3xl font-extrabold">Three steps back to your stuff</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card flex flex-col p-6">
              <span className="font-mono text-sm font-bold text-brand">{s.n}</span>
              <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed">{s.body}</p>
              <Link href={s.cta.href} className="mt-4 text-sm font-semibold text-brand hover:underline">
                {s.cta.label} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Recently handed in</p>
            <h2 className="mt-2 text-3xl font-extrabold">Waiting at the Info Desk</h2>
          </div>
          <Link href="/items" className="btn-secondary hidden sm:inline-flex">
            View all
          </Link>
        </div>
        {recent?.length ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((item) => (
              <ItemCard key={item.id} item={item} photoUrl={photos[item.found_item_details?.photo_path ?? ""]} href={`/items/${item.id}`} />
            ))}
          </div>
        ) : (
          <p className="card mt-8 p-8 text-center text-muted">Nothing handed in yet. Fingers crossed it stays that way!</p>
        )}
      </section>
    </>
  );
}
