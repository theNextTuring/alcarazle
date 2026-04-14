# Alcarazle — Setup & Publishing Guide

This is your complete guide to getting Alcarazle live on the internet.
Follow these steps in order. Each one links to exactly where you need to go.

---

## What you'll set up

| Service | What it does | Cost |
|---------|-------------|------|
| GitHub | Stores your code | Free |
| Supabase | Your player database | Free |
| Vercel | Hosts the game online | Free |

---

## Step 1 — GitHub (store your code)

1. Go to https://github.com and create a free account
2. Click **New repository** → name it `alcarazle` → set to **Public** → click **Create repository**
3. Download GitHub Desktop from https://desktop.github.com (easiest way to upload files)
4. In GitHub Desktop: **File → Add local repository** → select your `alcarazle` folder
5. Click **Publish repository** → uncheck "Keep this code private" → **Publish**

Your code is now saved online at `github.com/YOURUSERNAME/alcarazle`

---

## Step 2 — Supabase (your player database)

1. Go to https://supabase.com and sign up with your GitHub account
2. Click **New project** → name it `alcarazle` → choose a region close to you → **Create project** (takes ~2 minutes)
3. In the left sidebar click **SQL Editor**
4. Open the file `supabase-setup.sql` from your alcarazle folder — copy the entire contents and paste it into the SQL editor
5. Click **Run** — this creates your players table and loads all the player data
6. Go to **Settings → API** and copy these two values — you'll need them in Step 3:
   - **Project URL** (looks like `https://xxxxxxxxxxxx.supabase.co`)
   - **anon public** key (long string under "Project API keys")
   - **service_role** key (click reveal — keep this secret, never share it)
## Step 3 — RapidAPI (weekly rankings + titles updates)
To update a player manually later (e.g. Alcaraz wins another slam):
- Go to **Table Editor → players** → find the player → click the cell → edit the number → click Save

---


1. Go to https://rapidapi.com and create a free account
2. Search for **"Tennis Live Data"** → subscribe to the free tier
3. Open your RapidAPI dashboard and copy your API key (usually called **X-RapidAPI-Key**)
4. Save this key for Step 4 as `RAPIDAPI_KEY`

---

## Step 4 — Vercel (publish the game)

1. Go to https://vercel.com and sign up with your GitHub account
2. Click **Add New → Project** → select your `alcarazle` repository → click **Import**
3. Before deploying, click **Environment Variables** and add these — one at a time:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | Your Supabase Project URL from Step 2 |
| `SUPABASE_ANON_KEY` | Your Supabase anon public key from Step 2 |
| `SUPABASE_SERVICE_KEY` | Your Supabase service_role key from Step 2 |
| `RAPIDAPI_KEY` | Your RapidAPI key from Step 3 |
| `CRON_SECRET` | Make up any long random string e.g. `alcarazle-cron-abc123xyz` |

4. Click **Deploy** — Vercel builds and publishes your site (takes ~1 minute)
5. Vercel gives you a URL like `alcarazle.vercel.app` — your game is live!

---

## Step 5 — Custom domain (optional but recommended)

1. Buy `alcarazle.com` (or similar) at https://namecheap.com (~$10/year)
2. In Vercel: go to your project → **Settings → Domains** → type your domain → **Add**
3. Vercel shows you two DNS records — copy them
4. In Namecheap: go to **Domain List → Manage → Advanced DNS** → add those two records
5. Wait 10–30 minutes → your game is at `alcarazle.com`

---

## How auto-updates work

Every Monday at 6am UTC, Vercel automatically calls `/api/update-stats`.
Players get their new ranking next time someone plays — no action needed from you.

For titles (slams, masters wins) — these require a manual update in Supabase Table Editor,
since title counts aren't available from free APIs. Takes 30 seconds.

---

## Updating the player roster

To add a new player:
1. Go to Supabase → Table Editor → players → **Insert row**
2. Fill in all fields: name, nat, age, hand (Right/Left), bh (1HBH/2HBH), ranking, titles, active (true)
3. Save — the player appears in the game immediately

---

## Project file structure

```
alcarazle/
  public/
    index.html        ← the game page
    style.css         ← all styling
    game.js           ← all game logic
  api/
    players.js        ← serves player data from Supabase
    update-stats.js ← weekly auto-update job
  vercel.json         ← Vercel config + cron schedule
  supabase-setup.sql  ← run once to set up your database
  README.md           ← this file
```

---

## Need help?

Come back and ask — bring any error messages you see and we'll fix them together.
