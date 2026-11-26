/**
 * Builds the constituency/MP snapshot from the UK Parliament Members API.
 *
 * The Members API has no ONS codes, so constituencies are joined to the ONS 2024
 * boundary list by exact name (650 of 650 matched on 26 November 2026). If that ever
 * stops being true, the build fails rather than writing a partial table.
 */
import { mpOverrides } from "@/content/mpOverrides";
import { slugify } from "@/lib/slug";
import type { Constituency, Mp, Nation } from "./types";

export const MEMBERS_API = "https://members-api.parliament.uk/api";
export const EXPECTED_CONSTITUENCIES = 650;

export type OnsConstituency = { code: string; name: string };
export type FetchJson = (url: string) => Promise<unknown>;

// Only the fields we use from the Members API.
type ApiMember = {
  id: number;
  nameDisplayAs: string;
  nameAddressAs: string | null;
  latestParty: { name: string };
  thumbnailUrl: string;
};
export type ApiConstituency = {
  id: number;
  name: string;
  endDate: string | null;
  currentRepresentation: { member: { value: ApiMember } } | null;
};
type ApiSearchPage = { items: { value: ApiConstituency }[]; totalResults: number };
type ApiContact = {
  type: string;
  typeId: number;
  line1: string | null;
  line2: string | null;
  line3: string | null;
  line4: string | null;
  line5: string | null;
  postcode: string | null;
  email: string | null;
};

const PARLIAMENTARY_OFFICE = 1;
const CONSTITUENCY_OFFICE = 4;

export class SnapshotError extends Error {}

function nationFromCode(code: string): Nation {
  switch (code[0]) {
    case "E":
      return "england";
    case "S":
      return "scotland";
    case "W":
      return "wales";
    case "N":
      return "northern-ireland";
    default:
      throw new SnapshotError(`Unexpected ONS code ${code}`);
  }
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Parliamentary-office email first, then constituency-office. Never constructed. */
export function pickEmail(contacts: ApiContact[]): string | null {
  for (const typeId of [PARLIAMENTARY_OFFICE, CONSTITUENCY_OFFICE]) {
    const email = clean(contacts.find((c) => c.typeId === typeId && clean(c.email))?.email);
    if (email) return email;
  }
  return null;
}

export function pickPostalAddress(contacts: ApiContact[]): string[] | null {
  const office = contacts.find((c) => c.typeId === PARLIAMENTARY_OFFICE);
  if (!office) return null;
  const lines = [office.line1, office.line2, office.line3, office.line4, office.line5]
    .map(clean)
    .filter((l): l is string => l !== null);
  const postcode = clean(office.postcode);
  if (lines.length === 0 || !postcode) return null;
  return [...lines, postcode];
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function fetchCurrentConstituencies(fetchJson: FetchJson): Promise<ApiConstituency[]> {
  const all: ApiConstituency[] = [];
  for (let skip = 0; ; skip += 20) {
    const page = (await fetchJson(`${MEMBERS_API}/Location/Constituency/Search?skip=${skip}&take=20`)) as ApiSearchPage;
    all.push(...page.items.map((i) => i.value));
    if (skip + 20 >= page.totalResults) break;
  }
  return all.filter((c) => c.endDate === null);
}

export async function buildSnapshot(options: {
  fetchJson: FetchJson;
  ons: OnsConstituency[];
  now?: Date;
}): Promise<Constituency[]> {
  const { fetchJson, ons } = options;
  const refreshedAt = (options.now ?? new Date()).toISOString();
  const onsByName = new Map(ons.map((o) => [o.name, o]));

  const current = await fetchCurrentConstituencies(fetchJson);

  const records = await mapLimit(current, 8, async (c) => {
    const match = onsByName.get(c.name);
    if (!match) throw new SnapshotError(`No ONS code for constituency "${c.name}"`);
    return toRecord(c, match, fetchJson, refreshedAt);
  });

  validateSnapshot(records, ons);
  return records.sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
}

/** Turns one Members API constituency (plus its MP's contacts) into a snapshot record. */
export async function toRecord(
  c: ApiConstituency,
  onsEntry: OnsConstituency,
  fetchJson: FetchJson,
  refreshedAt: string,
): Promise<Constituency> {
  let mp: Mp | null = null;
  const member = c.currentRepresentation?.member.value;
  if (member) {
    const contacts = ((await fetchJson(`${MEMBERS_API}/Members/${member.id}/Contact`)) as { value: ApiContact[] }).value;
    mp = {
      id: member.id,
      displayName: member.nameDisplayAs.trim(),
      addressAs: clean(member.nameAddressAs),
      party: member.latestParty.name,
      isSpeaker: member.latestParty.name === "Speaker",
      email: pickEmail(contacts),
      postalAddress: pickPostalAddress(contacts) ?? mpOverrides[member.id]?.postalAddress ?? null,
      thumbnailUrl: member.thumbnailUrl,
    };
  }
  return {
    onsCode: onsEntry.code,
    name: c.name,
    slug: slugify(c.name),
    nation: nationFromCode(onsEntry.code),
    mp,
    refreshedAt,
  };
}

export function validateSnapshot(records: Constituency[], ons: OnsConstituency[]): void {
  const problems: string[] = [];
  if (records.length !== EXPECTED_CONSTITUENCIES) {
    problems.push(`Expected ${EXPECTED_CONSTITUENCIES} constituencies, got ${records.length}`);
  }
  const codes = new Set(records.map((r) => r.onsCode));
  const missing = ons.filter((o) => !codes.has(o.code)).map((o) => o.name);
  if (missing.length) problems.push(`ONS constituencies with no record: ${missing.join(", ")}`);
  const slugs = new Set<string>();
  for (const r of records) {
    if (slugs.has(r.slug)) problems.push(`Duplicate slug ${r.slug}`);
    slugs.add(r.slug);
  }
  if (problems.length) throw new SnapshotError(problems.join("; "));
}
