export class OrderValidationError extends Error {}

export const ORDER_STATUSES = [
  "novo", "confirmado", "preparando", "pronto",
  "saiu_para_entrega", "entregue", "cancelado",
] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODES = new Set(["acai", "sorvete", "mix", "milkshake"]);
const PAYMENTS = new Set(["Pix", "Cartão", "Dinheiro"]);

function text(value: unknown, label: string, max: number, required = true) {
  if (value == null && !required) return null;
  if (typeof value !== "string") throw new OrderValidationError(`${label} inválido.`);
  const clean = value.trim();
  if ((required && !clean) || clean.length > max) throw new OrderValidationError(`${label} inválido.`);
  return clean || null;
}

function uuid(value: unknown, label: string, required = false) {
  if ((value == null || value === "") && !required) return null;
  if (typeof value !== "string" || !UUID.test(value)) throw new OrderValidationError(`${label} inválido.`);
  return value;
}

function uuidList(value: unknown, label: string, max: number) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > max) throw new OrderValidationError(`${label} inválido.`);
  return value.map((entry) => uuid(entry, label, true) as string);
}

export type SafeOrderInput = ReturnType<typeof parseSafeOrderInput>;

export function parseSafeOrderInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new OrderValidationError("Pedido inválido.");
  const input = value as Record<string, unknown>;
  const allowed = new Set(["customerName", "customerPhone", "fulfillment", "deliveryAreaId", "address", "payment", "changeFor", "items"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) throw new OrderValidationError("O pedido contém campos não permitidos.");

  const fulfillment = input.fulfillment;
  if (fulfillment !== "delivery" && fulfillment !== "pickup") throw new OrderValidationError("Forma de recebimento inválida.");
  if (!PAYMENTS.has(String(input.payment))) throw new OrderValidationError("Forma de pagamento inválida.");
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 100) throw new OrderValidationError("Itens inválidos.");

  const items = input.items.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new OrderValidationError("Item inválido.");
    const item = raw as Record<string, unknown>;
    const itemAllowed = new Set(["mode", "sizeId", "acaiTypeId", "sorveteIds", "extrasIds", "readyProductId"]);
    if (Object.keys(item).some((key) => !itemAllowed.has(key))) throw new OrderValidationError("Item contém campos não permitidos.");
    if (!MODES.has(String(item.mode))) throw new OrderValidationError("Tipo de item inválido.");
    return {
      mode: String(item.mode),
      size_id: uuid(item.sizeId, "Tamanho"),
      acai_type_id: uuid(item.acaiTypeId, "Tipo de açaí"),
      sorvete_ids: uuidList(item.sorveteIds, "Sabor", 3),
      extras_ids: uuidList(item.extrasIds, "Adicional", 30),
      ready_product_id: uuid(item.readyProductId, "Produto"),
    };
  });

  return {
    customer_name: text(input.customerName, "Nome", 120) as string,
    customer_phone: text(input.customerPhone, "Telefone", 20) as string,
    fulfillment,
    delivery_area_id: fulfillment === "delivery" ? uuid(input.deliveryAreaId, "Área de entrega", true) : null,
    address: fulfillment === "delivery" ? text(input.address, "Endereço", 500) : null,
    payment: String(input.payment),
    change_for: input.payment === "Dinheiro" ? text(input.changeFor, "Troco", 40, false) : null,
    items,
  };
}

