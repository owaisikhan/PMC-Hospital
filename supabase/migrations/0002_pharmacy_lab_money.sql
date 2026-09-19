-- PMC — pharmacy, laboratory and the money ledger

-- ---------------------------------------------------------------------------
-- Pharmacy
-- ---------------------------------------------------------------------------
create table pharmacy_items (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  form           text,
  strength       text,
  unit           text not null default 'unit',
  reorder_level  integer not null default 0 check (reorder_level >= 0),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (name, form, strength)
);

create table pharmacy_batches (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references pharmacy_items(id),
  batch_no      text not null,
  expiry_date   date not null,
  qty_received  integer not null check (qty_received > 0),
  qty_remaining integer not null check (qty_remaining >= 0),
  cost_price    numeric(12,2) not null check (cost_price >= 0),
  sale_price    numeric(12,2) not null check (sale_price >= 0),
  received_on   date not null default current_date,
  created_by    uuid not null references profiles(id),
  created_at    timestamptz not null default now(),
  unique (item_id, batch_no),
  constraint pharmacy_batches_remaining_lte_received check (qty_remaining <= qty_received)
);
comment on table pharmacy_batches is
  'Stock is held per batch so expiry warnings and true per-sale margin are possible.';

create index pharmacy_batches_expiry_idx on pharmacy_batches (expiry_date)
  where qty_remaining > 0;

create table pharmacy_sales (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid references patients(id),
  admission_id uuid references admissions(id),
  sold_on      date not null default current_date,
  total        numeric(12,2) not null default 0 check (total >= 0),
  created_by   uuid not null references profiles(id),
  created_at   timestamptz not null default now()
);

