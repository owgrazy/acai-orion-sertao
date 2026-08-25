import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  AdminValidationError,
  parseCreateDeliveryAreaInput,
  parseCreateProductInput,
  parseDeliveryAreaUpdateInput,
  parseOrderStatusInput,
  parseProductUpdateInput,
  parseStoreSettingsInput,
} from "../lib/admin/validation.ts";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const AREA_ID = "22222222-2222-4222-8222-222222222222";
const ORDER_ID = "33333333-3333-4333-8333-333333333333";

test("valida criação e atualização de products sem aceitar campos arbitrários", () => {
  assert.deepEqual(
    parseCreateProductInput({
      type: "size",
      name: " 500 ml ",
      description: null,
      category: null,
      price: 15,
      size_ml: 500,
      extras_limit: 3,
      sort_order: 1,
      is_available: true,
    }),
    {
      type: "size",
      name: "500 ml",
      description: null,
      category: null,
      price: 15,
      size_ml: 500,
      extras_limit: 3,
      sort_order: 1,
      is_available: true,
      image_url: null,
    }
  );

  assert.deepEqual(parseProductUpdateInput(PRODUCT_ID, { is_available: false }), {
    id: PRODUCT_ID,
    patch: { is_available: false },
  });

  assert.throws(
    () => parseProductUpdateInput(PRODUCT_ID, { role: "admin" }),
    AdminValidationError
  );
  assert.throws(
    () => parseProductUpdateInput("not-a-uuid", { name: "Produto" }),
    AdminValidationError
  );
  assert.throws(
    () =>
      parseCreateProductInput({
        type: "size",
        name: "Produto",
        description: null,
        category: null,
        price: -1,
        size_ml: 500,
        extras_limit: 3,
        sort_order: 1,
        is_available: true,
      }),
    AdminValidationError
  );
});

test("valida payloads de delivery areas", () => {
  assert.deepEqual(
    parseCreateDeliveryAreaInput({
      name: " Centro ",
      fee: 5.5,
      is_active: true,
      sort_order: 2,
    }),
    { name: "Centro", fee: 5.5, is_active: true, sort_order: 2 }
  );

  assert.deepEqual(parseDeliveryAreaUpdateInput(AREA_ID, { fee: 7 }), {
    id: AREA_ID,
    patch: { fee: 7 },
  });
  assert.throws(
    () => parseDeliveryAreaUpdateInput(AREA_ID, { fee: Number.NaN }),
    AdminValidationError
  );
});

test("valida horários e fechamento da loja", () => {
  assert.deepEqual(
    parseStoreSettingsInput({
      open_time: "18:00",
      close_time: "23:30",
      force_closed: false,
    }),
    { open_time: "18:00", close_time: "23:30", force_closed: false }
  );

  assert.throws(
    () =>
      parseStoreSettingsInput({
        open_time: "25:00",
        close_time: "23:30",
        force_closed: false,
      }),
    AdminValidationError
  );
});

test("aceita somente status permitido para orders", () => {
  assert.deepEqual(parseOrderStatusInput(ORDER_ID, "preparando"), {
    id: ORDER_ID,
    status: "preparando",
  });
  assert.throws(() => parseOrderStatusInput(ORDER_ID, "pago"), AdminValidationError);
});

test("cada Server Action revalida admin antes da mutação", async () => {
  const source = await readFile("app/admin/actions.ts", "utf8");
  const actions = [
    "createProductAction",
    "updateProductAction",
    "deleteProductAction",
    "createDeliveryAreaAction",
    "updateDeliveryAreaAction",
    "deleteDeliveryAreaAction",
    "updateStoreSettingsAction",
    "updateOrderStatusAction",
  ];

  for (const [index, action] of actions.entries()) {
    const start = source.indexOf(`export async function ${action}`);
    const end = index + 1 < actions.length
      ? source.indexOf(`export async function ${actions[index + 1]}`)
      : source.length;
    const body = source.slice(start, end);

    assert.notEqual(start, -1, `${action} deve existir`);
    assert.match(body, /await requireAdmin\(\)/, `${action} deve exigir admin`);
    assert.ok(
      body.indexOf("await requireAdmin()") < body.search(/\.insert\(|\.update\(|\.delete\(/),
      `${action} deve autorizar antes de mutar`
    );
  }
});

test("upload administrativo também exige admin e páginas não mutam via SDK", async () => {
  const route = await readFile("app/api/admin/product-images/route.ts", "utf8");
  assert.match(route, /await requireAdmin\(\)/);
  assert.ok(route.indexOf("await requireAdmin()") < route.indexOf(".upload("));

  const pages = await Promise.all([
    readFile("app/admin/products/page.tsx", "utf8"),
    readFile("app/admin/delivery-areas/page.tsx", "utf8"),
    readFile("app/admin/store/page.tsx", "utf8"),
    readFile("app/admin/orders/page.tsx", "utf8"),
  ]);

  for (const page of pages) {
    assert.doesNotMatch(page, /\.insert\(|\.update\(|\.delete\(|\.upload\(|\.remove\(/);
  }
});
