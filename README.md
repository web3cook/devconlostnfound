# Event Lost & Found

An open-source lost-and-found and cloakroom desk for conferences and events. It was originally built for
[Devcon](https://devcon.org/en/)'s Info Desk, and it's easy to rebrand for your own event.

Built with **Next.js** (App Router) on **Vercel**, and **Supabase** for Postgres, Google sign-in and photo storage.
Access rules live in the database (Postgres Row Level Security), so the privacy guarantees hold even if the UI has a bug.

- [Features](#features)
- [Deploy your own](#deploy-your-own)
- [Local development](#local-development)
- [Customizing](#customizing)
- [Adding features](#adding-features)
- [Contributing](#contributing) · [License](#license)

## Features

**Attendees** (no account, no sign-in)
- Browse everything handed in at the Info Desk. The public only ever sees a **generic label** ("Water bottle, 1 L", "Backpack"), category, date and status. No photo, description or location is shown, so the real owner has to describe the item. Returned items stay listed as **Returned**
- Each item has a reference number (`F-0042`) to give at the desk when claiming it
- To report a loss, they visit an Info Desk. A team member files it and contacts them if it turns up

**Info Desk team** (Google accounts the superadmin has added)
- **Log found items** from a phone: the camera photo is compressed in the browser and uploaded. Each item has a generic public label plus team-only details: title, colour, description, photo, location, finder's contact, **identifying details** to check claims against, and internal notes
- **File lost reports** for attendees at the desk, and edit them later
- **Possible matches**: a dashboard pairs open lost reports with items in custody. Link a report to an item, then contact the attendee
- **Hand over** an item: record who collected it (phone, email and/or other contact) and how they proved ownership. This also closes the linked report, and it can be undone
- **Cloakroom**: check bags in against a reusable physical token, with bag and token photos and the depositor's contact. Each deposit also gets a permanent number (`C-0042`). Bags are handed back to whoever presents the matching token, and the collector's details are recorded
- **Full track record**: nothing can be deleted. Every record shows who created, last edited and handed it over (as "Name (email)"), plus a **History** timeline of every change. The database writes these entries, so they can't be faked

**Superadmin** (the email in `SUPERADMIN`)
- Everything the team can do, plus **adding and removing team members** on Team desk → Team
- **Archive** (soft delete) and **Restore** found items, lost reports and cloakroom deposits

**Anyone else who signs in** sees **Authorisation denied**: they're signed out and their account is deleted.

### Privacy model (enforced in Postgres RLS)

| Data | Public | Team |
| --- | --- | --- |
| Found items: generic label, category, date, status (not archived) | ✅ | ✅ |
| Found items: title, description, colour, photo | ❌ | ✅ |
| Found items: location, finder, claimant, identifying details | ❌ | ✅ |
| Lost reports (incl. attendee contact info) | ❌ | ✅ |
| Cloakroom deposits and photos | ❌ | ✅ |
| History timeline | ❌ | ✅ (read-only; written by database triggers) |
| Team roster | ❌ | ✅ (read-only; superadmin edits via the server) |

A team member must be in `team_members` **and** have signed in with Google. `supabase/tests/rls_smoke.sh`
checks all of the above.

## Deploy your own

You need free accounts on [Supabase](https://supabase.com), [Vercel](https://vercel.com) and
[Google Cloud](https://console.cloud.google.com) (for Google sign-in), plus a fork of this repository on GitHub.

### 1. Create the Supabase project

1. In the [Supabase dashboard](https://supabase.com/dashboard), click **New project**. Pick the region closest to
   your event, and save the database password.
2. Note the **project ref**, the `abcdefgh…` part of `https://abcdefgh….supabase.co`.
3. Apply the database schema. Run these from the repo folder, one at a time:
   ```bash
   npx supabase login
   ```
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
   ```bash
   npx supabase db push
   ```
   This applies every file in `supabase/migrations/`, in order. It creates the tables, access rules, history triggers
   and the private `item-photos` storage bucket.
   (Without the CLI, paste each migration file into **SQL Editor** and run them **in filename order**.)

### 2. Set up Google sign-in

1. In Google Cloud Console, create a project, then go to **APIs & Services → OAuth consent screen**:
   - App name and support email. The default scopes (`email`, `profile`, `openid`) are enough.
   - Set the audience to **External** and **publish** the app. In "Testing" mode, only listed test users can sign in.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**:
   - **Authorized JavaScript origins**: your site URL (e.g. `https://your-app.vercel.app`) and `http://localhost:3000`
   - **Authorized redirect URIs**: exactly `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Copy the **Client ID** and **Client secret**. Don't commit the downloaded JSON: `.gitignore` already
     excludes `client_secret*.json`.
3. In Supabase, go to **Authentication → Sign In / Providers**:
   - **Google**: enable it and paste the client ID and secret.
   - **Email**: turn it **off**. Only Google sign-in is used.

### 3. Deploy to Vercel

1. In Vercel, **Add New → Project**, then import your fork. The Next.js framework is detected automatically, so you
   don't need to change any build settings.
2. Before deploying, add these **Environment Variables**:

   | Variable | Where to find it |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API (`https://YOUR_PROJECT_REF.supabase.co`) |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → publishable key (`sb_publishable_…`) |
   | `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → secret key (`sb_secret_…`). **Server-only**: never prefix it with `NEXT_PUBLIC_` |
   | `SUPERADMIN` | Your Google email. It can manage the team and archive records. Comma-separate to have more than one |

3. Click **Deploy** and note your production URL.

### 4. Connect the URLs

In Supabase, go to **Authentication → URL Configuration**:
- **Site URL**: your production URL, e.g. `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/**` and `http://localhost:3000/**`. To use sign-in on Vercel
  preview deployments, also add `https://*-YOUR-VERCEL-TEAM.vercel.app/**`.

If sign-in sends you back to the wrong domain, the Site URL or Redirect URLs are missing your domain.

### 5. First sign-in

Open the site, click **Team login** and sign in with the `SUPERADMIN` account. Go to **Team desk → Team** to add
your volunteers' Google accounts. Access takes effect on their next page load.

### Updating a live deployment

When you pull changes that include new files in `supabase/migrations/`, apply them **before** deploying the code:

```bash
npx supabase db push
```

Then push to GitHub; Vercel redeploys automatically. Schedule schema changes outside event hours, because the
old code may not work with the new schema while they're between versions.

## Local development

You need Node.js 20+ and Docker (for the local Supabase stack).

```bash
npm install
```
```bash
npx supabase start
```
```bash
cp .env.example .env.local
```

Fill `.env.local` with the URL and keys printed by `supabase start`, plus your email as `SUPERADMIN`.

Sign-in is Google-only, so for local sign-in, export `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and
`SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` in your shell. Don't put them in a committed file. Then restart Supabase with
`npx supabase stop` and `npx supabase start`. Add `http://localhost:3000` to your OAuth client's JavaScript origins,
and `http://127.0.0.1:54321/auth/v1/callback` to its redirect URIs. Then:

```bash
npm run dev
```

Open http://localhost:3000.

### Tests and checks

```bash
npx supabase db reset && bash supabase/tests/rls_smoke.sh
```

This runs the database access-rule tests against a fresh local database.

```bash
npm run lint && npm run build
```

## Customizing

Most rebranding is done in two files.

### Event, brand and wording: `src/lib/config.ts`

| Setting | What it controls |
| --- | --- |
| `BRAND` | Name in the logo, page titles and footer, plus the ID attendees should bring |
| `EVENT` | Event name, city, dates, the event's main website (linked in the top bar), and the **time zone** all times are shown in |
| `INFO_DESK` | Where the desk is, and shift-lead Telegram contacts shown in the footer |
| `CATEGORIES` | Item categories with their emoji. The `value` is stored in the database, so keep values stable once your event is live |

The home page's "How it works" steps are the `STEPS` list at the top of `src/app/page.tsx`.

### Colours and components: `src/app/globals.css`

The whole palette is the `@theme` block at the top. Change the tokens to restyle every page:

| Token | Used for |
| --- | --- |
| `--color-brand`, `--color-brand-dark`, `--color-brand-soft` | Buttons, links, highlights |
| `--color-night`, `--color-night-2` | Top bar, header, footer and hero background |
| `--color-ink`, `--color-body`, `--color-muted` | Headings, body text, secondary text |
| `--color-lavender`, `--color-lavender-2`, `--color-line` | Page background, soft fills, borders |
| `--color-mint`, `--color-teal` | Accent badge and hero glow |

Below the palette are the shared component classes (`btn-primary`, `btn-secondary`, `card`, `input`, `label`, …),
written as Tailwind v4 `@utility` blocks. Change one and every button or card follows. Everything else is plain
[Tailwind CSS](https://tailwindcss.com/docs) classes in the components.

### Font, logo and icon

- **Font**: `src/app/layout.tsx` loads Poppins with `next/font/google`. Swap in another Google font there, and keep the
  `--font-poppins` variable name, or rename it in `globals.css`.
- **Logo**: `src/components/logo.tsx`. Replace the inline SVG mark with your own SVG, or with an `<img>` from `public/`.
- **Favicon**: replace `src/app/favicon.ico`.
- **Hero**: the dark banner and glow on the home page are in `src/app/page.tsx`.

## Adding features

### How the code is organised

```
src/app/                       public pages: home, /items, /login (team), /denied
src/app/team/(desk)/           team desk: dashboard, items, reports, cloakroom, members
src/app/team/actions.ts        server actions for items, reports, archive and the roster
src/app/team/cloakroom-actions.ts
src/components/                shared UI (header, forms, photo picker, history timeline, …)
src/lib/config.ts              brand, event and category settings
src/lib/auth.ts                getViewer / requireTeam / requireSuperadmin
src/lib/supabase/              browser, server, proxy and admin (secret-key) clients
src/lib/validation.ts          zod schemas for every form
src/lib/types.ts               row types
src/lib/match.ts               lost-report ↔ found-item matching heuristic
src/proxy.ts                   session refresh + team-only route guard
supabase/migrations/           schema, RLS policies, triggers, storage
supabase/tests/rls_smoke.sh    access-rule tests
```

### Recipe: a new team-only module

The cloakroom (`cloak_deposits`) is a complete, small example of this recipe. Copy its pattern.

1. **Schema.** Create a migration:
   ```bash
   npx supabase migration new my_feature
   ```
   In it:
   - Create the table and `enable row level security`.
   - Add policies `to authenticated` using `(select private.is_team())` for select, insert and update.
   - `revoke all … from anon, authenticated`, then grant only `select, insert, update` to `authenticated`.
     Don't grant `delete`: records are archived, never deleted.
   - For "who did what", add a `BEFORE` trigger like `private.stamp_cloak_deposit()`. It stamps
     `private.current_actor()` and only allows archive changes from the server.
   - For the History timeline, add a column to `activity_log` and an `AFTER` trigger like
     `private.log_cloak_deposit()`.
2. **Types and validation.** Add a row type to `src/lib/types.ts` and a zod schema to `src/lib/validation.ts`.
3. **Server actions.** Create a `"use server"` file. Call `await requireTeam()` first in every action, then use
   `createClient()` from `@/lib/supabase/server`, so the database checks the user's own permissions.
4. **Pages.** Add a folder under `src/app/team/(desk)/`, with a `loading.tsx` in each route folder (see "Next.js
   notes"). Pages there are already behind the team login.
5. **Navigation.** Add a link to `NAV` in `src/app/team/(desk)/layout.tsx`.
6. **Archive.** To let the superadmin archive it, add your table to `TABLES` in `setArchived()` in
   `src/app/team/actions.ts`.
7. **Tests.** Add `check` lines to `supabase/tests/rls_smoke.sh`. Cover what the team can do, and that
   `anon` and non-team users can't.

### Rules that keep it safe

- Put access rules in the **database** (RLS). Pages and server actions also check, but treat those checks as UX, not
  as the security boundary.
- `SUPABASE_SECRET_KEY` bypasses RLS. Only use it through `createAdminClient()`, and only after `requireSuperadmin()`.
- Anything shown to the public must come from columns that `anon` is allowed to read. Never embed team-only tables in
  public queries.
- Photos go to the private `item-photos` bucket and are shown with short-lived signed URLs (`src/lib/photos.ts`).

### Next.js notes

This project uses Next.js 16 with **Cache Components** and **Partial Prefetching** on, which work differently from older
Next.js versions. Read the bundled docs in `node_modules/next/dist/docs/` before changing routing or data fetching.
In particular:

- Pages that read cookies or the database must render inside a `<Suspense>` boundary. Adding a `loading.tsx` to the
  route folder does this.
- `createClient()` already calls `connection()`, so database reads are always done per request.
- Middleware is called **proxy** (`src/proxy.ts`).

## Contributing

Issues and pull requests are welcome. Before opening a PR:

1. `npm run lint && npm run build` passes.
2. If you changed the database, add a **new** migration (never edit one that's already applied), and
   `npx supabase db reset && bash supabase/tests/rls_smoke.sh` passes.
3. Describe what changed for attendees, the team and the superadmin.

## License

[MIT](LICENSE). You're free to use, modify and deploy this for your own events.

"Devcon" and its visual identity belong to their respective owners. If you deploy this for a different event, update
the `BRAND` settings, colours and logo as described in [Customizing](#customizing).
