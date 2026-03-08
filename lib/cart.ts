export type CartItem = {
  id: string;
  mode: "acai" | "sorvete" | "mix" | "milkshake";
  createdAt: number;

  sizeId?: string;
  sizeLabel?: string;
  price?: number | null;

  acaiTypeId?: string;
  acaiTypeLabel?: string;

  sorveteIds?: string[];
  sorveteLabels?: string[];

  extrasIds?: string[];
  extrasLabels?: string[];

  allowPaidExtras?: boolean;
  paidExtrasCount?: number;
  paidExtrasUnitPrice?: number;

  milkshakeFlavorId?: string;
  milkshakeFlavorLabel?: string;

  readyProductType?: "milkshake" | "bebida" | "combo" | "outro";
};

const KEY = "orion_cart_v1";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function setCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function addToCart(item: CartItem) {
  const cur = getCart();
  cur.push(item);
  setCart(cur);
}

export function removeFromCart(id: string) {
  const cur = getCart().filter((x) => x.id !== id);
  setCart(cur);
}

export function clearCart() {
  setCart([]);
}

export function money(v: number) {
  return `R$ ${Number(v).toFixed(2).replace(".", ",")}`;
}

export function itemExtrasPaidValue(it: CartItem) {
  const qty = it.paidExtrasCount ?? 0;
  const unit = it.paidExtrasUnitPrice ?? 0;
  return qty * unit;
}

export function itemBaseValue(it: CartItem) {
  return typeof it.price === "number" ? it.price : 0;
}

export function itemTotalValue(it: CartItem) {
  return itemBaseValue(it) + itemExtrasPaidValue(it);
}

export function cartTotalValue(items: CartItem[]) {
  return items.reduce((acc, it) => acc + itemTotalValue(it), 0);
}

export function normalizePhoneBR(raw: string) {
  return (raw || "").replace(/\D/g, "");
}

function labelMode(item: CartItem) {
  if (item.mode === "acai") return "Açaí";
  if (item.mode === "sorvete") return "Sorvete";
  if (item.mode === "mix") return "Açaí + Sorvete";

  if (item.readyProductType === "bebida") return "Bebida";
  if (item.readyProductType === "combo") return "Combo";
  if (item.readyProductType === "outro") return "Outros produtos";

  return "Milkshake";
}

export function buildWhatsAppText(args: {
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  fulfillment: "delivery" | "pickup";
  bairro?: string;
  deliveryFee: number;
  address?: string;
  payment: "Pix" | "Cartão" | "Dinheiro";
  changeFor?: string;
  orderCode?: string;
  trackingLink?: string;
}) {
  const {
    items,
    customerName,
    customerPhone,
    fulfillment,
    bairro,
    deliveryFee,
    address,
    payment,
    changeFor,
    orderCode,
    trackingLink,
  } = args;

  const itemsTotal = cartTotalValue(items);
  const grandTotal = itemsTotal + (deliveryFee || 0);

  const lines: string[] = [];

  lines.push("*Açaí Órion*");
  lines.push("");

  if (orderCode) {
    lines.push(`*Pedido:* ${orderCode}`);
  }

  lines.push(`*Nome:* ${customerName.trim()}`);
  lines.push(`*Telefone:* ${customerPhone.trim()}`);
  lines.push(`*Recebimento:* ${fulfillment === "delivery" ? "Entrega" : "Retirada"}`);

  if (fulfillment === "delivery") {
    lines.push(`*Bairro:* ${bairro || "-"}`);
    lines.push(`*Endereço:* ${address?.trim() || "-"}`);
  }

  lines.push("");

  items.forEach((it, idx) => {
    lines.push(`*${idx + 1}) ${labelMode(it)}*`);

    if (it.mode === "milkshake") {
      if (it.readyProductType === "milkshake") {
        lines.push(`Tamanho: ${it.sizeLabel || "-"}`);
        lines.push(`Sabor: ${it.milkshakeFlavorLabel || "-"}`);
      } else {
        lines.push(`Produto: ${it.milkshakeFlavorLabel || "-"}`);
        if (it.sizeLabel) {
          lines.push(`Tamanho: ${it.sizeLabel}`);
        }
      }

      if (typeof it.price === "number") {
        lines.push(`Valor: ${money(it.price)}`);
      }

      lines.push("");
      return;
    }

    if (it.sizeLabel) lines.push(`Tamanho: ${it.sizeLabel}`);

    if (it.mode === "acai" || it.mode === "mix") {
      lines.push(`Açaí: ${it.acaiTypeLabel || "-"}`);
    }

    if (it.mode === "sorvete" || it.mode === "mix") {
      lines.push(`Sorvetes: ${it.sorveteLabels?.length ? it.sorveteLabels.join(", ") : "-"}`);
    }

    lines.push(`Adicionais: ${it.extrasLabels?.length ? it.extrasLabels.join(", ") : "-"}`);

    const base = itemBaseValue(it);
    const extrasPaid = itemExtrasPaidValue(it);

    if (base) lines.push(`Base: ${money(base)}`);
    if (extrasPaid) lines.push(`Extras pagos: ${money(extrasPaid)}`);
    if (base || extrasPaid) lines.push(`Subtotal: ${money(base + extrasPaid)}`);

    lines.push("");
  });

  lines.push(`*Total itens:* ${money(itemsTotal)}`);
  lines.push(`*Taxa de entrega:* ${money(deliveryFee || 0)}`);
  lines.push(`*Total final:* ${money(grandTotal)}`);
  lines.push(`*Pagamento:* ${payment}`);

  if (payment === "Dinheiro" && changeFor?.trim()) {
    lines.push(`*Troco para:* ${changeFor.trim()}`);
  }

  if (trackingLink) {
    lines.push("");
    lines.push(`*Acompanhar pedido:* ${trackingLink}`);
  }

  return lines.join("\n");
}