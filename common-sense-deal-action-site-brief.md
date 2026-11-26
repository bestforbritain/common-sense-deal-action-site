# Common Sense Deal: business action site, build brief for Claude Code

Owner: Joshua Edwicker, Senior Content Officer, Best for Britain
Live campaign site: https://www.commonsensedeal.com (Squarespace)
This is a new, standalone site on its own subdomain: `[TODO JOSHUA: subdomain]`. It is a separate project from the Common Sense Deal business hub (maps and submissions). Don't share code, databases or deployments with it.

---

## 0. How to work on this

- Read this whole brief before writing any code. Then reply with:
  - a short plan;
  - your findings for every check in section 3;
  - any questions, including anything in this brief that looks wrong.
- Don't start building until I've answered.
- Work in the phases in section 14. At the end of each phase, stop, summarise what you did (with desktop and mobile screenshots once there is UI), and wait for my go-ahead.
- Use British English everywhere: UI copy, code comments and docs.
- Never invent statistics, quotes, sources, MP details or letter wording. Where something is missing, leave a clearly marked placeholder: `[TODO JOSHUA: …]`.
- Draft letter wording is in `inputs/letters.md` (exported from my doc). Copy it into `content/letters/` word for word. Don't rewrite or "improve" it; if something looks wrong, ask me.
- Keep editable content out of components:
  - public copy in `content/copy.ts`;
  - sectors in `content/sectors.ts`;
  - letters in `content/letters/` (one file per sector);
  - the Minister's details in `content/minister.ts`;
  - the list of actions in `content/actions.ts`.

### Stannp safety rule (read this twice)

Stannp has a test mode, not a test environment. The `test` parameter defaults to false and there are no separate test keys, so a create call that omits it posts a real letter and charges the account.

- Every Stannp create call must go through one function, `postLetter()`.
- That function sends `test=true` unless **both** of these are true:
  - the environment variable `STANNP_LIVE` is `true`;
  - the admin setting "Live posting" is switched on.
- `STANNP_LIVE` must never be `true` in local or preview environments.
- Write automated tests proving that `postLetter()` sends `test=true` in every other combination.
- Never call Stannp live during development, even "just once to check".

---

## 1. What we're building

A site that gets business owners to write to decision-makers about the UK's relationship with the EU.

1. They choose their **sector** and enter their **business postcode**.
2. They land on an **action page** for their constituency, showing their MP.
3. They take one or both actions:
   - **Email your MP**: a sector-specific letter, sent from their own email account.
   - **Send a posted letter**: a sector-specific letter to **their MP or the Minister** (they choose), printed and posted by Best for Britain through Stannp.

More actions will be added later, so the action page must render a config-driven list of action modules from `content/actions.ts`, each with an `enabled` flag and an order.

**Audience:** owners and managers of UK businesses, mostly small, on phones as often as desktops.
**Primary job:** get someone from the home page to a sent letter with as little friction as possible.

---

## 2. User flow

```
Home
  [Sector ▾]  [Business postcode]  (Find my MP)
        │
        ▼  server-side postcode lookup
Action page  /act/{constituency-slug}/{sector-slug}
  Your MP: name, party, constituency, photo
  ├── Email your MP
  │     details → editable letter → Open in my email app / Gmail / Outlook / Copy
  │     → "I've sent it" (self-reported count)
  └── Send a posted letter
        choose MP or Minister → details → editable letter → A4 PDF preview
        → submit → confirm by email → staff approval (default) → Stannp → posted
```

- The postcode is **never** put in a URL, analytics event or log line. Keep it in form state and in the submission record only.
- The action page URL contains only the constituency and sector slugs, so it is shareable and holds no personal data.
- If someone lands on an action page directly, ask for their postcode before sending anything, so we know they're a constituent.

---

## 3. Checks to do before building (Phase 0)

Report what you find for each, with links.

