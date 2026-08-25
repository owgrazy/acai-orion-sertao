import assert from "node:assert/strict";
import test from "node:test";

import { checkAdminAccess } from "../lib/auth/admin-access.ts";

test("nega usuário anônimo", async () => {
  const result = await checkAdminAccess({
    getUser: async () => ({ userId: null, error: null }),
    getRole: async () => {
      throw new Error("não deve consultar profiles sem usuário");
    },
  });

  assert.deepEqual(result, { status: "unauthenticated" });
});

test("nega sessão inválida", async () => {
  const result = await checkAdminAccess({
    getUser: async () => ({ userId: null, error: new Error("invalid token") }),
    getRole: async () => {
      throw new Error("não deve consultar profiles sem usuário válido");
    },
  });

  assert.deepEqual(result, { status: "unauthenticated" });
});

test("nega usuário comum", async () => {
  const result = await checkAdminAccess({
    getUser: async () => ({ userId: "common-user", error: null }),
    getRole: async (userId) => {
      assert.equal(userId, "common-user");
      return { role: "customer", error: null };
    },
  });

  assert.deepEqual(result, { status: "forbidden" });
});

test("nega quando profiles não pode confirmar a role", async () => {
  const result = await checkAdminAccess({
    getUser: async () => ({ userId: "unknown-user", error: null }),
    getRole: async () => ({ role: null, error: new Error("query failed") }),
  });

  assert.deepEqual(result, { status: "forbidden" });
});

test("autoriza somente role admin", async () => {
  const result = await checkAdminAccess({
    getUser: async () => ({ userId: "admin-user", error: null }),
    getRole: async (userId) => {
      assert.equal(userId, "admin-user");
      return { role: "admin", error: null };
    },
  });

  assert.deepEqual(result, { status: "authorized", userId: "admin-user" });
});
