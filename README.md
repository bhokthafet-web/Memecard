# Memecard

A mobile-first flashcard app for language learning: categories → collections of
independent Memecards, each with an image, title, optional description, and a
single-play audio button. No Previous/Next navigation — every card is opened
directly from its category.

## Run it

```bash
npm install
npm run dev
```

## Deploy

**Live at:** https://bhokthafet-web.github.io/Memecard/

Deployed via GitHub Pages: `.github/workflows/deploy.yml` builds the app with
Vite and publishes `dist/` on every push to `main`. `vite.config.js` sets
`base: '/Memecard/'` to match the Pages URL — change that if you fork this
under a different repo name. Supabase's URL/key are read from repo secrets
(`Settings → Secrets and variables → Actions`) at build time, so update them
there (`gh secret set VITE_SUPABASE_URL ...`) rather than in a local `.env` if
you rotate them.

A `netlify.toml` is also included if you'd rather deploy to Netlify instead
(or in addition) — import the repo there and it picks up the build command
and publish dir automatically; just remember to add the same two `VITE_*`
environment variables in Netlify's own dashboard first, since a local `.env`
has no effect on either platform's build.

Without Supabase configured (see below), the app runs in local-only mode:
deploying works fine either way, but custom cards and edits live
per-browser/device, not in a shared account.

## Accounts & per-user cards (Supabase)

This is opt-in — skip it and the app keeps working exactly as before,
per-device via `localStorage`. Set it up and you get real accounts, an admin
role, and cards that follow a user across devices.

**The core rule: nobody but an admin ever edits shared/official content in
place.** A regular user (or a signed-out guest) who wants to change a card
they don't own copies it to their own wall first — from there it's a normal
personal card they fully control, and the original shared card is untouched
for everyone else.

**How it works:**

| Who | Can do |
|---|---|
| Signed-out visitor | Browse every category and card (including admin-added ones); tap **📥 Add to my wall** on any shared card to get an editable personal copy, or **+ Add Card** to add one from scratch — both live in `localStorage` on that device |
| Signed-in user | Same as above, but their wall (copied + from-scratch cards) syncs to their account across devices instead of staying on one device |
| Signed-in admin | Can't edit *your* wall, but has full run of the shared content: **✏️** on any shared card/category edits it for every visitor, **+ Add Card** while on a category adds an official card for everyone (not to their own wall), and **+ New** next to the tabs creates a whole new shared category |

There's no separate admin sign-in — it's the same email/password flow as
everyone else. What makes someone an admin is one field, `role`, on their row
in `profiles` (`'user'` by default). No UI ever lets a user set this on
themselves; you promote someone with one SQL statement (step 7 below), and
Postgres row-level security enforces the admin-only writes at the database
level — a direct API call bypassing the app's UI still can't write to shared
content without that `role = 'admin'` row.

**To try it as an admin:** sign in, promote your account (step 7 below),
reload the page so the app picks up the new role, then open any category —
you'll see **✏️** appear on every card (including built-in ones) and on the
category name itself, plus a **+ New** tab for adding a whole new category.
Icons are optional everywhere admin content is created: leave the emoji field
blank and a generic folder icon is used automatically.

Five tables make this work (see `supabase/schema.sql` for the full DDL + RLS
policies):

- `global_categories` / `global_cards` — admin-writable, world-readable.
  Brand-new "official" categories and cards an admin creates from scratch.
- `global_card_overrides` / `global_category_overrides` — admin-writable,
  world-readable. *Edits* to any existing card/category (built-in or
  admin-created) that apply to every visitor.
- `user_custom_cards` — private per user (RLS-scoped to `auth.uid()`). A
  user's own wall: cards added from scratch and cards copied from shared
  content, all fully editable by their owner only.

**Setup:**

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project's SQL Editor, paste and run `supabase/schema.sql`.
3. In **Project Settings → API**, copy the **Project URL** and **anon public**
   key.
4. Copy `.env.example` to `.env` and fill in those two values:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
5. Restart `npm run dev`. A "Sign in" button now appears in the header.
6. (Optional, for quick local testing) In **Authentication → Providers →
   Email**, turn off "Confirm email" so new accounts can sign in immediately
   instead of waiting on a confirmation email.
7. To make an account an admin, run this in the SQL Editor after they've
   signed up once:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

See the "Deploy" section above for where these two values need to live for
GitHub Pages (repo secrets) vs. Netlify (its own dashboard) — either way, a
local `.env` only affects `npm run dev`/`npm run build` on your machine.

## Architecture notes

- **Audio**: standard HTML5 `<audio>` via `src/hooks/useAudioPlayer.js`. Plays
  once per tap, never loops, never autoplays, shows a "Playing…" state, and
  resets when the card closes. Missing/broken audio degrades to an "Audio
  unavailable" state instead of crashing (see the `Bonsoir` demo card in
  `src/data/content.js`).
- **Audio output / Bluetooth**: the app never tries to pair with or select a
  Bluetooth device itself — playback always goes through whatever output the
  OS currently has selected (speaker, wired headphones, Bluetooth headphones,
  or a Bluetooth speaker). `BluetoothHelp.jsx` is a plain disclosure, not a
  fake "Connect Bluetooth" button — Web Bluetooth only exposes GATT services,
  not the A2DP audio profile, so there's no legitimate way for a browser tab
  to pair with or stream audio to a speaker itself; that pairing has to happen
  in the OS's own Bluetooth settings.
- **Connectivity**: `useOnlineStatus.js` listens for `online`/`offline`
  events (works the same over Wi-Fi or a mobile hotspot) and the app shows a
  friendly offline banner rather than failing silently.
- **Personal cards**: the "+ Add Card" flow stores user-added cards (title,
  description, emoji image, optional uploaded audio) in `localStorage` when
  signed out, or in Supabase when signed in (see "Accounts & per-user cards"
  above). Uploaded images/audio are stored as base64 data URLs directly in
  the database row for simplicity — fine for small demo clips, but a
  production app with larger files should switch those two columns to
  Supabase Storage URLs instead.
- Demo audio in `public/audio/` was generated locally with macOS `say` +
  `ffmpeg` purely as placeholder pronunciation clips.