1. **Postcode to constituency**
   - Use postcodes.io (`GET https://api.postcodes.io/postcodes/{postcode}`).
   - Confirm it returns the 2024-boundary Westminster constituency (name and ONS code).
   - Plan handling for: invalid format, terminated postcodes, non-geographic postcodes, Channel Islands and Isle of Man (no MP).
   - Northern Ireland has MPs and is included. `[TODO JOSHUA: do NI businesses need different letter wording, given the Windsor Framework?]`
2. **Constituency to MP**
   - Use the UK Parliament Members API (https://members-api.parliament.uk).
   - Find the current MP for each constituency, their contact details (email and parliamentary postal address), the name to address them by, party and thumbnail.
   - Build a **local snapshot table** of all 650 constituencies: ONS code, name, slug, MP id, display name, address-as name, party, email, postal address, thumbnail URL, last refreshed.
   - Refresh it on a daily schedule. Use live API calls only as a fallback.
   - Report how many MPs have **no public email address** in the API. Never guess or construct an email address.
3. **Edge cases**
   - Vacant seats, the Speaker, and MPs who don't take their seats still have constituents. Show them normally unless contact details are missing.
   - Draft clear copy for each case in `content/copy.ts`, marked `[TODO JOSHUA: approve]`.
4. **Stannp**
   - Read https://www.stannp.com/uk/direct-mail-api/letters and the linked guide, design guidelines, idempotency-key and webhook pages.
   - Confirm:
     - the UK host (`api-eu1.stannp.com`) and authentication (API key as the basic-auth username);
     - which endpoint suits us: creating a letter from our own PDF plus recipient fields, or posting a fully merged PDF;
     - A4 layout rules: address window position, margins, safe areas, page limits;
     - how idempotency keys are sent;
     - which webhook events exist and how to verify they really came from Stannp;
     - how the return address for undelivered mail is set;
     - postage class options and the cost per letter.
   - Recommend an approach.
5. **Brand**
   - Use Playwright to screenshot https://www.commonsensedeal.com and `/for-businesses` at desktop and mobile widths.
   - Read the computed styles for headings, body text, buttons, links, form fields and backgrounds.
   - Note how the live site renders the campaign name ("Common Sense Deal").
   - Check font licensing before using any typeface.
   - Report the design tokens you'll use.
6. **Figures in the copy**
   - Open the Frontier Economics report via https://bestforbritain.org/publication/eu-uk-integration/ and confirm where the £92bn and £43bn figures appear.
   - If you can't find them, flag it. Don't change the copy.

---

## 4. Stack

- Next.js (App Router) and TypeScript, Supabase (Postgres, plus auth for the admin area), deployed on Vercel. This matches Best for Britain's other tools.
- **PDF generation:** recommend a library (e.g. `@react-pdf/renderer`). The preview the user sees must be the exact PDF that gets posted.
- **Transactional email** (confirmation links, "your letter has been posted"): recommend a provider with UK or EU data handling. `[TODO JOSHUA: confirm provider and account]`
- **Bot protection:** Cloudflare Turnstile or similar on every form that writes data.
- No browser storage is required. If you use it for convenience (e.g. keeping an unsent draft), it must fail gracefully.

---

## 5. Home page

### Layout

- **Desktop:** two columns above the fold.
  - **Left:** headline `[TODO JOSHUA: headline]`, one line of intro `[TODO JOSHUA]`, and the form:
    - **Sector**: a select list from `content/sectors.ts`, ending with "Other";
    - **Business postcode**: text input, `autocomplete="postal-code"`, formatted on blur;
    - button: **Find my MP**.
  - **Right:** a panel headed `[TODO JOSHUA: e.g. "Why EU membership is common sense"]`, containing copy block 1 and its source line.
- **Below the fold:** copy block 2 in full, followed by a short prompt that takes people back to the form.
- **Mobile:** form first, then the panel, then block 2.
- **Footer:** Best for Britain, privacy notice, contact. `[TODO JOSHUA: links]`

### Copy (store verbatim in `content/copy.ts`)

Where the source text reads ‘COMMON SENSE’ DEAL, store a token such as `{csd}` and render it the way the live site does, so the styling lives in one component.

**Block 1 (panel)**

> Red tape moving car parts from Germany shouldn’t cost jobs at car plants in Luton. British goods destined for French shops shouldn’t get stuck for twenty hours at Dover. And you shouldn’t be stopped from working or travelling in places like Paris, Barcelona, or Berlin.
>
> It’s just common sense.
>
> Our current deal with the EU is causing too much hassle for ordinary people and business owners.
>
> By rejoining the EU we can get rid of this unnecessary hassle. We can return freedom of movement. We can supercharge the UK economy and drive costs down.
>
> EU membership could deliver at least £92bn in economic growth, and £43bn in additional exports each and every year.
>
> It’s just common sense.

Source line under the panel: "Source: Frontier Economics for Best for Britain", linking to https://bestforbritain.org/publication/eu-uk-integration/

**Block 2 (below the fold)**

> If you run a business you’ll find that buying and selling parts, or selling your finished products, becomes faster and cheaper if the UK and the EU agree a {csd}. There will be fewer forms to fill in and transport costs will go down - mostly because ports like Dover won’t be bogged down with paperwork.
>
> As a customer you might notice that prices go down, or find a bigger range of products in your local supermarket. If you’re a motorist you might find that certain cars, that haven’t been on sale in the UK since 2019, start to be sold here again.
>
> And if the economy grows because a {csd} is struck, there won’t be so much need to cut public services that you and your family use.
>
> Wherever our current deal with the EU has made it harder for ordinary people to go about their lives, or buy the products that they want to, EU membership will deliver clarity and ease.
>
> It’s just common sense.

---

## 6. Postcode lookup and errors

- Normalise and validate the format in the browser, then look it up through a server route (never call third-party APIs directly from the browser).
- Rate-limit the lookup route.
- Error states say what happened and how to fix it:
  - postcode not recognised;
  - postcode with no MP (Channel Islands, Isle of Man);
  - lookup temporarily unavailable, with a retry.

---

## 7. Action page

- **MP card:** "{MP display name}, {party} MP for {constituency}", with photo (meaningful alt text) and the chosen sector, plus a link to change sector.
- **Actions:** rendered from `content/actions.ts`. For now:
  1. Email your MP
  2. Send a posted letter
- After someone completes one action, suggest the other.
- If the MP has no public email address, hide "Email your MP", explain why in one line, and point to the posted letter.

---

## 8. Letters

### Structure

- **A different letter for each sector, with an MP version and a Minister version.**
- One file per sector in `content/letters/`, each exporting `mp` and `minister` letters.
- To keep shared wording consistent, build letters from parts, with any part overridable per sector:
  1. opening (MP or Minister version);
  2. sector paragraph (the same paragraph in both versions);
  3. optional personal paragraph (see below);
  4. the ask, shared across sectors: the MP version asks the MP to support the UK rejoining the EU; the Minister version asks the government to signal that the UK intends to rejoin;
  5. sign-off with name, role, business name and business address.
- A sector may replace the whole letter if needed.
- **Tokens:** `{mpAddressAs}` (from the Members API's address-as name, e.g. "Dear Ms Smith"), `{constituency}`, `{sectorNoun}` (a short description per sector, e.g. "food and drink"), `{senderName}`, `{role}`, `{businessName}`, `{businessAddress}`, `{personalParagraph}`. The Minister version opens "Dear Minister".
- **Wording:** from `inputs/letters.md`: shared openings, asks, sign-off and email subject line, plus one paragraph and one `{sectorNoun}` per sector. It is a draft awaiting sign-off, so expect wording changes; keep it all in content files so they need no code changes.

### Sectors (`content/sectors.ts`)

Confirmed list. Each sector has a slug, a display name, and a field mapping it to the ONS broad industry group(s) used in the Commons Library business-count data, so we can add sector stats later:

- Food and drink production
- Farming, fishing and forestry
- Manufacturing and engineering
- Automotive (making, selling or repairing vehicles)
- Wholesale, import and export
- Retail
- Transport, haulage and logistics
- Hospitality and tourism
- Arts, culture and events
- Creative, media and digital
- Professional and financial services
- Construction
- Other (uses a general letter)

### Personal paragraph

- Optional field: "How has the current deal with the EU affected your business?"
- Limit: 1,000 characters, with a live count.

### Editing

- **Email letters:** fully editable before sending.
- **Posted letters:** fully editable (confirmed). Staff approve each one before it's posted.
- A posted letter must fit on one A4 sheet. Enforce this with the character limit and a page-count check on the generated PDF.

---

## 9. Action 1: Email your MP

- **Fields:** name, role, business name, business address or postcode (prefilled from the lookup, editable).
- **Letter:** the sector's MP letter, filled in and editable in a text area. Subject line `[TODO JOSHUA]`, also editable.
- **Sending** (from the user's own account; we never send it for them):
  - **Open in my email app** (`mailto:` with To, Subject and Body);
  - **Open in Gmail**;
  - **Open in Outlook**;
  - **Copy letter**.
  - If the body is too long for a reliable link, open the compose window with To and Subject only, copy the body to the clipboard, and say so.
- **Optional BCC** to a campaign address: `[TODO JOSHUA: address, or none]`
- **"I've sent it"** button: records a self-reported count with sector, constituency and time. No personal data unless they've opted in (see section 12).
- **Optional:** email field plus a marketing opt-in, unticked by default.

---

## 10. Action 2: Send a posted letter (Stannp)

### Recipient

The user chooses:
- **Your MP:** the parliamentary postal address from the Members API.
- **The Minister:** from `content/minister.ts`, so a reshuffle is a one-line change. Current values (from GOV.UK and the October 2026 List of Ministerial Responsibilities):
  - The Rt Hon Hamish Falconer MP
  - Minister of State (Minister for Intergovernmental Relations and European Relations)
  - Cabinet Office, 70 Whitehall, London SW1A 2AS
  - `[TODO JOSHUA: confirm address; Cabinet Office correspondence has also used 1 Horse Guards Road, London SW1A 2HQ]`

### Fields

- full name, role, business name;
- business address (printed on the letter so the recipient can reply), with the postcode prefilled;
- email address: used for confirmation only, never printed;
- required checkbox: "I agree to Best for Britain printing and posting this letter in my name" (draft wording: `[TODO JOSHUA: approve]`);
- marketing opt-in: separate, unticked by default.

### Preview and submit

- Show the exact A4 PDF that will be posted before they submit.
- A small footer line on the letter, e.g. "Sent via commonsensedeal.com, a Best for Britain campaign": `[TODO JOSHUA: include or not, and wording]`

### Status lifecycle

```
awaiting_confirmation → awaiting_approval → queued → sending → sent → dispatched
                                         ↘ rejected            ↘ failed / returned
```

- **awaiting_confirmation:** we email a confirmation link (expires after 48 hours). Nothing is queued until it's clicked.
- **awaiting_approval:** staff approval, on by default (confirmed). If an admin switches on auto-send, confirmed letters go straight to `queued`.
- **sending → sent:** `postLetter()` calls Stannp with an idempotency key equal to our letter id, and stores Stannp's id and cost.
- **dispatched / returned / failed:** updated from verified Stannp webhooks.
- **rejected:** an internal reason is stored. `[TODO JOSHUA: should the sender be told?]`
- Emails to the sender: when they confirm, and when the letter is posted.

### Limits and cost controls

- One letter per email address per recipient (one to their MP, one to the Minister).
- **No spending caps while staff approval is on** (confirmed): approvers control the pace and the spend.
- Build a daily cap and a total budget cap into admin settings anyway, both off by default. Auto-send can only be switched on once a total budget cap is set. When a cap is reached, new letters wait in the queue, and the confirmation page says there may be a delay.
- Turnstile and per-IP rate limiting on submission.
- An automatic flag for profanity or abusive content, shown to approvers.
- Postage class: `[TODO JOSHUA]`. Black and white or colour: `[TODO JOSHUA]`.
- Account and payment: Best for Britain has a Stannp account and pays for the letters. `[TODO JOSHUA: who holds the API key]`

---

## 11. Admin area

- `/admin`, using Supabase auth (magic link), restricted to an allowlist of staff emails set in an environment variable.
- **Queue:** filter by status, recipient and sector; open the PDF; see flags; approve, reject, or bulk-approve.
- **Settings:**
  - auto-send (default off);
  - live posting (default off; see the safety rule in section 0);
  - daily cap and total budget cap (off by default; a budget cap is required before auto-send can be switched on);
  - spend so far, from Stannp's reported costs.
- **Stats:** self-reported emails sent, letters by status, by sector, by constituency and by recipient.
- CSV exports: letters (with status and sector), self-reported emails, and a separate export of people who opted in to marketing, with the opt-in time and wording version. This is how staff get data out; there is no CRM integration.
- An audit log of every admin action.

---

## 12. Data, privacy and security

- Best for Britain is the data controller. Link the privacy notice: `[TODO JOSHUA: URL]`
- Collect only the fields listed above.
- Data stays in the site's own database. No CRM integration.
- **Marketing opt-in:** offered on both actions, unticked by default, and separate from the consent to post a letter. Store when they opted in and the exact wording they saw. Draft wording: `[TODO JOSHUA: approve]`
- Retention period for personal data: `[TODO JOSHUA]`. Build a scheduled job to delete it when the period ends, keeping anonymised counts.
- Stannp processes names and addresses: `[TODO JOSHUA: confirm the data processing agreement]`
- No personal data in URLs, analytics or logs.
- Supabase service keys and the Stannp key are server-only. Enable row-level security on every table; the public can only write through server routes.
- Analytics: privacy-friendly or none. `[TODO JOSHUA: which?]`
- Set security headers and a content security policy.
- Accessibility: WCAG 2.2 AA. Labelled fields, clear error messages linked to their fields, visible keyboard focus, works at 320px wide, respects reduced motion.

---

## 13. Look and feel

- **Match commonsensedeal.com** using the tokens from check 5: colours, type, buttons and form styles. It should feel like part of the same campaign, not a new brand.
- The form and the copy panel are the page. Don't add decoration the live site doesn't have: no stat tiles, no numbered markers (except where content really is a sequence), no all-caps eyebrow labels, no arrows tacked onto button text.
- Use at most one deliberate piece of motion, e.g. the MP card appearing on the action page. Respect reduced-motion settings.
- **Button labels name the action**, and the same name follows through the flow: "Find my MP", "Open in my email app", "Preview my letter", "Send my letter" → confirmation page "Your letter is on its way to approval" (draft: `[TODO JOSHUA: approve]`).
- Errors say what went wrong and how to fix it, without apologising or being vague.

---

## 14. Phases

**Phase 0: checks and plan.** Section 3 checks, brand extraction, plan and questions. No application code. Stop.

**Phase 1: scaffold and home page.** Project setup, design tokens, home page with copy, panel, source line and form (lookup stubbed). Desktop and mobile screenshots. Stop.

**Phase 2: lookup and action page.** Constituency/MP snapshot table with scheduled refresh, postcode lookup route, action page with MP card and sector, all edge cases and error states, with tests. Stop.

**Phase 3: letters and email action.** Letter content from `inputs/letters.md`, sector and recipient selection, Email your MP flow end to end. Stop.

**Phase 4: posted letters.** Form, PDF generation and preview, confirmation email, database, admin queue and settings, and Stannp in **test mode** end to end. Show me Stannp's test-mode proof PDFs for both recipients. Stop.

**Phase 5: hardening and launch prep.** Caps, abuse controls, webhooks, retention job, accessibility audit, privacy review, and a launch checklist. Live posting is switched on only when I say so.

---

## 15. Placeholders I still need to fill

Subdomain · headline and intro line · panel heading · footer links · NI wording · sign-off of the draft letters · BCC address · Minister's address · consent wording · marketing opt-in wording · letter footer line · rejection notice · postage class and colour · Stannp API key holder · transactional email provider · privacy notice URL · retention period · Stannp data processing agreement · analytics
