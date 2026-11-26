import {
  pgTable, uuid, text, integer, boolean, timestamp, date, time, jsonb, numeric,
} from "drizzle-orm/pg-core";

// Mirrors supabase/001_schema.sql — keep both in sync.

export const clinics = pgTable("clinics", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  domain: text("domain"),
  name: text("name").notNull(),
  tagline: text("tagline"),
  phone: text("phone").notNull(),
  whatsappNumber: text("whatsapp_number"),
  email: text("email"),
  address: text("address").notNull(),
  area: text("area"),
  city: text("city").notNull(),
  mapUrl: text("map_url"),
  mapEmbedUrl: text("map_embed_url"),
  doctorName: text("doctor_name"),
  doctorDegrees: text("doctor_degrees"),
  doctorRegNo: text("doctor_reg_no"),
  doctorBio: text("doctor_bio"),
  doctorExperience: integer("doctor_experience"),
  languages: text("languages"),
  googleRating: numeric("google_rating"),
  googleReviewCount: integer("google_review_count"),
  googleReviewsUrl: text("google_reviews_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const staff = pgTable("staff", {
  userId: uuid("user_id").primaryKey(),
  clinicId: uuid("clinic_id").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["doctor", "reception"] }).notNull(),
});

export const clinicSettings = pgTable("clinic_settings", {
  clinicId: uuid("clinic_id").primaryKey(),
  openDays: integer("open_days").array().notNull(),
  morningStart: time("morning_start"),
  morningEnd: time("morning_end"),
  eveningStart: time("evening_start"),
  eveningEnd: time("evening_end"),
  slotMinutes: integer("slot_minutes").notNull(),
  chairs: integer("chairs").notNull(),
  daysAhead: integer("days_ahead").notNull(),
  minNoticeMinutes: integer("min_notice_minutes").notNull(),
});

export const holidays = pgTable("holidays", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").notNull(),
  date: date("date").notNull(),
  reason: text("reason"),
});

export type Faq = { q: string; a: string };

export const treatments = pgTable("treatments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  shortDesc: text("short_desc").notNull(),
  body: text("body").notNull(),
  faqs: jsonb("faqs").$type<Faq[]>().notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  sort: integer("sort").notNull(),
  isActive: boolean("is_active").notNull(),
});

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  consentAt: timestamp("consent_at", { withTimezone: true }),
  lastVisitAt: timestamp("last_visit_at", { withTimezone: true }),
  nextRecallAt: date("next_recall_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const BOOKING_STATUSES = ["confirmed", "completed", "cancelled", "no_show"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").notNull(),
  patientId: uuid("patient_id").notNull(),
  treatmentId: uuid("treatment_id"),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  chairNo: integer("chair_no").notNull(),
  status: text("status", { enum: BOOKING_STATUSES }).notNull(),
  source: text("source", { enum: ["web", "whatsapp", "manual"] }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const MEDIA_SECTIONS = ["hero", "doctor", "clinic", "gallery", "treatment"] as const;
export type MediaSection = (typeof MEDIA_SECTIONS)[number];

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").notNull(),
  kind: text("kind", { enum: ["image", "video"] }).notNull(),
  url: text("url").notNull(),
  storagePath: text("storage_path"),
  section: text("section", { enum: MEDIA_SECTIONS }).notNull(),
  treatmentId: uuid("treatment_id"),
  title: text("title").notNull(),
  alt: text("alt").notNull(),
  sort: integer("sort").notNull(),
  isVisible: boolean("is_visible").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Clinic = typeof clinics.$inferSelect;
export type ClinicSettings = typeof clinicSettings.$inferSelect;
export type Treatment = typeof treatments.$inferSelect;
export type Media = typeof media.$inferSelect;
