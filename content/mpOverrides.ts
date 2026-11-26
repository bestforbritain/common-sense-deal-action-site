/**
 * Manual fixes for gaps in the Members API, keyed by Members API id.
 * Applied only where the API has no value, so a real value from Parliament always wins.
 * Each entry records who approved it and when.
 */
export type MpOverride = {
  name: string;
  postalAddress?: string[];
  approved: string;
};

export const mpOverrides: Record<number, MpOverride> = {
  5086: {
    name: "Josh Babarinde (Eastbourne)",
    // The address the Members API lists for 646 of the other MPs.
    postalAddress: ["House of Commons", "London", "SW1A 0AA"],
    approved: "Joshua Edwicker, 26 November 2026",
  },
};

// Decided 26 November 2026: no email override for Sir Julian Lewis (New Forest East).
// Parliament lists no email for him, and the brief rules out guessing one.
