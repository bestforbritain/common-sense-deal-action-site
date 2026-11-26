/**
 * Transactional email (confirmation links, "your letter has been posted").
 *
 * The provider isn't chosen yet ([TODO JOSHUA: confirm provider and account]). Until it
 * is, emails go to a development outbox: kept in memory and shown at /dev/outbox when
 * running locally. On the live site, sending fails loudly instead of silently dropping.
 */
export type OutgoingEmail = { to: string; subject: string; text: string };
export type OutboxEntry = OutgoingEmail & { sentAt: string };

const globalOutbox = globalThis as unknown as { __csdOutbox?: OutboxEntry[] };

export function devOutbox(): OutboxEntry[] {
  return (globalOutbox.__csdOutbox ??= []);
}

export class EmailNotConfiguredError extends Error {}

export async function sendEmail(email: OutgoingEmail): Promise<void> {
  if (process.env.VERCEL_ENV === "production") {
    throw new EmailNotConfiguredError("No transactional email provider is configured");
  }
  devOutbox().unshift({ ...email, sentAt: new Date().toISOString() });
  console.info(`[outbox] Email queued for /dev/outbox: "${email.subject}"`);
}
