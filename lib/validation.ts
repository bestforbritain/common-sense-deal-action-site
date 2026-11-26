/** A deliberately loose email check: something@something.something, no spaces. */
export function isEmailFormat(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
