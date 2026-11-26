# Smile Care Dental — clinic website + booking + admin

Phase 1 + 2 of the dental clinic platform:

- **Public website**: home, treatment pages, sticky Call / WhatsApp / Book bar on phones, SEO (Dentist schema)
- **Online booking**: 4-step wizard (treatment → date → free slot → details), double-booking protection
- **Admin** (`/admin`): login, bookings (day view, status, manual booking, reschedule), media manager (upload photos/videos, YouTube links, show/hide, reorder), treatments editor, settings (timings, slots, holidays, clinic & doctor details)
- **Multi-tenant**: one deployment serves many clinics; every table has `clinic_id`, and the clinic is picked from the domain

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Drizzle ORM

---

## 1. Run it on your computer

Requirements: **Node.js 20+** and a free **Supabase** account.

```bash
npm install
cp .env.example .env.local     # Windows: copy .env.example .env.local
```

### Create the Supabase project
1. supabase.com → New project → region **Mumbai (ap-south-1)**.
2. **SQL Editor** → paste and run `supabase/001_schema.sql`, then `supabase/002_seed_demo.sql` (demo clinic + 8 treatments + timings).
3. **Project Settings → API**: copy the URL, `anon` key and `service_role` key into `.env.local`.
4. **Project Settings → Database → Connection string → Transaction pooler** (port 6543): put it in `DATABASE_URL` (replace the password).

### Create the doctor login
1. **Authentication → Users → Add user** (email + password, tick "Auto confirm").
2. Copy the new user's UUID and run in SQL Editor:
   ```sql
   insert into staff (user_id, clinic_id, name, role)
   select '<USER-UUID>', id, 'Dr. [Doctor Name]', 'doctor' from clinics where slug = 'smile-care-dental';
   ```
   Use role `reception` for front-desk staff (they can't open Settings).

### Start
```bash
npm run dev
```
- Website: http://localhost:3000
- Admin: http://localhost:3000/admin

## 2. Deploy (Vercel)
1. Push to GitHub → import the repo in Vercel.
2. Add the same 5 environment variables from `.env.local`.
3. Deploy. The demo works on `your-project.vercel.app` via `DEFAULT_CLINIC_SLUG`.

> Vercel's free Hobby plan is for non-commercial use — fine for the demo. Move to Pro once a clinic pays.

## 3. Add a new clinic (multi-tenant)
1. Insert a row in `clinics` (copy the seed file and change slug, name, phone, address, `domain`), plus its `clinic_settings` and treatments.
2. Add the clinic's domain in Vercel → Project → Domains.
3. Create their logins and `staff` rows.

The site finds the clinic by `clinics.domain`; anything else (localhost, `*.vercel.app`) falls back to `DEFAULT_CLINIC_SLUG`.

## Project map

```
supabase/001_schema.sql      tables, unique slot index, RLS, storage bucket
supabase/002_seed_demo.sql   demo clinic
src/lib/slots.ts             slot logic (pure, unit-tested)
src/lib/booking.ts           the one booking service (web, admin, later WhatsApp)
src/lib/data.ts              clinic lookup by domain + cached site content
src/lib/notify.ts            notification hook → WhatsApp in Phase 3
src/app/(site)/…             public website + /book
src/app/api/slots|bookings   booking API
src/app/admin/…              admin pages + server actions (actions.ts)
src/proxy.ts                 keeps /admin behind login
```

## How things work
- **Free slots** = clinic sessions (morning/evening) − closed days − holidays − booked chairs − times within the minimum notice.
- **No double booking**: a partial unique index on `(clinic_id, date, start_time, chair_no)` for non-cancelled bookings. Tested with 5 simultaneous requests for one slot → 1 booked, 4 told "slot taken".
- **Fast pages**: public content is cached per clinic and refreshed instantly when an admin saves (`updateTag`).
- **Security**: browser never talks to the database. RLS is on with no policies, so the public anon key can't read tables. Every admin query filters by the logged-in staff member's `clinic_id`.
- **Media**: photos are downscaled to WebP in the browser, then uploaded straight to Supabase Storage with a one-time signed URL.

## Checks
```bash
npm test          # slot logic tests
npm run typecheck
npm run build
```

## Not in this phase (next)
- WhatsApp bot, confirmations and reminders (Phase 3 — plug into `src/lib/notify.ts` and `createBooking`)
- Review requests, recall reminders, monthly report (Phase 4)
- Hindi version of the site
- Rate limiting on the booking API (add e.g. Upstash Ratelimit before going live)
- Patients list page in admin
