"use client";

import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { ui } from "@/lib/ui";

function getYouTubeEmbed(url: string) {
  try {
    const u = new URL(url);

    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    return "";
  } catch {
    return "";
  }
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [isLogged, setIsLogged] = useState(false);
  const [name, setName] = useState("");
  const [videoOpen, setVideoOpen] = useState(false);

  // Troque aqui pelo link que você quiser
  const howToOrderUrl =
    "https://youtube.com/shorts/0eiYSCEnTds";

  const embedUrl = useMemo(() => getYouTubeEmbed(howToOrderUrl), [howToOrderUrl]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        setIsLogged(false);
        setName("");
        setLoading(false);
        return;
      }

      setIsLogged(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      setName(
        profile?.full_name ||
          (user.user_metadata?.full_name as string) ||
          (user.email?.split("@")[0] ?? "cliente")
      );

      setLoading(false);
    })();
  }, []);

  return (
    <>
      <AppHeader />

      <main style={ui.appBg}>
        <section style={{ ...ui.page, paddingTop: 36, paddingBottom: 28 }}>
          <div style={ui.sectionSoft}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "#d7b7ff",
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              {loading ? "Carregando" : isLogged ? `Olá, ${name}` : "Bem-vindo"}
            </div>

            <h1
              style={{
                margin: "10px 0 8px",
                fontSize: 32,
                lineHeight: 1.1,
                color: "#ffffff",
              }}
            >
              Peça seu açaí sem sofrimento
            </h1>

            <p
              style={{
                margin: 0,
                fontSize: 16,
                lineHeight: 1.6,
                color: "#f1e8ff",
                maxWidth: 680,
              }}
            >
              Monte seu pedido, escolha entrega ou retirada, acompanhe o status e mande tudo direto no WhatsApp.
            </p>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 18,
              }}
            >
              {!loading && !isLogged ? (
                <>
                  <a href="/menu" style={{ ...ui.buttonPrimary, textDecoration: "none" }}>
                    Fazer pedido sem login
                  </a>

                  <a href="/login" style={{ ...ui.buttonSecondary, textDecoration: "none" }}>
                    Entrar / cadastrar
                  </a>
                </>
              ) : null}

              {!loading && isLogged ? (
                <>
                  <a href="/menu" style={{ ...ui.buttonPrimary, textDecoration: "none" }}>
                    Ir para o cardápio
                  </a>

                  <a href="/my-orders" style={{ ...ui.buttonSecondary, textDecoration: "none" }}>
                    Meus pedidos
                  </a>

                  <a href="/account" style={{ ...ui.buttonSecondary, textDecoration: "none" }}>
                    Minha conta
                  </a>


                </>
              ) : null}

              <button onClick={() => setVideoOpen(true)} style={ui.buttonSecondary}>
                Como pedir
              </button>
            </div>
          </div>
        </section>

        <section
          style={{
            ...ui.page,
            paddingTop: 0,
            paddingBottom: 40,
            display: "grid",
            gap: 14,
          }}
        >
          <div style={ui.card}>
            <h2 style={{ margin: 0, fontSize: 18, color: "#fff" }}>Como pedir</h2>
            <p style={{ margin: "8px 0 0", lineHeight: 1.6, color: "#ece1ff" }}>
              Escolha os itens, preencha os dados, envie no WhatsApp e acompanhe pelo link do pedido.
            </p>
          </div>

          <div style={ui.card}>
            <h2 style={{ margin: 0, fontSize: 18, color: "#fff" }}>
              {isLogged ? "Você já está com tudo pronto" : "Login não é obrigatório"}
            </h2>
            <p style={{ margin: "8px 0 0", lineHeight: 1.6, color: "#ece1ff" }}>
              {isLogged
                ? "Como você já entrou, seus dados e seus pedidos ficam mais fáceis de acompanhar."
                : "Você pode pedir sem login. Mas, se entrar, depois a experiência fica mais rápida."}
            </p>
          </div>

          <div style={ui.card}>
            <h2 style={{ margin: 0, fontSize: 18, color: "#fff" }}>Acompanhe o pedido</h2>
            <p style={{ margin: "8px 0 0", lineHeight: 1.6, color: "#ece1ff" }}>
              Depois de enviar, você recebe um link para acompanhar status como recebido, preparando, pronto e saiu para entrega.
            </p>
          </div>
        </section>
      </main>

      {videoOpen ? (
        <div
          onClick={() => setVideoOpen(false)}
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
              maxWidth: 820,
              background: "linear-gradient(135deg, rgba(38,16,60,0.98), rgba(17,11,26,0.98))",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14 }}>
              <b style={{ color: "#fff" }}>Como pedir</b>
              <button onClick={() => setVideoOpen(false)} style={ui.buttonGhost}>
                X
              </button>
            </div>

            <div style={{ padding: 14 }}>
              {embedUrl ? (
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    paddingTop: "56.25%",
                    borderRadius: 16,
                    overflow: "hidden",
                  }}
                >
                  <iframe
                    src={embedUrl}
                    title="Como pedir"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      border: "none",
                    }}
                  />
                </div>
              ) : (
                <div style={{ color: "#ece1ff", lineHeight: 1.6 }}>
                  <p>Esse link não é do YouTube para incorporar direto no site.</p>
                  <a
                    href={howToOrderUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ ...ui.buttonPrimary, textDecoration: "none", display: "inline-block" }}
                  >
                    Abrir vídeo
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}