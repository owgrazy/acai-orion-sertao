"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { ui } from "@/lib/ui";

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setErr("");
    setOk("");

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      setLoading(false);
      setErr("Você precisa estar logado para acessar sua conta.");
      return;
    }

    setEmail(user.email || "");

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle();

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setFullName(data?.full_name || "");
    setPhone(data?.phone || "");
  }

  async function saveProfile() {
    setSaving(true);
    setErr("");
    setOk("");

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      setSaving(false);
      setErr("Você precisa estar logado.");
      return;
    }

    const payload = {
      id: user.id,
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
    };

    const { error } = await supabase.from("profiles").upsert(payload);

    setSaving(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setOk("Dados salvos com sucesso.");
  }

  return (
    <>
      <AppHeader />

      <main style={ui.appBg}>
        <section style={ui.pageNarrow}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1 style={ui.title}>Minha conta</h1>
            <a href="/menu" style={{ textDecoration: "underline", fontSize: 14, color: "#e9dcff" }}>
              Voltar ao menu
            </a>
          </header>

          {loading ? <p style={{ marginTop: 14, opacity: 0.75 }}>Carregando…</p> : null}
          {err ? <p style={{ marginTop: 14, color: "#ff8f8f" }}>{err}</p> : null}
          {ok ? <p style={{ marginTop: 14, color: "#8ff0b2" }}>{ok}</p> : null}

          {!loading && !err ? (
            <section style={ui.section}>
              <label style={{ display: "grid", gap: 6 }}>
                Email
                <input value={email} readOnly style={ui.inputReadonly} />
              </label>

              <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
                Nome
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome"
                  style={ui.input}
                />
              </label>

              <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
                Telefone / WhatsApp
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: (85) 9 9999-9999"
                  style={ui.input}
                />
              </label>

              <button
                onClick={saveProfile}
                disabled={saving}
                style={{
                  ...ui.buttonPrimary,
                  marginTop: 14,
                  opacity: saving ? 0.7 : 1,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Salvando..." : "Salvar dados"}
              </button>
            </section>
          ) : null}
        </section>
      </main>
    </>
  );
}