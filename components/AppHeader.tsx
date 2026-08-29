"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ThemeToggle from "@/components/ThemeToggle";

type ProfileData = { full_name: string | null; phone: string | null; role: string | null };

export default function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLogged, setIsLogged] = useState(false);
  const [userName, setUserName] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const loadUser = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) { setIsLogged(false); setUserName(""); setRole(null); setLoading(false); return; }
    setIsLogged(true);
    const { data: profile } = await supabase.from("profiles").select("full_name, phone, role").eq("id", user.id).maybeSingle();
    const p = profile as ProfileData | null;
    setUserName(p?.full_name || (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || "Cliente");
    setRole(p?.role || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadUser());
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => void loadUser());
    return () => subscription.unsubscribe();
  }, [loadUser]);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.classList.add("drawer-open");
    const previous = document.activeElement as HTMLElement | null;
    const trigger = triggerRef.current;
    drawerRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>("a,button:not([disabled])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("drawer-open");
      document.removeEventListener("keydown", onKeyDown);
      (previous ?? trigger)?.focus();
    };
  }, [menuOpen]);

  async function logout() { await supabase.auth.signOut(); window.location.href = "/menu"; }

  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <Link className="brand" href="/" aria-label="Açaí Órion Sertão — início">
            <Image className="brand__logo" src="/logo-orion-white.png" alt="" width={40} height={40} priority />
            <span className="brand__text">Açaí Órion Sertão</span>
          </Link>
          <div className="header-actions">
            {!loading && (isLogged ? <a className="header-account" href="/account">Olá, {userName}</a> : <a className="header-account" href="/login">Entrar</a>)}
            <ThemeToggle />
            <button ref={triggerRef} className="icon-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu" aria-expanded={menuOpen} aria-controls="main-drawer">
              <span aria-hidden="true" style={{ fontSize: 22 }}>☰</span>
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <button className="drawer-overlay" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" tabIndex={-1} />
          <aside id="main-drawer" ref={drawerRef} className="drawer" role="dialog" aria-modal="true" aria-label="Navegação principal">
            <div className="drawer__header">
              <div><strong style={{ display: "block" }}>Menu</strong><span className="muted" style={{ fontSize: 13 }}>{isLogged ? `Olá, ${userName}` : "Peça do seu jeito"}</span></div>
              <button className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">×</button>
            </div>
            <nav className="drawer__nav" onClick={() => setMenuOpen(false)}>
              <MenuLink href="/" icon="⌂">Início</MenuLink>
              <MenuLink href="/menu" icon="◫">Cardápio</MenuLink>
              <MenuLink href="/cart" icon="◉">Carrinho</MenuLink>
              {isLogged && <><MenuLink href="/my-orders" icon="◷">Meus pedidos</MenuLink><MenuLink href="/account" icon="○">Minha conta</MenuLink></>}
              {role === "admin" && <><div className="drawer__divider" /><MenuLink href="/admin" icon="◇">Painel admin</MenuLink><MenuLink href="/admin/orders" icon="▤">Pedidos</MenuLink><MenuLink href="/admin/products" icon="□">Produtos</MenuLink><MenuLink href="/admin/delivery-areas" icon="⌖">Áreas de delivery</MenuLink><MenuLink href="/admin/store" icon="◴">Loja</MenuLink></>}
              <div className="drawer__divider" />
              {!isLogged ? <MenuLink href="/login" icon="→">Entrar / Cadastrar</MenuLink> : <button onClick={logout} className="drawer__link" style={{ border: 0, background: "transparent", cursor: "pointer" }}><span aria-hidden="true">↪</span>Sair</button>}
            </nav>
          </aside>
        </>
      )}
    </>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: string; children: React.ReactNode }) {
  return <Link href={href} className="drawer__link"><span aria-hidden="true">{icon}</span><span>{children}</span></Link>;
}
