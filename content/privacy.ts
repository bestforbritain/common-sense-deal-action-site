/**
 * Data retention for posted letters.
 *
 * After this many days, a letter's personal data is removed (name, role, business name
 * and address, email, letter text and the PDF), keeping only sector, constituency,
 * recipient, status and dates for counts. Only letters in a final state are touched.
 *
 * null means "not decided yet": the job runs but deletes nothing.
 * [TODO JOSHUA: retention period]
 *
 * Marketing opt-ins are not covered: they're kept until the person unsubscribes, under
 * Best for Britain's normal supporter data policy. [TODO JOSHUA: confirm]
 */
export const LETTER_RETENTION_DAYS: number | null = null;
