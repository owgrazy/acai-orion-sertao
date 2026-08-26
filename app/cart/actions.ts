"use server";

import { createClient } from "@/lib/supabase/server";
import { OrderValidationError, parseSafeOrderInput } from "@/lib/orders/validation";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateOrderResult =
  | { ok: true; order: { id: string; tracking_code: string; order_code: string | null; items: unknown[]; items_total: number; delivery_fee: number; total_final: number } }
  | { ok: false; error: string };

export async function createOrderAction(input: unknown): Promise<CreateOrderResult> {
  let payload;
  try {
    payload = parseSafeOrderInput(input);
  } catch (error) {
    return { ok: false, error: error instanceof OrderValidationError ? error.message : "Pedido inválido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_order_secure", { p_order: payload });
  if (error) {
    // During the app-first rollout the RPC may not exist yet. The old database remains
    // available, but arbitrary client fields are no longer accepted by this application.
    if (error.code === "PGRST202" || error.code === "42883") {
      return createLegacyOrderDuringRollout(supabase, payload);
    }
    return { ok: false, error: "Não foi possível criar o pedido." };
  }

  const order = Array.isArray(data) ? data[0] : data;
  if (!order?.id || !order?.tracking_code) return { ok: false, error: "Não foi possível confirmar o pedido." };
  return { ok: true, order: { ...order, items_total: Number(order.items_total), delivery_fee: Number(order.delivery_fee), total_final: Number(order.total_final) } };
}

type ProductRow = {
  id: string; type: string; name: string; price: number | null; size_ml: number | null;
  extras_limit: number | null; is_available: boolean;
};

async function createLegacyOrderDuringRollout(
  supabase: SupabaseClient,
  payload: ReturnType<typeof parseSafeOrderInput>
): Promise<CreateOrderResult> {
  try {
    const ids = new Set<string>();
    for (const item of payload.items) {
      [item.size_id, item.acai_type_id, item.ready_product_id, ...item.sorvete_ids, ...item.extras_ids]
        .filter(Boolean).forEach((id) => ids.add(id as string));
    }
    const { data: rows, error: productsError } = await supabase.from("products").select("id,type,name,price,size_ml,extras_limit,is_available").in("id", [...ids]);
    if (productsError) return { ok: false, error: "Não foi possível validar os produtos." };
    const products = new Map(((rows || []) as ProductRow[]).map((row) => [row.id, row]));
    const snapshot: Record<string, unknown>[] = [];
    let itemsTotal = 0;

    for (const item of payload.items) {
      if (item.mode === "milkshake") {
        const product = item.ready_product_id ? products.get(item.ready_product_id) : null;
        if (!product?.is_available || !["milkshake", "bebida", "outro", "combo"].includes(product.type) || product.price == null) throw new Error("invalid product");
        itemsTotal += Number(product.price);
        snapshot.push({ id: crypto.randomUUID(), mode: "milkshake", readyProductType: product.type, milkshakeFlavorId: product.id, milkshakeFlavorLabel: product.name, sizeLabel: product.size_ml ? `${product.size_ml}ml` : "", price: Number(product.price), createdAt: Date.now() });
        continue;
      }
      const size = item.size_id ? products.get(item.size_id) : null;
      const acai = item.acai_type_id ? products.get(item.acai_type_id) : null;
      const flavors = item.sorvete_ids.map((id) => products.get(id));
      const extras = item.extras_ids.map((id) => products.get(id));
      if (!size?.is_available || size.type !== "size" || size.price == null) throw new Error("invalid size");
      if (["acai", "mix"].includes(item.mode) && (!acai?.is_available || acai.type !== "acai_type")) throw new Error("invalid acai");
      if (flavors.some((p) => !p?.is_available || p.type !== "sorvete_flavor") || (["sorvete", "mix"].includes(item.mode) && (flavors.length < 1 || flavors.length > 3)) || (item.mode === "acai" && flavors.length)) throw new Error("invalid flavors");
      if (extras.some((p) => !p?.is_available || p.type !== "extra")) throw new Error("invalid extras");
      const paidExtrasCount = Math.max(extras.length - Number(size.extras_limit || 0), 0);
      itemsTotal += Number(size.price) + paidExtrasCount * 2;
      snapshot.push({ id: crypto.randomUUID(), mode: item.mode, sizeId: size.id, sizeLabel: `${size.size_ml}ml`, price: Number(size.price), acaiTypeId: acai?.id || "", acaiTypeLabel: acai?.name || "", sorveteIds: flavors.map((p) => p!.id), sorveteLabels: flavors.map((p) => p!.name), extrasIds: extras.map((p) => p!.id), extrasLabels: extras.map((p) => p!.name), paidExtrasCount, paidExtrasUnitPrice: 2, createdAt: Date.now() });
    }

    let area: { name: string; fee: number; is_active: boolean } | null = null;
    if (payload.fulfillment === "delivery") {
      const result = await supabase.from("delivery_areas").select("name,fee,is_active").eq("id", payload.delivery_area_id!).eq("is_active", true).maybeSingle();
      if (result.error || !result.data) throw new Error("invalid area");
      area = { ...result.data, fee: Number(result.data.fee) };
    }
    const { data: auth } = await supabase.auth.getUser();
    const deliveryFee = area?.fee || 0;
    const { data, error } = await supabase.from("orders").insert({
      user_id: auth.user?.id || null, customer_name: payload.customer_name, customer_phone: payload.customer_phone,
      fulfillment: payload.fulfillment, bairro_name: area?.name || null, delivery_fee: deliveryFee,
      address: payload.address, payment: payload.payment, change_for: payload.change_for,
      items_total: itemsTotal, total_final: itemsTotal + deliveryFee, items: snapshot, status: "novo",
    }).select("id,tracking_code,order_code,items,items_total,delivery_fee,total_final").single();
    if (error || !data) return { ok: false, error: "Não foi possível criar o pedido." };
    return { ok: true, order: { ...data, items: data.items as unknown[], items_total: Number(data.items_total), delivery_fee: Number(data.delivery_fee), total_final: Number(data.total_final) } };
  } catch {
    return { ok: false, error: "O pedido contém produtos ou entrega inválidos." };
  }
}
