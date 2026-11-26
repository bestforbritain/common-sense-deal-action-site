/** Fills in and assembles letters from the templates in content/letters/. */
import { copy } from "@/content/copy";
import { emailSubject, lettersFor, type LetterTemplate, type Recipient } from "@/content/letters";
import type { Mp } from "@/lib/constituencies/types";

export const PERSONAL_PARAGRAPH_MAX = 1000;

export type SenderDetails = {
  senderName: string;
  role: string;
  businessName: string;
  businessAddress: string;
};

/** "Dear …": Parliament's address-as name where set, otherwise the display name (decision 26 November 2026). */
export function salutationName(mp: Pick<Mp, "addressAs" | "displayName">): string {
  return mp.addressAs ?? mp.displayName;
}

/** Replaces tokens; empty sender details become visible placeholders like "[your name]". */
export function fillTokens(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (!(key in values)) return match;
    const value = values[key].trim();
    return value || copy.email.placeholders[key as keyof typeof copy.email.placeholders] || match;
  });
}

export function letterTokens(options: {
  sectorSlug: string;
  constituency: string;
  mp: Pick<Mp, "addressAs" | "displayName"> | null;
  sender: SenderDetails;
}): Record<string, string> {
  return {
    mpAddressAs: options.mp ? salutationName(options.mp) : "",
    constituency: options.constituency,
    sectorNoun: lettersFor(options.sectorSlug).sectorNoun,
    ...options.sender,
  };
}

/**
 * Assembles the letter in the order set out in inputs/letters.md:
 * opening, sector paragraph, personal paragraph (if any), the ask, sign-off.
 * Paragraphs are separated by blank lines; the sign-off's name, role and address lines
 * sit on consecutive lines under "Yours sincerely,".
 */
export function buildLetter(options: {
  sectorSlug: string;
  recipient: Recipient;
  tokens: Record<string, string>;
  personalParagraph?: string;
}): string {
  const template: LetterTemplate = lettersFor(options.sectorSlug)[options.recipient];
  const fill = (s: string) => fillTokens(s, options.tokens);
  const personal = options.personalParagraph?.trim().slice(0, PERSONAL_PARAGRAPH_MAX);
  const [closing, ...signature] = template.signOff;

  return [
    ...template.opening.map(fill),
    fill(template.sectorParagraph),
    ...(personal ? [personal] : []),
    ...template.ask.map(fill),
    fill(closing),
    signature.map(fill).join("\n"),
  ].join("\n\n");
}

export function buildSubject(tokens: Record<string, string>): string {
  return fillTokens(emailSubject.default, tokens);
}
