"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  AdminValidationError,
  parseCreateDeliveryAreaInput,
  parseCreateProductInput,
  parseDeliveryAreaUpdateInput,
  parseOrderStatusInput,
  parseProductUpdateInput,
  parseStoreSettingsInput,
  parseUuid,
} from "@/lib/admin/validation";

export type AdminActionResult =
  | { ok: true }
  | { ok: false; error: string };

function invalidResult(error: unknown): AdminActionResult | null {
  if (error instanceof AdminValidationError) {
    return { ok: false, error: error.message };
  }
  return null;
}

async function executeMutation(
  operation: () => PromiseLike<{ error: unknown }>,
  message: string
): Promise<AdminActionResult | null> {
  try {
    const { error } = await operation();
    return error ? { ok: false, error: message } : null;
  } catch {
    return { ok: false, error: message };
  }
}

export async function createProductAction(input: unknown): Promise<AdminActionResult> {
  const { supabase } = await requireAdmin();
  let payload;
  try {
    payload = parseCreateProductInput(input);
  } catch (error) {
    return invalidResult(error) ?? { ok: false, error: "Dados inválidos." };
  }

  const failure = await executeMutation(
    () => supabase.from("products").insert(payload),
    "Não foi possível criar o produto."
  );
  if (failure) return failure;

  revalidatePath("/admin/products");
  return { ok: true };
}

export async function updateProductAction(id: unknown, input: unknown): Promise<AdminActionResult> {
  const { supabase } = await requireAdmin();
  let validated;
  try {
    validated = parseProductUpdateInput(id, input);
  } catch (error) {
    return invalidResult(error) ?? { ok: false, error: "Dados inválidos." };
  }

  const failure = await executeMutation(
    () => supabase.from("products").update(validated.patch).eq("id", validated.id),
    "Não foi possível atualizar o produto."
  );
  if (failure) return failure;

  revalidatePath("/admin/products");
  return { ok: true };
}

export async function deleteProductAction(id: unknown): Promise<AdminActionResult> {
  const { supabase } = await requireAdmin();
  let productId;
  try {
    productId = parseUuid(id, "Produto");
  } catch (error) {
    return invalidResult(error) ?? { ok: false, error: "Produto inválido." };
  }

  const failure = await executeMutation(
    () => supabase.from("products").delete().eq("id", productId),
    "Não foi possível excluir o produto."
  );
  if (failure) return failure;

  revalidatePath("/admin/products");
  return { ok: true };
}

export async function createDeliveryAreaAction(input: unknown): Promise<AdminActionResult> {
  const { supabase } = await requireAdmin();
  let payload;
  try {
    payload = parseCreateDeliveryAreaInput(input);
  } catch (error) {
    return invalidResult(error) ?? { ok: false, error: "Dados inválidos." };
  }

  const failure = await executeMutation(
    () => supabase.from("delivery_areas").insert(payload),
    "Não foi possível criar a área de delivery."
  );
  if (failure) return failure;

  revalidatePath("/admin/delivery-areas");
  return { ok: true };
}

export async function updateDeliveryAreaAction(id: unknown, input: unknown): Promise<AdminActionResult> {
  const { supabase } = await requireAdmin();
  let validated;
  try {
    validated = parseDeliveryAreaUpdateInput(id, input);
  } catch (error) {
    return invalidResult(error) ?? { ok: false, error: "Dados inválidos." };
  }

  const failure = await executeMutation(
    () => supabase.from("delivery_areas").update(validated.patch).eq("id", validated.id),
    "Não foi possível atualizar a área de delivery."
  );
  if (failure) return failure;

  revalidatePath("/admin/delivery-areas");
  return { ok: true };
}

export async function deleteDeliveryAreaAction(id: unknown): Promise<AdminActionResult> {
  const { supabase } = await requireAdmin();
  let areaId;
  try {
    areaId = parseUuid(id, "Área de delivery");
  } catch (error) {
    return invalidResult(error) ?? { ok: false, error: "Área de delivery inválida." };
  }

  const failure = await executeMutation(
    () => supabase.from("delivery_areas").delete().eq("id", areaId),
    "Não foi possível excluir a área de delivery."
  );
  if (failure) return failure;

  revalidatePath("/admin/delivery-areas");
  return { ok: true };
}

export async function updateStoreSettingsAction(input: unknown): Promise<AdminActionResult> {
  const { supabase } = await requireAdmin();
  let payload;
  try {
    payload = parseStoreSettingsInput(input);
  } catch (error) {
    return invalidResult(error) ?? { ok: false, error: "Configuração inválida." };
  }

  const failure = await executeMutation(
    () => supabase.from("store_settings").update(payload).eq("id", 1),
    "Não foi possível salvar a configuração da loja."
  );
  if (failure) return failure;

  revalidatePath("/admin/store");
  return { ok: true };
}

export async function updateOrderStatusAction(id: unknown, status: unknown): Promise<AdminActionResult> {
  const { supabase } = await requireAdmin();
  let validated;
  try {
    validated = parseOrderStatusInput(id, status);
  } catch (error) {
    return invalidResult(error) ?? { ok: false, error: "Pedido ou status inválido." };
  }

  const failure = await executeMutation(
    () => supabase.from("orders").update({ status: validated.status }).eq("id", validated.id),
    "Não foi possível atualizar o status do pedido."
  );
  if (failure) return failure;

  revalidatePath("/admin/orders");
  return { ok: true };
}
