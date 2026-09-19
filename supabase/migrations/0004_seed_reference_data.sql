-- PMC — starting reference data. Safe to re-run.

insert into wards (name, code, total_beds, sort_order) values
  ('Paediatric Emergency (24x7)', 'ER',       8,  1),
  ('NICU',                        'NICU',    12,  2),
  ('PICU',                        'PICU',     8,  3),
  ('Measles Ward',                'MEASLES',  6,  4),
  ('General Ward',                'GENERAL', 20,  5)
on conflict (code) do nothing;

-- Rates confirmed with PMC. Admin can change these in Settings at any time;
-- existing admissions keep the rate they were admitted on.
insert into charge_rates (code, name, amount, sort_order) values
  ('NICU',       'NICU admission (per day)',      5000, 1),
  ('CPAP',       'CPAP support (per day)',        8000, 2),
  ('VENTILATOR', 'Ventilator support (per day)', 16000, 3),
  ('PICU',       'PICU admission (per day)',      5000, 4),
  ('GENERAL',    'General ward (per day)',        2000, 5),
  ('MEASLES',    'Measles ward (per day)',        2000, 6),
  ('ER',         'Emergency observation (per day)', 2000, 7)
on conflict (code) do nothing;

insert into settings (key, value) values
  ('hospital_name', '"PMC — Paeds Medical Complex"'::jsonb),
  ('currency',      '"PKR"'::jsonb),
  ('lab_mode',      '"external"'::jsonb),
  ('trial_notice',  'false'::jsonb)
on conflict (key) do nothing;
