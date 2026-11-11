# RCS Task Hackathon: the Brief

The three best Entries win. Their authors become **Contributors** to ruetcs.org, and the best of their work is merged into the live site.

| | |
|---|---|
| Who can enter | Any society Member, from any intake. Solo only. |
| Window | 10 days: **{{START_DATE}}** to **{{DEADLINE}}** (Asia/Dhaka) |
| Build in | This Starter kit. Create your own **private** repo from it with **Use this template**. |
| Submit | Make your repo public, then fill in the [submission form]({{FORM_URL}}) before the deadline. |
| Questions | [GitHub Discussions]({{DISCUSSIONS_URL}}) on this repo, nowhere else. |
| Demo day | **{{DEMO_DAY}}**: showcase and winners announced. |

## The problem

Every week, RCS runs Sessions in a handful of Tracks: web development one evening, competitive programming another. At the end of a Session the Mentor sets a Task or two, and that is where things fall apart. Tasks are posted in a Messenger group and scroll out of sight. Solutions arrive as screenshots, Drive links and private messages, some after the deadline and some never. Mentors are often seniors or alumni who take a single Session and move on, so the work they set goes unread, and Learners never find out whether what they did was any good.

The society wants a home for this on ruetcs.org. Officers already run the site. They plan each Track's Sessions and bring in whoever is mentoring by their email address. A Mentor should be able to get in, set their Tasks, and later see what came in, without being handed the keys to anything else, and without keeping them forever: a Mentor's say over a Session ends a week after its last deadline, though they can always look back at it. Mentors disappear, so Officers can step in anywhere.

Learners are the society's Members. They should always know what is waiting for them and by when. They hand in their work as text, or as a file of up to 10 MB, and get useful feedback within seconds rather than never, because an AI reads every Submission against what the Mentor said a good answer looks like. The AI is a first reader, not the last word. A Mentor who disagrees can say so, and the Learner should see it. What a Learner hands in is theirs, and no other Learner should ever be able to see it. People who are not part of any of this should find nothing here.

Deadline night is the hard case. Everyone submits in the same hour, the free AI quota runs out, and the club's hosting rejects large requests. Nothing a Learner hands in may be lost, and nobody should be left wondering whether their work arrived.

Everything this section does not say is yours to decide: how the two sides should look and work, what a Mentor needs to see to run a Session well, what happens at and after a deadline, and anything else a real Learner, Mentor or Officer would expect. Record those decisions in `DECISIONS.md`. Judges read it, and judge the decisions as well as the code.

[CONTEXT.md](CONTEXT.md) defines the words this Brief uses. Use them as defined.

## What cannot change

Winning Entries are merged into a live site, so these are fixed.

1. **The kit's files stay as they are.** Add your own files. The Gate fails if any file the kit shipped was edited or deleted.
2. **Routes:** Learners use `/learn` (pages in `app/(site)/learn/`) and Mentors and Officers use `/mentor` (pages in `app/mentor/`).
3. **Data:** `supabase/migrations/20261111000000_task_core.sql` is the core of the data model. Extend it in your own migrations; never change it. Every table starts with every access denied. Who may see and do what is enforced by the database, not only by your pages: judges will query it directly with the public key.
4. **Identity** comes only from `lib/auth.ts` (`getViewer()`, `requireViewer()`) and, in SQL, from `public.is_admin()`, `public.viewer_member_id()` and `auth.jwt() ->> 'email'`. At merge time these are rewired to the club site's Google sign-in, so build no other sign-in.
5. **The evaluator** is `evaluate()` exported from `lib/evaluate.ts`, typed by `lib/evaluation-contract.ts`. The `EVALUATOR` environment variable selects it:
   - `mock`, the default: deterministic. The same input always gives the same result, with no network and no key.
   - `gemini`: Google Gemini, using `GEMINI_API_KEY`.
   - `fail`: always throws.

   Judges run your Entry with `mock` and with `fail`.
6. **No personal data goes to an AI**: no names, rolls, emails or phone numbers.
7. **Production is Vercel**, which rejects request bodies over 4.5 MB. Whatever you build must work there, not only on your laptop.
8. **The codebase's own rules apply.** [CONTRIBUTING.md](CONTRIBUTING.md) has them. A new dependency needs a reason in `DECISIONS.md`.

AI tools are welcome. You are responsible for every line you submit.

## The Gate

```bash
npm run gate
```

This runs lint, `tsc --noEmit`, `npm test`, `npm run build`, and the kit-file check. Judges run it on your submitted commit after a clean `npm ci`. **An Entry that fails the Gate is not scored.**

## Judging

A panel of 2–3 judges scores every Entry that passes the Gate. Each judge scores separately, and the scores are averaged. The three highest scores win.

| Area | Points |
|---|---|
| **The problem, solved.** Judges work through a set of scenarios drawn from the problem statement, as Learners, Mentors, Officers and outsiders, through your pages and directly against the database. The scenarios are not published. | 30 |
| **Fit with ruetcs.org.** It looks, reads and behaves like the club site, and is built the way the club site is built. | 20 |
| **Engineering.** Code that others can maintain and extend, tests that would catch a real regression, and access rules that are correct and no wider than they need to be. | 20 |
| **The evaluator.** Feedback a Learner can act on, criteria actually used, and behaviour you can trust when the model is slow, wrong, out of quota or being manipulated. | 15 |
| **Experience.** Clear for someone using it for the first time, honest about what is happening, and accessible on every screen size. | 10 |
| **Decisions.** `DECISIONS.md`: what you decided where the Brief was silent, and why. | 5 |

## Submitting

Before **{{DEADLINE}}**:

1. Push your final commit.
2. Fill in `DECISIONS.md`, and link a demo video of **3 minutes or less** from the README (YouTube unlisted or Google Drive, viewable by anyone with the link).
3. **Make your repo public.**
4. Fill in the [submission form]({{FORM_URL}}): your name, roll, email, GitHub username, repo URL, the **full 40-character commit SHA**, and the video link.

Your Entry is the commit whose SHA you submitted. Pushes after the deadline are ignored. A repo that is private when judging starts cannot be scored.

## Fair play

- Solo work. Entries that share code with each other beyond the kit are disqualified, and commit history is checked.
- Ask about the Brief only in Discussions. Any answer that changes what the Brief means is added to `FAQ.md`, so everyone has the same information.
- The organiser and judges do not enter.

## If you win

You become a **Contributor** to ruetcs.org with write access to the club site's repo. Your first job, together with the other two winners, is to bring the best of the three Entries into the live site through reviewed pull requests, within about 3 weeks of the announcement. You also get a certificate and a mention on the site.
