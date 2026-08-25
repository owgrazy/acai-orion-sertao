begin;

-- Central admin predicate. It bypasses profiles RLS only for this exact lookup.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- Defence in depth: even an accidentally broadened grant/policy cannot change role.
create or replace function public.protect_profile_identity_and_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    if new.id <> (select auth.uid()) then
      raise exception 'profile identity cannot be changed' using errcode = '42501';
    end if;
    if tg_op = 'INSERT' and coalesce(new.role, 'client') <> 'client' then
      raise exception 'profile role cannot be set by users' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.role is distinct from old.role then
      raise exception 'profile role cannot be changed by users' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.protect_profile_identity_and_role() from public, anon, authenticated;

drop trigger if exists protect_profile_identity_and_role on public.profiles;
create trigger protect_profile_identity_and_role
before insert or update on public.profiles
for each row execute function public.protect_profile_identity_and_role();

alter table public.profiles enable row level security;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and role = 'client');
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()) and role = 'client');
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, full_name, phone) on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- Public catalogue; unavailable products remain visible only to admins.
alter table public.products enable row level security;
drop policy if exists products_admin_all on public.products;
drop policy if exists products_admin_write on public.products;
drop policy if exists products_read_all on public.products;
drop policy if exists products_select_available on public.products;
create policy products_public_read_available on public.products for select to anon, authenticated
  using (is_available = true);
create policy products_admin_all on public.products for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke insert, update, delete on public.products from anon;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

alter table public.delivery_areas enable row level security;
drop policy if exists delivery_areas_admin_write on public.delivery_areas;
drop policy if exists delivery_areas_read_all on public.delivery_areas;
create policy delivery_areas_public_read_active on public.delivery_areas for select to anon, authenticated
  using (is_active = true);
create policy delivery_areas_admin_all on public.delivery_areas for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke insert, update, delete on public.delivery_areas from anon;
grant select on public.delivery_areas to anon, authenticated;
grant insert, update, delete on public.delivery_areas to authenticated;

alter table public.store_settings enable row level security;
drop policy if exists store_settings_public_read on public.store_settings;
drop policy if exists store_settings_admin_all on public.store_settings;
create policy store_settings_public_read on public.store_settings for select to anon, authenticated using (true);
create policy store_settings_admin_all on public.store_settings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke insert, update, delete on public.store_settings from anon;
grant select on public.store_settings to anon, authenticated;
grant insert, update, delete on public.store_settings to authenticated;

