"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { money } from "@/lib/cart";
import { ui } from "@/lib/ui";

type OrderItem = {
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
};

type OrderRow = {
  id: string;
  order_code: string | null;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  fulfillment: "delivery" | "pickup";
  bairro_name: string | null;
  delivery_fee: number;
  address: string | null;
  payment: "Pix" | "Cartão" | "Dinheiro";
  change_for: string | null;
  items_total: number;
  total_final: number;
  status: string;
  status_updated_at: string;
  tracking_code: string;
  items: OrderItem[];
};

const STATUS_OPTIONS = [
  { value: "novo", label: "Pedido recebido" },
  { value: "confirmado", label: "Confirmado" },
  { value: "preparando", label: "Preparando" },
  { value: "pronto", label: "Pronto" },
  { value: "saiu_para_entrega", label: "Saiu para entrega" },
  { value: "entregue", label: "Entregue" },
  { value: "cancelado", label: "Cancelado" },
];

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDayLocal(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`);
}

function endOfDayLocal(dateStr: string) {
  return new Date(`${dateStr}T23:59:59.999`);
}

function fmtDateTimeBR(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

function statusLabel(s: string) {
  return STATUS_OPTIONS.find((x) => x.value === s)?.label || s;
}

function statusChipStyle(status: string): React.CSSProperties {
  const styles: Record<string, React.CSSProperties> = {
    novo: {
      background: "rgba(250, 204, 21, 0.15)",
      color: "#fde68a",
      border: "1px solid rgba(250,204,21,0.35)",
    },
    confirmado: {
      background: "rgba(59, 130, 246, 0.15)",
      color: "#bfdbfe",
      border: "1px solid rgba(59,130,246,0.35)",
    },
    preparando: {
      background: "rgba(168, 85, 247, 0.18)",
      color: "#e9d5ff",
      border: "1px solid rgba(168,85,247,0.35)",
    },
    pronto: {
      background: "rgba(34, 197, 94, 0.16)",
      color: "#bbf7d0",
      border: "1px solid rgba(34,197,94,0.35)",
    },
    saiu_para_entrega: {
      background: "rgba(139, 92, 246, 0.18)",
      color: "#ddd6fe",
      border: "1px solid rgba(139,92,246,0.35)",
    },
    entregue: {
      background: "rgba(16, 185, 129, 0.16)",
      color: "#a7f3d0",
      border: "1px solid rgba(16,185,129,0.35)",
    },
    cancelado: {
      background: "rgba(239, 68, 68, 0.16)",
      color: "#fecaca",
      border: "1px solid rgba(239,68,68,0.35)",
    },
  };

  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    ...styles[status],
  };
}

function itemLabel(mode: OrderItem["mode"]) {
  if (mode === "acai") return "Açaí";
  if (mode === "sorvete") return "Sorvete";
  if (mode === "mix") return "Açaí + Sorvete";
  return "Produto";
}

function itemExtrasPaidValue(it: OrderItem) {
  const qty = it.paidExtrasCount ?? 0;
  const unit = it.paidExtrasUnitPrice ?? 0;
  return qty * unit;
}

function itemBaseValue(it: OrderItem) {
  return typeof it.price === "number" ? it.price : 0;
}

function itemTotalValue(it: OrderItem) {
  return itemBaseValue(it) + itemExtrasPaidValue(it);
}

function csvEscape(v: any) {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

export default function AdminOrdersPage() {
  const today = useMemo(() => new Date(), []);
  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [selected, setSelected] = useState<OrderRow | null>(null);

  const [from, setFrom] = useState<string>(isoDate(sevenDaysAgo));
  const [to, setTo] = useState<string>(isoDate(today));

  const [savingId, setSavingId] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const firstLoadDoneRef = useRef(false);
  const previousIdsRef = useRef<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("admin_orders_sound_enabled");
    if (saved === "true") {
      setSoundEnabled(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("admin_orders_sound_enabled", String(soundEnabled));
  }, [soundEnabled]);

  async function ensureAudioReady() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }
  }

  async function playLoudTring() {
    if (!soundEnabled) return;

    try {
      await ensureAudioReady();
      const ctx = audioCtxRef.current!;

      const notes = [
        { freq: 1046, start: 0.0, duration: 0.11 },
        { freq: 1318, start: 0.14, duration: 0.11 },
        { freq: 1046, start: 0.28, duration: 0.11 },
        { freq: 1318, start: 0.42, duration: 0.11 },
        { freq: 1567, start: 0.56, duration: 0.16 },
      ];

      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.start);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + n.start);
        gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + n.start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.start + n.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + n.start);
        osc.stop(ctx.currentTime + n.start + n.duration + 0.02);
      });
    } catch {
      // navegador pode bloquear até gesto do usuário
    }
  }

  function stopAlarmLoop() {
    if (alarmIntervalRef.current) {
      window.clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
  }

  function startAlarmLoop() {
    if (!soundEnabled) return;
    if (alarmIntervalRef.current) return;

    playLoudTring();

    alarmIntervalRef.current = window.setInterval(() => {
      playLoudTring();
    }, 2500);
  }

  const hasPendingNewOrder = useMemo(() => {
    return orders.some((o) => o.status === "novo");
  }, [orders]);

  useEffect(() => {
    if (!soundEnabled) {
      stopAlarmLoop();
      return;
    }

    if (hasPendingNewOrder) {
      startAlarmLoop();
    } else {
      stopAlarmLoop();
    }

    return () => {
      if (!hasPendingNewOrder) {
        stopAlarmLoop();
      }
    };
  }, [soundEnabled, hasPendingNewOrder]);

  useEffect(() => {
    return () => {
      stopAlarmLoop();
    };
  }, []);

  async function load(showLoading = true) {
    if (showLoading) {
      setLoading(true);
      setErr("");
    }

    const fromDt = startOfDayLocal(from);
    const toDt = endOfDayLocal(to);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .gte("created_at", fromDt.toISOString())
      .lte("created_at", toDt.toISOString())
      .order("created_at", { ascending: false });

    if (showLoading) setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    const list = ((data || []) as any[]).map((o) => ({
      ...o,
      delivery_fee: Number(o.delivery_fee || 0),
      items_total: Number(o.items_total || 0),
      total_final: Number(o.total_final || 0),
      tracking_code: o.tracking_code || "",
      order_code: o.order_code || null,
      items: Array.isArray(o.items) ? o.items : [],
    }));

    const nextIds = new Set(list.map((o) => o.id));

    if (firstLoadDoneRef.current) {
      let foundNew = false;

      for (const id of nextIds) {
        if (!previousIdsRef.current.has(id)) {
          foundNew = true;
          break;
        }
      }

      if (foundNew) {
        playLoudTring();
      }
    }

    previousIdsRef.current = nextIds;
    firstLoadDoneRef.current = true;

    setOrders(list);
    setLastSyncAt(new Date());

    if (selected) {
      const newerSelected = list.find((o) => o.id === selected.id) || null;
      setSelected(newerSelected);
    }
  }

  useEffect(() => {
    load(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      load(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [from, to, selected, soundEnabled]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            await playLoudTring();
          }
          load(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [from, to, soundEnabled, selected]);

  const validForTotals = useMemo(() => orders.filter((o) => o.status !== "cancelado"), [orders]);

  const totals = useMemo(() => {
    const count = validForTotals.length;
    const items = validForTotals.reduce((acc, o) => acc + (o.items_total || 0), 0);
    const fees = validForTotals.reduce((acc, o) => acc + (o.delivery_fee || 0), 0);
    const grand = validForTotals.reduce((acc, o) => acc + (o.total_final || 0), 0);
    const deliveryCount = validForTotals.filter((o) => o.fulfillment === "delivery").length;
    const pickupCount = validForTotals.filter((o) => o.fulfillment === "pickup").length;
    return { count, items, fees, grand, deliveryCount, pickupCount };
  }, [validForTotals]);

  function setQuick(range: "today" | "7d" | "30d") {
    const now = new Date();

    if (range === "today") {
      setFrom(isoDate(now));
      setTo(isoDate(now));
      return;
    }

    const back = new Date(now);
    back.setDate(now.getDate() - (range === "7d" ? 6 : 29));
    setFrom(isoDate(back));
    setTo(isoDate(now));
  }

  async function updateStatus(orderId: string, newStatus: string) {
    setSavingId(orderId);

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    setSavingId("");

    if (error) {
      alert(`Erro ao salvar status: ${error.message}`);
      return;
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: newStatus, status_updated_at: new Date().toISOString() }
          : o
      )
    );

    if (selected?.id === orderId) {
      setSelected((prev) =>
        prev ? { ...prev, status: newStatus, status_updated_at: new Date().toISOString() } : prev
      );
    }
  }

  function notifyWhatsApp(o: OrderRow) {
    const link = `${window.location.origin}/order/${o.id}?code=${o.tracking_code}`;
    const phone = String(o.customer_phone || "").replace(/\D/g, "");

    if (!phone || phone.length < 10) {
      alert("Telefone do pedido inválido.");
      return;
    }

    const msg =
      `*Açaí Órion*\n\n` +
      `*Pedido:* ${o.order_code || o.id}\n` +
      `*Status:* ${statusLabel(o.status)}\n` +
      `*Acompanhar:* ${link}`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  function exportCSV() {
    const header = [
      "order_code",
      "id",
      "created_at",
      "customer_name",
      "customer_phone",
      "fulfillment",
      "bairro_name",
      "delivery_fee",
      "address",
      "payment",
      "change_for",
      "items_total",
      "total_final",
      "status",
      "status_updated_at",
      "tracking_code",
      "items_count",
    ];

    const rows = orders.map((o) => [
      o.order_code || "",
      o.id,
      o.created_at,
      o.customer_name,
      o.customer_phone,
      o.fulfillment,
      o.bairro_name || "",
      o.delivery_fee,
      o.address || "",
      o.payment,
      o.change_for || "",
      o.items_total,
      o.total_final,
      o.status,
      o.status_updated_at,
      o.tracking_code,
      Array.isArray(o.items) ? o.items.length : 0,
    ]);

    const csv = [
      header.map(csvEscape).join(";"),
      ...rows.map((r) => r.map(csvEscape).join(";")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedidos_${from}_ate_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function toggleSound() {
    if (!soundEnabled) {
      await ensureAudioReady();
      setSoundEnabled(true);
      return;
    }

    setSoundEnabled(false);
  }

  function printSelectedOrder(o: OrderRow) {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;

    const itemsHtml = o.items?.length
      ? o.items
          .map((it, idx) => {
            const extrasPaid = itemExtrasPaidValue(it);
            const subtotal = itemTotalValue(it);

            return `
              <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px dashed #999;">
                <strong>${idx + 1}) ${itemLabel(it.mode)}</strong><br/>
                ${it.mode === "milkshake" ? `<div><b>Produto:</b> ${it.milkshakeFlavorLabel || "-"}</div>` : ""}
                ${it.sizeLabel ? `<div><b>Tamanho:</b> ${it.sizeLabel}</div>` : ""}
                ${(it.mode === "acai" || it.mode === "mix") ? `<div><b>Açaí:</b> ${it.acaiTypeLabel || "-"}</div>` : ""}
                ${(it.mode === "sorvete" || it.mode === "mix") ? `<div><b>Sorvetes:</b> ${(it.sorveteLabels || []).join(", ") || "-"}</div>` : ""}
                ${it.mode !== "milkshake" ? `<div><b>Adicionais:</b> ${(it.extrasLabels || []).join(", ") || "-"}</div>` : ""}
                ${extrasPaid ? `<div><b>Extras pagos:</b> ${money(extrasPaid)}</div>` : ""}
                <div><b>Subtotal:</b> ${money(subtotal)}</div>
              </div>
            `;
          })
          .join("")
      : "<p>Sem itens.</p>";

    win.document.write(`
      <html>
        <head>
          <title>Pedido ${o.order_code || o.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1, h2, h3 { margin: 0 0 10px; }
            .block { margin-bottom: 18px; }
          </style>
        </head>
        <body>
          <h1>Pedido ${o.order_code || o.id}</h1>
          <div class="block">
            <div><b>Data:</b> ${fmtDateTimeBR(o.created_at)}</div>
            <div><b>Status:</b> ${statusLabel(o.status)}</div>
            <div><b>Cliente:</b> ${o.customer_name}</div>
            <div><b>Telefone:</b> ${o.customer_phone}</div>
            <div><b>Recebimento:</b> ${o.fulfillment === "delivery" ? "Entrega" : "Retirada"}</div>
            ${o.fulfillment === "delivery" ? `<div><b>Bairro:</b> ${o.bairro_name || "-"}</div>` : ""}
            ${o.fulfillment === "delivery" ? `<div><b>Endereço:</b> ${o.address || "-"}</div>` : ""}
            <div><b>Pagamento:</b> ${o.payment}${o.payment === "Dinheiro" && o.change_for ? ` (troco: ${o.change_for})` : ""}</div>
          </div>

          <div class="block">
            <h3>Itens</h3>
            ${itemsHtml}
          </div>

          <div class="block">
            <div><b>Itens:</b> ${money(o.items_total || 0)}</div>
            <div><b>Taxa:</b> ${money(o.delivery_fee || 0)}</div>
            <div><b>Total:</b> ${money(o.total_final || 0)}</div>
          </div>
        </body>
      </html>
    `);

    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <>
      <AppHeader />

      <main style={ui.appBg}>
        <section style={ui.page}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <h1 style={ui.title}>Admin: Pedidos</h1>
            <a href="/admin" style={{ color: "#e9dcff", textDecoration: "underline", fontSize: 14 }}>
              Voltar
            </a>
          </header>

          {err ? <p style={{ color: "#ff9d9d", marginTop: 10 }}>Erro: {err}</p> : null}

          <section style={ui.section}>
            <b style={{ color: "#fff" }}>Filtros</b>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button onClick={() => setQuick("today")} style={ui.buttonSecondary}>Hoje</button>
              <button onClick={() => setQuick("7d")} style={ui.buttonSecondary}>Últimos 7 dias</button>
              <button onClick={() => setQuick("30d")} style={ui.buttonSecondary}>Últimos 30 dias</button>
              <button onClick={toggleSound} style={soundEnabled ? ui.buttonPrimary : ui.buttonSecondary}>
                {soundEnabled ? "Som ligado" : "Ativar som"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 10, marginTop: 12 }}>
              <label style={{ display: "grid", gap: 6, color: "#f2eaff" }}>
                De
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={ui.input} />
              </label>

              <label style={{ display: "grid", gap: 6, color: "#f2eaff" }}>
                Até
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={ui.input} />
              </label>

              <button onClick={() => load(true)} style={{ ...ui.buttonPrimary, alignSelf: "end" }}>
                Atualizar
              </button>

              <button onClick={exportCSV} style={{ ...ui.buttonSecondary, alignSelf: "end" }}>
                Exportar CSV
              </button>
            </div>

            <p style={{ marginTop: 10, color: "#dcccff", fontSize: 12 }}>
              Atualização automática em tempo real + checagem a cada 10 segundos.
              {lastSyncAt ? ` Última sincronização: ${fmtDateTimeBR(lastSyncAt.toISOString())}` : ""}
              {soundEnabled && hasPendingNewOrder ? " • Alarme ativo enquanto houver pedido novo." : ""}
            </p>
          </section>

          <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            <Card title="Pedidos" value={String(totals.count)} />
            <Card title="Itens" value={money(totals.items)} />
            <Card title="Entrega" value={money(totals.fees)} />
            <Card title="Total" value={money(totals.grand)} />
          </section>

          <section style={ui.section}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <b style={{ color: "#fff" }}>Distribuição</b>
              <div style={{ color: "#ddd0f6", fontSize: 13 }}>
                Entrega: <b>{totals.deliveryCount}</b> • Retirada: <b>{totals.pickupCount}</b>
              </div>
            </div>
          </section>

          <section style={ui.section}>
            <b style={{ color: "#fff" }}>Lista de pedidos</b>

            {loading ? (
              <p style={{ color: "#ece1ff", marginTop: 12 }}>Carregando…</p>
            ) : orders.length === 0 ? (
              <p style={{ color: "#ece1ff", marginTop: 12 }}>Nenhum pedido nesse período.</p>
            ) : (
              <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                {orders.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      ...ui.card,
                      opacity: o.status === "cancelado" ? 0.68 : 1,
                      border:
                        o.status === "novo"
                          ? "1px solid rgba(250,204,21,0.55)"
                          : (ui.card as any).border,
                      boxShadow:
                        o.status === "novo"
                          ? "0 0 0 1px rgba(250,204,21,0.18), 0 12px 28px rgba(250,204,21,0.12)"
                          : (ui.card as any).boxShadow,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>
                          {o.order_code || "-"}
                        </div>
                        <div style={{ color: "#dcccff", fontSize: 13, marginTop: 4 }}>
                          {fmtDateTimeBR(o.created_at)}
                        </div>
                        <div style={{ color: "#ece1ff", marginTop: 8 }}>
                          <b>{o.customer_name}</b> • {o.customer_phone}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={statusChipStyle(o.status)}>{statusLabel(o.status)}</div>
                        <div style={{ marginTop: 8, color: "#f3e8ff", fontWeight: 700 }}>
                          {money(o.total_final || 0)}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 12, color: "#ece1ff", lineHeight: 1.7 }}>
                      <div><b>Recebimento:</b> {o.fulfillment === "delivery" ? `Entrega (${o.bairro_name || "-"})` : "Retirada"}</div>
                      <div><b>Pagamento:</b> {o.payment}</div>
                      <div><b>Itens:</b> {money(o.items_total || 0)} • <b>Taxa:</b> {money(o.delivery_fee || 0)}</div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 10, marginTop: 14 }}>
                      <select
                        value={o.status}
                        onChange={(e) => updateStatus(o.id, e.target.value)}
                        style={ui.input}
                        disabled={savingId === o.id}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>

                      <button onClick={() => setSelected(o)} style={ui.buttonSecondary}>
                        Ver
                      </button>

                      <button onClick={() => printSelectedOrder(o)} style={ui.buttonSecondary}>
                        Imprimir
                      </button>

                      <button onClick={() => notifyWhatsApp(o)} style={ui.buttonPrimary}>
                        Avisar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {selected ? (
            <div
              onClick={() => setSelected(null)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.82)",
                display: "grid",
                placeItems: "center",
                padding: 18,
                zIndex: 9999,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  maxWidth: 840,
                  background: "linear-gradient(135deg, rgba(38,16,60,0.98), rgba(17,11,26,0.98))",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 20,
                  overflow: "hidden",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14 }}>
                  <b style={{ color: "#fff" }}>Pedido {selected.order_code || selected.id}</b>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => printSelectedOrder(selected)} style={ui.buttonSecondary}>
                      Imprimir
                    </button>
                    <button onClick={() => setSelected(null)} style={ui.buttonGhost}>X</button>
                  </div>
                </div>

                <div style={{ padding: 14, color: "#ece1ff", lineHeight: 1.6 }}>
                  <div><b>Status:</b> {statusLabel(selected.status)} ({fmtDateTimeBR(selected.status_updated_at)})</div>
                  <div><b>Cliente:</b> {selected.customer_name} • {selected.customer_phone}</div>
                  <div><b>Tipo:</b> {selected.fulfillment === "delivery" ? `Entrega (${selected.bairro_name || "-"})` : "Retirada"}</div>
                  {selected.fulfillment === "delivery" ? <div><b>Endereço:</b> {selected.address || "-"}</div> : null}
                  <div><b>Pagamento:</b> {selected.payment}{selected.payment === "Dinheiro" && selected.change_for ? ` • Troco: ${selected.change_for}` : ""}</div>

                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <b style={{ color: "#fff" }}>Valores</b>
                    <div style={{ marginTop: 8 }}>Itens: {money(selected.items_total || 0)}</div>
                    <div>Taxa: {money(selected.delivery_fee || 0)}</div>
                    <div><b>Total:</b> {money(selected.total_final || 0)}</div>
                  </div>

                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <b style={{ color: "#fff" }}>Itens do pedido</b>

                    {selected.items?.length ? (
                      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                        {selected.items.map((it, idx) => {
                          const extrasPaid = itemExtrasPaidValue(it);
                          const subtotal = itemTotalValue(it);

                          return (
                            <div key={it.id || idx} style={ui.card}>
                              <div style={{ fontWeight: 800, color: "#fff" }}>
                                {idx + 1}) {itemLabel(it.mode)}
                              </div>

                              <div style={{ marginTop: 8, lineHeight: 1.6, fontSize: 14, color: "#ece1ff" }}>
                                {it.mode === "milkshake" ? (
                                  <>
                                    <div><b>Produto:</b> {it.milkshakeFlavorLabel || "-"}</div>
                                    {it.sizeLabel ? <div><b>Tamanho:</b> {it.sizeLabel}</div> : null}
                                  </>
                                ) : (
                                  <>
                                    {it.sizeLabel ? <div><b>Tamanho:</b> {it.sizeLabel}</div> : null}
                                    {(it.mode === "acai" || it.mode === "mix") ? <div><b>Açaí:</b> {it.acaiTypeLabel || "-"}</div> : null}
                                    {(it.mode === "sorvete" || it.mode === "mix") ? (
                                      <div><b>Sorvetes:</b> {it.sorveteLabels?.length ? it.sorveteLabels.join(", ") : "-"}</div>
                                    ) : null}
                                    <div><b>Adicionais:</b> {it.extrasLabels?.length ? it.extrasLabels.join(", ") : "-"}</div>
                                    {extrasPaid ? <div><b>Extras pagos:</b> {money(extrasPaid)}</div> : null}
                                  </>
                                )}

                                <div style={{ marginTop: 6 }}>
                                  <b>Subtotal:</b> {money(subtotal)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ opacity: 0.75, marginTop: 8 }}>Sem itens salvos nesse pedido.</p>
                    )}
                  </div>

                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <b style={{ color: "#fff" }}>Link do cliente</b>
                    <div style={{ color: "#dcccff", fontSize: 13, marginTop: 8 }}>
                      {typeof window !== "undefined"
                        ? `${window.location.origin}/order/${selected.id}?code=${selected.tracking_code}`
                        : ""}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div style={ui.card}>
      <div style={{ color: "#dcccff", fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 900, marginTop: 6, color: "#fff" }}>{value}</div>
    </div>
  );
}