import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { copy, fill } from "@/content/copy";
import { findSector } from "@/content/sectors";
import { getConstituencyBySlug } from "@/lib/constituencies/store";
import { ActionArea } from "@/components/ActionArea";
import { ChangeSector } from "@/components/ChangeSector";
import { MpCard } from "@/components/MpCard";
import styles from "./page.module.css";

/**
 * /act/{constituency-slug}/{sector-slug}
 *
 * The URL holds only the two slugs, so it's shareable and contains no personal data.
 * Constituency data is cached and invalidated by the daily refresh (tag "constituencies").
 */
async function getConstituency(slug: string) {
  "use cache";
  cacheTag("constituencies");
  cacheLife("days");
  const constituency = await getConstituencyBySlug(slug);
  // Great Britain only (decision 26 November 2026).
  return constituency && constituency.nation !== "northern-ireland" ? constituency : null;
}

// Blocking rather than streaming, so unknown slugs return a real 404 status instead of
// a 200 shell followed by a not-found message. Each page is cached after its first visit.
export const instant = false;

export async function generateStaticParams() {
  // A sample for build-time validation; other pages render on first request and are then cached.
  return [{ constituency: "cities-of-london-and-westminster", sector: "retail" }];
}

export async function generateMetadata({ params }: PageProps<"/act/[constituency]/[sector]">): Promise<Metadata> {
  const { constituency: slug } = await params;
  const constituency = await getConstituency(slug);
  if (!constituency) return {};
  return { title: `${fill(copy.action.pageTitle, { constituency: constituency.name })} | A ‘Common Sense’ Deal with Europe` };
}

export default async function ActionPage({ params }: PageProps<"/act/[constituency]/[sector]">) {
  const { constituency: slug, sector: sectorSlug } = await params;
  const sector = findSector(sectorSlug);
  const constituency = sector ? await getConstituency(slug) : null;
  if (!sector || !constituency) notFound();

  return (
    <div className={styles.page}>
      <MpCard constituency={constituency} />
      <ChangeSector constituencySlug={constituency.slug} sector={sector} />
      <ActionArea constituency={constituency} sector={sector} />
    </div>
  );
}
