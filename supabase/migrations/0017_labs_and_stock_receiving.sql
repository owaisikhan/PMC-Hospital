-- A proper labs table (the two names on lab_tests were plain text nobody
-- could manage), and nothing new needed for pharmacy stock receiving —
-- pharmacy_batches already has everywhere a "receive stock" action writes to.

-- ---------------------------------------------------------------------------
-- Labs: who a test is actually sent to. Same read/write split as wards and
-- charge_rates — every active login needs to see which lab a test goes to
-- when ordering one, only an admin manages the list itself.
-- ---------------------------------------------------------------------------
create table labs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table labs enable row level security;
create policy "read labs" on labs for select using (is_active_user());
create policy "admin writes labs" on labs for all using (is_admin()) with check (is_admin());

-- Carries the two prices already on lab_tests: charge_price (what the
-- family pays) and cost_price (what this lab bills PMC) apply per test, not
-- per lab, so they stay on lab_tests rather than moving here.
alter table lab_tests add column lab_id uuid references labs(id);

insert into labs (name)
select distinct external_lab from lab_tests
where external_lab is not null and trim(external_lab) <> ''
on conflict (name) do nothing;

update lab_tests t
set lab_id = l.id
from labs l
where l.name = t.external_lab;

drop view lab_tests_view;
alter table lab_tests drop column external_lab;

create view lab_tests_view
with (security_invoker = true)
as
select
  t.id, t.name, t.lab_id, l.name as lab_name, t.charge_price,
  case when is_admin() then t.cost_price else null end as cost_price,
  t.is_active
from lab_tests t
left join labs l on l.id = t.lab_id;

grant select on lab_tests_view to authenticated;
