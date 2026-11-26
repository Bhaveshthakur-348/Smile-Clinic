-- Demo clinic for pitching to dentists. Replace the [bracketed] values per clinic.
-- Run after 001_schema.sql.

with c as (
  insert into clinics (slug, name, tagline, phone, whatsapp_number, address, area, city,
                       map_url, doctor_name, doctor_degrees, doctor_reg_no, doctor_bio,
                       doctor_experience, google_reviews_url)
  values ('smile-care-dental', 'Smile Care Dental',
          'Gentle dental care for your whole family',
          '+919000000000', '919000000000',
          '[Clinic address]', 'Vijay Nagar', 'Indore',
          'https://maps.google.com/?q=Vijay+Nagar+Indore',
          'Dr. [Doctor Name]', 'BDS, MDS ([Specialisation])', '[Reg. No.]',
          '[Short introduction in the doctor''s own words — approach to patient comfort, languages spoken.]',
          null, null)
  on conflict (slug) do update set name = excluded.name
  returning id
),
s as (
  insert into clinic_settings (clinic_id, open_days, morning_start, morning_end, evening_start, evening_end,
                               slot_minutes, chairs, days_ahead)
  select id, '{1,2,3,4,5,6}', '10:00', '14:00', '17:00', '21:00', 30, 1, 14 from c
  on conflict (clinic_id) do nothing
  returning clinic_id
)
insert into treatments (clinic_id, name, slug, short_desc, body, faqs, duration_minutes, sort)
select c.id, t.name, t.slug, t.short_desc, t.body, t.faqs::jsonb, t.dur, t.sort
from c, (values
  ('Check-up & Consultation', 'check-up', 'Not sure what you need? Start here — the doctor will examine and guide you.',
   'A full examination of teeth and gums, with X-rays if needed. You get a clear treatment plan with options and costs before anything starts.',
   '[{"q":"How long does a check-up take?","a":"Usually 15–20 minutes."}]', 15, 1),
  ('Root Canal (RCT)', 'root-canal', 'Save an infected tooth and end the pain, usually in 1–2 visits.',
   'Root canal treatment removes infected pulp from inside the tooth, cleans and seals it, so the natural tooth can be kept. The area is numbed, so most patients feel pressure rather than pain. A crown is often advised afterwards to protect the tooth.',
   '[{"q":"Is root canal painful?","a":"The tooth is numbed first. Most patients say it feels like a long filling."},{"q":"How many visits?","a":"Usually one or two, depending on the infection."},{"q":"Do I need a crown after RCT?","a":"Back teeth usually need one to prevent cracking. The doctor will advise."}]', 45, 2),
  ('Dental Implants', 'dental-implants', 'A fixed replacement for a missing tooth that looks and feels natural.',
   'An implant is a small titanium post placed in the jaw that holds a crown. It does not disturb neighbouring teeth. Planning starts with an examination and X-ray to check bone support.',
   '[{"q":"Am I suitable for an implant?","a":"Most adults with healthy gums and enough bone are. A consultation and X-ray confirm it."},{"q":"How long does it take?","a":"Usually a few months from placement to the final crown, so the bone can heal around the implant."}]', 30, 3),
  ('Braces & Aligners', 'braces-aligners', 'Metal, ceramic or clear aligners to straighten teeth.',
   'Straightening crooked or gapped teeth improves bite and makes cleaning easier. Options include metal braces, tooth-coloured ceramic braces and clear removable aligners.',
   '[{"q":"What age is best for braces?","a":"Treatment works at most ages; a first check around age 7–8 helps plan early."}]', 30, 4),
  ('Cleaning & Scaling', 'cleaning-scaling', 'Remove tartar and stains; recommended every 6 months.',
   'Professional cleaning removes hardened tartar that brushing cannot, helping prevent gum disease and bad breath.',
   '[{"q":"Does scaling damage teeth?","a":"No. It removes deposits from the tooth surface."}]', 30, 5),
  ('Teeth Whitening', 'teeth-whitening', 'In-clinic whitening for a brighter smile.',
   'Whitening lightens natural tooth colour. The doctor first checks for decay or sensitivity, then recommends the right approach.',
   '[{"q":"Is whitening safe?","a":"Done under supervision after a check-up, yes. Some temporary sensitivity is common."}]', 45, 6),
  ('Wisdom Tooth Removal', 'wisdom-tooth', 'Careful extraction of painful or impacted wisdom teeth.',
   'Wisdom teeth that are impacted or keep getting infected can be removed under local anaesthesia after an X-ray assessment.',
   '[{"q":"How long is recovery?","a":"Most people are back to normal routine in a few days. Aftercare instructions are given."}]', 45, 7),
  ('Kids Dentistry', 'kids-dentistry', 'Gentle check-ups, fillings and habits for children.',
   'Child-friendly check-ups, cavity prevention, fillings and guidance for parents on brushing and diet.',
   '[{"q":"When should my child first see a dentist?","a":"By the first birthday or when the first tooth appears."}]', 20, 8)
) as t(name, slug, short_desc, body, faqs, dur, sort)
on conflict (clinic_id, slug) do nothing;

-- After creating a login in Supabase → Authentication → Users, link it to the clinic:
-- insert into staff (user_id, clinic_id, name, role)
-- select '<AUTH-USER-UUID>', id, 'Dr. [Doctor Name]', 'doctor' from clinics where slug = 'smile-care-dental';
