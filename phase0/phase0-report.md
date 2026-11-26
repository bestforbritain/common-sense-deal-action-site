# Phase 0 report: checks, brand, plan and questions

## Decisions (Joshua, 26 November 2026)

1. **Letter salutation:** "Dear {nameAddressAs}" where it is set, otherwise "Dear {nameDisplayAs}". Never built from the gender field.
2. **Panel figures:** the £92bn is presented as a long-run figure. Proposed line (awaiting approval): "EU membership could deliver at least £92bn in economic growth in the long run, and £43bn in additional exports each and every year." This differs from the live site.
3. **Great Britain only:** Northern Ireland is out of scope. BT postcodes get a "not covered" message, the same way the Channel Islands and Isle of Man do. The NI wording TODO is dropped.
4. **Arts, culture and events:** the opening reads "a business in the creative industry" instead of "a {sectorNoun} business". This is a sector-level override; the rest of the letter stays word for word.
5. **Stannp design guide:** later.
6. **Mobile screenshots:** captured in the built-in browser at 375px (`home-mobile.jpg`, `for-businesses-mobile.jpg`).
   - Type at mobile width: H1 45.2px / 47.8px, H4 21.8px, body 16px / 24px (weight 600, unchanged), button text 23.3px.
   - The campaign-name highlight wraps across lines as separate red blocks.
   - On the live home page at phone width, the large hero lock-up runs off the right-hand edge. We won't copy that.
7. **Logo:** no SVGs. For now, use a crop of the screenshot as a placeholder, because the logo will change.
8. **Minister:** the current Minister (Hamish Falconer, Cabinet Office, 70 Whitehall) replaces the former Minister.
9. **Josh Babarinde (Eastbourne):** posted letters go to House of Commons, London SW1A 0AA (decided in Phase 2). The address is set in `content/mpOverrides.ts` and is used only while Parliament's API has no address for him.
10. **Sir Julian Lewis (New Forest East):** posted letter only. No email address is guessed for him.

Checked on 26 November 2026. No application code has been written. Stannp has not been called at all (not even in test mode).

Screenshots are in `phase0/screenshots/`.

---

## 1. Postcode to constituency (postcodes.io)

`GET https://api.postcodes.io/postcodes/{postcode}` works and returns the 2024-boundary constituency in `parliamentary_constituency_2024` (name) and `codes.parliamentary_constituency_2024` (ONS code, e.g. `E14001352` Manchester Central, `N05000002` Belfast North). The older `parliamentary_constituency` field now holds the same 2024 values. Use the `_2024` fields explicitly.

What each case returns, tested live:

| Case | Example | Response | Plan |
| --- | --- | --- | --- |
| Valid GB / NI | M1 1AE, BT48 6DQ | 200, name and code | Normal |
| Large-user postcode | SW1A 1AA, W1A 1AA | 200, name and code | Normal |
| Channel Islands | GY1 1AA, JE2 4WD | **200**, `country: "Channel Islands"`, constituency `null`, code `L99999999` | "No MP" message |
| Isle of Man | IM1 3PW, IM2 4NA | **200**, `country: "Isle of Man"`, constituency `null`, code `M99999999` | "No MP" message |
| Terminated | E1W 1UU | 404 on `/postcodes`; 200 on `/terminated_postcodes/E1W1UU` with year and month retired | Say it was retired and ask for the current postcode |
| Non-geographic (BX) | BX1 1LT | 404, same as invalid | Can't be told apart from a typo, so the "not recognised" message mentions PO Boxes and non-geographic postcodes |
| Invalid | XX1 1XX | 404 "Postcode not found" | "Not recognised" message |

So "no MP" is detected by a 200 response with a null constituency, not by a 404. A format check runs first in the browser and again on the server.

## 2. Constituency to MP (Members API)

I downloaded all current constituencies and every MP's contact record from https://members-api.parliament.uk (`/api/Location/Constituency/Search`, `/api/Members/{id}/Contact`).

