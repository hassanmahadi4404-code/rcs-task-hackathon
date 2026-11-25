import { sweepQueue } from '@/lib/tasks/run-evaluation';

/**
 * The sweep: move the queue for the AI with nobody looking. Any visit moves
 * the line, so this is the backstop for deadline night, when the AI's free
 * quota runs out and the Learners have gone to bed. It reads at the model's
 * pace, waiting between slots, until the line is empty or its time is up. `vercel.json`
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

  const ran = await sweepQueue(BUDGET_MS);
  return Response.json({ ran });
}
