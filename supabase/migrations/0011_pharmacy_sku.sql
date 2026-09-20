-- A stock-keeping code per medicine, so staff can refer to an item by
-- something short and stable rather than by a name plus strength plus form.
-- Allocated in the database, like the MRN, so two people adding stock at once
-- cannot collide; the unique index is the backstop.

create sequence if not exists pharmacy_sku_seq;

create or replace function next_sku()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_active_user() then
    raise exception 'Not permitted.';
  end if;
  return 'PH-' || lpad(nextval('pharmacy_sku_seq')::text, 4, '0');
end;
$$;

revoke execute on function next_sku() from public, anon;
grant execute on function next_sku() to authenticated;

alter table pharmacy_items add column sku text;

-- Backfill in name order, so the existing catalogue reads sensibly rather than
-- carrying whatever order the rewrite happened to use.
with numbered as (
  select id, row_number() over (order by name) as n from pharmacy_items
)
update pharmacy_items i
set sku = 'PH-' || lpad(numbered.n::text, 4, '0')
from numbered where numbered.id = i.id;

select setval('pharmacy_sku_seq', greatest(1, (select count(*) from pharmacy_items)));

alter table pharmacy_items
  alter column sku set not null,
  alter column sku set default next_sku(),
  add constraint pharmacy_items_sku_key unique (sku);
