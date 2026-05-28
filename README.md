# Aurabot — Deployment Guide
## Netlify + Supabase Setup

---

## What's in this folder

| File | Purpose |
|------|---------|
| `index.html` | The full Aurabot app |
| `supabase-schema.sql` | Run this in Supabase to create all tables |
| `netlify.toml` | Netlify deploy settings |
| `js/supabase.js` | Supabase client (reference module) |
| `js/auth.js` | Auth helpers (reference module) |
| `js/db.js` | Database helpers (reference module) |

> **Note:** The app is self-contained in `index.html` — the `js/` files are
> reference modules for if you later want to split the code. Everything needed
> to deploy is in `index.html`, `netlify.toml`, and `supabase-schema.sql`.

---

## Step 1 — Create a Supabase project

1. Go to **https://supabase.com** → New project
2. Choose a name (e.g. `aurabot`), set a strong database password, pick a region close to your students
3. Wait ~2 minutes for the project to provision

---

## Step 2 — Run the database schema

1. In Supabase Dashboard → **SQL Editor** → **New query**
2. Paste the entire contents of `supabase-schema.sql`
3. Click **Run** — you should see "Success. No rows returned"

This creates:
- `profiles` table (one row per student)
- `characters` table (saved creations)
- `stars` table (who starred what)
- All Row Level Security policies
- `character-images` storage bucket
- `community_feed` view

---

## Step 3 — Get your API credentials

In Supabase Dashboard → **Settings** → **API**:

- Copy **Project URL** — looks like `https://abcdefgh.supabase.co`
- Copy **anon public** key — the long `eyJ…` string

---

## Step 4 — Add credentials to index.html

Open `index.html` and find these two lines near the bottom (in the `<script>` block):

```js
const SUPABASE_URL      = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Replace the placeholder strings with your real values:

```js
const SUPABASE_URL      = 'https://abcdefgh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

> ✅ The anon key is **safe to include in frontend code** — it only allows
> what your Row Level Security policies permit. Never use the `service_role`
> key in frontend code.

---

## Step 5 — Configure email confirmation (optional but recommended)

In Supabase Dashboard → **Authentication** → **Email Templates**:
- Customise the confirmation email with your school branding

In **Authentication** → **URL Configuration**:
- Set **Site URL** to your Netlify URL (you'll get this in Step 7)

---

## Step 6 — Deploy to Netlify

### Option A: Drag & drop (quickest)
1. Go to **https://netlify.com** → Log in → **Sites**
2. Drag your entire project folder onto the deploy zone
3. Done — Netlify gives you a URL like `https://aurabot-abc123.netlify.app`

### Option B: GitHub (recommended for ongoing updates)
1. Push this folder to a GitHub repo
2. In Netlify → **Add new site** → **Import an existing project**
3. Connect GitHub → select your repo → click **Deploy site**
4. Future pushes to `main` auto-deploy

---

## Step 7 — Update Supabase redirect URL

Once you have your Netlify URL:

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set **Site URL** to `https://your-site.netlify.app`
3. Add `https://your-site.netlify.app/**` to **Redirect URLs**

---

## Step 8 — Test the full flow

1. Open your Netlify URL
2. Click **Join free** → create a test account
3. Check your email for the confirmation link (or disable email confirm in Supabase Auth settings for testing)
4. Sign in → create a character → click **Save to My Profile**
5. Toggle **Share with community** → save → go to **Community** section → see it appear
6. Star another character → confirm the count updates

---

## Supabase Storage — manual setup (if SQL failed)

If the storage bucket wasn't created by the SQL:

1. Supabase Dashboard → **Storage** → **New bucket**
2. Name: `character-images`, toggle **Public bucket** ON
3. Under **Policies** → add these policies manually:

| Policy | Target | Condition |
|--------|---------|-----------|
| INSERT | Authenticated users | `auth.uid()::text = (storage.foldername(name))[1]` |
| SELECT | Public | `true` |
| DELETE | Authenticated users | `auth.uid()::text = (storage.foldername(name))[1]` |

---

## Troubleshooting

**"Invalid API key"** → Double-check you copied the `anon public` key, not the `service_role` key

**Can't sign up** → Check Supabase Authentication → Email is enabled, or temporarily disable "Confirm email" for testing

**Images not saving** → Check the `character-images` bucket exists and is set to Public

**Community feed empty after sharing** → Make sure the `community_feed` view was created (re-run the SQL)

---

## Student data & privacy

- Each student's characters are private by default
- Only characters they explicitly toggle "Share" on appear in the community
- Students can delete their own characters at any time
- No student data is shared with third parties — it all lives in your Supabase project
- Consider adding a teacher/admin role (service role key in a Netlify serverless function) for moderation

---

## Adding a teacher moderation panel (future)

Create a Netlify serverless function at `netlify/functions/moderate.js` using the Supabase `service_role` key to allow teachers to delete inappropriate community posts without exposing the service key to students.
