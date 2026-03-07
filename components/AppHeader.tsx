"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ProfileData = {
  full_name: string | null;
  phone: string | null;
  role: string | null;
};

export default function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [isLogged, setIsLogged] = useState(false);
  const [userName, setUserName] = useState("");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUser() {
    setLoading(true);

    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (!user) {
      setIsLogged(false);
      setUserName("");
      setRole(null);
      setLoading(false);
      return;
    }

    setIsLogged(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, role")
      .eq("id", user.id)
      .maybeSingle();

    const p = profile as ProfileData | null;

    const fallbackName =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      "Cliente";

    setUserName(p?.full_name || fallbackName);
    setRole(p?.role || null);
    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/menu";
  }

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 2000,
          background:
            "linear-gradient(135deg, rgba(28,12,45,0.98), rgba(76,29,149,0.95))",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            maxWidth: 920,
            margin: "0 auto",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <a
  href="/"
  style={{
    textDecoration: "none",
    color: "#ffffff",
    fontWeight: 900,
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    gap: 10,
  }}
>
  <img
    src="/logo-orion-white.png"
    alt="Açaí Órion"
    style={{
      width: 38,
      height: 38,
      objectFit: "contain",
      display: "block",
    }}
  />
  <span style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>
    Açaí Órion
  </span>
</a>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!loading ? (
              isLogged ? (
                <span style={{ fontSize: 13, color: "#f3ebff" }}>
                  Olá, <b>{userName}</b>
                </span>
              ) : (
                <a href="/login" style={{ textDecoration: "underline", fontSize: 13, color: "#fff" }}>
                  Entrar
                </a>
              )
            ) : null}

            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Abrir menu"
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                padding: 0,
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <span style={barStyle} />
                <span style={barStyle} />
                <span style={barStyle} />
              </div>
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 1999,
          }}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              right: 12,
              top: 64,
              width: 290,
              background:
                "linear-gradient(135deg, rgba(35,16,56,0.98), rgba(85,34,136,0.96))",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              boxShadow: "0 18px 40px rgba(0,0,0,0.32)",
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 800, color: "#fff", marginBottom: 10 }}>
              Navegação
            </div>

            <nav style={{ display: "grid", gap: 8 }}>
              <MenuLink href="/">Página inicial</MenuLink>
              <MenuLink href="/menu">Cardápio</MenuLink>
              <MenuLink href="/cart">Carrinho</MenuLink>

              {isLogged ? (
                <>
                  <MenuLink href="/my-orders">Meus pedidos</MenuLink>
                  <MenuLink href="/account">Minha conta</MenuLink>
                </>
              ) : null}

              {role === "admin" ? (
                <>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "8px 0" }} />
                  <MenuLink href="/admin">Painel admin</MenuLink>
                  <MenuLink href="/admin/orders">Pedidos</MenuLink>
                  <MenuLink href="/admin/products">Produtos</MenuLink>
                  <MenuLink href="/admin/delivery-areas">Áreas de delivery</MenuLink>
                </>
              ) : null}

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "8px 0" }} />

              {!isLogged ? (
                <MenuLink href="/login">Entrar / Cadastro</MenuLink>
              ) : (
                <button
                  onClick={logout}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  Sair
                </button>
              )}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function MenuLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      style={{
        textDecoration: "none",
        color: "#ffffff",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
        fontSize: 14,
      }}
    >
      {children}
    </a>
  );
}

const barStyle: React.CSSProperties = {
  display: "block",
  width: 18,
  height: 2,
  background: "#ffffff",
  borderRadius: 999,
};