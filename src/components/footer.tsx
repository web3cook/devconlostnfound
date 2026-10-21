import { EVENT, INFO_DESK } from "@/lib/config";

export function Footer() {
  const contacts = INFO_DESK.contacts.filter((c) => c.telegram);
  return (
    <footer className="mt-20 bg-night text-white/70">
      <div className="container-page flex flex-col gap-4 py-10 text-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-white">Devcon Lost &amp; Found</p>
          <p className="mt-1">
            {EVENT.name} · {EVENT.city} · {EVENT.dates}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="font-semibold text-white">Special cases</p>
          {contacts.length ? (
            contacts.map((c) => (
              <p key={c.shift} className="mt-1">
                {c.shift}: {c.name} ·{" "}
                <a className="text-brand-soft hover:text-white" href={`https://t.me/${c.telegram}`}>
                  @{c.telegram}
                </a>
              </p>
            ))
          ) : (
            <p className="mt-1">Ask any volunteer at the {INFO_DESK.location}.</p>
          )}
        </div>
      </div>
    </footer>
  );
}
