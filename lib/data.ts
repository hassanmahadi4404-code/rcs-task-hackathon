/**
 * Starter kit stub of the club site's data module.
 *
 * On ruetcs.org these come from the database (the `settings` row). In the kit
 * they are fixed, so the site chrome renders without any of that schema.
 */

import { contact, type SocialLink } from '@/content/site';

/** Which optional site sections have rows; the header hides the empty ones. */
export interface SectionsPresent {
  hasEvents: boolean;
  hasAchievements: boolean;
}

/** The society's address and inbox. The label above them is microcopy. */
export interface ContactDetails {
  email: string;
  location: string;
}

export async function getSocials(): Promise<SocialLink[]> {
  return [];
}

export async function getContact(): Promise<ContactDetails> {
  return { email: 'hello@kit.test', location: contact.location };
}
