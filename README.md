# Common Sense Deal: business action site

A standalone site where businesses choose their sector, enter their business postcode, and write to their MP or the Minister. The full brief is in `common-sense-deal-action-site-brief.md`, and the Phase 0 findings and decisions are in `phase0/phase0-report.md`.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (Vitest)
npm run lint
npm run build
npm run snapshot   # refresh data/constituencies.json from the Members API
npm run stannp:proof   # Stannp test-mode proofs for both recipients (needs STANNP_API_KEY)
```

## Posted letters and admin

- Flow: preview (the exact A4 PDF) → submit → confirmation email → staff approval at `/admin` → `postLetter()` → Stannp.
- `lib/stannp.ts` holds the Stannp safety rule. Every create call goes through `postLetter()`, which sends `test=true` unless `STANNP_LIVE` is `true`, the "Live posting" setting is on, and it's the live deployment. `lib/stannp.test.ts` checks every combination.
- Locally, without Supabase, letters are kept in memory, emails appear at `/dev/outbox`, and `/admin` signs you in as `dev@localhost`.

## MP data

- `data/constituencies.json` holds all 650 constituencies with their MPs. It's used when Supabase isn't configured (local development and tests). Regenerate it with `npm run snapshot`.
- In production, `/api/cron/refresh-mps` runs daily at 04:00 (see `vercel.json`) and writes the same data to the Supabase `constituencies` table. If the data doesn't validate (650 rows, every name matched to an ONS code), nothing is written.
- The schema is in `supabase/migrations/`. Every table has row-level security on and no public policies: only the server, using the service role, can read or write.
- Environment variables are listed in `.env.example`. Hosting setup (Vercel, Supabase, Turnstile) is in `docs/hosting-setup.md`. Before launch, see `docs/launch-checklist.md`, `docs/privacy-review.md` and `docs/accessibility.md`.

## Where things live

- `content/`: all editable content. Copy goes in `copy.ts`, sectors in `sectors.ts`, and the action-page modules in `actions.ts`. Letters and the Minister's details are added in later phases.
- `app/globals.css`: design tokens taken from commonsensedeal.com.
- `components/CampaignName.tsx`: renders `{csd}` as the red ‘COMMON SENSE’ DEAL block.
- `public/logo-placeholder.jpg`: a crop of the live site's header, used until the new logo arrives.

Anything marked `[TODO JOSHUA: …]` is a placeholder or draft awaiting sign-off.
