"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/components/AppHeader";
import { ui } from "@/lib/ui";

type Mode = "login" | "signup" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    setMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    window.location.replace("/menu");
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    setMsg("");

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setMsg("Cadastro realizado com sucesso. Agora você já pode entrar.");
    setMode("login");
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    setMsg("");

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setMsg("Enviamos o link de redefinição para o seu email.");
  }

  return (
    <>
      <AppHeader />

      <main style={ui.appBg}>
        <section style={ui.pageNarrow}>
          <header style={{ marginBottom: 14 }}>
            <h1 style={ui.title}>
              {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar senha"}
            </h1>
            <p style={{ ...ui.subtitle, marginTop: 6 }}>
              {mode === "login"
                ? "Entre para acompanhar pedidos e preencher seus dados mais rápido."
                : mode === "signup"
                ? "Cadastre-se para deixar sua experiência mais prática."
                : "Digite seu email para receber o link de redefinição."}
            </p>
          </header>

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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <button onClick={() => setMode("login")} style={tabButton(mode === "login")}>
                Entrar
              </button>
              <button onClick={() => setMode("signup")} style={tabButton(mode === "signup")}>
                Cadastrar
              </button>
              <button onClick={() => setMode("forgot")} style={tabButton(mode === "forgot")}>
                Esqueci a senha
              </button>
            </div>

            {mode === "login" ? (
              <form onSubmit={handleLogin} style={{ display: "grid", gap: 12, marginTop: 14 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: "#f2eaff" }}>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={ui.input}
                    required
                  />
                </label>

                <PasswordField
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  onToggleShow={() => setShowPassword((v) => !v)}
                />

                <button type="submit" disabled={loading} style={{ ...ui.buttonPrimary, opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </form>
            ) : null}

            {mode === "signup" ? (
              <form onSubmit={handleSignup} style={{ display: "grid", gap: 12, marginTop: 14 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: "#f2eaff" }}>Nome</span>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={ui.input}
                    required
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: "#f2eaff" }}>Telefone</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={ui.input}
                    required
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: "#f2eaff" }}>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={ui.input}
                    required
                  />
                </label>

                <PasswordField
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  onToggleShow={() => setShowPassword((v) => !v)}
                />

                <button type="submit" disabled={loading} style={{ ...ui.buttonPrimary, opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Cadastrando..." : "Criar conta"}
                </button>
              </form>
            ) : null}

            {mode === "forgot" ? (
              <form onSubmit={handleForgot} style={{ display: "grid", gap: 12, marginTop: 14 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: "#f2eaff" }}>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={ui.input}
                    required
                  />
                </label>

                <button type="submit" disabled={loading} style={{ ...ui.buttonPrimary, opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Enviando..." : "Enviar link de redefinição"}
                </button>
              </form>
            ) : null}
          </section>
        </section>
      </main>
    </>
  );
}

function PasswordField({
  value,
  onChange,
  show,
  onToggleShow,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ color: "#f2eaff" }}>Senha</span>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={ui.input}
          required
        />

        <button type="button" onClick={onToggleShow} style={ui.buttonSecondary}>
          {show ? "Ocultar" : "Ver"}
        </button>
      </div>
    </label>
  );
}

function tabButton(active: boolean): React.CSSProperties {
  return active
    ? { ...ui.buttonPrimary, padding: 10 }
    : { ...ui.buttonSecondary, padding: 10 };
}