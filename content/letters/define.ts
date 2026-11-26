/**
 * Builds a sector's MP and Minister letters from the shared parts in shared.ts.
 * A sector can override any part, or replace a whole letter, without code changes elsewhere.
 */
import { asks, openings, signOff } from "./shared";

export type Recipient = "mp" | "minister";

export type LetterTemplate = {
  /** Salutation and opening paragraph. */
  opening: string[];
  /** The same paragraph in both versions. */
  sectorParagraph: string;
  ask: string[];
  signOff: string[];
};

export type SectorLetters = {
  sectorNoun: string;
  mp: LetterTemplate;
  minister: LetterTemplate;
};

export function defineSectorLetters(options: {
  sectorNoun: string;
  paragraph: string;
  /** Replaces "a {sectorNoun} business" in the openings. */
  openingPhrase?: string;
  /** Per-recipient overrides; pass every part to replace a whole letter. */
  mp?: Partial<LetterTemplate>;
  minister?: Partial<LetterTemplate>;
}): SectorLetters {
  const opening = (paragraphs: string[]) =>
    options.openingPhrase
      ? paragraphs.map((p) => p.replace("a {sectorNoun} business", options.openingPhrase!))
      : paragraphs;

  const base = (recipient: Recipient): LetterTemplate => ({
    opening: opening(openings[recipient]),
    sectorParagraph: options.paragraph,
    ask: asks[recipient],
    signOff,
  });

  return {
    sectorNoun: options.sectorNoun,
    mp: { ...base("mp"), ...options.mp },
    minister: { ...base("minister"), ...options.minister },
  };
}
