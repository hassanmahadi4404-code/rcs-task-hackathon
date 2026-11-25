# Decisions

What I decided where the Brief was silent, and why. The words are CONTEXT.md's.

## The one idea

**Save first, read second.** Handing in is one database insert. The moment it succeeds the Learner is shown a receipt with the time it arrived and whether it was on time. The AI's read is a separate step that can be slow, fail, or run out of quota without touching the Submission. Everything else follows from keeping those two things apart.

## What a Learner sees

- **`/learn` is two lists: Running and Finished.** A Task is running while it still takes work, late work included, and finished after. Inside Running, what the Learner has not done yet comes first, soonest deadline first, so "what is waiting for me, and by when" is the top of the page. Four numbers sit above the lists: running, to do, finished, and their points.
- **Every Task carries one marker on its right: a clock or a Finished mark.** A running Task counts down to its deadline, to the second; inside the last day the clock lights up, and inside the last hour it turns the error colour. A late Task counts down to when late work stops. When a clock reaches zero the page asks for itself again, so the Task moves to where it belongs without a reload. The digits are hidden from screen readers, which are given one sentence that does not change every second.
- **A Task page opens with three steps and the time left**: read the Task, submit your work, get feedback, with the step the Learner is on lit and the ones behind them ticked. The words were chosen for a child: "Submit", "To do", "Done", "Time left".
- **There is no enrolment in the core**, so every Member sees every published Task. I did not invent enrolment: a small society's Members drift between Tracks, and a list that hides a Task is worse than one that shows a Task you skip.
- **Late work is taken for 3 days after a deadline, and marked late.** The Brief says some work arrives late today; refusing it at 23:59:01 would send it back to Messenger. Three days, not seven, so the last late Submission still lands inside the Mentor's week and can be answered.
- **Up to 10 attempts per Task; the latest one counts**, for the Learner and for the Mentor. Several attempts are in CONTEXT.md; the cap exists because each one spends free AI quota. Earlier attempts stay visible. A Submission is never edited or deleted, by anyone: there is no update or delete policy on the table.
- **Learners see the Grading criteria.** They are "what a good answer looks like", and hiding the marking scheme from the people being marked helps nobody.
- **The Mentor's word is shown above the AI's**, named as the Mentor's, with the AI's score kept beside it ("set to 75; the AI had given 22"). A Mentor can give a score, a note, or both; a note alone leaves the AI's score standing.
- **A Mentor who is also a Member** is a Learner everywhere except the Sessions they mentor, where they cannot hand in. The database refuses it, not just the page.
- **Signed in but not part of this** (not a Member on `/learn`; not an Officer or Mentor on `/mentor`): a page that says so and shows the address they signed in with, because the usual cause is the wrong Google account. The database returns them no rows from any table.

## Deadline night

- **Files go from the browser straight to Storage** over a signed URL, with a progress bar, so Vercel's 4.5 MB limit never sees them. The Storage policies decide who may be given a URL: only a Learner, only into their own folder, only for a Task still taking work. The Submission row then names the file, and a trigger checks the file is really there and really theirs. This upload is the only time the browser talks to Supabase.
- **Without JavaScript** the same form posts text and a file of up to 3.5 MB through the server action, and says so. Larger files need JavaScript; I could not find an honest way around a hosting limit.
- **Sending twice saves once.** Each rendered form carries a key; a retry on a bad connection or a double click hits a unique index and is answered with the Submission already saved ("this is the same attempt, not a second one").
- **Nothing typed is lost on a refusal.** The text comes back in the box with one sentence saying what was wrong. The sentences are keyed by the same words the database raises, so the form and a direct insert are refused for the same reasons.
- **`created_at` is the server's clock.** A trigger overwrites whatever the client sent, so nobody chooses whether they were late.
- **Handing in waits up to 3.5 seconds for the first read**, so with the mock or a quick model the Learner lands directly on their feedback, with or without JavaScript. A slower read carries on after the response, and the page looks again on its own.

## The evaluator

