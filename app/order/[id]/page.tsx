"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { ui } from "@/lib/ui";

type PublicOrderProgress = {
  id: string;
  order_code: string | null;
  created_at: string;
  fulfillment: "delivery" | "pickup";
  status: string;
  status_updated_at: string;
};

function fmtDateTimeBR(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    novo: "Pedido recebido", confirmado: "Confirmado", preparando: "Preparando",
    pronto: "Pronto", saiu_para_entrega: "Saiu para entrega",
    entregue: "Entregue", cancelado: "Cancelado",
  };
  return labels[status] || status;
}

function stageDone(current: string, target: string) {
  const stages = ["novo", "confirmado", "preparando", "pronto", "saiu_para_entrega", "entregue"];
  return current !== "cancelado" && stages.indexOf(current) >= stages.indexOf(target);
}

export default function OrderTrackingPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id;
  const code = searchParams.get("code") || "";
  const [loading, setLoading] = useState(Boolean(id && code));
  const [errorMessage, setErrorMessage] = useState(id && code ? "" : "Link inválido.");
  const [order, setOrder] = useState<PublicOrderProgress | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!id || !code) return;
    let cancelled = false;
    async function load(firstLoad = false) {
      if (firstLoad) setLoading(true);
      const { data, error } = await supabase.rpc("get_order_by_code", { p_id: id, p_code: code });
      if (cancelled) return;
      if (firstLoad) setLoading(false);
      if (error) {
        setErrorMessage("Não foi possível consultar o pedido.");
        return;
      }
      const progress = data?.[0] as PublicOrderProgress | undefined;
      if (!progress) {
        setErrorMessage("Pedido não encontrado ou código inválido.");
        return;
      }
      setErrorMessage("");
      setOrder(progress);
      setLastRefreshAt(new Date());
    }
    void load(true);
    const interval = window.setInterval(() => void load(false), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [id, code]);

  return (
    <>
      <AppHeader />
      <main style={ui.appBg}>
        <section style={ui.pageNarrow}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <h1 style={ui.title}>Acompanhar pedido</h1>
            <button onClick={() => router.push("/menu")} style={ui.buttonSecondary}>Menu</button>
          </header>
          {loading ? <section style={ui.section}>Carregando…</section> : null}
          {errorMessage ? <section style={ui.section}><p style={{ margin: 0, color: "#ff9d9d" }}>{errorMessage}</p></section> : null}
          {order ? (
            <>
              <section style={ui.section}>
                <div style={{ fontSize: 13, color: "#dcccff" }}>Pedido</div>
                <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4, color: "#fff" }}>{order.order_code || order.id}</div>
                <div style={{ marginTop: 12, color: "#fff", fontWeight: 800 }}>{statusLabel(order.status)}</div>
                <div style={{ color: "#dcccff", marginTop: 8, fontSize: 13 }}>Atualizado em: {fmtDateTimeBR(order.status_updated_at)}</div>
                {lastRefreshAt ? <div style={{ color: "#bfaee4", marginTop: 6, fontSize: 12 }}>Atualização automática ativa • última consulta às {fmtDateTimeBR(lastRefreshAt.toISOString())}</div> : null}
              </section>
              <section style={ui.section}>
                <b style={{ color: "#fff" }}>Andamento</b>
                {order.status === "cancelado" ? <p style={{ color: "#fecaca" }}>Pedido cancelado.</p> : (
                  <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                    <StageItem done={stageDone(order.status, "novo")} label="Pedido recebido" />
                    <StageItem done={stageDone(order.status, "confirmado")} label="Confirmado" />
                    <StageItem done={stageDone(order.status, "preparando")} label="Preparando" />
                    <StageItem done={stageDone(order.status, "pronto")} label="Pronto" />
                    <StageItem done={stageDone(order.status, "saiu_para_entrega")} label={order.fulfillment === "delivery" ? "Saiu para entrega" : "Pronto para retirada"} />
                    <StageItem done={stageDone(order.status, "entregue")} label="Finalizado" />
                  </div>
                )}
              </section>
              <section style={ui.section}><p style={{ margin: 0, color: "#dcccff", fontSize: 13 }}>Por segurança, esta página pública mostra somente o andamento do pedido.</p></section>
            </>
          ) : null}
        </section>
      </main>
    </>
  );
}

function StageItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, border: done ? "1px solid rgba(34,197,94,0.35)" : "1px solid rgba(255,255,255,0.08)", background: done ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)" }}>
      <span style={{ width: 22, height: 22, borderRadius: 999, display: "grid", placeItems: "center", background: done ? "#22c55e" : "rgba(255,255,255,0.12)", color: done ? "#08150d" : "#fff", flexShrink: 0 }}>{done ? "✓" : "•"}</span>
      <span style={{ color: "#f3e8ff", fontWeight: 600 }}>{label}</span>
    </div>
  );
}
