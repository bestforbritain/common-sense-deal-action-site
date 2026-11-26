/**
 * Stannp: printing and posting letters.
 *
 * SAFETY RULE (brief, section 0). Stannp has a test mode, not a test environment:
 * `test` defaults to false and there are no separate test keys, so a create call that
 * leaves it out posts a real letter and charges the account.
 *
 * - Every Stannp create call goes through postLetter(). Nothing else may call Stannp's
 *   create endpoints.
 * - postLetter() sends test=true unless ALL of these are true:
 *     1. the STANNP_LIVE environment variable is exactly "true";
 *     2. the admin setting "Live posting" is on;
 *     3. this is the live Vercel deployment (VERCEL_ENV === "production"), so local and
 *        preview environments can never post for real, whatever STANNP_LIVE says.
 * - lib/stannp.test.ts proves test=true for every other combination.
 */

export const STANNP_API = "https://api-eu1.stannp.com/v1";

export type StannpRecipient = {
  title?: string;
  firstname: string;
  lastname?: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  postcode: string;
  country: "GB";
};

export type PostLetterInput = {
  /** Our letter id. Sent as the idempotency key. */
  letterId: string;
  /** The exact PDF the sender previewed and approvers checked. */
  pdf: Uint8Array;
  recipient: StannpRecipient;
  /** The admin "Live posting" setting, read from the database by the caller. */
  livePostingSetting: boolean;
  /** Postage add-on, e.g. "FIRST_CLASS". [TODO JOSHUA: postage class] */
  addons?: string[];
};

export type PostLetterResult = {
  test: boolean;
  /** Stannp's id. Always 0 in test mode. */
  stannpId: number;
  /** Cost in pence as reported by Stannp (test mode reports an indicative cost). */
  costPence: number | null;
  /** Stannp's sample PDF (test mode) or proof URL. */
  pdfUrl: string | null;
  status: string;
};

export type PostingEnv = {
  STANNP_LIVE?: string;
  VERCEL_ENV?: string;
};

/** The single decision point: true means a real, paid letter. */
export function isLivePosting(env: PostingEnv, livePostingSetting: boolean): boolean {
  return env.STANNP_LIVE === "true" && livePostingSetting === true && env.VERCEL_ENV === "production";
}

/** Builds the form body. `test` is always present, never left to Stannp's default. */
export function buildLetterForm(input: PostLetterInput, live: boolean): FormData {
  const form = new FormData();
  form.set("test", live ? "false" : "true");
  form.set("size", "A4");
  form.set("duplex", "false"); // one-sided: letters are one sheet
  form.set("clearzone", "true"); // Stannp prints the address in the window
  form.set("post_unverified", "false"); // don't post to an address Stannp can't verify
  for (const [key, value] of Object.entries(input.recipient)) {
    if (value) form.set(`recipient[${key}]`, value);
  }
  if (input.addons?.length) form.set("addons", input.addons.join(","));
  form.set("file", new Blob([input.pdf as BlobPart], { type: "application/pdf" }), `${input.letterId}.pdf`);
  return form;
}

type StannpResponse = {
  success: boolean;
  error?: string;
  data?: { id?: number | string; cost?: number | string; pdf?: string; status?: string };
};

export class StannpError extends Error {}

export async function postLetter(
  input: PostLetterInput,
  deps: { fetch?: typeof fetch; env?: PostingEnv; apiKey?: string } = {},
): Promise<PostLetterResult> {
  const env = deps.env ?? { STANNP_LIVE: process.env.STANNP_LIVE, VERCEL_ENV: process.env.VERCEL_ENV };
  const apiKey = deps.apiKey ?? process.env.STANNP_API_KEY;
  if (!apiKey) throw new StannpError("STANNP_API_KEY is not set");

  const live = isLivePosting(env, input.livePostingSetting);
  const res = await (deps.fetch ?? fetch)(`${STANNP_API}/letters/create`, {
    method: "POST",
    headers: {
      // API key as the basic-auth username with an empty password.
      authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      "x-idempotency-key": input.letterId,
    },
    body: buildLetterForm(input, live),
    signal: AbortSignal.timeout(60_000),
  });

  // A repeat of an identical request returns the original response with HTTP 409.
  const body = (await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }))) as StannpResponse;
  if ((!res.ok && res.status !== 409) || !body.success || !body.data) {
    throw new StannpError(`Stannp rejected the letter: ${body.error ?? `HTTP ${res.status}`}`);
  }

  const cost = body.data.cost === undefined ? null : Math.round(Number(body.data.cost) * 100);
  return {
    test: !live,
    stannpId: Number(body.data.id ?? 0),
    costPence: Number.isFinite(cost) ? cost : null,
    pdfUrl: body.data.pdf ?? null,
    status: body.data.status ?? (live ? "received" : "test"),
  };
}