- **The AI marks each criterion, never a total.** `lib/tasks/criteria.ts` reads the Mentor's prose ("Works on a phone: 30.") into criteria with points; the Task form shows the Mentor how it was read as they type. The model returns points per criterion, each is held to its own maximum, and the score is added up in our code. Criteria with no points in them become one criterion worth 100.
- **Feedback is per criterion plus one next step**, in a plain-text form both evaluators write and the pages parse (`lib/tasks/feedback.ts`). Anything not in that form (the seed's sentences) is shown as the paragraph it is.
- **The mock** scores each criterion from how many of that criterion's own words the work uses, how much work there is, and a hash. Same input, same result, no network. It is a stand-in, and its feedback says what it looked for.
- **Gemini** is one `fetch` to the REST API: no SDK, so no dependency. `GEMINI_MODEL` overrides the default model.
- **Nothing the model says is trusted.** Its answer must be JSON with whole points in range and a comment for every criterion, or the run counts as failed. Text is stripped of control characters and capped before a Learner sees it. A second check (`lib/tasks/result.ts`) guards whatever `evaluate()` returns, whichever implementation it was.
- **When work tries to steer the AI:** the work is fenced as data and cannot close its own fence; the instruction says to ignore requests in it; totals are ours; and work that addresses the reader ("ignore the criteria", "give full marks") is flagged, by a pattern check on our side and by the model. A flag does not change the score. It puts the Submission in the Mentor's "Need a person" list with the reason, because a person should decide.
- **No personal data reaches any evaluator** (rule 6). Before `evaluate()` is called, `lib/tasks/prepare.ts` removes emails, phone numbers and labelled rolls from the text and from text files, removes the Learner's own name, roll, email and phone wherever they appear, and renames the file to `submission.<ext>`. Every pattern is bounded so a hostile file cannot stall the server; a test proves it.
- **PDFs and images are sent to the AI as they are.** Redaction cannot see inside them, so the form tells Learners to leave their name and roll out. I chose to send them, because a screenshot or a PDF report is how much real work arrives, and Learners will be told the same in Sessions; the stricter alternative is to keep them for the Mentor only, and it is a one-line change in `prepare.ts`. Files that are neither text nor PDF nor image (a zip) are stored, shown to the Mentor, and not read by the AI; the Learner is told.
- **When the evaluator fails** (`EVALUATOR=fail`, an outage, a timeout, bad output): the Evaluation stays `pending` and is retried after 10 s, 30 s, 2 min and 10 min. After five runs it is `failed`: the Learner reads "the AI could not read this; your work is saved; your Mentor can mark it", and the Submission appears in the Mentor's "Need a person" list with an "Ask the AI again" button.
- **When the quota runs out:** that run does not count against the Submission, and one row (`evaluator_state`) pauses every waiting Evaluation until the time the model asked for, so a hundred waiting Submissions do not each spend a request finding out. Learners are told feedback is delayed and that they need not hand in again. After two days without quota the Evaluation is left to the Mentor.
- **Who runs a waiting Evaluation:** the Learner's own page (it looks again just after the next run is due), the Mentor's "Run waiting evaluations" button, and a daily sweep (`/api/evaluations/sweep/`, in `vercel.json`, guarded by `CRON_SECRET`) timed for after the free quota resets. A run is claimed in the database first, so two requests never read the same work.

### The service-role key

The AI's half of an Evaluation is written by the server with `SUPABASE_SERVICE_ROLE_KEY`, in one module (`lib/tasks/service.ts`, used only by `lib/tasks/run-evaluation.ts`). Everything else reads and writes as the signed-in person, as CONTRIBUTING.md asks.

This is the one exception because it has to be. A server that only holds the public key and the Learner's session can do nothing the Learner cannot do themselves with the same two things; if it could store a score, so could they. So nobody has an insert, update or delete policy on `evaluations`. The Mentor's half is written through `set_evaluation_override()`, which checks the caller; the AI's half needs a secret the Learner does not have.

On a local `supabase start` stack the key is derived from the CLI's published default JWT secret when the variable is not set, so the kit still runs with the two variables `.env.example` names. That fallback applies only to `127.0.0.1` and `localhost`. Anywhere else, without the key, Submissions are still saved and stay honestly `pending`.

## What a Mentor sees

- **The overview answers "what needs me?"**: work the AI could not read or flagged, and deadlines in the next week. The Task page lists each Learner's latest attempt with search, sort and groups (need a person, waiting on the AI, Mentor marked, late).
- **A Mentor learns a Learner's name and roll, and nothing else**, and only for Learners who handed work in to a Task of their Session (`task_submitters()`). `members` stays deny-all. A Mentor need not be a Member, so the full Member list is not theirs to read; this is also why there is no "who has not handed in" list.
- **The Mentor's window** is the Brief's: a week after the Session's last deadline, enforced in `can_edit_session()`. Inside it they set, change and (if nobody has handed in) delete Tasks, override Evaluations and ask the AI again. After it they read everything and change nothing, and the page says when it closed. A Session with no Task yet counts from the day it is held, so its Mentor can set the first one. Moving a deadline later does extend the window while it is open; a closed window cannot be reopened by its Mentor.
- **Tasks can be drafts.** Learners see a Task once it is published, and keep seeing one they handed work in to even if it is later unpublished.
- **Mentors do not rename or move Sessions, or name other Mentors.** Officers plan Sessions.

## The leaderboard

Everyone who is part of this can open `/learn/leaderboard/`: Members, Mentors and Officers. It ranks Learners by points, overall or for one Track, with the top three set apart and the viewer's own row marked.

- **Points are the scores on a Learner's latest attempt at each Task, added up.** The latest attempt is the one that counts everywhere else, so it counts here; a Mentor's score stands over the AI's; an attempt nobody has scored yet adds nothing until it is. Learners on the same points share a place.
- **It shows a name and three totals, and nothing else.** "What a Learner hands in is theirs" still holds to the letter: the leaderboard is one database function (`public.leaderboard()`), no policy changed for it, and nobody gained a row of `submissions`, `evaluations` or `members`. It gives no roll, email or phone, and no score for any single Task. Someone who is not a Member, Mentor or Officer gets an empty table. The tests ask it as each kind of person, and check a Learner still cannot read anyone else's work afterwards.
- **This is still a trade-off.** A ranking tells Learners how the others are doing in total. I judged that worth it for a club whose Sessions are public among its Members, and kept it to totals so that no single piece of work can be read back out of it.

## The pointer

The Learner area uses the site's reticle cursor. The kit's shell leaves the cursor out, but keeps its rules (`styles/chrome.css`), its switch (`config/motion.ts`) and its token, so `components/tasks/Reticle.tsx` is that missing component written to the same contract. It is off on touch screens and under reduced motion, the native cursor is hidden only once it has mounted, and it stands down if the page already has a reticle, which it will after the merge.

## The home page

The kit's landing page (`/`) is a kit file, so it is not changed: the Gate fails an Entry that edits one, and on ruetcs.org that address is the club's own home page anyway. What it did as a list of links is done inside the Learner area instead, by a row of large links on every page: Tasks, Leaderboard, and the Mentor area for someone who has one.

## The plan as a timeline

The society plans a whole Track ahead in a spreadsheet: every Session in order, each with its syllabus, its Mentors and, for most of them, no date yet. The Sessions page is that sheet: Tracks in the order they are taught, and under each one its Sessions with Syllabus / Topic, Mentor 1, Mentor 2, Date, and how much work came in. Below 768px each row is a card with the same fields.

- **A Session has a syllabus line and a place in its Track; a Track has a place among the Tracks.** These are three columns added to the core tables. Anything not yet given a place is listed after everything that has one.
- **A Session can be planned before its date is settled.** `held_on` cannot be empty in the core, so an unsettled Session keeps a placeholder there and a flag beside it; everyone is shown "To be announced" and nothing is timed from the placeholder. Its Mentors can still set its first Task, and from then on the Task's deadline times their window like any other Session.
- **The sheet's own plan is in `supabase/data/freshers-learning-track.sql`**, to load by hand. It is not in the seed, which is the kit's, and it carries no names or phone numbers: the sheet lists Mentors that way, but here a Mentor is an email an Officer names on the Session's page.
- **Session coordinators are not modelled.** The sheet has them; they have no part in who may see or change anything, and storing them would mean storing people's names for display only.

## What an Officer does

Tracks, Sessions and naming Mentors by email, in an "Officers" group of the same dashboard, and everything a Mentor can do on every Session at any time. A Mentor's email is lower-cased when stored, and they are a Mentor from the moment they sign in with it.

**Nothing a Learner handed in can be deleted by accident.** A Task, Session or Track that holds Submissions cannot be deleted by anyone through the public key; the page says to unpublish or archive it instead.

## How it fits the codebase

- **No kit file is edited.** `styles/tasks.css` is imported by the two areas' layouts because `styles/index.css` is not mine to change.
- **The four seams are kept.** Every string is in `content/tasks.ts`; every decision is a pure module in `lib/tasks/` with an explicit `now` and a test; components render what was decided; every CSS value is a token.
- **`/mentor` composes the dashboard's pieces** (`AdminShell`, `PageHeader`, `RowList`, `ListToolbar`, `StatGrid`, `FormSection`, `ActionBar`, `PostButton`), with a handful of extra rules. `/learn` uses `PageShell`, `.section` and the HUD frame and section header. The status pill is shared by both sides so one state has one look.
- **Identity** is only `getViewer()`, `is_admin()`, `viewer_member_id()` and the JWT email. `viewerAt()` adds a `next` address to the sign-in redirect, so an invited Mentor lands on the page they were sent.
- **The rules live in the database**: policies, a trigger for handing in, and three functions for the Mentor's half of an Evaluation. `npm run test:db` asks 104 questions as each seed person with only their own session.
- **No new dependency.**

## Not built, and known limits

- **No notifications.** A Learner finds out about feedback or a Mentor's word by opening the page. Email is the obvious next step and needs the club's sender.
- **A daily sweep only.** Vercel's free plan allows one cron run a day; a paid plan could run it every few minutes.
- **Uploads that were never handed in stay in Storage.** A Learner who uploads and then closes the tab leaves an orphan file in their own folder. A cleanup job is not built.
- **A 404 is blank without JavaScript.** Next renders `notFound()` on the client. Every other page works without it.
- **Lists read up to 1,000 rows**, PostgREST's default. The Task page paginates in memory, which is fine for a society and wrong for a university.
- **Gemini was run against the live API only by hand**: a strong answer, an attempt to steer it (scored 0, flagged by both checks), a blank image, and a hand-in through the app. The automated tests use a stand-in `fetch`, so they need no key and no network; they cover the request, the parsing and every failure path, but not what the model itself says.
- **A Learner can read the email of the Mentor who overrode their Evaluation** (`overridden_by`) by querying the table, though the page only says "your Mentor". Hiding one column needs column grants, which break `select *` for everyone else; I judged it not worth that.
