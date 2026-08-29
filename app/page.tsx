"use client";

import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";

function getYouTubeEmbed(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) { const id = u.pathname.replace("/", ""); return id ? `https://www.youtube.com/embed/${id}` : ""; }
    if (u.hostname.includes("youtube.com")) { const id = u.searchParams.get("v"); if (id) return `https://www.youtube.com/embed/${id}`; }
    return "";
  } catch { return ""; }
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [isLogged, setIsLogged] = useState(false);
  const [name, setName] = useState("");
  const [videoOpen, setVideoOpen] = useState(false);
  const howToOrderUrl = "https://youtube.com/shorts/0eiYSCEnTds";
  const embedUrl = useMemo(() => getYouTubeEmbed(howToOrderUrl), [howToOrderUrl]);

  useEffect(() => { void (async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) { setIsLogged(false); setName(""); setLoading(false); return; }
    setIsLogged(true);
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    setName(profile?.full_name || (user.user_metadata?.full_name as string) || (user.email?.split("@")[0] ?? "cliente"));
    setLoading(false);
  })(); }, []);

  return <div className="app-shell">
    <AppHeader />
    <main>
      <section className="home-hero page-container">
        <div className="home-hero__copy">
          <span className="eyebrow">{loading ? "Carregando" : isLogged ? `Olá, ${name}` : "Seu momento mais gostoso"}</span>
          <h1>Açaí do seu jeito, sem complicação.</h1>
          <p>Monte seu pedido em poucos passos, escolha entrega ou retirada e acompanhe tudo pelo celular.</p>
          <div className="home-actions">
            <a className="btn btn--primary" href="/menu">Fazer pedido <span aria-hidden="true">→</span></a>
            {!loading && !isLogged ? <a className="btn btn--secondary" href="/login">Entrar / Cadastrar</a> : <a className="btn btn--secondary" href="/my-orders">Meus pedidos</a>}
          </div>
          <button className="home-video-link" onClick={() => setVideoOpen(true)}><span aria-hidden="true">▶</span> Veja como pedir</button>
        </div>
        <div className="home-hero__visual" aria-hidden="true">
          <div className="açaí-orb">AÇAÍ<br/><small>ÓRION</small></div>
          <span className="hero-chip hero-chip--one">Entrega rápida</span>
          <span className="hero-chip hero-chip--two">Monte como quiser</span>
        </div>
      </section>

      <section className="home-steps page-container" aria-labelledby="steps-title">
        <div><span className="eyebrow">Simples e rápido</span><h2 id="steps-title">Seu pedido em três passos</h2></div>
        <div className="steps-grid">
          <Step number="01" icon="✦" title="Escolha" text="Selecione tamanho, sabores e adicionais." />
          <Step number="02" icon="⌁" title="Finalize" text="Defina entrega, retirada e pagamento." />
          <Step number="03" icon="◷" title="Acompanhe" text="Veja o andamento pelo link do pedido." />
        </div>
      </section>
    </main>

    {videoOpen && <div className="modal-overlay" onClick={() => setVideoOpen(false)} role="presentation">
      <div className="video-modal surface surface--elevated" role="dialog" aria-modal="true" aria-labelledby="video-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><strong id="video-title">Como pedir</strong><button className="icon-button" onClick={() => setVideoOpen(false)} aria-label="Fechar vídeo">×</button></div>
        {embedUrl ? <div className="video-frame"><iframe src={embedUrl} title="Como pedir" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div> : <a className="btn btn--primary" href={howToOrderUrl} target="_blank" rel="noreferrer">Abrir vídeo</a>}
      </div>
    </div>}
  </div>;
}

function Step({ number, icon, title, text }: { number: string; icon: string; title: string; text: string }) {
  return <article className="step-card surface"><div className="step-icon" aria-hidden="true">{icon}</div><span>{number}</span><h3>{title}</h3><p>{text}</p></article>;
}
