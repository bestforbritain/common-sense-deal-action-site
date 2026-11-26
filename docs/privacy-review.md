# Privacy review

Reviewed 26 November 2026 against the brief (section 12). Best for Britain is the data controller. This is a working review for the team and whoever handles data protection; it isn't legal advice.

## What the site collects, and where it goes

| Where | Data | Stored? | Sent to |
| --- | --- | --- | --- |
| Home page form | Sector, business postcode | **Not stored by us.** The postcode stays in the browser (session storage) to prefill the address. | postcodes.io (third party) to find the constituency. The postcode is in the request path to postcodes.io, but never in our own URLs, logs or analytics. |
| Email your MP | Name, role, business, address, optional paragraph | **No.** Everything stays in the browser. | The sender's own email app, or Gmail or Outlook if they choose those buttons (see open question 1). |
| "I've sent it" | Sector, constituency, time | Yes (`email_sends`) | Nobody |
| Marketing opt-in (both actions) | Email address, time, exact wording and its version | Yes (`marketing_optins`), only if the box is ticked | Nobody (exported by staff as CSV) |
| Posted letter | Name, role, business name and address, email, letter text, PDF | Yes (`letters` table and private `letters` bucket), until the retention period ends | **Stannp** (letter PDF and the recipient's address); **email provider** (sender's email and name, for confirmation emails) |
| Rate limiting | IP address | **Only as a salted hash**, kept for a day | Nobody |
| Bot check | IP address, browser signals | No | **Cloudflare Turnstile** |
| Admin sign-in | Staff email, session cookie | Supabase Auth | Supabase |

## Where data is held

- **Database and files:** Supabase, London region (`eu-west-2`, to be chosen when the project is created).
- **Hosting:** Vercel, with server functions in London (`lhr1`). Vercel's own request logs (IP addresses, URLs) are kept by Vercel. Our URLs contain no personal data: confirmation tokens appear in a URL, but they're random and identify nothing on their own.
- **Processors needing a data processing agreement:** Supabase, Vercel, Stannp, Cloudflare and the transactional email provider. Most are standard click-through DPAs in each account's settings.

## Controls in place

- Row-level security is on for every table, with no public policies: only the server, using the service role key, can read or write.
- Keys are server-only and never sent to the browser.
- There's no analytics. The only cookie is the admin sign-in cookie (strictly necessary), so public pages need no cookie banner.
- Session storage holds the confirmed postcode for the current visit only, and is needed for the service the person asked for.
- Logs: every log line was checked. None includes a postcode, email address, name or letter text.
- Admin access is limited to the staff allowlist. Every approval, rejection, settings change and export is written to the audit log.
- The letters CSV contains no personal data. Personal data leaves the system only through the opt-in export.
- The consent to post a letter in someone's name is separate from the marketing opt-in, and the opt-in is unticked by default.
- Retention: a daily job removes personal data from finished letters after the retention period, keeping counts. **It deletes nothing until the period is set** in `content/privacy.ts`.

## Open questions

1. **Gmail and Outlook buttons:** these put the letter, including the business address, into a link to Google or Microsoft. It's the sender's own choice, but it means that data passes through a URL. The alternative is to open those two with only To and Subject, and copy the body for the sender to paste.
2. **Retention period** for posted-letter data. Six or twelve months after posting are common choices.
3. **Opt-ins:** keep them until the person unsubscribes, as with other supporter data? Who imports the CSV into Best for Britain's systems, and how often?
4. **Privacy notice:** Best for Britain's notice needs to cover this site: the purposes, Stannp as a processor, the retention period, and that letters are posted in the sender's name. Link it in the footer.
5. **Rejected letters:** should the sender be told? (The brief leaves this open.) At the moment they aren't.
6. **Data subject requests:** there's no admin tool yet. To find or delete someone's data, search `letters.email` and `marketing_optins.email` in Supabase. A small admin search could be added if requests are expected.
7. **Northern Ireland:** the site refuses NI postcodes (Great Britain only), so no NI data is collected.
