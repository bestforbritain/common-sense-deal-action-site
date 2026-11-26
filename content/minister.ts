/**
 * The Minister who receives posted letters. A reshuffle is a change to this file only.
 *
 * Source: GOV.UK (appointed 20 July 2026) and the October 2026 List of Ministerial
 * Responsibilities. Address: GOV.UK's Cabinet Office correspondence address.
 * [TODO JOSHUA: confirm address; Cabinet Office correspondence has also used 1 Horse Guards Road, London SW1A 2HQ]
 */
export const minister = {
  /** As printed in the address window. */
  name: "The Rt Hon Hamish Falconer MP",
  role: "Minister of State (Minister for Intergovernmental Relations and European Relations)",
  /** Short label for the recipient choice. */
  shortLabel: "The Minister for European Relations",
  organisation: "Cabinet Office",
  address: {
    line1: "70 Whitehall",
    city: "London",
    postcode: "SW1A 2AS",
  },
} as const;
