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

## Deploy to Netlify

`netlify.toml` is already set up (build command `npm run build`, publish dir
`dist`, SPA fallback redirect). Two ways to ship it:

- **Netlify CLI**: `npx netlify-cli deploy --build --prod` from this folder
  (first run will ask you to log in and link/create a site).
- **Git-based**: push this folder to a GitHub/GitLab repo and "Import an
  existing project" in the Netlify dashboard — it reads `netlify.toml`
  automatically, no manual config needed.

Without Supabase configured (see below), the app runs in local-only mode: a
Netlify deploy works fine, but custom cards and edits live per-browser/device,
not in a shared account. Set up Supabase first if you want real accounts.

## Accounts & per-user cards (Supabase)

This is opt-in — skip it and the app keeps working exactly as before,
per-device via `localStorage`. Set it up and you get real accounts, an admin
role, and cards that follow a user across devices.

**How it works:**

| Who | Can do |
|---|---|
| Signed-out visitor | Browse all cards (including any admin edits), use the app fully via `localStorage` on that device |
| Signed-in user | Everything above, plus: personal cards and personal edits to any card sync to their account across devices |
| Signed-in admin | Everything a user can do, plus: editing a built-in card (French/Spanish/English Basics) changes it for **everyone**, including signed-out visitors |

Three tables make this work (see `supabase/schema.sql` for the full DDL +
row-level security policies):

- `global_card_overrides` — admin-writable, world-readable. Patches to the
  built-in cards that apply to every visitor.
- `user_custom_cards` / `user_card_overrides` — private per user (RLS-scoped
  to `auth.uid()`). A user's own added cards and their personal tweaks to any
  card, visible only to them.

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

**Deploying with Supabase to Netlify:** Vite bakes `VITE_*` env vars in at
build time, so add the same two variables in **Site settings → Environment
variables** in the Netlify dashboard before you deploy (or `netlify env:set`
via the CLI) — a `.env` file on your machine has no effect on Netlify's build.

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