create table pharmacy_sale_items (
  id         uuid primary key default gen_random_uuid(),
  sale_id    uuid not null references pharmacy_sales(id) on delete cascade,
  batch_id   uuid not null references pharmacy_batches(id),
  qty        integer not null check (qty > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  unit_cost  numeric(12,2) not null check (unit_cost >= 0),
  line_total numeric(12,2) generated always as (qty * unit_price) stored
);
comment on column pharmacy_sale_items.unit_cost is
  'Snapshot of the batch cost price, so margin stays correct after a restock.';

create index pharmacy_sale_items_sale_idx on pharmacy_sale_items (sale_id);

-- Stock can never go negative, and a sale can never exceed what the batch holds.
create or replace function deduct_pharmacy_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  available integer;
begin
  select qty_remaining into available
  from pharmacy_batches where id = new.batch_id for update;

  if available is null then
    raise exception 'Batch % does not exist', new.batch_id;
  end if;

  if available < new.qty then
    raise exception 'Only % unit(s) left in this batch, cannot sell %', available, new.qty;
  end if;

  update pharmacy_batches
     set qty_remaining = qty_remaining - new.qty
   where id = new.batch_id;

  return new;
end;
$$;

create trigger pharmacy_sale_items_deduct_stock
  after insert on pharmacy_sale_items
  for each row execute function deduct_pharmacy_stock();

-- ---------------------------------------------------------------------------
-- Laboratory (external until their own lab is functional)
-- ---------------------------------------------------------------------------
create table lab_tests (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique,
  external_lab     text,
  charge_price     numeric(12,2) not null check (charge_price >= 0),
  cost_price       numeric(12,2) not null default 0 check (cost_price >= 0),
  is_active        boolean not null default true
);
comment on table lab_tests is
  'charge_price is what the patient pays; cost_price is what the outside lab bills
   PMC. Margin is the difference — flip settings.lab_mode to in_house later.';

create table lab_orders (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references patients(id),
  admission_id   uuid references admissions(id),
  test_id        uuid not null references lab_tests(id),
  ordered_on     date not null default current_date,
  status         lab_order_status not null default 'ordered',
  charge_amount  numeric(12,2) not null check (charge_amount >= 0),
  cost_amount    numeric(12,2) not null default 0 check (cost_amount >= 0),
  external_lab   text,
  result_note    text,
  created_by     uuid not null references profiles(id),
  created_at     timestamptz not null default now()
);

create index lab_orders_patient_idx on lab_orders (patient_id);

-- ---------------------------------------------------------------------------
-- The ledger — every rupee in and out, append-only
-- ---------------------------------------------------------------------------
create table ledger_entries (
  id              uuid primary key default gen_random_uuid(),
  direction       ledger_direction not null,
  income_cat      income_category,
  expense_cat     expense_category,
  amount          numeric(12,2) not null check (amount > 0),
  occurred_on     date not null default current_date,
  method          payment_method not null default 'cash',
  description     text,
  patient_id      uuid references patients(id),
  admission_id    uuid references admissions(id),
  sale_id         uuid references pharmacy_sales(id),
  lab_order_id    uuid references lab_orders(id),
  staff_id        uuid references staff(id),
  -- A correction is a new reversing row, never an edit or a delete.
  reverses_id     uuid references ledger_entries(id) unique,
  reversal_reason text,
  created_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now(),
  constraint ledger_category_matches_direction check (
    (direction = 'in'  and income_cat is not null and expense_cat is null) or
    (direction = 'out' and expense_cat is not null and income_cat is null)
  ),
  constraint ledger_reversal_has_reason check (
    reverses_id is null or reversal_reason is not null
  )
);
comment on table ledger_entries is
  'Single source of truth for cash. Append-only: 0003 revokes update and delete
   from everyone, so history can never be silently rewritten.';

create index ledger_occurred_idx  on ledger_entries (occurred_on desc);
create index ledger_direction_idx on ledger_entries (direction, occurred_on desc);

-- A reversal must mirror its original exactly, and an entry can only be reversed once.
create or replace function validate_ledger_reversal()
returns trigger
language plpgsql
as $$
declare
  original ledger_entries;
begin
  if new.reverses_id is null then
    return new;
  end if;

  select * into original from ledger_entries where id = new.reverses_id;

  if original.reverses_id is not null then
    raise exception 'Cannot reverse a reversal';
  end if;

  if new.amount <> original.amount then
    raise exception 'A reversal must match the original amount (% vs %)',
      new.amount, original.amount;
  end if;

  if new.direction = original.direction then
    raise exception 'A reversal must run opposite to the original entry';
  end if;

  return new;
end;
$$;

create trigger ledger_entries_validate_reversal
  before insert on ledger_entries
  for each row execute function validate_ledger_reversal();

create table salary_payments (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references staff(id),
  for_month   date not null,
  amount      numeric(12,2) not null check (amount > 0),
  paid_on     date not null default current_date,
  ledger_id   uuid references ledger_entries(id),
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now(),
  unique (staff_id, for_month)
);
comment on column salary_payments.for_month is 'Always stored as the first of the month.';

-- ---------------------------------------------------------------------------
-- Settings and audit
-- ---------------------------------------------------------------------------
create table settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table audit_log (
  id         bigserial primary key,
  table_name text not null,
  row_id     text not null,
  action     text not null,
  actor      uuid,
  before     jsonb,
  after      jsonb,
  at         timestamptz not null default now()
);

create index audit_log_row_idx on audit_log (table_name, row_id);

create or replace function write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log (table_name, row_id, action, actor, before, after)
  values (
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, '?'),
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_ledger_entries after insert or update or delete on ledger_entries
  for each row execute function write_audit_log();
create trigger audit_admissions after insert or update or delete on admissions
  for each row execute function write_audit_log();
create trigger audit_admission_services after insert or update or delete on admission_services
  for each row execute function write_audit_log();
create trigger audit_charge_rates after insert or update or delete on charge_rates
  for each row execute function write_audit_log();
create trigger audit_pharmacy_batches after insert or update or delete on pharmacy_batches
  for each row execute function write_audit_log();
create trigger audit_staff after insert or update or delete on staff
  for each row execute function write_audit_log();
