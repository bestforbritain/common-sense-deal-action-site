/**
 * Compose links for the sender's own email account. We never send email for them.
 *
 * Long links are unreliable: some mail apps truncate mailto: links of around 2,000
 * characters, and webmail links fail at a few thousand. Over these limits the link
 * carries only To and Subject, and the caller copies the body to the clipboard.
 */
export const MAILTO_MAX_LENGTH = 1900;
export const WEBMAIL_MAX_LENGTH = 7000;

export type ComposeTarget = "mailto" | "gmail" | "outlook";
export type Email = { to: string; subject: string; body: string; bcc?: string | null };
export type ComposeLink = { url: string; includesBody: boolean };

// Mail clients expect CRLF line breaks in mailto: bodies (RFC 6068).
const enc = (s: string) => encodeURIComponent(s.replace(/\r?\n/g, "\r\n"));

function build(target: ComposeTarget, email: Email, withBody: boolean): string {
  const body = withBody ? email.body : "";
  switch (target) {
    case "mailto": {
      const params = [`subject=${enc(email.subject)}`];
      if (email.bcc) params.push(`bcc=${enc(email.bcc)}`);
      if (body) params.push(`body=${enc(body)}`);
      return `mailto:${encodeURIComponent(email.to)}?${params.join("&")}`;
    }
    case "gmail": {
      const params = new URLSearchParams({ view: "cm", fs: "1", to: email.to, su: email.subject });
      if (email.bcc) params.set("bcc", email.bcc);
      if (body) params.set("body", body);
      return `https://mail.google.com/mail/?${params}`;
    }
    case "outlook": {
      const params = new URLSearchParams({ to: email.to, subject: email.subject });
      if (email.bcc) params.set("bcc", email.bcc);
      if (body) params.set("body", body);
      return `https://outlook.office.com/mail/deeplink/compose?${params}`;
    }
  }
}

export function composeLink(target: ComposeTarget, email: Email): ComposeLink {
  const max = target === "mailto" ? MAILTO_MAX_LENGTH : WEBMAIL_MAX_LENGTH;
  const full = build(target, email, true);
  if (full.length <= max) return { url: full, includesBody: true };
  return { url: build(target, email, false), includesBody: false };
}
