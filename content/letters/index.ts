import type { SectorLetters } from "./define";
import artsCultureEvents from "./arts-culture-events";
import automotive from "./automotive";
import construction from "./construction";
import creativeMediaDigital from "./creative-media-digital";
import farmingFishingForestry from "./farming-fishing-forestry";
import foodAndDrink from "./food-and-drink";
import hospitalityTourism from "./hospitality-tourism";
import manufacturingEngineering from "./manufacturing-engineering";
import other from "./other";
import professionalFinancial from "./professional-financial";
import retail from "./retail";
import transportLogistics from "./transport-logistics";
import wholesaleImportExport from "./wholesale-import-export";

/** Letters by sector slug (see content/sectors.ts). */
export const lettersBySector: Record<string, SectorLetters> = {
  "food-and-drink": foodAndDrink,
  "farming-fishing-forestry": farmingFishingForestry,
  "manufacturing-engineering": manufacturingEngineering,
  automotive,
  "wholesale-import-export": wholesaleImportExport,
  retail,
  "transport-logistics": transportLogistics,
  "hospitality-tourism": hospitalityTourism,
  "arts-culture-events": artsCultureEvents,
  "creative-media-digital": creativeMediaDigital,
  "professional-financial": professionalFinancial,
  construction,
  other,
};

/** The sector's letters, or the general "Other" letters for an unknown slug. */
export function lettersFor(sectorSlug: string): SectorLetters {
  return lettersBySector[sectorSlug] ?? other;
}

export type { LetterTemplate, Recipient, SectorLetters } from "./define";
export { emailSubject, personalParagraphPrompt } from "./shared";
