import { describe, expect, it } from "vitest";
import { composeLink, MAILTO_MAX_LENGTH } from "./emailLinks";

const email = { to: "mp@parliament.uk", subject: "A Luton business & EU membership", body: "Dear MP,\n\nLine two" };

describe("composeLink", () => {
  it("builds a mailto: link with CRLF line breaks", () => {
    const { url, includesBody } = composeLink("mailto", email);
    expect(includesBody).toBe(true);
    expect(url).toBe("mailto:mp%40parliament.uk?subject=A%20Luton%20business%20%26%20EU%20membership&body=Dear%20MP%2C%0D%0A%0D%0ALine%20two");
  });

  it("builds Gmail and Outlook compose links", () => {
    const gmail = new URL(composeLink("gmail", email).url);
    expect(gmail.origin + gmail.pathname).toBe("https://mail.google.com/mail/");
    expect(gmail.searchParams.get("to")).toBe("mp@parliament.uk");
    expect(gmail.searchParams.get("su")).toBe(email.subject);
    expect(gmail.searchParams.get("body")).toBe(email.body);

    const outlook = new URL(composeLink("outlook", email).url);
    expect(outlook.origin + outlook.pathname).toBe("https://outlook.office.com/mail/deeplink/compose");
    expect(outlook.searchParams.get("subject")).toBe(email.subject);
  });

  it("drops the body when the link would be too long", () => {
    const long = { ...email, body: "word ".repeat(600) };
    const { url, includesBody } = composeLink("mailto", long);
    expect(includesBody).toBe(false);
    expect(url).not.toContain("body=");
    expect(url.length).toBeLessThanOrEqual(MAILTO_MAX_LENGTH);
    expect(url).toContain("subject=");
  });

  it("adds a BCC only when one is set", () => {
    expect(composeLink("mailto", { ...email, bcc: "count@example.org" }).url).toContain("bcc=count%40example.org");
    expect(composeLink("mailto", { ...email, bcc: null }).url).not.toContain("bcc=");
  });
});
