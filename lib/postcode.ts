/**
 * Browser-side postcode helpers. The server re-checks everything in Phase 2;
 * these only catch typos early and tidy the format.
 */

// Standard UK postcode shape: outward code (2–4 chars) + inward code (digit + 2 letters).
const POSTCODE_PATTERN = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/;

/** Uppercases, strips everything but letters and digits. */
export function compactPostcode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Returns true if the input has the shape of a full UK postcode. */
export function isPostcodeFormat(input: string): boolean {
  return POSTCODE_PATTERN.test(compactPostcode(input));
}

/**
 * Formats a postcode as "SW1A 1AA". Returns the input trimmed and uppercased
 * if it doesn't look like a postcode, so we never mangle what someone typed.
 */
export function formatPostcode(input: string): string {
  const compact = compactPostcode(input);
  if (!POSTCODE_PATTERN.test(compact)) return input.trim().toUpperCase();
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}
