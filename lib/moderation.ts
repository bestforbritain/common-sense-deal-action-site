/**
 * Automatic flags shown to approvers on posted letters (brief, section 10).
 * Flags inform; they never block. Staff approval is the control.
 */
import { flaggedWords } from "@/content/moderation";

export type Flag = "language" | "link" | "shouting";

const wordPattern = new RegExp(`\\b(${flaggedWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i");
const linkPattern = /\b(https?:\/\/|www\.)\S+|\b[\w-]+\.(com|co\.uk|org|net|io|ru|xyz)\b/i;

export function flagsFor(texts: string[]): Flag[] {
  const all = texts.join("\n");
  const flags: Flag[] = [];
  if (flaggedWords.length && wordPattern.test(all)) flags.push("language");
  if (linkPattern.test(all)) flags.push("link");
  // Lots of capitals: more than 30% of letters in a paragraph of any length.
  const letters = all.replace(/[^A-Za-z]/g, "");
  const caps = all.replace(/[^A-Z]/g, "");
  if (letters.length > 200 && caps.length / letters.length > 0.3) flags.push("shouting");
  return flags;
}

export const flagLabels: Record<Flag, string> = {
  language: "Possible offensive language",
  link: "Contains a web address",
  shouting: "Lots of capital letters",
};
