"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/components/AppHeader";
import { ui } from "@/lib/ui";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    setMsg("");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setMsg("Senha atualizada com sucesso. Agora você já pode entrar.");
  }

  return (
    <>
      <AppHeader />

      <main style={ui.appBg}>
        <section style={ui.pageNarrow}>
          <h1 style={ui.title}>Redefinir senha</h1>

          {err ? (
            <section style={ui.section}>
              <p style={{ margin: 0, color: "#ff9d9d" }}>{err}</p>
            </section>
          ) : null}

          {msg ? (
            <section style={ui.section}>
              <p style={{ margin: 0, color: "#9ff0b8" }}>{msg}</p>
            </section>
          ) : null}

          <section style={ui.section}>
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "#f2eaff" }}>Nova senha</span>

                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={ui.input}
                    required
                  />
                  <button type="button" onClick={() => setShow((v) => !v)} style={ui.buttonSecondary}>
                    {show ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </label>

              <button type="submit" disabled={loading} style={{ ...ui.buttonPrimary, opacity: loading ? 0.7 : 1 }}>
                {loading ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          </section>
        </section>
      </main>
    </>
  );
}