# Hosting setup: Vercel, Supabase and Turnstile

Status on 26 November 2026:

- **Vercel:** project `common-sense-deal-action-site` has been created in the **Best for Britain** team and connected to the GitHub repository. `main` is the production branch, and server functions run in London (`lhr1`, set in `vercel.json`).
- **Supabase:** not set up yet.
- **Turnstile:** not set up yet.

Keys and passwords are only ever pasted into the Vercel, Supabase or Cloudflare dashboards, or into a password manager. Never put them in the code, in chat, or in this file.

---

## 1. Vercel: switch on Deployment Protection (do this first)

Every push to `main` deploys the live version. Until launch, nobody outside Best for Britain should be able to see it.

1. Go to vercel.com → **Best for Britain** team → **common-sense-deal-action-site** → **Settings** → **Deployment Protection**.
2. Under **Vercel Authentication**, choose the option that protects **all deployments**, including production, not just previews. (If your plan only offers previews, use **Password Protection** for production instead.)
3. Save.

Colleagues then need to be members of the Best for Britain Vercel team, or be given access, to open the links.

## 2. Supabase: create the project

1. Go to supabase.com and open the **Best for Britain** organisation. Create one if needed, so the project isn't on someone's personal account.
2. **New project**:
   - Name: `common-sense-deal-action-site`
   - Region: **West EU (London)**, so personal data stays in the UK
   - Database password: generate one and save it in Best for Britain's password manager. It isn't needed in Vercel.
3. When the project is ready, open **SQL Editor** and run these files from the repository, **in this order**. Paste each file's contents and click **Run**:
   1. `supabase/migrations/0001_constituencies_and_rate_limits.sql`
   2. `supabase/migrations/0002_email_sends_and_optins.sql`
   3. `supabase/migrations/0003_letters_settings_audit.sql`, which also creates the private `letters` storage bucket for the PDFs
4. Open **Project Settings** → **API** and keep the page open for step 3. You'll need:
   - **Project URL**
   - **anon** (or "publishable") key, used for admin sign-in
   - **service_role** key (secret: it bypasses row-level security, so it must only ever go into Vercel's server-side settings)
5. Admin sign-in: go to **Authentication** → **URL Configuration** and add the live site address plus `https://*.vercel.app/admin/auth/callback` to **Redirect URLs**. Under **Providers**, check **Email** is on.

## 3. Vercel: environment variables

### Supabase keys (paste these yourself)

In Vercel → project → **Settings** → **Environment Variables**, add the following, ticking **Production** and **Preview**:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | Project URL from Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key from Supabase (mark as **Sensitive**) |
| `SUPABASE_ANON_KEY` | anon or publishable key from Supabase |
| `ADMIN_EMAILS` | Staff who can use `/admin`, comma-separated, e.g. `name@bestforbritain.org,other@bestforbritain.org` |

### Generated secrets (run these in Terminal)

These make a random value and send it straight to Vercel, so nobody needs to see or copy it. Run them from the project folder:

```bash
openssl rand -hex 32 | vercel env add RATE_LIMIT_SALT production --scope best-for-britain
```

```bash
openssl rand -hex 32 | vercel env add RATE_LIMIT_SALT preview --scope best-for-britain
```

```bash
openssl rand -hex 32 | vercel env add CRON_SECRET production --scope best-for-britain
```

Vercel sends `CRON_SECRET` with the daily MP refresh automatically. Cron jobs only run on production.

## 4. Fill the MP table

After the next production deployment (once steps 1 to 3 are done):

1. Vercel → project → **Settings** → **Cron Jobs**.
2. Next to `/api/cron/refresh-mps`, click **Run**.
3. In Supabase → **Table Editor** → `constituencies`, check there are **650 rows**.

From then on it refreshes daily at 04:00 UTC. If a refresh doesn't validate, nothing is written and the job shows as failed in Vercel's logs.

Until this table is filled, the deployed site falls back to the copy of the MP data held in the code (`data/constituencies.json`), so it still works.

## 5. Cloudflare Turnstile (bot check)

Needed before launch. Without it, the live site refuses "I've sent it" (and, later, posted-letter) submissions; preview deployments allow them.

1. Cloudflare dashboard (Best for Britain account) → **Turnstile** → **Add widget**.
2. Hostnames: the live subdomain `[TODO JOSHUA: subdomain]`, plus `vercel.app` for previews.
3. Widget mode: **Managed**.
4. Add to Vercel (Production and Preview):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Site key (public) |
| `TURNSTILE_SECRET_KEY` | Secret key (mark as **Sensitive**) |

## 6. Stannp (test mode first)

1. Whoever holds Best for Britain's Stannp account adds `STANNP_API_KEY` in Vercel (Production and Preview, **Sensitive**).
2. **Do not add `STANNP_LIVE`** until launch. Letters are only posted for real when `STANNP_LIVE` is `true`, the admin "Live posting" setting is on, **and** it's the live deployment. Otherwise every letter goes to Stannp in test mode: a sample PDF, nothing printed, nothing charged.
3. To get Stannp's test-mode proofs for both recipients on your own computer, run this in Terminal from the project folder. It pastes nothing into the code, and it always uses test mode:

```bash
STANNP_API_KEY="paste-the-key-here" npm run stannp:proof
```

The proofs are saved to `phase4/stannp-proofs/`.

## 7. Later

- **Separate Supabase project for previews:** at the moment, previews and production share one database. Before launch, consider a second project for previews, so test submissions don't mix with real ones.
- **Custom domain:** add the subdomain in Vercel → **Settings** → **Domains** once it's agreed.
- **Stannp and the transactional email provider:** these are set up in Phase 4, always starting in Stannp **test mode**.
