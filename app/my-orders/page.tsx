"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { money } from "@/lib/cart";
import { ui } from "@/lib/ui";

type OrderRow = {
  id: string;
  order_code: string | null;
  created_at: string;
  fulfillment: "delivery" | "pickup";
  bairro_name: string | null;
  payment: "Pix" | "Cartão" | "Dinheiro";
  total_final: number;
  status: string;
  tracking_code: string;
};

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
  const map: Record<string, string> = {
    novo: "Pedido recebido",
    confirmado: "Confirmado",
    preparando: "Preparando",
    pronto: "Pronto",
    saiu_para_entrega: "Saiu para entrega",
    entregue: "Entregue",
    cancelado: "Cancelado",
  };
  return map[s] || s;
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

export default function MyOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    setErr("");

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      setLoading(false);
      setErr("Você precisa estar logado para ver seus pedidos.");
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select("id, order_code, created_at, fulfillment, bairro_name, payment, total_final, status, tracking_code")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    const list = ((data || []) as any[]).map((o) => ({
      ...o,
      total_final: Number(o.total_final || 0),
    }));

    setOrders(list);
  }

  return (
    <>
      <AppHeader />

      <main style={ui.appBg}>
        <section style={ui.pageNarrow}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <h1 style={ui.title}>Meus pedidos</h1>
            <a href="/menu" style={{ textDecoration: "underline", fontSize: 14, color: "#e9dcff" }}>
              Voltar ao menu
            </a>
          </header>

          {loading ? (
            <section style={ui.section}>
              <p style={{ margin: 0, color: "#ece1ff" }}>Carregando…</p>
            </section>
          ) : null}

          {err ? (
            <section style={ui.section}>
              <p style={{ margin: 0, color: "#ff9d9d" }}>{err}</p>
            </section>
          ) : null}

          {!loading && !err && orders.length === 0 ? (
            <section style={ui.section}>
              <p style={{ margin: 0, color: "#ece1ff" }}>Você ainda não tem pedidos salvos.</p>
            </section>
          ) : null}

          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            {orders.map((o) => {
              const trackingLink = `/order/${o.id}?code=${o.tracking_code}`;

              return (
                <div key={o.id} style={ui.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 900, color: "#fff", fontSize: 18 }}>
                        {o.order_code || o.id}
                      </div>
                      <div style={{ fontSize: 13, color: "#dcccff", marginTop: 4 }}>
                        {fmtDateTimeBR(o.created_at)}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={statusChipStyle(o.status)}>{statusLabel(o.status)}</div>
                      <div style={{ fontSize: 14, color: "#f3e8ff", marginTop: 8, fontWeight: 700 }}>
                        {money(o.total_final)}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.7, color: "#ece1ff" }}>
                    <div><b>Recebimento:</b> {o.fulfillment === "delivery" ? "Entrega" : "Retirada"}</div>
                    {o.fulfillment === "delivery" ? (
                      <div><b>Bairro:</b> {o.bairro_name || "-"}</div>
                    ) : null}
                    <div><b>Pagamento:</b> {o.payment}</div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                    <a
                      href={trackingLink}
                      style={{
                        ...ui.buttonPrimary,
                        textDecoration: "none",
                      }}
                    >
                      Acompanhar pedido
                    </a>

                    <a
                      href={trackingLink}
                      style={{
                        ...ui.buttonSecondary,
                        textDecoration: "none",
                      }}
                    >
                      Ver detalhes
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}