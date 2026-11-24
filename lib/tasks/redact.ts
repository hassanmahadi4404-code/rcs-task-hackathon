/**
 * Taking personal data out of a Learner's work before an AI reads it —
 * BRIEF.md, rule 6: no names, rolls, emails or phone numbers.
 *
 * Three passes. Anything shaped like an email, a Bangladeshi mobile number or
 * a labelled roll goes, whoever's it is. The Learner's own name, roll, email and phone go
 * wherever they appear (`personalTerms`, from `submission_personal_terms()`).
 * And a heading line at the top of the work that labels a name, a roll or an
 * ID loses its value, which catches a friend's or a team's.
 *
 * It cannot see inside a picture or a PDF; the form tells the Learner to
 * leave their name and roll out of those. DECISIONS.md, "The evaluator".
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

export const REMOVED = '[removed]';

/*
 * Every pattern here is bounded: no `*` or `+` beside another over the same
 * characters. A Learner chooses this input, and a file that is one line of
 * 40,000 spaces must cost microseconds, not the server.
 */

const EMAIL = /[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,253}\.[A-Z]{2,24}/gi;

/** `01712345678`, `+880 1712-345678`, `8801712345678`. */
const PHONE = /(?<!\d)(?:\+?88[\s-]?)?0[\s-]?1[3-9](?:[\s-]?\d){8}(?!\d)/g;

/** How far down the work a heading such as `Name: …` is looked for. */
const HEADING_LINES = 15;

/**
 * `// Name: Ayesha`, `Student ID - 2203001`, `Submitted by: …`. Only the value
 * goes, up to the end of its clause, so an answer that opens "Name: Ayesha.
 * I built…" keeps the answer.
 */
const HEADING =
  /^((?:\/\/|\/\*{1,3}|\*|#|<!--|--|;)?[ \t]{0,8})(full[ \t]?name|name|roll(?:[ \t]?(?:no\.?|number))?|student[ \t]?id|id(?:[ \t]?(?:no\.?|number))?|reg(?:istration)?(?:[ \t]?(?:no\.?|number))?|author|submitted[ \t]?by|series|department|dept\.?|phone|mobile|contact)([ \t]{0,4}[:=\-–][ \t]{0,4})[^\s.,;|][^.,;|\n]{0,60}/i;

/** `roll 2203002`, `Roll no: 2203002`, `student id 2203002`, anywhere in the work. */
const ROLL = /\b(roll|student[ \t]?id|reg(?:istration)?)((?:[ \t]{0,2}(?:no\.?|number|#))?[ \t]{0,2}[:=\-–]?[ \t]{0,2})\d{5,10}\b/gi;

function escape(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A name is taken out word by word, so "Ayesha" goes as well as "Ayesha Rahman". */
function words(term: string): string[] {
  const parts = term.trim().split(/\s+/).filter((part) => part.length >= 3);
  return parts.length > 1 ? [term.trim(), ...parts] : [term.trim()];
}

function personalPattern(personalTerms: readonly string[]): RegExp | null {
  const terms = [...new Set(personalTerms.flatMap(words).filter((term) => term.length >= 3))];
  if (terms.length === 0) return null;
  terms.sort((a, b) => b.length - a.length);
  // Whole words only, so a roll inside a longer number is left alone. A name
  // that is also a word ("Main") costs the work that word: rule 6 comes first.
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${terms.map(escape).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
}

export function redact(text: string, personalTerms: readonly string[] = []): string {
  const personal = personalPattern(personalTerms);
  const lines = text.split('\n').map((line, index) => {
    // The heading is matched after the indent, so the pattern never has to guess where it ends.
    const indent = line.length - line.trimStart().length;
    const cleaned =
      index < HEADING_LINES ? line.slice(0, indent) + line.slice(indent).replace(HEADING, `$1$2$3${REMOVED}`) : line;
    const noContacts = cleaned.replace(EMAIL, REMOVED).replace(PHONE, REMOVED).replace(ROLL, `$1$2${REMOVED}`);
    return personal ? noContacts.replace(personal, REMOVED) : noContacts;
  });
  return lines.join('\n');
}