-- Atomic order creation. Only identifiers and customer choices are accepted.
create or replace function public.create_order_secure(p_order jsonb)
returns table (
  id uuid, tracking_code text, order_code text, items jsonb,
  items_total numeric, delivery_fee numeric, total_final numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_snapshot jsonb := '[]'::jsonb;
  v_product public.products%rowtype;
  v_size public.products%rowtype;
  v_acai public.products%rowtype;
  v_area public.delivery_areas%rowtype;
  v_store public.store_settings%rowtype;
  v_extras jsonb;
  v_sorvetes jsonb;
  v_extra_count integer;
  v_item_total numeric;
  v_items_total numeric := 0;
  v_delivery_fee numeric := 0;
  v_tracking text;
  v_order public.orders%rowtype;
  v_fulfillment text := p_order->>'fulfillment';
  v_payment text := p_order->>'payment';
begin
  if jsonb_typeof(p_order) <> 'object'
     or jsonb_typeof(p_order->'items') <> 'array'
     or jsonb_array_length(p_order->'items') not between 1 and 100 then
    raise exception 'invalid order' using errcode = '22023';
  end if;
  if v_fulfillment not in ('delivery', 'pickup') or v_payment not in ('Pix', 'Cartão', 'Dinheiro') then
    raise exception 'invalid order options' using errcode = '22023';
  end if;
  if length(trim(p_order->>'customer_name')) not between 1 and 120
     or (p_order->>'customer_phone') !~ '^[0-9]{10,20}$' then
    raise exception 'invalid customer' using errcode = '22023';
  end if;

  select * into v_store from public.store_settings order by id limit 1;
  if found and (
    v_store.force_closed = true
    or (pg_catalog.timezone('America/Sao_Paulo', pg_catalog.now()))::time
       not between v_store.open_time::time and v_store.close_time::time
  ) then
    raise exception 'store is closed' using errcode = 'P0001';
  end if;

  if v_fulfillment = 'delivery' then
    select * into v_area from public.delivery_areas
      where id = (p_order->>'delivery_area_id')::uuid and is_active = true;
    if not found or nullif(trim(p_order->>'address'), '') is null or length(p_order->>'address') > 500 then
      raise exception 'invalid delivery' using errcode = '22023';
    end if;
    v_delivery_fee := v_area.fee;
  elsif nullif(p_order->>'delivery_area_id', '') is not null or nullif(trim(coalesce(p_order->>'address', '')), '') is not null then
    raise exception 'pickup cannot contain delivery fields' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_order->'items') loop
    v_item_total := 0;
    if v_item->>'mode' = 'milkshake' then
      select * into v_product from public.products
        where id = (v_item->>'ready_product_id')::uuid
          and type in ('milkshake', 'bebida', 'outro', 'combo') and is_available = true and price is not null;
      if not found then raise exception 'invalid product' using errcode = '22023'; end if;
      v_item_total := v_product.price;
      v_snapshot := v_snapshot || jsonb_build_array(jsonb_build_object(
        'id', replace(pg_catalog.gen_random_uuid()::text, '-', ''), 'mode', 'milkshake',
        'readyProductType', v_product.type, 'milkshakeFlavorId', v_product.id,
        'milkshakeFlavorLabel', v_product.name, 'sizeLabel', case when v_product.size_ml is null then '' else v_product.size_ml || 'ml' end,
        'price', v_product.price, 'createdAt', floor(extract(epoch from pg_catalog.clock_timestamp()) * 1000)
      ));
    elsif v_item->>'mode' in ('acai', 'sorvete', 'mix') then
      select * into v_size from public.products
        where id = (v_item->>'size_id')::uuid and type = 'size' and is_available = true and price is not null;
      if not found then raise exception 'invalid size' using errcode = '22023'; end if;
      if v_item->>'mode' in ('acai', 'mix') then
        select * into v_acai from public.products
          where id = (v_item->>'acai_type_id')::uuid and type = 'acai_type' and is_available = true;
        if not found then raise exception 'invalid acai' using errcode = '22023'; end if;
      else v_acai := null; end if;

      select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) order by p.name), '[]'::jsonb), count(*)
        into v_sorvetes, v_extra_count from public.products p
        where p.id in (select value::uuid from jsonb_array_elements_text(coalesce(v_item->'sorvete_ids', '[]'::jsonb)))
          and p.type = 'sorvete_flavor' and p.is_available = true;
      if v_extra_count <> jsonb_array_length(coalesce(v_item->'sorvete_ids', '[]'::jsonb))
         or (v_item->>'mode' in ('sorvete','mix') and v_extra_count not between 1 and 3)
         or (v_item->>'mode' = 'acai' and v_extra_count <> 0) then
        raise exception 'invalid flavors' using errcode = '22023';
      end if;

      select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) order by p.name), '[]'::jsonb), count(*)
        into v_extras, v_extra_count from public.products p
        where p.id in (select value::uuid from jsonb_array_elements_text(coalesce(v_item->'extras_ids', '[]'::jsonb)))
          and p.type = 'extra' and p.is_available = true;
      if v_extra_count <> jsonb_array_length(coalesce(v_item->'extras_ids', '[]'::jsonb)) then
        raise exception 'invalid extras' using errcode = '22023';
      end if;
      v_item_total := v_size.price + greatest(v_extra_count - coalesce(v_size.extras_limit, 0), 0) * 2;
      v_snapshot := v_snapshot || jsonb_build_array(jsonb_build_object(
        'id', replace(pg_catalog.gen_random_uuid()::text, '-', ''), 'mode', v_item->>'mode',
        'sizeId', v_size.id, 'sizeLabel', v_size.size_ml || 'ml', 'price', v_size.price,
        'acaiTypeId', v_acai.id, 'acaiTypeLabel', v_acai.name,
        'sorveteIds', coalesce((select jsonb_agg(x->'id') from jsonb_array_elements(v_sorvetes) x), '[]'::jsonb),
        'sorveteLabels', coalesce((select jsonb_agg(x->'name') from jsonb_array_elements(v_sorvetes) x), '[]'::jsonb),
        'extrasIds', coalesce((select jsonb_agg(x->'id') from jsonb_array_elements(v_extras) x), '[]'::jsonb),
        'extrasLabels', coalesce((select jsonb_agg(x->'name') from jsonb_array_elements(v_extras) x), '[]'::jsonb),
        'paidExtrasCount', greatest(v_extra_count - coalesce(v_size.extras_limit, 0), 0), 'paidExtrasUnitPrice', 2,
        'createdAt', floor(extract(epoch from pg_catalog.clock_timestamp()) * 1000)
      ));
    else raise exception 'invalid item mode' using errcode = '22023';
    end if;
    v_items_total := v_items_total + v_item_total;
  end loop;

  loop
    v_tracking := replace(pg_catalog.gen_random_uuid()::text, '-', '');
    exit when not exists (select 1 from public.orders o where o.tracking_code = v_tracking);
  end loop;

  insert into public.orders (
    user_id, customer_name, customer_phone, fulfillment, bairro_name, delivery_fee,
    address, payment, change_for, items_total, total_final, items, status, tracking_code
  ) values (
    (select auth.uid()), trim(p_order->>'customer_name'), p_order->>'customer_phone', v_fulfillment,
    case when v_fulfillment = 'delivery' then v_area.name else null end, v_delivery_fee,
    case when v_fulfillment = 'delivery' then trim(p_order->>'address') else null end, v_payment,
    case when v_payment = 'Dinheiro' then nullif(trim(p_order->>'change_for'), '') else null end,
    v_items_total, v_items_total + v_delivery_fee, v_snapshot, 'novo', v_tracking
  ) returning * into v_order;

  return query select v_order.id, v_order.tracking_code, v_order.order_code, v_order.items,
    v_order.items_total, v_order.delivery_fee, v_order.total_final;
