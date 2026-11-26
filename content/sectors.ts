/**
 * Business sectors, in the order they appear in the form. The list is confirmed in the brief.
 *
 * `onsGroups` maps each sector to the ONS broad industry group(s) used in the
 * Commons Library's UK Business Counts data, so sector statistics can be added later.
 * [TODO JOSHUA: check mapping] Some sectors only partly match an ONS group
 * (e.g. food and drink production sits inside "Manufacturing").
 */

export type OnsBroadIndustryGroup =
  | "Agriculture, forestry & fishing"
  | "Mining, quarrying & utilities"
  | "Manufacturing"
  | "Construction"
  | "Motor trades"
  | "Wholesale"
  | "Retail"
  | "Transport & storage (inc postal)"
  | "Accommodation & food services"
  | "Information & communication"
  | "Financial & insurance"
  | "Property"
  | "Professional, scientific & technical"
  | "Business administration & support services"
  | "Public administration & defence"
  | "Education"
  | "Health"
  | "Arts, entertainment, recreation & other services";

export type Sector = {
  slug: string;
  name: string;
  onsGroups: OnsBroadIndustryGroup[];
};

export const sectors: readonly Sector[] = [
  { slug: "food-and-drink", name: "Food and drink production", onsGroups: ["Manufacturing"] },
  { slug: "farming-fishing-forestry", name: "Farming, fishing and forestry", onsGroups: ["Agriculture, forestry & fishing"] },
  { slug: "manufacturing-engineering", name: "Manufacturing and engineering", onsGroups: ["Manufacturing"] },
  { slug: "automotive", name: "Automotive (making, selling or repairing vehicles)", onsGroups: ["Motor trades", "Manufacturing"] },
  { slug: "wholesale-import-export", name: "Wholesale, import and export", onsGroups: ["Wholesale"] },
  { slug: "retail", name: "Retail", onsGroups: ["Retail"] },
  { slug: "transport-logistics", name: "Transport, haulage and logistics", onsGroups: ["Transport & storage (inc postal)"] },
  { slug: "hospitality-tourism", name: "Hospitality and tourism", onsGroups: ["Accommodation & food services"] },
  { slug: "arts-culture-events", name: "Arts, culture and events", onsGroups: ["Arts, entertainment, recreation & other services"] },
  { slug: "creative-media-digital", name: "Creative, media and digital", onsGroups: ["Information & communication"] },
  { slug: "professional-financial", name: "Professional and financial services", onsGroups: ["Professional, scientific & technical", "Financial & insurance"] },
  { slug: "construction", name: "Construction", onsGroups: ["Construction"] },
  { slug: "other", name: "Other", onsGroups: [] },
];

export function findSector(slug: string): Sector | undefined {
  return sectors.find((s) => s.slug === slug);
}
