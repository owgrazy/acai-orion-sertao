"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { money, normalizePhoneBR } from "@/lib/cart";
import { ui } from "@/lib/ui";

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
  items: any;
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
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    ...styles[status],
  };
}

function stageDone(current: string, target: string) {
  const order = ["novo", "confirmado", "preparando", "pronto", "saiu_para_entrega", "entregue"];
  if (current === "cancelado") return false;
  return order.indexOf(current) >= order.indexOf(target);
}

export default function OrderTrackingPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params?.id;
  const code = searchParams.get("code") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [phoneCheck, setPhoneCheck] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  const last4 = useMemo(() => {
    return order?.customer_phone ? normalizePhoneBR(order.customer_phone).slice(-4) : "";
  }, [order?.customer_phone]);

  useEffect(() => {
    if (!id || !code) {
      setLoading(false);
      setErr("Link inválido.");
      return;
    }

    let cancelled = false;

    async function load(showFirstLoading = false) {
      if (showFirstLoading) {
        setLoading(true);
        setErr("");
      }

      const { data, error } = await supabase.rpc("get_order_by_code", {
        p_id: id,
        p_code: code,
      });

      if (cancelled) return;

      if (showFirstLoading) setLoading(false);

      if (error) {
        setErr(error.message);
        return;
      }

      const first = data?.[0];
      if (!first) {
        setErr("Pedido não encontrado ou código inválido.");
        return;
      }

      setOrder({
        ...first,
        delivery_fee: Number(first.delivery_fee || 0),
        items_total: Number(first.items_total || 0),
        total_final: Number(first.total_final || 0),
      });

      setLastRefreshAt(new Date());
    }

    load(true);

    const interval = setInterval(() => {
      load(false);
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, code]);

  function tryUnlock() {
    const digits = normalizePhoneBR(phoneCheck);
    if (digits.slice(-4) === last4) {
      setUnlocked(true);
    } else {
      alert("Últimos 4 dígitos do telefone não conferem.");
    }
  }

  const waNum = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

  return (
    <>
      <AppHeader />

      <main style={ui.appBg}>
        <section style={ui.pageNarrow}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <h1 style={ui.title}>Acompanhar pedido</h1>
            <button onClick={() => router.push("/menu")} style={ui.buttonSecondary}>
              Menu
            </button>
          </header>

          {loading ? (
            <section style={ui.section}>
              <p style={{ margin: 0, color: "#ece1ff" }}>Carregando…</p>
            </section>
          ) : null}

          {err ? (
            <section style={ui.section}>
              <p style={{ margin: 0, color: "#ff9d9d" }}>Erro: {err}</p>
            </section>
          ) : null}

          {order ? (
            <>
              <section style={ui.section}>
                <div style={{ fontSize: 13, color: "#dcccff" }}>Pedido</div>
                <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4, color: "#fff" }}>
                  {order.order_code || order.id}
                </div>

                <div style={{ marginTop: 12 }}>
                  <span style={statusChipStyle(order.status)}>{statusLabel(order.status)}</span>
                </div>

                <div style={{ color: "#dcccff", marginTop: 8, fontSize: 13 }}>
                  Atualizado em: {fmtDateTimeBR(order.status_updated_at)}
                </div>

                {lastRefreshAt ? (
                  <div style={{ color: "#bfaee4", marginTop: 6, fontSize: 12 }}>
                    Atualização automática ativa • última checagem às {fmtDateTimeBR(lastRefreshAt.toISOString())}
                  </div>
                ) : null}
              </section>

              <section style={ui.section}>
                <b style={{ color: "#fff" }}>Andamento</b>

                {order.status === "cancelado" ? (
                  <div style={{ marginTop: 12 }}>
                    <span style={statusChipStyle("cancelado")}>Pedido cancelado</span>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                    <StageItem done={stageDone(order.status, "novo")} label="Pedido recebido" />
                    <StageItem done={stageDone(order.status, "confirmado")} label="Confirmado" />
                    <StageItem done={stageDone(order.status, "preparando")} label="Preparando" />
                    <StageItem done={stageDone(order.status, "pronto")} label="Pronto" />
                    <StageItem
                      done={stageDone(order.status, "saiu_para_entrega")}
                      label={order.fulfillment === "delivery" ? "Saiu para entrega" : "Pronto para retirada"}
                    />
                    <StageItem done={stageDone(order.status, "entregue")} label="Finalizado" />
                  </div>
                )}
              </section>

              {!unlocked ? (
                <section style={ui.section}>
                  <b style={{ color: "#fff" }}>Confirme para ver os detalhes</b>
                  <p style={{ marginTop: 8, color: "#ece1ff", fontSize: 13 }}>
                    Digite os <b>últimos 4 dígitos</b> do telefone usado no pedido.
                  </p>

                  <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                    <input
                      value={phoneCheck}
                      onChange={(e) => setPhoneCheck(e.target.value)}
                      placeholder="Ex: 1234"
                      style={ui.input}
                    />
                    <button onClick={tryUnlock} style={ui.buttonPrimary}>
                      Ver meu pedido
                    </button>
                  </div>
                </section>
              ) : (
                <>
                  <section style={ui.section}>
                    <b style={{ color: "#fff" }}>Resumo</b>

                    <div style={{ marginTop: 12, lineHeight: 1.75, color: "#ece1ff" }}>
                      <div><b>Data:</b> {fmtDateTimeBR(order.created_at)}</div>
                      <div><b>Cliente:</b> {order.customer_name}</div>
                      <div><b>Recebimento:</b> {order.fulfillment === "delivery" ? "Entrega" : "Retirada"}</div>

                      {order.fulfillment === "delivery" ? (
                        <>
                          <div><b>Bairro:</b> {order.bairro_name || "-"}</div>
                          <div><b>Endereço:</b> {order.address || "-"}</div>
                        </>
                      ) : (
                        <div><b>Local:</b> Retirada no estabelecimento</div>
                      )}

                      <div>
                        <b>Pagamento:</b> {order.payment}
                        {order.payment === "Dinheiro" && order.change_for
                          ? ` (troco: ${order.change_for})`
                          : ""}
                      </div>
                    </div>
                  </section>

                  <section style={ui.section}>
                    <b style={{ color: "#fff" }}>Valores</b>

                    <div style={{ marginTop: 12, lineHeight: 1.75, color: "#ece1ff" }}>
                      <div>Itens: <b>{money(order.items_total || 0)}</b></div>
                      <div>Taxa: <b>{money(order.delivery_fee || 0)}</b></div>
                      <div>Total: <b>{money(order.total_final || 0)}</b></div>
                    </div>
                  </section>

                  <section style={ui.section}>
                    <b style={{ color: "#fff" }}>Itens do pedido</b>

                    {Array.isArray(order.items) && order.items.length ? (
                      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                        {order.items.map((it: any, idx: number) => (
                          <div key={it.id || idx} style={ui.card}>
                            <div style={{ fontWeight: 800, color: "#fff" }}>
                              {idx + 1}) {labelMode(it.mode)}
                            </div>

                            <div style={{ marginTop: 8, lineHeight: 1.65, fontSize: 14, color: "#ece1ff" }}>
                              {it.mode === "milkshake" ? (
                                <>
                                  <div><b>Produto:</b> {it.milkshakeFlavorLabel || "-"}</div>
                                  {it.sizeLabel ? <div><b>Tamanho:</b> {it.sizeLabel}</div> : null}
                                </>
                              ) : (
                                <>
                                  {it.sizeLabel ? <div><b>Tamanho:</b> {it.sizeLabel}</div> : null}
                                  {(it.mode === "acai" || it.mode === "mix") ? (
                                    <div><b>Açaí:</b> {it.acaiTypeLabel || "-"}</div>
                                  ) : null}
                                  {(it.mode === "sorvete" || it.mode === "mix") ? (
                                    <div><b>Sorvetes:</b> {it.sorveteLabels?.length ? it.sorveteLabels.join(", ") : "-"}</div>
                                  ) : null}
                                  <div><b>Adicionais:</b> {it.extrasLabels?.length ? it.extrasLabels.join(", ") : "-"}</div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ marginTop: 10, color: "#ece1ff" }}>Sem itens disponíveis.</p>
                    )}
                  </section>

                  {waNum ? (
                    <button
                      style={{ ...ui.buttonPrimary, width: "100%", marginTop: 14 }}
                      onClick={() => {
                        const msg = `Oi! Quero falar sobre meu pedido ${order.order_code || order.id}.`;
                        window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, "_blank");
                      }}
                    >
                      Falar com a loja no WhatsApp
                    </button>
                  ) : null}
                </>
              )}
            </>
          ) : null}
        </section>
      </main>
    </>
  );
}

function labelMode(mode: string) {
  if (mode === "acai") return "Açaí";
  if (mode === "sorvete") return "Sorvete";
  if (mode === "mix") return "Açaí + Sorvete";
  return "Produto";
}

function StageItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 14,
        border: done
          ? "1px solid rgba(34,197,94,0.35)"
          : "1px solid rgba(255,255,255,0.08)",
        background: done
          ? "rgba(34,197,94,0.12)"
          : "rgba(255,255,255,0.03)",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          fontWeight: 900,
          background: done ? "#22c55e" : "rgba(255,255,255,0.12)",
          color: done ? "#08150d" : "#fff",
          flexShrink: 0,
        }}
      >
        {done ? "✓" : "•"}
      </span>

      <span style={{ color: "#f3e8ff", fontWeight: 600 }}>{label}</span>
    </div>
  );
}