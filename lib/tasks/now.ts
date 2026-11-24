/**
 * The instant a request is answered at. Every decision module takes an
 * explicit `now`; pages get it here, read once per request, so every card,
 * pill and deadline on a page agrees about what time it is.
 *
 * Server only.
 */

import { cache } from 'react';

export const requestNow = cache((): number => Date.now());
