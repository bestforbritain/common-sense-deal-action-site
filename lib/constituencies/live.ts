/** Fallback: builds one constituency record straight from the Members API. */
import { MEMBERS_API, toRecord, type ApiConstituency, type FetchJson, type OnsConstituency } from "./snapshot";
import type { Constituency } from "./types";

export async function buildRecordLive(onsEntry: OnsConstituency, fetchJson: FetchJson): Promise<Constituency | null> {
  const url = `${MEMBERS_API}/Location/Constituency/Search?searchText=${encodeURIComponent(onsEntry.name)}&take=20`;
  const page = (await fetchJson(url)) as { items: { value: ApiConstituency }[] };
  const match = page.items.map((i) => i.value).find((c) => c.name === onsEntry.name && c.endDate === null);
  if (!match) return null;
  return toRecord(match, onsEntry, fetchJson, new Date().toISOString());
}
