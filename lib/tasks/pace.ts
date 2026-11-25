/**
 * The pace of the queue for the evaluator this server is running: the least
 * time between two requests to it. One place reads the environment, so the
 * line and the wait a Learner is shown always agree.
 *
 * Server only.
 */

import { evaluatorFromEnv } from '@/lib/evaluation-contract';
import { evaluatorIntervalMs } from '@/lib/tasks/queue';

export const evaluatorPaceMs = (): number => evaluatorIntervalMs(evaluatorFromEnv(), process.env.GEMINI_PER_MINUTE);
