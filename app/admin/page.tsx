"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { ui } from "@/lib/ui";

export default function AdminHome() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        setLoading(false);
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      setLoading(false);

      if (error) {
        setErr(error.message);
        return;
      }

      setIsAdmin(data?.role === "admin");
    })();
  }, []);

  if (loading) {
    return (
      <>
        <AppHeader />
        <main style={ui.appBg}>
          <section style={ui.pageNarrow}>
            <section style={ui.section}>
              <p style={{ margin: 0, color: "#ece1ff" }}>Carregando admin…</p>
            </section>
          </section>
        </main>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <AppHeader />
        <main style={ui.appBg}>
          <section style={ui.pageNarrow}>
            <section style={ui.section}>
              <h1 style={ui.title}>Admin</h1>
              <p style={{ color: "#ff9d9d", marginTop: 10 }}>Acesso negado.</p>
              <a href="/menu" style={{ color: "#e9dcff", textDecoration: "underline" }}>
                Voltar pro menu
              </a>
            </section>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />

      <main style={ui.appBg}>
        <section style={ui.page}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <h1 style={ui.title}>Painel Admin</h1>
            <a href="/menu" style={{ color: "#e9dcff", textDecoration: "underline", fontSize: 14 }}>
              Ver cardápio
            </a>
          </header>

          {err ? <p style={{ color: "#ff9d9d", marginTop: 10 }}>Erro: {err}</p> : null}

          <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
            <a href="/admin/orders" style={{ ...ui.card, textDecoration: "none" }}>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>Pedidos</div>
              <div style={{ color: "#ddd0f6", marginTop: 6 }}>Ver pedidos, status, faturamento e exportação CSV.</div>
            </a>

            <a href="/admin/products" style={{ ...ui.card, textDecoration: "none" }}>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>Produtos</div>
              <div style={{ color: "#ddd0f6", marginTop: 6 }}>Cadastrar e organizar tamanhos, sabores, milkshakes e adicionais.</div>
            </a>

            <a href="/admin/delivery-areas" style={{ ...ui.card, textDecoration: "none" }}>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>Áreas de delivery</div>
              <div style={{ color: "#ddd0f6", marginTop: 6 }}>Editar bairros, taxas e ordem de exibição.</div>
            </a>

            <a href="/admin/store" style={{ ...ui.card, textDecoration: "none" }}>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>Horário da Loja</div>
              <div style={{ color: "#ddd0f6", marginTop: 6 }}>Editar horário</div>
            </a>

          </div>
        </section>
      </main>
    </>
  );
}