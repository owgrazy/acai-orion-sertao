"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

const links = [
  ["/admin", "Visão geral", "◇"],
  ["/admin/orders", "Pedidos", "▤"],
  ["/admin/products", "Produtos", "□"],
  ["/admin/delivery-areas", "Áreas de delivery", "⌖"],
  ["/admin/store", "Horário da loja", "◴"],
] as const;

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("drawer-open");
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.classList.remove("drawer-open"); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const navigation = <nav style={{ display: "grid", gap: 5, marginTop: 22 }} aria-label="Administração">
    {links.map(([href, label, icon]) => <a key={href} className="admin-nav-link" href={href}><span aria-hidden="true" style={{ width: 24 }}>{icon}</span>{label}</a>)}
    <div className="drawer__divider" />
    <a className="admin-nav-link" href="/menu"><span aria-hidden="true" style={{ width: 24 }}>←</span>Voltar ao site</a>
  </nav>;

  return <div className="admin-layout">
    <aside className="admin-sidebar">
      <a className="brand" href="/admin"><Image className="brand__logo" src="/logo-orion-white.png" alt="" width={40} height={40}/><span>Órion Admin</span></a>
      {navigation}
      <div style={{ marginTop: "auto" }}><ThemeToggle /></div>
    </aside>
    <div className="admin-content">
      <header className="admin-mobile-nav"><a className="brand" href="/admin"><Image className="brand__logo" src="/logo-orion-white.png" alt="" width={40} height={40}/><span>Órion Admin</span></a><div className="header-actions"><ThemeToggle/><button className="icon-button" onClick={() => setOpen(true)} aria-label="Abrir navegação administrativa">☰</button></div></header>
      {children}
    </div>
    {open && <><button className="drawer-overlay" onClick={() => setOpen(false)} aria-label="Fechar navegação"/><aside className="drawer" role="dialog" aria-modal="true" aria-label="Navegação administrativa"><div className="drawer__header"><strong>Administração</strong><button className="icon-button" onClick={() => setOpen(false)} aria-label="Fechar navegação">×</button></div>{navigation}</aside></>}
  </div>;
}