- **650 current constituencies, 650 sitting MPs, no vacancies today.**
- **The Members API has no ONS codes.** I joined by name to the ONS list ([PCON_2024_UK_NC_v2](https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/PCON_2024_UK_NC_v2/FeatureServer/0)): **650 of 650 names match exactly.** The snapshot refresh will fail loudly if that ever stops being true.
- **No email address anywhere in the API: 2 MPs.**
  - Sir Julian Lewis (Conservative, New Forest East)
  - Órfhlaith Begley (Sinn Féin, West Tyrone)
- 6 more have an email only on their constituency-office entry, not the parliamentary one (James Frith, Sir Lindsay Hoyle, Danny Kruger, Josh Babarinde, Clive Efford, Abena Oppong-Asare). That address is listed in the API, so using it isn't guessing. Proposed rule: use the parliamentary-office email, then the constituency-office email, and never construct one.
- 44 MPs list more than one distinct email address, and 13 have stray spaces in an address (e.g. `"contact@lucypowell.org.uk "`). The refresh will trim them.
- **Postal address:** 649 MPs have a parliamentary-office address. **Josh Babarinde (Eastbourne) has none in the API.**
- **Address-as name (important, see Q1):** `nameAddressAs` is **empty for 457 MPs**, holds the full name for 148 (e.g. "Lucy Powell"), and holds a title-and-surname form for only 45. The letters assume "Dear Ms Smith" comes from this field. It mostly won't.
- Party and thumbnail are always present. Thumbnails are at `/api/Members/{id}/Thumbnail`.
- The snapshot table in the brief (ONS code, name, slug, MP id, display name, address-as, party, email, postal address, thumbnail, last refreshed) can be built as written.

## 3. Edge cases

- **Speaker:** Sir Lindsay Hoyle (Chorley). Party comes back as "Speaker", so the MP card would say "Speaker MP for Chorley". He needs his own wording. His `nameAddressAs` is "Sir Lindsay".
- **Sinn Féin:** 7 MPs who don't take their seats. All have contact details except Órfhlaith Begley, who has no email.
- **Vacant seats:** none today, but by-elections will happen. When a seat is vacant the API's `currentRepresentation` is null.
- **Minister is your MP:** if the sender's MP is also the Minister, the two recipient choices go to the same person.

Draft copy to go in `content/copy.ts`, all marked `[TODO JOSHUA: approve]`:

- Vacant seat: "{constituency} doesn't have an MP at the moment. You can still send a posted letter to the Minister."
- Speaker: "Sir Lindsay Hoyle is the Speaker of the House of Commons and MP for Chorley. The Speaker stays politically neutral, but still represents constituents and can raise their concerns with ministers."
- Sinn Féin / not taking seat: "{name} doesn't take their seat in the House of Commons, but still represents {constituency} and can raise your concerns."
- No email: "{name} doesn't publish an email address, so you can't email them from here. You can send them a posted letter instead."
- No postal address: "We don't have a postal address for {name}, so you can't send them a posted letter from here."
- Channel Islands / Isle of Man: "{place} isn't represented in the UK Parliament, so there's no MP to write to. You can still write to the Minister."
- Retired postcode: "That postcode was retired in {year}. Please enter your business's current postcode."
- Not recognised: "We don't recognise that postcode. Check it's the postcode of your business premises, not a PO Box."

## 4. Stannp

