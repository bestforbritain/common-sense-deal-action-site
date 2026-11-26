import { defineSectorLetters } from "./define";

// Word for word from inputs/letters.md, "Arts, culture and events".
export default defineSectorLetters({
  sectorNoun: "arts and events",
  // Decision 26 November 2026 (Joshua): the opening says "a business in the creative
  // industry" instead of "a {sectorNoun} business", which would read "a arts and events
  // business". Only this phrase changes; the rest of the shared opening is unchanged.
  openingPhrase: "a business in the creative industry",
  paragraph:
    "Artists, performers and event companies used to tour Europe freely. Now each country can set its own rules on work permits, equipment needs extra paperwork to cross borders, and limits on how long UK citizens can stay in the EU cut tours short. Many smaller acts and crews have found that European work no longer pays. EU membership would restore free movement for people and equipment, and reopen European audiences to UK talent.",
});
