# Launch checklist

Work through this top to bottom. **Live posting is switched on only when Joshua says so** (the last step).

## 1. Decisions and wording (Joshua)

Every placeholder is marked `[TODO JOSHUA: …]` in the code. Open at the time of writing:

- [x] **Home page:** headline, intro line, heading above the copy, page title and description (`content/copy.ts`)
- [ ] **Panel figures:** wording with "in the long run" (`content/copy.ts`)
- [ ] **Footer:** links and contact link (`content/copy.ts`)
- [ ] **Edge-case copy:** lookup errors, Speaker, vacant seat, no email, no postal address (`content/copy.ts`)
- [ ] **Email flow copy and opt-in wording** (`content/copy.ts`). Bump the opt-in `version` if the wording changes.
- [ ] **BCC address** for emails to MPs, or none (`components/actions/EmailComposer.tsx`)
- [ ] **Posted letter:** copy, consent wording, letter footer line on or off (`content/postedLetter.ts`)
- [ ] **Transactional emails:** wording and sending domain (`content/postedLetter.ts`)
- [ ] **Minister's address:** 70 Whitehall, or 1 Horse Guards Road (`content/minister.ts`)
- [ ] **Action summaries** (`content/actions.ts`)
- [ ] **Sector-to-ONS mapping** (`content/sectors.ts`)
- [ ] **Flagged words list** (`content/moderation.ts`)
- [ ] **Retention period** (`content/privacy.ts`)
- [ ] **Letter wording sign-off:** `inputs/letters.md` is a draft. Its fact-check table lists nine claims still needing a source.
- [ ] **Postage class**, e.g. first class (`lib/stannp.ts` → `addons`)
- [ ] **Subdomain**

## 2. Accounts and keys (owners of each account)

- [ ] **Vercel:** Deployment Protection on for all deployments (`docs/hosting-setup.md` §1)
- [ ] **Supabase:** project in London, four migrations run in order (0001 to 0004), redirect URLs set (§2)
- [ ] **Vercel environment variables** (§3):
  - [ ] Supabase keys: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
  - [ ] `ADMIN_EMAILS`
  - [ ] `RATE_LIMIT_SALT` and `CRON_SECRET`
- [ ] **Cloudflare Turnstile** widget, with keys in Vercel (§5)
- [ ] **Stannp:** API key in Vercel. `STANNP_LIVE` **not set** yet (§6).
- [ ] **Stannp webhook:** in Stannp's settings, create a webhook to `https://{site}/api/webhooks/stannp` for `mailpiece_status`, with a secret. Put the same secret in Vercel as `STANNP_WEBHOOK_SECRET`.
- [ ] **Stannp return address:** confirm how undelivered letters are returned (it isn't documented for letters)
- [ ] **Transactional email provider:** choose one (with UK or EU data handling), verify the sending domain, then wire it into `lib/mailer.ts`. **Posted letters can't go live without this**, because people can't confirm them.
- [ ] **DPAs:** Supabase, Vercel, Stannp, Cloudflare, email provider
- [ ] **Privacy notice:** updated, and linked in the footer
- [ ] **Custom domain** added in Vercel

## 3. Checks on the preview deployment

- [ ] Run the MP refresh cron once and check `constituencies` has 650 rows
- [ ] Email your MP, end to end, on a phone and on a desktop
- [ ] Posted letter, end to end, for **both** recipients: preview → confirm by email → approve in admin → Stannp **test mode** → sample PDF linked in admin
- [ ] `npm run stannp:proof`: check Stannp's proofs show the address in the window and that nothing overlaps the letter. Adjust `lib/pdf/layout.ts` against Stannp's A4 guide if needed.
- [ ] Reject a letter; try sending a second letter to the same recipient from the same email (it should be refused)
- [ ] Set a daily cap of 1, approve two letters, and check the second waits
- [ ] Download each CSV export and check it in a spreadsheet
- [ ] Do the manual accessibility checks in `docs/accessibility.md`
- [ ] Do a test webhook from Stannp's settings page (it should return 200)

## 4. Go live (on Joshua's word)

1. Set budget caps in **Admin → Settings**: a total budget, and a daily cap if wanted.
2. In Vercel, add `STANNP_LIVE` = `true` for **Production only**, then redeploy.
3. In **Admin → Settings**, tick **Live posting**, plus the confirmation box, and save. The mode box turns red and says LIVE.
4. Approve one real letter and watch it through to "dispatched".

## 5. After launch

- **Daily:** check the admin queue for letters awaiting approval and any **failed** letters.
- **Vercel → Logs / Cron Jobs:** the MP refresh at 04:00 and the retention job at 03:00 should succeed. The letter queue runs every 10 minutes.
- **To stop posting at once:** untick **Live posting** in Admin → Settings. Letters then go to Stannp in test mode only. To stop all posting, test included, reject or leave letters unapproved.
