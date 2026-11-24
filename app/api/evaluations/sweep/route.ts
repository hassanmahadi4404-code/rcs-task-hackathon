import { runDueEvaluations } from '@/lib/tasks/run-evaluation';

/**
 * The sweep: work through Evaluations that are waiting and due, with nobody
 * looking. A waiting Evaluation is also run when its Learner opens the Task
 * or its Mentor asks, so this is the backstop for deadline night, when the
 * AI's free quota runs out and the Learners have gone to bed. `vercel.json`
 * calls it once a day, after the quota has reset; Vercel sends
 * `CRON_SECRET` as a bearer token, and without it this does nothing.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Stops well inside `maxDuration`, between runs, never in the middle of one. */
const BUDGET_MS = 40_000;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }

  const started = Date.now();
  let ran = 0;
  while (Date.now() - started < BUDGET_MS) {
    const batch = await runDueEvaluations();
    if (batch === 0) break;
    ran += batch;
  }
  return Response.json({ ran });
}
