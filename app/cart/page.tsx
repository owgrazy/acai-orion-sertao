"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/components/AppHeader";
import {
  buildWhatsAppText,
  cartTotalValue,
  clearCart,
  getCart,
  itemExtrasPaidValue,
  itemTotalValue,
  money,
  normalizePhoneBR,
  addToCart,
  removeFromCart,
  type CartItem,
} from "@/lib/cart";
import { isStoreOpen } from "@/lib/store";
import { makeId } from "@/lib/id";
import { ui } from "@/lib/ui";
import { createOrderAction } from "./actions";

type DeliveryArea = {
  id: string;
  name: string;
  fee: number;
  is_active: boolean;
  sort_order: number;
};

type Fulfillment = "delivery" | "pickup";

type CartGroup = {
  key: string;
  label: string;
  items: CartItem[];
  quantity: number;
  unitValue: number;
  subtotal: number;
};

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");

  const [areasLoading, setAreasLoading] = useState(true);
  const [areasErr, setAreasErr] = useState("");
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [areaId, setAreaId] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<"Pix" | "Cartão" | "Dinheiro">("Pix");
  const [changeFor, setChangeFor] = useState("");

  const [sending, setSending] = useState(false);

  useEffect(() => {
    setItems(getCart());
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle();
      if (profile?.full_name) setName(profile.full_name);
      if (profile?.phone) setPhone(profile.phone);
    })();
  }, []);

  async function loadAreas() {
    setAreasLoading(true);
    setAreasErr("");

    const { data, error } = await supabase
      .from("delivery_areas")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    setAreasLoading(false);

    if (error) {
      setAreasErr(error.message);
      return;
    }

    const list = (data || []) as DeliveryArea[];
    setAreas(
      list.map((x) => ({
        ...x,
        fee: Number(x.fee || 0),
      }))
    );
  }

  useEffect(() => {
    loadAreas();
  }, []);

  useEffect(() => {
    if (fulfillment === "pickup") {
      setAreaId("");
      setAddress("");
    }
  }, [fulfillment]);

  function refreshCart() {
    setItems(getCart());
  }

  function addOneToGroup(group: CartGroup) {
    const base = group.items[0];
    if (!base) return;

    const cloned: CartItem = {
      ...base,
      id: makeId(),
      createdAt: Date.now(),
    };

    addToCart(cloned);
    refreshCart();
  }

  function removeOneFromGroup(group: CartGroup) {
    const first = group.items[0];
    if (!first) return;

    removeFromCart(first.id);
    refreshCart();
  }

  function removeGroup(group: CartGroup) {
    if (!confirm(`Remover "${group.label}" do carrinho?`)) return;
    group.items.forEach((it) => removeFromCart(it.id));
    refreshCart();
  }

  const groupedItems = useMemo<CartGroup[]>(() => {
    const map = new Map<string, CartItem[]>();

    for (const item of items) {
      const key = buildGroupKey(item);
      const arr = map.get(key) || [];
      arr.push(item);
      map.set(key, arr);
    }

    return Array.from(map.entries()).map(([key, groupItems]) => {
      const first = groupItems[0];
      const quantity = groupItems.length;
      const unitValue = itemTotalValue(first);
      const subtotal = groupItems.reduce((acc, it) => acc + itemTotalValue(it), 0);

      return {
        key,
        label: groupLabel(first),
        items: groupItems,
        quantity,
        unitValue,
        subtotal,
      };
    });
  }, [items]);

  const selectedArea = useMemo(() => areas.find((a) => a.id === areaId), [areas, areaId]);
  const deliveryFee = fulfillment === "delivery" ? selectedArea?.fee ?? 0 : 0;

  const itemsTotal = useMemo(() => cartTotalValue(items), [items]);
  const grandTotal = itemsTotal + deliveryFee;

  const phoneDigits = useMemo(() => normalizePhoneBR(phone), [phone]);

  const isValid = useMemo(() => {
    if (items.length === 0) return false;
    if (!name.trim()) return false;
    if (phoneDigits.length < 10) return false;
    if (!payment) return false;

    if (fulfillment === "delivery") {
      if (!areaId) return false;
      if (!address.trim()) return false;
    }

    if (payment === "Dinheiro" && changeFor.trim()) {
      const n = Number(changeFor.replace(",", "."));
      if (!isFinite(n) || n <= 0) return false;
    }

    return true;
  }, [items.length, name, phoneDigits.length, payment, fulfillment, areaId, address, changeFor]);

  async function saveOrderAndSendWhatsApp() {
    if (!isValid) {
      alert("Preenche tudo: Nome, Telefone e Pagamento. E se for Entrega: Bairro + Endereço.");
      return;
    }

    const waNum = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
    if (!waNum) {
      alert("Configura NEXT_PUBLIC_WHATSAPP_NUMBER no .env.local");
      return;
    }

    const storeOpen = await isStoreOpen();
    if (!storeOpen) {
      alert("A loja está fechada no momento.");
      return;
    }

    setSending(true);

    try {
      const bairroName = fulfillment === "delivery" ? selectedArea?.name || "" : "";
      const addr = fulfillment === "delivery" ? address.trim() : "";

      const payload = {
        customerName: name.trim(),
        customerPhone: phoneDigits,
        fulfillment,
        deliveryAreaId: fulfillment === "delivery" ? areaId : null,
        address: fulfillment === "delivery" ? addr : null,
        payment,
        changeFor: payment === "Dinheiro" ? (changeFor.trim() || null) : null,
        items: items.map((item) => ({
          mode: item.mode,
          sizeId: item.sizeId || null,
          acaiTypeId: item.acaiTypeId || null,
          sorveteIds: item.sorveteIds || [],
          extrasIds: item.extrasIds || [],
          readyProductId: item.milkshakeFlavorId || null,
        })),
      };

      const result = await createOrderAction(payload);
      if (!result.ok) {
        alert(`Erro ao salvar pedido: ${result.error}`);
        return;
      }

      const authoritativeItems = result.order.items as CartItem[];
      const orderId = result.order.id;
      const trackingCode = result.order.tracking_code;
      const orderCode = result.order.order_code || orderId;

      const trackingLink = `${window.location.origin}/order/${orderId}?code=${trackingCode}`;

      const text = buildWhatsAppText({
        items: authoritativeItems,
        customerName: name.trim(),
        customerPhone: phoneDigits,
        fulfillment,
        bairro: bairroName,
        deliveryFee: result.order.delivery_fee,
        address: addr,
        payment,
        changeFor: payment === "Dinheiro" ? changeFor : undefined,
        orderCode,
        trackingLink,
      });

      const url = `https://wa.me/${waNum}?text=${encodeURIComponent(text)}`;
      window.location.href = url;
      return;
    } catch (error: unknown) {
      alert(`Erro ao enviar pedido: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <AppHeader />

      <main style={ui.appBg}>
        <section className="checkout-page" style={ui.pageNarrow}>
          <header className="checkout-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div><span className="eyebrow">Seu pedido</span><h1 style={ui.title}>Carrinho</h1></div>
            <a className="btn btn--ghost" href="/menu">
              Continuar comprando
            </a>
          </header>

          {items.length === 0 ? (
            <section style={ui.section}>
              <p style={{ margin: 0, color: "#ece1ff" }}>Carrinho vazio.</p>
            </section>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              {groupedItems.map((group, idx) => (
                <div className="cart-item-card" key={group.key} style={ui.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
                    <div>
                      <b style={{ color: "#fff" }}>
                        {idx + 1}) {group.label}
                      </b>

                      <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.65, color: "#ece1ff" }}>
                        <div><b>Quantidade:</b> {group.quantity}</div>
                        <div><b>Unitário:</b> {money(group.unitValue)}</div>
                        <div><b>Subtotal:</b> {money(group.subtotal)}</div>
                        <div style={{ marginTop: 8 }}>{renderItemDetails(group.items[0])}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button onClick={() => removeOneFromGroup(group)} style={qtyBtn}>−</button>
                      <span style={{ color: "#fff", fontWeight: 800, minWidth: 24, textAlign: "center" }}>
                        {group.quantity}
                      </span>
                      <button onClick={() => addOneToGroup(group)} style={qtyBtn}>+</button>
                      <button onClick={() => removeGroup(group)} style={{ ...ui.buttonGhost, marginLeft: 6 }}>
                        Remover tudo
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <section className="checkout-section" style={ui.section}>
            <b style={{ color: "#fff" }}>Como você quer receber?</b>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => setFulfillment("delivery")}
                style={fulfillmentButton(fulfillment === "delivery")}
              >
                Entrega
              </button>

              <button
                onClick={() => setFulfillment("pickup")}
                style={fulfillmentButton(fulfillment === "pickup")}
              >
                Retirada
              </button>
            </div>

            {fulfillment === "pickup" ? (
              <p style={{ marginTop: 10, color: "#ece1ff", fontSize: 13 }}>
                Retirada no local. Taxa: <b>{money(0)}</b>
              </p>
            ) : null}
          </section>

          {fulfillment === "delivery" ? (
            <section className="checkout-section" style={ui.section}>
              <b style={{ color: "#fff" }}>Entrega</b>

              {areasErr ? <p style={{ color: "#ff9d9d", marginTop: 10 }}>Erro bairros: {areasErr}</p> : null}

              <label style={{ display: "grid", gap: 6, marginTop: 12, color: "#f2eaff" }}>
                Bairro
                <select
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  style={ui.input}
                  disabled={areasLoading || areas.length === 0}
                >
                  <option value="">{areasLoading ? "Carregando..." : "Selecione o bairro"}</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({money(a.fee)})
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ marginTop: 8, fontSize: 13, color: "#e9dcff" }}>
                Taxa: <b>{money(deliveryFee)}</b>
              </div>

              <label style={{ display: "grid", gap: 6, marginTop: 12, color: "#f2eaff" }}>
                Endereço (rua + número + referência)
                <input value={address} onChange={(e) => setAddress(e.target.value)} style={ui.input} />
              </label>
            </section>
          ) : null}

          <section className="checkout-section" style={ui.section}>
            <b style={{ color: "#fff" }}>Seus dados</b>

            <label style={{ display: "grid", gap: 6, marginTop: 12, color: "#f2eaff" }}>
              Nome
              <input value={name} onChange={(e) => setName(e.target.value)} style={ui.input} />
            </label>

            <label style={{ display: "grid", gap: 6, marginTop: 12, color: "#f2eaff" }}>
              Telefone / WhatsApp
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: (85) 9 9999-9999"
                style={ui.input}
              />
            </label>

            <div style={{ marginTop: 8, fontSize: 12, color: "#dcccff" }}>
              Você digitou: <b>{phoneDigits || "-"}</b>
            </div>
          </section>

          <section className="checkout-section" style={ui.section}>
            <b style={{ color: "#fff" }}>Pagamento</b>

            <label style={{ display: "grid", gap: 6, marginTop: 12, color: "#f2eaff" }}>
              Forma de pagamento
              <select value={payment} onChange={(e) => setPayment(e.target.value as "Pix" | "Cartão" | "Dinheiro")} style={ui.input}>
                <option value="Pix">Pix</option>
                <option value="Cartão">Cartão</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </label>

            {payment === "Dinheiro" ? (
              <label style={{ display: "grid", gap: 6, marginTop: 12, color: "#f2eaff" }}>
                Troco para quanto? (opcional)
                <input value={changeFor} onChange={(e) => setChangeFor(e.target.value)} style={ui.input} />
              </label>
            ) : null}
          </section>

          <section className="checkout-section checkout-summary" style={ui.section}>
            <b style={{ color: "#fff" }}>Resumo</b>

            <div style={{ marginTop: 10, lineHeight: 1.7, color: "#ece1ff" }}>
              <div>Total itens: <b>{money(itemsTotal)}</b></div>
              <div>Taxa: <b>{money(deliveryFee)}</b></div>
              <div>Total final: <b>{money(grandTotal)}</b></div>
            </div>
          </section>

          <div className="checkout-actions" style={{ display: "grid", gap: 10, marginTop: 16, paddingBottom: 24 }}>
            <button
              onClick={saveOrderAndSendWhatsApp}
              disabled={!isValid || sending}
              style={{
                ...ui.buttonPrimary,
                opacity: !isValid || sending ? 0.6 : 1,
                cursor: !isValid || sending ? "not-allowed" : "pointer",
              }}
            >
              {sending ? "Salvando pedido..." : "Salvar e enviar no WhatsApp"}
            </button>

            {!isValid ? (
              <p style={{ margin: 0, fontSize: 12, color: "#dcccff" }}>
                Preencha: <b>Nome</b>, <b>Telefone</b>, <b>Pagamento</b>. E se for <b>Entrega</b>: <b>Bairro</b> e <b>Endereço</b>.
              </p>
            ) : null}

            <button
              onClick={() => {
                if (!confirm("Limpar carrinho?")) return;
                clearCart();
                refreshCart();
              }}
              style={ui.buttonSecondary}
            >
              Limpar carrinho
            </button>
          </div>
        </section>
      </main>
    </>
  );
}

function buildGroupKey(item: CartItem) {
  return JSON.stringify({
    mode: item.mode,
    sizeId: item.sizeId || "",
    sizeLabel: item.sizeLabel || "",
    price: item.price ?? 0,
    acaiTypeId: item.acaiTypeId || "",
    acaiTypeLabel: item.acaiTypeLabel || "",
    sorveteLabels: [...(item.sorveteLabels || [])].sort(),
    extrasLabels: [...(item.extrasLabels || [])].sort(),
    milkshakeFlavorLabel: item.milkshakeFlavorLabel || "",
    paidExtrasCount: item.paidExtrasCount || 0,
    paidExtrasUnitPrice: item.paidExtrasUnitPrice || 0,
  });
}

function groupLabel(item: CartItem) {
  if (item.mode === "milkshake") return item.milkshakeFlavorLabel || "Produto";
  if (item.mode === "acai") return "Açaí";
  if (item.mode === "sorvete") return "Sorvete";
  if (item.mode === "mix") return "Açaí + Sorvete";
  return "Produto";
}

function renderItemDetails(it: CartItem) {
  const extrasPaid = itemExtrasPaidValue(it);

  if (it.mode === "milkshake") {
    return (
      <>
        <div><b>Produto:</b> {it.milkshakeFlavorLabel || "-"}</div>
        {it.sizeLabel ? <div><b>Tamanho:</b> {it.sizeLabel}</div> : null}
      </>
    );
  }

  return (
    <>
      {it.sizeLabel ? <div><b>Tamanho:</b> {it.sizeLabel}</div> : null}
      {(it.mode === "acai" || it.mode === "mix") ? (
        <div><b>Açaí:</b> {it.acaiTypeLabel || "-"}</div>
      ) : null}
      {(it.mode === "sorvete" || it.mode === "mix") ? (
        <div><b>Sorvetes:</b> {it.sorveteLabels?.length ? it.sorveteLabels.join(", ") : "-"}</div>
      ) : null}
      <div><b>Adicionais:</b> {it.extrasLabels?.length ? it.extrasLabels.join(", ") : "-"}</div>
      {extrasPaid ? <div><b>Extras pagos:</b> {money(extrasPaid)}</div> : null}
    </>
  );
}

function fulfillmentButton(active: boolean): React.CSSProperties {
  return active
    ? {
        ...ui.buttonPrimary,
        padding: 10,
      }
    : {
        ...ui.buttonSecondary,
        padding: 10,
      };
}

const qtyBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  fontWeight: 800,
  fontSize: 18,
  cursor: "pointer",
};
