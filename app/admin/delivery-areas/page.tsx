"use client";

import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { supabase } from "@/lib/supabaseClient";
import { ui } from "@/lib/ui";

type DeliveryArea = {
  id: string;
  name: string;
  fee: number;
  is_active: boolean;
  sort_order: number;
};

function toNum(v: string) {
  const n = Number(String(v).replace(",", "."));
  return isFinite(n) ? n : null;
}

export default function DeliveryAreasPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [areas, setAreas] = useState<DeliveryArea[]>([]);

  const [name, setName] = useState("");
  const [fee, setFee] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const canSave = useMemo(() => name.trim().length >= 2, [name]);

  async function load() {
    setLoading(true);
    setErr("");

    const { data, error } = await supabase
      .from("delivery_areas")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    const list = ((data || []) as DeliveryArea[]).map((x: any) => ({
      ...x,
      fee: Number(x.fee || 0),
    }));

    setAreas(list);
  }

  useEffect(() => {
    load();
  }, []);

  async function addArea() {
    if (!canSave) return;

    const feeNum = toNum(fee);
    const sortNum = toNum(sortOrder);

    const { error } = await supabase.from("delivery_areas").insert({
      name: name.trim(),
      fee: feeNum ?? 0,
      is_active: true,
      sort_order: sortNum ?? 0,
    });

    if (error) {
      setErr(error.message);
      return;
    }

    setName("");
    setFee("");
    setSortOrder("0");
    load();
  }

  async function updateArea(id: string, patch: Partial<DeliveryArea>) {
    const { error } = await supabase.from("delivery_areas").update(patch).eq("id", id);
    if (error) {
      setErr(error.message);
      return;
    }
    load();
  }

  async function deleteArea(id: string) {
    if (!confirm("Apagar essa área?")) return;

    const { error } = await supabase.from("delivery_areas").delete().eq("id", id);
    if (error) {
      setErr(error.message);
      return;
    }

    load();
  }

  return (
    <>
      <AppHeader />

      <main style={ui.appBg}>
        <section style={ui.page}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <h1 style={ui.title}>Admin: Áreas de delivery</h1>
            <div style={{ display: "flex", gap: 10 }}>
              <a href="/admin" style={{ color: "#e9dcff", textDecoration: "underline", fontSize: 14 }}>
                Voltar
              </a>
              <a href="/cart" style={{ color: "#e9dcff", textDecoration: "underline", fontSize: 14 }}>
                Ver carrinho
              </a>
            </div>
          </header>

          {err ? <p style={{ color: "#ff9d9d", marginTop: 10 }}>Erro: {err}</p> : null}

          <section style={ui.section}>
            <b style={{ color: "#fff" }}>Nova área</b>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, marginTop: 12 }}>
              <label style={{ display: "grid", gap: 6, color: "#f2eaff" }}>
                Bairro
                <input value={name} onChange={(e) => setName(e.target.value)} style={ui.input} />
              </label>

              <label style={{ display: "grid", gap: 6, color: "#f2eaff" }}>
                Taxa
                <input value={fee} onChange={(e) => setFee(e.target.value)} style={ui.input} />
              </label>

              <label style={{ display: "grid", gap: 6, color: "#f2eaff" }}>
                Ordem de exibição
                <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={ui.input} />
              </label>

              <button
                onClick={addArea}
                disabled={!canSave}
                style={{ ...ui.buttonPrimary, alignSelf: "end", opacity: canSave ? 1 : 0.6 }}
              >
                Salvar
              </button>
            </div>
          </section>

          <section style={ui.section}>
            <b style={{ color: "#fff" }}>Lista</b>

            {loading ? (
              <p style={{ color: "#ece1ff", marginTop: 12 }}>Carregando…</p>
            ) : areas.length === 0 ? (
              <p style={{ color: "#ece1ff", marginTop: 12 }}>Nenhuma área cadastrada.</p>
            ) : (
              <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                {areas.map((a) => (
                  <div key={a.id} style={ui.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <b style={{ color: "#fff", fontSize: 18 }}>{a.name}</b>
                        <div style={{ color: "#ddd0f6", fontSize: 13, marginTop: 6 }}>
                          Taxa: R$ {Number(a.fee || 0).toFixed(2)} • ordem: {a.sort_order ?? 0}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <ToggleSwitch
                          checked={a.is_active}
                          onChange={() => updateArea(a.id, { is_active: !a.is_active })}
                        />

                        <button onClick={() => deleteArea(a.id)} style={ui.buttonGhost}>
                          Apagar
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
                      <label style={{ display: "grid", gap: 6, color: "#f2eaff" }}>
                        Bairro
                        <input
                          defaultValue={a.name}
                          onBlur={(e) => updateArea(a.id, { name: e.target.value })}
                          style={ui.input}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6, color: "#f2eaff" }}>
                        Taxa
                        <input
                          defaultValue={String(a.fee ?? 0)}
                          onBlur={(e) => {
                            const v = toNum(e.target.value);
                            updateArea(a.id, { fee: v ?? 0 });
                          }}
                          style={ui.input}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6, color: "#f2eaff" }}>
                        Ordem de exibição
                        <input
                          defaultValue={String(a.sort_order ?? 0)}
                          onBlur={(e) => {
                            const v = toNum(e.target.value);
                            updateArea(a.id, { sort_order: Math.round(v ?? 0) });
                          }}
                          style={ui.input}
                        />
                      </label>
                    </div>

                    <p style={{ marginTop: 10, color: "#dcccff", fontSize: 13 }}>
                      Editou? Sai do campo que salva.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      </main>
    </>
  );
}