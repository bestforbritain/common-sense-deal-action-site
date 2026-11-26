/**
 * Sends one sample letter to each recipient (an MP and the Minister) through
 * postLetter() in Stannp TEST MODE, and saves Stannp's proof PDFs to phase4/stannp-proofs/.
 *
 * Test mode is forced: the environment passed to postLetter() is empty and the
 * "Live posting" setting is false, so isLivePosting() is false whatever is set locally.
 * Nothing is printed, posted or charged.
 *
 * Run with: STANNP_API_KEY=… npm run stannp:proof
 */
import { mkdir, writeFile } from "node:fs/promises";
import snapshot from "../data/constituencies.json";
import type { Constituency } from "../lib/constituencies/types";
import { buildLetter, letterTokens } from "../lib/letters";
import { renderLetterPdf } from "../lib/pdf/letterPdf";
import { ministerRecipient, mpRecipient } from "../lib/posted/service";
import { postLetter } from "../lib/stannp";

const constituency = (snapshot as Constituency[]).find((c) => c.slug === "manchester-central")!;
const mp = constituency.mp!;
const sender = {
  senderName: "Sample Sender",
  role: "Owner",
  businessName: "Sample Bakery Ltd",
  businessAddress: "1 Example Street\nManchester\nM1 1AE",
};
const outDir = new URL("../phase4/stannp-proofs/", import.meta.url);
await mkdir(outDir, { recursive: true });

for (const recipient of ["mp", "minister"] as const) {
  const text = buildLetter({
    sectorSlug: "retail",
    recipient,
    tokens: letterTokens({ sectorSlug: "retail", constituency: constituency.name, mp, sender }),
    personalParagraph: "We used to sell to shops in France and Ireland. Since 2021 the paperwork has made small orders uneconomic.",
  });
  const rendered = await renderLetterPdf(text);
  if (!rendered.ok) throw new Error(`Rendering the ${recipient} letter failed: ${rendered.reason}`);
  await writeFile(new URL(`${recipient}-our-pdf.pdf`, outDir), rendered.pdf);

  const result = await postLetter(
    {
      letterId: `proof-${recipient}-${rendered.sha256.slice(0, 12)}`,
      pdf: rendered.pdf,
      recipient: recipient === "mp" ? mpRecipient(mp)! : ministerRecipient(),
      livePostingSetting: false,
    },
    { env: {} }, // forces test mode
  );
  if (!result.test) throw new Error("Refusing to continue: postLetter did not use test mode");
  console.log(`${recipient}: test=${result.test}, indicative cost £${((result.costPence ?? 0) / 100).toFixed(2)}`);

  if (result.pdfUrl) {
    const proof = await fetch(result.pdfUrl);
    await writeFile(new URL(`${recipient}-stannp-proof.pdf`, outDir), new Uint8Array(await proof.arrayBuffer()));
    console.log(`  saved phase4/stannp-proofs/${recipient}-stannp-proof.pdf`);
  }
}
