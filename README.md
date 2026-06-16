# gabyalex — setup

This is your Week 1 foundation: multi-tenant database, auth (the password gate),
and a deployed empty dashboard at your domain. Features get built on top of this.

Do these in order. Should take under an hour.

---

## 1. Supabase (the backend)

1. Go to **supabase.com** → New project. Name it `gabyalex`, pick a region near you
   (eu-west for Spain), set a DB password, create.
2. Open the **SQL Editor**. Run these three files, in this order, each as a new query:
   - `supabase/schema.sql`   ← tables + row-level security
   - `supabase/trigger.sql`  ← auto-creates a profile on signup
   - (leave `seed.sql` for step 4)
3. Go to **Project Settings → API**. Copy two things:
   - **Project URL**
   - **anon public** key
4. (Optional but nice) **Authentication → Providers → Email**: turn OFF "Confirm email"
   while testing so you can sign in instantly. Turn it back on later.

---

## 2. Run it locally

1. Unzip this project, open a terminal in the folder.
2. `cp .env.example .env.local` and paste your URL + anon key into it.
3. `npm install`
4. `npm run dev` → open the localhost link.
5. You should see the login screen. Click "create an account", make **your** account.
   Then create **Gaby's** (or add her later). You're now logged in to an empty dashboard
   with a yellow banner saying you're not linked to a couple yet — that's next.

---

## 3. Link the two of you (seed)

1. In Supabase → **Authentication → Users**, copy each person's **User UID**.
2. Open `supabase/seed.sql`, uncomment the statements, paste in the couple id
   (from the first insert) and the two UIDs.
3. Run it in the SQL Editor.
4. Refresh the app — the banner is gone, you're both linked to one couple.

---

## 4. GitHub

1. Create a new **private** repo on GitHub called `gabyalex`.
2. In the project folder:
   ```
   git init
   git add .
   git commit -m "foundation: auth + schema + dashboard shell"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/gabyalex.git
   git push -u origin main
   ```

---

## 5. Vercel + domain

1. **vercel.com** → Add New → Project → import your `gabyalex` repo.
   Framework preset auto-detects **Vite**. 
2. Before deploying, add **Environment Variables** (same two values):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy. You'll get a `*.vercel.app` URL — log in to confirm it works live.
4. **Domains** tab → add `gabyalex.com`. Vercel shows you the DNS records;
   set them at your registrar (or move the domain's nameservers to Vercel/Cloudflare).
   HTTPS is automatic.

---

## You're done with Week 1 when…

…you can open **gabyalex.com** on your phone, log in, and see the empty dashboard.
Everything after this is building feature tiles on a foundation that already
handles accounts and data isolation.

## What's next (build order)

1. **Clocks + Date jar + Memory jar** — fastest wins, pure CRUD on the schema.
2. **Mailbox, Goals, Savings, Habits, Watch queue, Brainstorm.**
3. **World map + flight scanner** (external API — do it after the rest works).
4. **The room + sprites** (the Gather-style piece — saved for last, on purpose).

Notes:
- Tables for the room (`room_objects`) and sprite config already exist, so when you
  get to the sprite work the data layer is ready.
- The three jars all use ONE pair of tables (`jars` + `jar_items`) — build the jar
  component once, reuse it three times.
- Realtime presence (who's online) uses Supabase Realtime channels, no schema needed.
