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

test("migration bloqueia autoelevação e escrita administrativa comum", async () => {
  const sql = await readFile("supabase/migrations/20260825000000_secure_rls_and_orders.sql", "utf8");
  assert.match(sql, /grant insert \(id, full_name, phone\) on public\.profiles/);
  assert.match(sql, /grant update \(full_name, phone\) on public\.profiles/);
  assert.doesNotMatch(sql, /grant update \([^)]*role[^)]*\) on public\.profiles/i);
  assert.match(sql, /new\.role is distinct from old\.role/);
  assert.match(sql, /product_images_admin_insert[\s\S]*public\.is_admin/);
  assert.match(sql, /alter table public\.store_settings enable row level security/);
});

