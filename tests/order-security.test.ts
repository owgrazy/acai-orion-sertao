import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { OrderValidationError, parseSafeOrderInput } from "../lib/orders/validation.ts";

const SIZE = "11111111-1111-4111-8111-111111111111";
const ACAI = "22222222-2222-4222-8222-222222222222";
const AREA = "33333333-3333-4333-8333-333333333333";

function validOrder() {
  return {
    customerName: "Cliente",
    customerPhone: "85999999999",
    fulfillment: "delivery",
    deliveryAreaId: AREA,
    address: "Rua 1, 10",
    payment: "Pix",
    changeFor: null,
    items: [{ mode: "acai", sizeId: SIZE, acaiTypeId: ACAI, sorveteIds: [], extrasIds: [] }],
  };
}

test("pedido público aceita somente escolhas e identificadores", () => {
  const parsed = parseSafeOrderInput(validOrder());
  assert.equal(parsed.fulfillment, "delivery");
  assert.equal(parsed.items[0].size_id, SIZE);
  assert.ok(!("status" in parsed));
  assert.ok(!("user_id" in parsed));
  assert.ok(!("total_final" in parsed));
});

test("cliente não consegue enviar status, user_id, preço ou total", () => {
  for (const injected of [
    { status: "entregue" },
    { user_id: "44444444-4444-4444-8444-444444444444" },
    { total_final: 0.01 },
    { items_total: 0.01 },
  ]) {
    assert.throws(() => parseSafeOrderInput({ ...validOrder(), ...injected }), OrderValidationError);
  }
  const order = validOrder();
  order.items = [{ ...order.items[0], price: 0.01 } as never];
  assert.throws(() => parseSafeOrderInput(order), OrderValidationError);
});

test("valida UUID, quantidade, pagamento e campos de delivery", () => {
  assert.throws(() => parseSafeOrderInput({ ...validOrder(), deliveryAreaId: "x" }), OrderValidationError);
  assert.throws(() => parseSafeOrderInput({ ...validOrder(), payment: "Crédito interno" }), OrderValidationError);
  assert.throws(() => parseSafeOrderInput({ ...validOrder(), items: [] }), OrderValidationError);
  assert.throws(() => parseSafeOrderInput({ ...validOrder(), address: "" }), OrderValidationError);
});

test("migration fecha RLS e mantém criação/rastreamento por RPC restrita", async () => {
  const sql = await readFile("supabase/migrations/20260825000000_secure_rls_and_orders.sql", "utf8");
  assert.match(sql, /drop policy if exists "admin can read orders"/);
  assert.match(sql, /revoke all on public\.orders from anon, authenticated/);
  assert.match(sql, /create or replace function public\.create_order_secure/);
  assert.match(sql, /status, tracking_code[\s\S]*'novo', v_tracking/);
  assert.match(sql, /replace\(pg_catalog\.gen_random_uuid\(\)::text, '-', ''\)/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /revoke all on function public\.get_order_by_code/);
  assert.doesNotMatch(sql, /returns setof orders/i);
});

test("tracking público retorna progresso sem PII para códigos históricos e novos", async () => {
  const sql = await readFile("supabase/migrations/20260825000000_secure_rls_and_orders.sql", "utf8");
  const start = sql.indexOf("create function public.get_order_by_code");
  const end = sql.indexOf("$$;", start);
  const trackingFunction = sql.slice(start, end);
  const returnedColumns = trackingFunction.slice(
    trackingFunction.indexOf("returns table ("),
    trackingFunction.indexOf(")\nlanguage sql")
  );

  assert.match(trackingFunction, /p_id uuid, p_code text\)/);
  assert.match(trackingFunction, /id uuid, order_code text, created_at timestamptz, fulfillment text,[\s\S]*status text, status_updated_at timestamptz/);
  assert.match(trackingFunction, /length\(p_code\) between 6 and 128/);
  for (const pii of ["customer_phone", "customer_name", "address", "user_id", "tracking_code", "payment", "change_for", "items jsonb"]) {
    assert.doesNotMatch(returnedColumns, new RegExp(pii), `tracking não pode retornar ${pii}`);
  }

  const page = await readFile("app/order/[id]/page.tsx", "utf8");
  assert.doesNotMatch(page, /phone|address|payment|change_for|items_total|total_final|details_unlocked/i);
  assert.match(page, /p_id: id, p_code: code/);
});

test("migration bloqueia autoelevação e escrita administrativa comum", async () => {
  const sql = await readFile("supabase/migrations/20260825000000_secure_rls_and_orders.sql", "utf8");
  assert.match(sql, /grant insert \(id, full_name, phone\) on public\.profiles/);
  assert.match(sql, /grant update \(full_name, phone\) on public\.profiles/);
  assert.doesNotMatch(sql, /grant update \([^)]*role[^)]*\) on public\.profiles/i);
  assert.match(sql, /new\.role is distinct from old\.role/);
  assert.match(sql, /product_images_admin_insert[\s\S]*public\.is_admin/);
  assert.match(sql, /alter table public\.store_settings enable row level security/);
});

test("admin edita campos comuns próprios sem obter permissão sobre role ou id", async () => {
  const sql = await readFile("supabase/migrations/20260825000000_secure_rls_and_orders.sql", "utf8");
  assert.match(sql, /create policy profiles_update_own[\s\S]*using \(id = \(select auth\.uid\(\)\)\) with check \(id = \(select auth\.uid\(\)\)\)/);
  assert.match(sql, /grant update \(full_name, phone\) on public\.profiles to authenticated/);
  assert.doesNotMatch(sql, /grant update \([^)]*(?:role|id)[^)]*\) on public\.profiles to authenticated/i);
  assert.match(sql, /tg_op = 'INSERT'[\s\S]*new\.role[\s\S]*<> 'client'/);
  assert.match(sql, /tg_op = 'UPDATE'[\s\S]*new\.role is distinct from old\.role/);
  assert.match(sql, /new\.id <> \(select auth\.uid\(\)\)/);
});

test("migration remove objetos nomeados antes de recriá-los", async () => {
  const sql = await readFile("supabase/migrations/20260825000000_secure_rls_and_orders.sql", "utf8");
  const policyNames = [...sql.matchAll(/create policy\s+(?:"([^"]+)"|([a-z0-9_]+))/gi)].map((match) => match[1] || match[2]);
  for (const name of policyNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(sql, new RegExp(`drop policy if exists (?:"${escaped}"|${escaped}) on`, "i"), `policy ${name} deve ser removida antes da criação`);
  }
  assert.match(sql, /drop trigger if exists protect_profile_identity_and_role[\s\S]*create trigger protect_profile_identity_and_role/);
  assert.match(sql, /drop function if exists public\.get_order_by_code\(uuid, text\);[\s\S]*drop function if exists public\.get_order_by_code\(uuid, text, text\);[\s\S]*create function public\.get_order_by_code/);
  assert.match(sql, /if not exists \([\s\S]*pubname = 'supabase_realtime'[\s\S]*alter publication supabase_realtime add table public\.orders/);
});
