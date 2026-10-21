import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { EVENT, INFO_DESK } from "@/lib/config";
import { Logo } from "@/components/logo";

function TopBar() {
  return (
    <div className="bg-night text-white">
      <div className="container-page flex h-9 items-center justify-between gap-3 text-xs">
        <p className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded bg-mint px-1.5 py-0.5 text-[10px] font-bold tracking-wide whitespace-nowrap text-night">
            {EVENT.name.toUpperCase()}
          </span>
          <span className="truncate font-medium">Lost something? Come to the {INFO_DESK.location}</span>
        </p>
        <a href={EVENT.mainSite} className="shrink-0 font-semibold text-brand-soft hover:text-white">
          devcon.org →
        </a>
      </div>
    </div>
  );
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40">
      <TopBar />
      <div className="border-b border-white/10 bg-night-2/95 text-white backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link href="/" aria-label="Lost & Found home">
            <Logo />
          </Link>
          {children}
        </div>
      </div>
    </header>
  );
}

export function HeaderFallback() {
  return <Shell />;
}

const menuItem = "block rounded-lg px-3 py-2 text-sm hover:bg-lavender";

export async function Header() {
  const viewer = await getViewer();

  const links = [
    { href: "/items", label: "Found items" },
    { href: "/report", label: "Report lost item" },
    ...(viewer ? [{ href: "/my-reports", label: "My reports" }] : []),
    ...(viewer?.isTeam ? [{ href: "/team", label: "Team desk" }] : []),
  ];

  return (
    <Shell>
      <nav className="hidden items-center gap-1 md:flex">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-full px-3.5 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white"
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        {viewer ? (
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full p-1 pr-3 hover:bg-white/10">
              {viewer.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={viewer.avatarUrl} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-sm font-bold">
                  {(viewer.name ?? viewer.email)[0]?.toUpperCase()}
                </span>
              )}
              <span className="hidden max-w-32 truncate text-sm sm:inline">{viewer.name ?? viewer.email}</span>
            </summary>
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-line bg-white p-2 text-body shadow-xl">
              <p className="truncate px-3 pt-2 text-xs text-muted">{viewer.email}</p>
              {viewer.isTeam && <p className="px-3 pb-2 text-xs font-semibold text-brand">Info Desk team</p>}
              <div className="my-1 border-t border-line md:hidden" />
              {links.map((l) => (
                <Link key={l.href} href={l.href} className={`${menuItem} md:hidden`}>
                  {l.label}
                </Link>
              ))}
              <div className="my-1 border-t border-line" />
              <form action="/auth/signout" method="post">
                <button className={`${menuItem} w-full text-left`}>Sign out</button>
              </form>
            </div>
          </details>
        ) : (
          <>
            <details className="relative md:hidden">
              <summary className="cursor-pointer list-none rounded-full px-3 py-2 text-sm hover:bg-white/10" aria-label="Menu">
                ☰
              </summary>
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-line bg-white p-2 text-body shadow-xl">
                {links.map((l) => (
                  <Link key={l.href} href={l.href} className={menuItem}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </details>
            <Link href="/login" className="btn-primary btn-sm">
              Sign in
            </Link>
          </>
        )}
      </div>
    </Shell>
  );
}
