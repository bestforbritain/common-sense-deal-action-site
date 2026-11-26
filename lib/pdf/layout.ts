/**
 * A4 letter layout for Stannp.
 *
 * Stannp prints the recipient's address itself (clearzone=true) in the window area at
 * the top left, so the top of our page is left blank.
 *
 * [TODO: confirm every measurement against Stannp's downloadable A4 letter guide
 * (https://www.stannp.com/uk/design-specs), parked by Joshua for later.] Until then
 * these are conservative: the whole top band is kept clear. Stannp's test-mode proof
 * PDFs will show any clash.
 */
export const MM = 72 / 25.4; // PDF points per millimetre

export const LAYOUT = {
  pageSize: "A4" as const,
  /** Kept clear for Stannp's address window and clear zones. */
  topClearMm: 95,
  sideMarginMm: 20,
  bottomMarginMm: 18,
  fontSizePt: 10.5,
  lineHeight: 1.38,
  paragraphGapPt: 7,
  /** Fixed metadata date, so the same letter always produces byte-identical PDFs. */
  fixedDate: new Date("2026-01-01T00:00:00Z"),
};

/** Letter text longer than this is refused before rendering. One page holds roughly 3,800. */
export const MAX_LETTER_CHARACTERS = 3800;