end;
$$;
revoke all on function public.create_order_secure(jsonb) from public;
grant execute on function public.create_order_secure(jsonb) to anon, authenticated;

alter table public.orders enable row level security;
drop policy if exists "admin can read orders" on public.orders;
drop policy if exists "allow anyone to create orders" on public.orders;
drop policy if exists orders_insert_anyone on public.orders;
drop policy if exists orders_delete_none on public.orders;
drop policy if exists orders_select_admin_only on public.orders;
drop policy if exists orders_select_own_user on public.orders;
drop policy if exists orders_update_admin_only on public.orders;
create policy orders_select_own on public.orders for select to authenticated using (user_id = (select auth.uid()));
create policy orders_select_admin on public.orders for select to authenticated using ((select public.is_admin()));
create policy orders_update_admin on public.orders for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.orders from anon, authenticated;
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;

alter table public.orders drop constraint if exists orders_status_valid;
alter table public.orders add constraint orders_status_valid check (
  status in ('novo','confirmado','preparando','pronto','saiu_para_entrega','entregue','cancelado')
) not valid;

-- Public tracking reveals summary first and details only after server-side phone verification.
drop function if exists public.get_order_by_code(uuid, text);
create function public.get_order_by_code(p_id uuid, p_code text, p_phone_last4 text default null)
returns table (
  id uuid, order_code text, created_at timestamptz, fulfillment text, bairro_name text,
  delivery_fee numeric, payment text, items_total numeric, total_final numeric, status text,
  status_updated_at timestamptz, customer_name text, address text, change_for text, items jsonb,
  details_unlocked boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.order_code::text, o.created_at, o.fulfillment::text,
    case when right(regexp_replace(o.customer_phone, '\D', '', 'g'), 4) = p_phone_last4 then o.bairro_name else null end,
    case when right(regexp_replace(o.customer_phone, '\D', '', 'g'), 4) = p_phone_last4 then o.delivery_fee else null end,
    case when right(regexp_replace(o.customer_phone, '\D', '', 'g'), 4) = p_phone_last4 then o.payment::text else null end,
    case when right(regexp_replace(o.customer_phone, '\D', '', 'g'), 4) = p_phone_last4 then o.items_total else null end,
    case when right(regexp_replace(o.customer_phone, '\D', '', 'g'), 4) = p_phone_last4 then o.total_final else null end,
    o.status, o.status_updated_at,
    case when right(regexp_replace(o.customer_phone, '\D', '', 'g'), 4) = p_phone_last4 then o.customer_name else null end,
    case when right(regexp_replace(o.customer_phone, '\D', '', 'g'), 4) = p_phone_last4 then o.address else null end,
    case when right(regexp_replace(o.customer_phone, '\D', '', 'g'), 4) = p_phone_last4 then o.change_for else null end,
    case when right(regexp_replace(o.customer_phone, '\D', '', 'g'), 4) = p_phone_last4 then o.items else null end,
    right(regexp_replace(o.customer_phone, '\D', '', 'g'), 4) = p_phone_last4
  from public.orders o
  where o.id = p_id and o.tracking_code = p_code
    and length(p_code) between 6 and 128
  limit 1;
$$;
revoke all on function public.get_order_by_code(uuid, text, text) from public;
grant execute on function public.get_order_by_code(uuid, text, text) to anon, authenticated;

-- Public images, admin-only writes, plus bucket-level validation.
drop policy if exists "Public read product images" on storage.objects;
drop policy if exists "Auth upload product images" on storage.objects;
drop policy if exists "Auth update product images" on storage.objects;
drop policy if exists "Auth delete product images" on storage.objects;
create policy product_images_public_read on storage.objects for select to public using (bucket_id = 'product-images');
create policy product_images_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));
create policy product_images_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));
create policy product_images_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
update storage.buckets set file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']::text[]
where id = 'product-images';

-- RLS is now safe for Realtime; avoid duplicate publication membership.
do $$ begin
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then execute 'alter publication supabase_realtime add table public.orders'; end if;
end $$;

commit;
