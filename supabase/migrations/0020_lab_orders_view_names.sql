-- ---------------------------------------------------------------------------
-- The Laboratory page used to read its orders, then go back for the patient
-- and test names those orders mention - a second round trip on every visit,
-- because PostgREST cannot embed through a view. The view now carries the
-- names itself, so one request is enough.
--
-- Still security_invoker, so the joined patients and lab_tests rows are read
-- under the signed-in user's own row level security, exactly as the separate
-- requests were. Left joins, so an order is never hidden because its patient
-- or test cannot be read; the name just comes back empty. The existing
-- columns keep their names and order (create or replace can only append),
-- and cost_amount stays masked for staff.
-- ---------------------------------------------------------------------------
create or replace view lab_orders_view
with (security_invoker = true)
as
select
  o.id, o.patient_id, o.admission_id, o.test_id, o.ordered_on, o.status,
  o.charge_amount,
  case when is_admin() then o.cost_amount else null end as cost_amount,
  o.external_lab, o.result_note, o.created_by, o.created_at,
  p.mrn       as patient_mrn,
  p.full_name as patient_name,
  t.name      as test_name
from lab_orders o
left join patients p on p.id = o.patient_id
left join lab_tests t on t.id = o.test_id;
