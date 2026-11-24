/**
 * The server's own Supabase client, for the one job a signed-in person must
 * not be able to do themselves: writing the AI's half of an Evaluation.
 *
 * Everything else in the task platform reads and writes as the signed-in
 * person through `supabaseServer()`, so RLS decides. This client bypasses
 * RLS, so it is used only by `run-evaluation.ts`, only on the server, and
 * its key (`SUPABASE_SERVICE_ROLE_KEY`) is never given a `NEXT_PUBLIC_` name.
 * DECISIONS.md, "The evaluator", says why it exists.
 *
 * Server only.
 */

import { createHmac } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The JWT secret every `supabase start` stack uses unless told otherwise. It
 * is published in Supabase's documentation and protects nothing: it only
 * lets the kit run with the two variables `.env.example` asks for.
 */
const LOCAL_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

function localServiceKey(url: string): string | null {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  if (!LOCAL_HOSTS.has(host)) return null;
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ iss: 'supabase-demo', role: 'service_role', exp: 1983812996 })}`;
  return `${body}.${createHmac('sha256', LOCAL_JWT_SECRET).update(body).digest('base64url')}`;
}

let client: SupabaseClient | null | undefined;

/** Null when no key is configured: Submissions are still saved, and wait `pending`. */
export function serviceClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || localServiceKey(url);
  if (!url || !key) {
    console.error('Task platform: SUPABASE_SERVICE_ROLE_KEY is not set, so no Submission can be evaluated.');
    client = null;
  } else {
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}
