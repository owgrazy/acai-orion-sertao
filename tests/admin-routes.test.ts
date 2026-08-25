import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const adminRoutes = [
  "app/admin/page.tsx",
  "app/admin/orders/page.tsx",
  "app/admin/products/page.tsx",
  "app/admin/delivery-areas/page.tsx",
  "app/admin/store/page.tsx",
];

test("todas as rotas admin existentes estão sob o layout protegido", async () => {
  const layout = await readFile("app/admin/layout.tsx", "utf8");

  assert.match(layout, /await requireAdmin\(\)/);

  for (const route of adminRoutes) {
    const routeStat = await stat(route);
    assert.equal(routeStat.isFile(), true, `${route} deve existir sob app/admin`);
  }
});

test("o proxy de sessão inclui todo o segmento admin", async () => {
  const proxy = await readFile("proxy.ts", "utf8");

  assert.match(proxy, /matcher:\s*\["\/admin\/:path\*"\]/);
});
