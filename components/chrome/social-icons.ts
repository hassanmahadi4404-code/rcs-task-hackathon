/**
 * Social icon map — TASK-138.
 *
 * An explicit map rather than a dynamic lookup on the `lucide-react`
 * namespace: a dynamic index pulls the entire icon set into the bundle
 * (PRF-001). Adding a social to `content/site.ts` means adding its icon here.
 *
 * It is shared because two surfaces render the same three entries at two
 * sizes — the footer's small icon row and the Connect band's tiles (REQ-120).
 */

import { Facebook, Linkedin, Mail, type LucideIcon } from 'lucide-react';

export const SOCIAL_ICONS: Record<string, LucideIcon> = {
  Facebook,
  Linkedin,
  Mail,
};
