-- Smile Care Dental platform — database schema
-- Run once in Supabase → SQL Editor.
-- Every table carries clinic_id so one database serves many clinics.

create extension if not exists "pgcrypto";

-- ───────────── Clinics (one row per customer) ─────────────
create table if not exists clinics (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  domain              text unique,                 -- e.g. smilecaredental.in (null for demo)
  name                text not null,
  tagline             text,
  phone               text not null,               -- +91XXXXXXXXXX
  whatsapp_number     text,                        -- digits only, e.g. 9198XXXXXXXX
  email               text,
  address             text not null,
  area                text,                        -- Vijay Nagar
  city                text not null default 'Indore',
  map_url             text,                        -- Google Maps link
  map_embed_url       text,                        -- Google Maps embed src
  doctor_name         text,
  doctor_degrees      text,                        -- BDS, MDS (Endodontics)
  doctor_reg_no       text,
  doctor_bio          text,
  doctor_experience   int,
  languages           text default 'Hindi · English',
  google_rating       numeric(2,1),
  google_review_count int,
  google_reviews_url  text,
  created_at          timestamptz not null default now()
);

-- ───────────── Staff (links Supabase Auth users to a clinic) ─────────────
create table if not exists staff (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  clinic_id  uuid not null references clinics(id) on delete cascade,
  name       text not null,
  role       text not null check (role in ('doctor','reception')),
  created_at timestamptz not null default now()
);

-- ───────────── Clinic timings and slot rules ─────────────
create table if not exists clinic_settings (
  clinic_id          uuid primary key references clinics(id) on delete cascade,
  open_days          int[] not null default '{1,2,3,4,5,6}',  -- 0 = Sunday … 6 = Saturday
  morning_start      time,          -- null = no morning session
  morning_end        time,
  evening_start      time,          -- null = no evening session
  evening_end        time,
  slot_minutes       int  not null default 30 check (slot_minutes between 10 and 120),
  chairs             int  not null default 1  check (chairs between 1 and 20),
  days_ahead         int  not null default 14 check (days_ahead between 1 and 90),
  min_notice_minutes int  not null default 60
);

create table if not exists holidays (
  id        uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  date      date not null,
  reason    text,
  unique (clinic_id, date)
);

-- ───────────── Treatments (each gets its own page) ─────────────
create table if not exists treatments (
  id               uuid primary key default gen_random_uuid(),
  clinic_id        uuid not null references clinics(id) on delete cascade,
  name             text not null,
  slug             text not null,
  short_desc       text not null default '',
  body             text not null default '',
  faqs             jsonb not null default '[]',   -- [{ "q": "...", "a": "..." }]
  duration_minutes int  not null default 30,
  sort             int  not null default 0,
  is_active        boolean not null default true,
  unique (clinic_id, slug)
);

-- ───────────── Patients ─────────────
create table if not exists patients (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references clinics(id) on delete cascade,
  name           text not null,
  phone          text not null,                  -- +91XXXXXXXXXX
  consent_at     timestamptz,
  last_visit_at  timestamptz,
  next_recall_at date,
  created_at     timestamptz not null default now(),
  unique (clinic_id, phone)
);

-- ───────────── Bookings ─────────────
create table if not exists bookings (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references clinics(id) on delete cascade,
  patient_id   uuid not null references patients(id) on delete cascade,
  treatment_id uuid references treatments(id) on delete set null,
  date         date not null,
  start_time   time not null,
  chair_no     int  not null default 1,
  status       text not null default 'confirmed'
               check (status in ('confirmed','completed','cancelled','no_show')),
  source       text not null check (source in ('web','whatsapp','manual')),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- One active booking per chair per slot. Cancelled bookings free the slot.
create unique index if not exists bookings_slot_unique
  on bookings (clinic_id, date, start_time, chair_no)
  where status <> 'cancelled';
create index if not exists bookings_clinic_date on bookings (clinic_id, date);

-- ───────────── Media (images & videos managed from admin) ─────────────
create table if not exists media (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references clinics(id) on delete cascade,
  kind         text not null check (kind in ('image','video')),
  url          text not null,
  storage_path text,
  section      text not null check (section in ('hero','doctor','clinic','gallery','treatment')),
  treatment_id uuid references treatments(id) on delete set null,
  title        text not null default '',
  alt          text not null default '',
  sort         int  not null default 0,
  is_visible   boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists media_clinic_section on media (clinic_id, section, sort);

-- ───────────── Row Level Security ─────────────
-- The app talks to Postgres from the server only (DATABASE_URL) and filters by
-- clinic_id in code. RLS is ON with no policies, so the public anon key can
-- never read or write these tables directly.
alter table clinics         enable row level security;
alter table staff           enable row level security;
alter table clinic_settings enable row level security;
alter table holidays        enable row level security;
alter table treatments      enable row level security;
alter table patients        enable row level security;
alter table bookings        enable row level security;
alter table media           enable row level security;

-- ───────────── Storage bucket for media (public read) ─────────────
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;
