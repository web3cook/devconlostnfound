# Devcon Lost & Found

A lost-and-found site for [Devcon](https://devcon.org/en/), based on the Info Desk's Notion guide.
It's built with Next.js and runs on Vercel, with Supabase for Postgres, Auth (Google) and Storage.

## What it does

**Attendees** (no sign-in needed to browse)
- Browse everything handed in at the Info Desk, with search and category filters
- Each item has a reference number (`F-0042`) to give at the desk when claiming it
- Sign in with Google to report a lost item: description, where/when it was lost, and contact details
- **My reports** shows the status, plus a "We may have found it!" card once the team links a match

**Info Desk team** (Google accounts listed in `TEAM_EMAILS`)
- Log a found item from a phone. The photo is taken in the browser, compressed, and uploaded
- Choose per item whether the photo is public (hide it for wallets, IDs and cards)
- Record team-only details: who handed it in, **identifying details** to check claims against, internal notes
- Dashboard of **possible matches** between open lost reports and items in custody
- Link a report to an item, which notifies the reporter on their My reports page
- **Hand over** an item: record who collected it, their contact and how they proved ownership. It's done in one step and also closes the linked report. A hand-over can be undone

### Privacy model (enforced in Postgres RLS)

| Data | Public | Signed-in user | Team |
| --- | --- | --- | --- |
| Found item basics (title, description, location, status) | ✅ | ✅ | ✅ |
| Item photo | only if marked public | only if marked public | ✅ |
| Finder / claimant details, identifying details | ❌ | ❌ | ✅ |
| Lost reports (incl. contact info) | ❌ | own only | ✅ |
| Team roster | ❌ | own row only | ✅ (read-only) |

A team member must be listed in `TEAM_EMAILS` **and** have signed in with Google. Signing in another way
with the same email is not enough. The tests in `supabase/tests/rls_smoke.sh` check all of the above.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the schema. Either link and push:
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
   ```bash
   npx supabase db push
   ```
   or paste `supabase/migrations/*_init.sql` into the SQL editor and run it.
3. **Authentication → Sign In / Providers → Google**: enable it and paste your Google OAuth client ID and secret.
   Turn **off** Email sign-ups. Only Google is used.
4. **Authentication → URL Configuration**:
   - Site URL: `https://your-domain.vercel.app`
   - Redirect URLs: `https://your-domain.vercel.app/auth/callback`, plus `http://localhost:3000/auth/callback` for local dev
5. In Google Cloud Console → your OAuth client → **Authorized redirect URIs**, add
   `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.

### 2. Vercel environment variables

| Variable | Where from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys (publishable) |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys (secret). **Server-only.** It's used only to sync the team list |
| `TEAM_EMAILS` | Comma-separated Google emails for the Info Desk team |

The Google client ID and secret are **not** Vercel variables. They live in the Supabase dashboard (step 3 above).

**Changing the team:** edit `TEAM_EMAILS` and redeploy. The roster is copied into the database (where RLS reads it)
when the server starts, on every sign-in, and when a team page is opened. If `TEAM_EMAILS` is unset, the roster
is left as it was and never wiped.

### 3. Event details

Edit `src/lib/config.ts` for the event name and dates, the Info Desk location, the shift leads' Telegram handles,
and the categories.

## Local development

You need Docker for the local Supabase stack.

```bash
npm install
```
```bash
npx supabase start
```
```bash
cp .env.example .env.local
```

Fill `.env.local` with the URL and keys printed by `supabase start`, plus `TEAM_EMAILS`. To use Google sign-in
locally, also set `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, then restart
Supabase. Then:

```bash
npm run dev
```

Run the RLS tests against a fresh local database:

```bash
npx supabase db reset && bash supabase/tests/rls_smoke.sh
```

## Project layout

```
src/app/                 public pages: home, /items, /report, /my-reports, /login
src/app/team/            team desk (dashboard, inventory, lost reports, team) + server actions
src/lib/                 Supabase clients, auth/team helpers, validation, matching heuristic
supabase/migrations/     schema, RLS policies, storage bucket, claim functions
supabase/tests/          RLS smoke tests
```
