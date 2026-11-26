import ons from "@/data/ons-pcon-2024.json";
import { findSector } from "@/content/sectors";
import { listEmailSends } from "@/lib/records";
import { getPostedStore } from "@/lib/posted/store";

const constituencyName = new Map(ons.map((o) => [o.code, o.name]));
export const nameForOns = (code: string) => constituencyName.get(code) ?? code;
export const sectorName = (slug: string) => findSector(slug)?.name ?? slug;

export type Count = { label: string; count: number };

function countBy<T>(items: T[], key: (item: T) => string): Count[] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export async function getStats() {
  const [emails, letters] = await Promise.all([listEmailSends(), getPostedStore().allLetters()]);
  // Unconfirmed and expired letters are left out of the letter counts.
  const real = letters.filter((l) => !["awaiting_confirmation", "expired"].includes(l.status));
  return {
    emails: {
      total: emails.length,
      bySector: countBy(emails, (e) => sectorName(e.sector)),
      byConstituency: countBy(emails, (e) => nameForOns(e.onsCode)),
    },
    letters: {
      total: real.length,
      byStatus: countBy(letters, (l) => l.status.replace(/_/g, " ")),
      byRecipient: countBy(real, (l) => (l.recipientType === "mp" ? "MP" : "Minister")),
      bySector: countBy(real, (l) => sectorName(l.sector)),
      byConstituency: countBy(real, (l) => l.constituencyName),
    },
  };
}
