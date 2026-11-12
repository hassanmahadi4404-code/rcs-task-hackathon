# Contributing to your Entry

This Starter kit is carved from the RUET Computing Society's website. Your Entry is judged partly on how well it fits that codebase, so these are the same rules the club site is reviewed against. [BRIEF.md](BRIEF.md) says what to build, and [CONTEXT.md](CONTEXT.md) defines the words.

## Set up locally

You need Node.js 22.18 or later and Docker running.

```bash
npm install
npx supabase start        # first run downloads the images; it takes a while
npx supabase status -o env
cp .env.example .env.local   # then paste API_URL and ANON_KEY into it
npm run dev
```

Open <http://localhost:3000> and sign in at `/sign-in` as any seed user listed in `supabase/seed.sql`. Every password is `password123`.

`npx supabase db reset` rebuilds the database from the migrations and loads the seed again. Do this whenever you add a migration. Supabase Studio, at <http://127.0.0.1:54323>, shows your tables and lets you run SQL.

## How the code is organised

The site changes through four seams. A change to visuals, motion, copy or theme goes through its seam, not into a component.

- **Tokens:** `config/tokens.css`. Every colour, space, radius, glow, type step, duration (`--dur-*`) and easing (`--ease-*`).
- **Motion:** `config/motion.ts`. Components call `useMotion(sectionId)` from `hooks/use-motion-config.ts` and never read the raw level, because the hook also handles `prefers-reduced-motion` and device capability.
- **Content:** `content/*.ts`. Every user-visible string. Yours go in `content/tasks.ts`.
- **Decisions:** `lib/`. A decision module takes plain data and an explicit `now`, returns plain data, and has a `lib/*.test.ts` file. Components only render what a decision returned.

Data comes from Supabase. Pages read it on the server, through `supabaseServer()` from `lib/auth.ts`, as the signed-in person, so RLS decides every read and write. The browser never queries the database. The one exception is the signed file upload.

### The two areas

- **Learner area:** `app/(site)/learn/`. The `(site)` layout puts these pages inside the site's header and footer, like the club site's own sub-pages.
- **Mentor area:** `app/mentor/`. It belongs in the dashboard's visual language: the pieces in `components/admin/`, styled by `styles/admin.css`, which is scoped to an `.admin` wrapper (see `app/sign-in/layout.tsx`).

### Identity

Use only `getViewer()` and `requireViewer()` from `lib/auth.ts`. In SQL, use `public.is_admin()`, `public.viewer_member_id()` and `auth.jwt() ->> 'email'`. Whether someone mentors a Session is a row in `session_mentors` for their email. There is no mentor role to check.

## Rules

- **Do not edit any file the kit shipped.** `npm run kit-check` lists every one you changed. Put your code in your own files: see BRIEF.md, "What cannot change", for the paths.
- **No literals in components.** Colours, durations, easings and fonts come from `config/`. Copy comes from `content/`. A hardcoded value in a `.tsx` file is a bug.
- **One scroll loop.** Lenis in `components/chrome/SmoothScroll.tsx` owns the only `requestAnimationFrame` scroll loop. Subscribe to it; never open a second one.
- **Everything degrades.** Pages stay usable without JavaScript where they can (forms post through server actions), and under `prefers-reduced-motion`.
- **Do not render what you would hide.** Decide in code what to render. Do not render two things and hide one with CSS.
- **Contrast is load-bearing.** Text targets 7:1, with 4.5:1 as the floor. Several tokens sit exactly at the threshold, so use them as they are.
- **Accessibility.** One `h1` per route, no skipped heading levels, labelled form fields, focus moved to the content on client navigation (`RouteFocus` already does this), and modals with a focus trap, `Escape` to close, and focus restored on close. No horizontal overflow at 1920, 1440, 1024, 768, 414 or 375 px.
- **Dashboard pages compose the shared pieces.** Do not invent a new layout. Monospace is for data only.
- **No new dependency** unless you can't reasonably do without one. Say why in `DECISIONS.md`.
- **Never send personal data to the AI**, and never trust what the AI sends back. Parse and validate its output before you store it.

Code comments in kit files cite IDs such as `TASK-136` or `REQ-013`. They point at the club site's design plans, which are not in this repository. Ignore them.

## Before you submit

```bash
npm run gate      # lint, tsc, tests, build, kit-check: must pass
```

Then check every page you built in the browser against the production build (`npm run build && npm start`), at the six widths above, with the console open.

## Using AI

AI tools are welcome. You are responsible for everything you submit.