Sources: [letters API](https://www.stannp.com/uk/direct-mail-api/letters), [guide](https://www.stannp.com/uk/direct-mail-api/guide), [webhooks](https://www.stannp.com/uk/direct-mail-api/webhooks), [design specs](https://www.stannp.com/uk/design-specs), [pricing](https://www.stannp.com/uk/pricing), [letters product page](https://www.stannp.com/uk/letters).

- **Host and authentication:** confirmed `https://api-eu1.stannp.com/v1/...`. The API key goes in as the basic-auth username with an empty password. (An `api_key` query parameter also works. Don't use it: it puts the key in URLs and logs.)
- **Endpoints:**
  - `POST /v1/letters/create` takes our own PDF (`file`) plus `recipient[...]` fields (title, firstname, lastname, company, address1, address2, city, postcode, country). Other options: `size=A4`, `duplex`, `clearzone`, `post_unverified`, `addons`, `tags`.
  - `POST /v1/letters/post` takes a fully merged PDF and reads the address off it with OCR.
  - **Recommendation:** use `letters/create` with our own PDF, leave the address window blank, and pass the recipient as fields. That avoids OCR errors, means Stannp verifies the address (set `post_unverified=false`), and lets us set `duplex=false` for a single sheet.
- **Test mode:** `test=true` returns a sample-PDF URL, `id: 0` and `status: "test"`, with "no charge". Our own records need their own ID because test mode always returns 0.
- **A4 layout:** the address-window position, margins, safe areas and bleed **are not stated in any page text**. They're in downloadable guide files (INDD/PNG/PDF) on the design-specs page. I didn't download them; I need your OK first (Q8). Page limit: the letters page says 25, the LLM spec says 10. That doesn't matter to us, because we enforce 1.
- **Idempotency:** `X-Idempotency-Key` header. A repeat returns the original response with HTTP 409. **It only counts as a repeat if the whole request body is identical.** If we regenerate the PDF and the bytes differ, Stannp treats it as a new letter. So we store the exact PDF once and always resend those bytes, and we also lock the status change in our database so a letter can't be sent twice.
- **Webhooks:**
  - Set up in the Stannp dashboard, not through the API.
  - Events: `mailpiece_status` (printing, dispatched, cancelled, local_delivery, delivered, returned), `campaign_status` and `recipient_events`.
  - Verification: `X-Stannp-Signature` header, an HMAC-SHA256 of the raw body using a secret we set. The docs don't say whether it's hex or base64, and there's no timestamp or replay protection, so we store `webhook_id` to drop repeats.
  - Retries: 3 attempts, 30 seconds apart. The webhook pauses itself after 5 failures in 24 hours.
- **Return address for undelivered mail:** **not documented for letters.** Postcards have a `return_address` parameter; letters don't. This needs asking of Stannp support or checking in the account settings.
- **Postage and cost:**
  - The only postage option documented is the `FIRST_CLASS` addon, and the default class isn't stated.
  - "Colour printing is standard", and no black-and-white option is documented.
  - Price: "A4 colour letter from £0.38", including print and postage. The calculator didn't render, so I have no first-class price and no VAT detail.
  - Turnaround: next working day.

## 5. Brand (commonsensedeal.com)

The site is **password-protected**. Headless Playwright got HTTP 401 and the "Under Construction" lock screen (`screenshots/lockscreen-mobile-headless.png`). Once you'd unlocked it in your Chrome, I read the computed styles there.

**Desktop screenshots only.** Your Chrome window wouldn't resize to phone width, so **I have no mobile screenshots of the live site yet** (Q9).

How the campaign name renders: **‘COMMON SENSE’ DEAL** is in capitals with curly quotes, in white Barlow ExtraBold on a solid red block (Squarespace's text highlight). The block has slight padding on each side and wipes in from left to right as it appears. The rest of the sentence stays navy, e.g. "What is a [‘COMMON SENSE’ DEAL]?".

Tokens I'd use:

| Token | Value | Where it comes from |
| --- | --- | --- |
| `--colour-navy` | `#1F1247` | Headings, body text, header bar |
| `--colour-red` | `#E22426` | Campaign-name highlight, buttons, link underlines, footer links |
| `--colour-white` | `#FFFFFF` | Page sections, button text |
| `--colour-cream` | `#FDF0E6` | `body` background (mostly hidden behind white sections; use sparingly, if at all) |
| `--font-sans` | Barlow 600 / 700 / 800 | All text |
| Body | 16px / 24px, weight 600, navy | `p` |
| H1 | 66.4px / 1.056, weight 800, letter-spacing −0.02em | Section headings |
| H3 | 36.16px, weight 800 | "Send your letter to the Minister:" |
| H4 / panel copy | 26.08px / 1.17, weight 800, −0.02em | Home-page panel text |
| Button | Red background, white Barlow 700 at 28.6px, about 68px tall, side padding 35.2px, **square corners**, no border | "I run a business" and others |
| Links | Navy text with a red underline in body copy; red underlined text in the footer | |
| Form fields | **None on the live site.** Its letter forms are on Typeform. | I'd propose: 2px navy border, square corners, Barlow 600 at 18px, visible red/navy focus ring |

Font licensing: Barlow and Space Grotesk are both on Google Fonts under the SIL Open Font Licence, so we can self-host them with `next/font`. (Space Grotesk is used only on the "Skip to content" link.)

**The logo lock-up** (union flag plus "A ‘COMMON SENSE’ DEAL WITH EUROPE" and the strapline) is an image. I'd like the original SVG files rather than copying them off the site.

Also worth knowing: **/for-businesses already has a letter-to-the-Minister tool.** Its three red buttons go to a Typeform (`iylz10zuydp.typeform.com`), and the sample letter is addressed to **Rt Hon Nick Thomas-Symonds, Minister for the Constitution and EU Relations**. That's no longer current. The footer links go to Best for Britain's [terms](https://www.bestforbritain.org/terms_of_use), [privacy policy](https://www.bestforbritain.org/privacy_policy) and [cookies](https://www.bestforbritain.org/cookies) pages.

## 6. Figures in the copy (Frontier Economics)

Report: [Modelling EU-UK Integration Scenarios and the Effects of Protectionism](https://bestforbritain.org/wp-content/uploads/2026/06/Modelling_EU_UK_Intergration_Scenarios_and_the_Effects_of_Protectionism.pdf) (58 pages), linked from the [publication page](https://bestforbritain.org/publication/eu-uk-integration/).

- **Neither "£92bn" nor "£43bn" appears in the report.** All its monetary figures are in **US dollars**. The pound figures are Best for Britain's conversions, shown on the publication page and in the [press release](https://www.bestforbritain.org/eu_membership_to_supercharge_uk_economy_by_at_least_92bn_report_suggests).
- **£92bn** comes from Table 6 (p10): UK long-run GDP effect under Scenario 4 (deep regulatory alignment plus liberal rules of origin), **$84–118bn**, i.e. 2.5–3.6% (Table 5, p9). £92bn is the **top** of that range in pounds; the publication page itself shows "£66–92bn". The report calls this a long-run effect, measurable over 5 to 10 years (p32). **It is not an annual figure.** The report never models EU membership directly; it calls Scenario 4 a "conservative guide" to membership (pp11, 33). That is the basis for "at least".
- **£43bn** comes from Table 1 (p4): UK total exports under Scenario 4, **$54.6bn, per year**, as a one-year comparison with the current baseline.
- **So the panel copy "at least £92bn in economic growth, and £43bn in additional exports each and every year" overstates the £92bn**: it's a one-off long-run boost to the size of the economy, not something that recurs every year. The same sentence is on the live site now. As instructed, I haven't changed it.
- The letters' wording ("boost the UK economy by at least £92bn and add £43bn a year in exports") is accurate on both counts.

---

## Build plan

1. **Phase 1:**
   - Next.js (App Router, TypeScript) scaffold.
   - Tokens as CSS custom properties, self-hosted Barlow.
   - A `<CampaignName />` component for `{csd}`.
   - Content files.
   - Home page with verbatim copy, panel, source line, and a stubbed form.
   - Desktop and mobile screenshots.
2. **Phase 2:**
   - Supabase schema with row-level security.
   - `constituencies` snapshot built from the Members API plus the ONS name join, refreshed daily by a Vercel cron job, with validation (650 rows, every name matched, trimmed emails, the email order of preference above).
   - Rate-limited `/api/lookup` route covering all the postcodes.io cases above.
   - `/act/[constituency]/[sector]` page with the MP card and the edge-case copy.
   - Tests with recorded API responses.
3. **Phase 3:**
   - `content/letters/*` copied word for word, with an assembler and token filling.
   - Email flow: mailto, Gmail and Outlook links, copy, a fallback for long bodies, and the self-reported count.
4. **Phase 4:**
   - `@react-pdf/renderer` for one A4 page laid out to Stannp's window geometry.
   - The PDF is generated once, stored, previewed, and those same bytes are posted.
   - Confirmation email (Postmark or Resend, both of which offer EU data hosting).
   - Admin queue and settings.
   - `postLetter()` with the test-mode guard and its tests.
   - Stannp test-mode proofs for both recipients.
5. **Phase 5:**
   - Caps, Turnstile, profanity flag, webhooks (HMAC and `webhook_id` deduplication), retention job, accessibility audit, CSP, launch checklist.

## Questions and things in the brief that look wrong

1. **How should letters open?** `nameAddressAs` is empty for 457 of the 650 MPs. My suggestion: use it where it's set, otherwise "Dear {nameDisplayAs}" (e.g. "Dear Lucy Powell", "Dear Sir Julian Lewis"). I'd avoid building "Ms Powell" from the gender field.
2. **Is the panel figure sentence OK?** The £92bn in it isn't an annual figure (section 6). Do you want to keep the live-site copy as it is, or match the letters' wording?
3. **NI wording:** my view is yes, it's needed. Under the Windsor Framework, NI goods already move to the EU without customs checks, so parts of the food and drink, manufacturing, wholesale and retail paragraphs aren't true for NI businesses. This is your decision.
4. **Grammar:** with `{sectorNoun}` = "arts and events", the opening reads "a arts and events business". Should the sector data carry its own article ("an arts and events"), or should the opening be reworded? I won't change the wording without your answer.
5. **Food and drink paragraph:** "the food and drink agreement signed with the EU in November" will date. Is "in November 2026" OK?
6. **Josh Babarinde (Eastbourne) has no parliamentary postal address in the API.** Should we use House of Commons, London SW1A 0AA (the address used for all the others), or hide the posted-letter option for him?
7. **Minister's address:** GOV.UK's Cabinet Office contact page gives "Correspondence Team, Cabinet Office, 70 Whitehall, London SW1A 2AS", which supports 70 Whitehall. GOV.UK also confirms Hamish Falconer was appointed to the role on 20 July 2026.
8. **Can I download Stannp's A4 letter design-guide files** from https://www.stannp.com/uk/design-specs to get the address-window measurements? Alternatively, could someone with the account ask Stannp for them, along with how letter returns work and the first-class versus standard prices?
9. **Mobile screenshots of the live site:** could you either un-maximise your Chrome window so I can resize it, or unlock the site in the app's built-in browser pane? Alternatively, a temporary password-free preview would do.
10. **Logo:** could I have the SVG files for the flag and the "A ‘COMMON SENSE’ DEAL WITH EUROPE" lock-up?
11. **The existing Typeform Minister letter on /for-businesses:** does the new site replace it? It currently names the former Minister.
12. **Postcodes in URLs:** the brief says the postcode never goes in a URL. But the Gmail and Outlook compose links put the letter body, including the business address and postcode, in a URL sent to Google or Microsoft. That's the user's own action, so I think it's acceptable, but please confirm. The alternative is for Gmail and Outlook to always open with To and Subject only and copy the body to the clipboard.
13. **Email subject:** the brief says `[TODO JOSHUA]`, but `letters.md` gives a default and an alternative. I'll use the default unless you say otherwise.
14. **Status lifecycle:** Stannp also reports `cancelled`, `local_delivery` and `delivered`. Should I add those to the lifecycle?
15. **Postage and colour:** Stannp documents only first class as an add-on and colour as standard. Is the "black and white or colour" TODO still needed?
16. Still open from section 15: subdomain, headline, intro, panel heading, BCC address, consent and opt-in wording, letter footer, rejection notice, who holds the API key, email provider, retention period, data processing agreement, analytics.
