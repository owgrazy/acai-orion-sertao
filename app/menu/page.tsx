"use client";
import { makeId } from "@/lib/id";
import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import RadioPill from "@/components/ui/RadioPill";
import CheckPill from "@/components/ui/CheckPill";
import { supabase } from "@/lib/supabaseClient";
import { addToCart, CartItem, getCart, itemTotalValue, money } from "@/lib/cart";
import { isStoreOpen } from "@/lib/store";
import { ui } from "@/lib/ui";

type ProductType =
  | "size"
  | "acai_type"
  | "sorvete_flavor"
  | "milkshake"
  | "extra"
  | "bebida"
  | "outro"
  | "combo";

type Mode =
  | "acai"
  | "sorvete"
  | "mix"
  | "milkshake"
  | "bebida"
  | "outro"
  | "combo";

type Product = {
  id: string;
  type: ProductType;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  size_ml: number | null;
  extras_limit: number | null;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
};

const EXTRA_PRICE = 2;

export default function MenuPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [mode, setMode] = useState<Mode>("acai");

  const [sizes, setSizes] = useState<Product[]>([]);
  const [acaiTypes, setAcaiTypes] = useState<Product[]>([]);
  const [sorveteFlavors, setSorveteFlavors] = useState<Product[]>([]);
  const [milkshakes, setMilkshakes] = useState<Product[]>([]);
  const [bebidas, setBebidas] = useState<Product[]>([]);
  const [outros, setOutros] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Product[]>([]);
  const [extras, setExtras] = useState<Product[]>([]);

  const [sizeId, setSizeId] = useState("");
  const [acaiTypeId, setAcaiTypeId] = useState("");
  const [sorveteSelected, setSorveteSelected] = useState<string[]>([]);
  const [extrasSelected, setExtrasSelected] = useState<string[]>([]);

  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null);

  const [allowPaidExtras, setAllowPaidExtras] = useState(false);
  const [paidModalOpen, setPaidModalOpen] = useState(false);
  const [pendingExtraId, setPendingExtraId] = useState<string | null>(null);

  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [storeOpen, setStoreOpen] = useState(true);

  const [milkshakeQty, setMilkshakeQty] = useState<Record<string, number>>({});
  const [bebidaQty, setBebidaQty] = useState<Record<string, number>>({});
  const [outroQty, setOutroQty] = useState<Record<string, number>>({});
  const [comboQty, setComboQty] = useState<Record<string, number>>({});

  const selectedSize = useMemo(() => sizes.find((s) => s.id === sizeId), [sizes, sizeId]);
  const extrasLimit = selectedSize?.extras_limit ?? 0;

  useEffect(() => {
    refreshFloatingCart();

    const onFocus = () => refreshFloatingCart();
    const onStorage = () => refreshFloatingCart();

    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function refreshFloatingCart() {
    const items = getCart();
    setCartCount(items.length);
    setCartTotal(items.reduce((acc, item) => acc + itemTotalValue(item), 0));
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_available", true)
        .order("type", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      setLoading(false);

      if (error) {
        setErr(error.message);
        return;
      }

      const all = (data || []) as Product[];

      setSizes(all.filter((p) => p.type === "size"));
      setAcaiTypes(all.filter((p) => p.type === "acai_type"));
      setSorveteFlavors(all.filter((p) => p.type === "sorvete_flavor"));
      setMilkshakes(all.filter((p) => p.type === "milkshake"));
      setBebidas(all.filter((p) => p.type === "bebida"));
      setOutros(all.filter((p) => p.type === "outro"));
      setCombos(all.filter((p) => p.type === "combo"));
      setExtras(all.filter((p) => p.type === "extra"));
    })();
  }, []);

  useEffect(() => {
    setAcaiTypeId("");
    setSorveteSelected([]);
    setExtrasSelected([]);

    setMilkshakeQty({});
    setBebidaQty({});
    setOutroQty({});
    setComboQty({});

    setAllowPaidExtras(false);
    setPaidModalOpen(false);
    setPendingExtraId(null);

    if (
      mode === "milkshake" ||
      mode === "bebida" ||
      mode === "outro" ||
      mode === "combo"
    ) {
      setSizeId("");
    }
  }, [mode]);

  useEffect(() => {
    setExtrasSelected([]);
    setAllowPaidExtras(false);
    setPaidModalOpen(false);
    setPendingExtraId(null);
  }, [sizeId]);

  function toggleSorvete(id: string) {
    setSorveteSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }

      if (prev.length >= 3) {
        alert("Você pode escolher até 3 sabores de sorvete.");
        return prev;
      }

      return [...prev, id];
    });
  }

  function requestPaidExtras(extraId: string) {
    setPendingExtraId(extraId);
    setPaidModalOpen(true);
  }

  function confirmPaidExtrasYes() {
    setAllowPaidExtras(true);
    setPaidModalOpen(false);

    if (pendingExtraId) {
      setExtrasSelected((prev) => (prev.includes(pendingExtraId) ? prev : [...prev, pendingExtraId]));
    }

    setPendingExtraId(null);
  }

  function confirmPaidExtrasNo() {
    setPaidModalOpen(false);
    setPendingExtraId(null);
  }

  function toggleExtra(id: string) {
    if (!sizeId) return;

    const has = extrasSelected.includes(id);
    if (has) {
      setExtrasSelected(extrasSelected.filter((x) => x !== id));
      return;
    }

    if (!allowPaidExtras && extrasSelected.length >= extrasLimit) {
      requestPaidExtras(id);
      return;
    }

    setExtrasSelected([...extrasSelected, id]);
  }

  function changeQty(
    setter: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    id: string,
    delta: number
  ) {
    setter((prev) => {
      const next = (prev[id] || 0) + delta;
      return {
        ...prev,
        [id]: Math.max(0, next),
      };
    });
  }

  const toppings = extras.filter((e) => e.category === "toppings");
  const cremes = extras.filter((e) => e.category === "cremes");
  const coberturas = extras.filter((e) => e.category === "coberturas");
  const caldas = extras.filter((e) => e.category === "caldas");
  const frutas = extras.filter((e) => e.category === "frutas");

  const paidExtrasCount = useMemo(() => {
    if (!sizeId) return 0;
    const over = extrasSelected.length - extrasLimit;
    return allowPaidExtras ? Math.max(0, over) : 0;
  }, [allowPaidExtras, extrasSelected.length, extrasLimit, sizeId]);

  const paidExtrasValue = paidExtrasCount * EXTRA_PRICE;

  function addReadyProductMultiple(
    list: Product[],
    qtyMap: Record<string, number>,
    ReadyType: "milkshake" | "bebida" | "combo" | "outro"
  ) {
    const selectedItems = list.filter((p) => (qtyMap[p.id] || 0) > 0);

    if (!selectedItems.length) {
      alert("Selecione pelo menos 1 item.");
      return false;
    }

    for (const product of selectedItems) {
      const qty = qtyMap[product.id] || 0;

      for (let i = 0; i < qty; i++) {
        const item: CartItem = {
          id: makeId(),
          mode: "milkshake",
          readyProductType: ReadyType,
          milkshakeFlavorId: product.id,
          milkshakeFlavorLabel: product.name || "",
          sizeLabel: product.size_ml ? `${product.size_ml}ml` : "",
          price: product.price ?? null,
          createdAt: Date.now(),
        };

        addToCart(item);
      }
    }

    refreshFloatingCart();
    alert("Adicionado ao carrinho");
    return true;
  }

  function handleAddToCart() {
    if (mode === "milkshake") {
      addReadyProductMultiple(milkshakes, milkshakeQty, "milkshake");
      return;
    }

    if (mode === "bebida") {
      addReadyProductMultiple(bebidas, bebidaQty, "bebida");
      return;
    }

    if (mode === "outro") {
      addReadyProductMultiple(outros, outroQty, "outro");
      return;
    }

    if (mode === "combo") {
      addReadyProductMultiple(combos, comboQty, "combo");
      return;
    }

    if (!sizeId) {
      alert("Escolha o tamanho.");
      return;
    }

    if ((mode === "acai" || mode === "mix") && !acaiTypeId) {
      alert("Escolha o tipo de açaí.");
      return;
    }

    if ((mode === "sorvete" || mode === "mix") && sorveteSelected.length === 0) {
      alert("Escolha pelo menos 1 sabor de sorvete.");
      return;
    }

    const size = sizes.find((x) => x.id === sizeId);

    const item: CartItem = {
      id: makeId(),
      mode,

      sizeId,
      sizeLabel: size ? `${size.size_ml}ml` : "",
      price: size?.price ?? null,

      acaiTypeId,
      acaiTypeLabel: acaiTypes.find((x) => x.id === acaiTypeId)?.name || "",

      sorveteIds: sorveteSelected,
      sorveteLabels: sorveteSelected
        .map((id) => sorveteFlavors.find((x) => x.id === id)?.name)
        .filter(Boolean) as string[],

      extrasIds: extrasSelected,
      extrasLabels: extrasSelected
        .map((id) => extras.find((x) => x.id === id)?.name)
        .filter(Boolean) as string[],

      allowPaidExtras,
      paidExtrasCount,
      paidExtrasUnitPrice: EXTRA_PRICE,

      createdAt: Date.now(),
    };

    addToCart(item);
    refreshFloatingCart();
    alert("Adicionado ao carrinho");
  }

  if (loading) {
    return (
      <>
        <AppHeader />
        <main style={ui.appBg}>
          <section style={ui.pageNarrow}>
            <div style={ui.section}>Carregando cardápio…</div>
          </section>
        </main>
      </>
    );
  }

  if (err) {
    return (
      <>
        <AppHeader />
        <main style={ui.appBg}>
          <section style={ui.pageNarrow}>
            <div style={ui.section}>
              <h1 style={ui.title}>Cardápio</h1>
              <p style={{ color: "#ff9d9d", marginTop: 10 }}>Erro: {err}</p>
            </div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />

      <main style={ui.appBg}>
        <section style={{ ...ui.pageNarrow, paddingBottom: cartCount > 0 ? 110 : 18 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <h1 style={ui.title}>Monte seu pedido</h1>
            <a href="/cart" style={{ textDecoration: "underline", fontSize: 14, color: "#e9dcff" }}>
              Ver carrinho
            </a>
          </header>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
            <button onClick={() => setMode("acai")} style={tabButton(mode === "acai")}>Açaí</button>
            <button onClick={() => setMode("sorvete")} style={tabButton(mode === "sorvete")}>Sorvete</button>
            <button onClick={() => setMode("mix")} style={tabButton(mode === "mix")}>Açaí + Sorvete</button>
            <button onClick={() => setMode("milkshake")} style={tabButton(mode === "milkshake")}>Milkshake</button>
            <button onClick={() => setMode("bebida")} style={tabButton(mode === "bebida")}>Bebidas</button>
            <button onClick={() => setMode("outro")} style={tabButton(mode === "outro")}>Outros</button>
            <button onClick={() => setMode("combo")} style={tabButton(mode === "combo")}>Combos</button>
          </div>

          {mode !== "milkshake" &&
          mode !== "bebida" &&
          mode !== "outro" &&
          mode !== "combo" && (
            <section style={ui.section}>
              <b style={{ color: "#fff" }}>1) Tamanho</b>
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {sizes.map((s) => (
                  <ChoiceCard
                    key={s.id}
                    checked={sizeId === s.id}
                    onSelect={() => setSizeId(s.id)}
                    title={`${s.size_ml}ml`}
                    subtitle={
                      <>
                        {s.price != null ? `${money(Number(s.price))} • ` : ""}
                        até {s.extras_limit} adicionais
                        {s.description ? ` • ${s.description}` : ""}
                      </>
                    }
                    imageUrl={s.image_url}
                    onPreview={() => setPreview({ url: s.image_url!, title: `${s.size_ml}ml` })}
                    type="radio"
                    name="size"
                  />
                ))}
              </div>
            </section>
          )}

          {(mode === "acai" || mode === "mix") && (
            <section style={ui.section}>
              <b style={{ color: "#fff" }}>2) Tipo de Açaí</b>
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {acaiTypes.map((a) => (
                  <ChoiceCard
                    key={a.id}
                    checked={acaiTypeId === a.id}
                    onSelect={() => setAcaiTypeId(a.id)}
                    title={a.name}
                    subtitle={a.description || undefined}
                    imageUrl={a.image_url}
                    onPreview={() => setPreview({ url: a.image_url!, title: a.name })}
                    type="radio"
                    name="acai"
                  />
                ))}
              </div>
            </section>
          )}

          {(mode === "sorvete" || mode === "mix") && (
            <section style={ui.section}>
              <b style={{ color: "#fff" }}>3) Sabores de Sorvete</b>
              <p style={{ ...ui.subtitle, marginTop: 8 }}>
                Você pode escolher até 3 sabores.
              </p>

              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {sorveteFlavors.map((f) => (
                  <ChoiceCard
                    key={f.id}
                    checked={sorveteSelected.includes(f.id)}
                    onSelect={() => toggleSorvete(f.id)}
                    title={f.name}
                    subtitle={f.description || undefined}
                    imageUrl={f.image_url}
                    onPreview={() => setPreview({ url: f.image_url!, title: f.name })}
                    type="checkbox"
                  />
                ))}
              </div>
            </section>
          )}

          {mode === "milkshake" && (
            <ReadyProductsQuantitySection
              title="1) Escolha seus Milkshakes"
              items={milkshakes}
              qtyMap={milkshakeQty}
              onMinus={(id) => changeQty(setMilkshakeQty, id, -1)}
              onPlus={(id) => changeQty(setMilkshakeQty, id, +1)}
              setPreview={setPreview}
              footerText="Você pode adicionar quantos milkshakes quiser."
            />
          )}

          {mode === "bebida" && (
            <ReadyProductsQuantitySection
              title="1) Escolha suas Bebidas"
              items={bebidas}
              qtyMap={bebidaQty}
              onMinus={(id) => changeQty(setBebidaQty, id, -1)}
              onPlus={(id) => changeQty(setBebidaQty, id, +1)}
              setPreview={setPreview}
            />
          )}

          {mode === "outro" && (
            <ReadyProductsQuantitySection
              title="1) Escolha os produtos"
              items={outros}
              qtyMap={outroQty}
              onMinus={(id) => changeQty(setOutroQty, id, -1)}
              onPlus={(id) => changeQty(setOutroQty, id, +1)}
              setPreview={setPreview}
            />
          )}

          {mode === "combo" && (
            <ReadyProductsQuantitySection
              title="1) Escolha os combos"
              items={combos}
              qtyMap={comboQty}
              onMinus={(id) => changeQty(setComboQty, id, -1)}
              onPlus={(id) => changeQty(setComboQty, id, +1)}
              setPreview={setPreview}
            />
          )}

          {mode !== "milkshake" &&
          mode !== "bebida" &&
          mode !== "outro" &&
          mode !== "combo" && (
            <section style={ui.section}>
              <b style={{ color: "#fff" }}>4) Adicionais</b>

              <div style={{ marginTop: 8, fontSize: 13, color: "#e9dcff", lineHeight: 1.6 }}>
                {sizeId ? (
                  <>
                    <div>
                      Selecionados: <b>{extrasSelected.length}</b> (incluídos: {extrasLimit})
                    </div>
                    {allowPaidExtras && paidExtrasCount > 0 ? (
                      <div>
                        Extras pagos: <b>{paidExtrasCount}</b> (+{money(paidExtrasValue)})
                      </div>
                    ) : (
                      <div style={{ opacity: 0.82 }}>
                        Ao passar do limite, o sistema pergunta se você quer pagar extras (+{money(EXTRA_PRICE)} cada).
                      </div>
                    )}
                  </>
                ) : (
                  <>Escolha um tamanho primeiro para liberar os adicionais.</>
                )}
              </div>

              <fieldset style={{ border: "none", padding: 0, marginTop: 10 }} disabled={!sizeId}>
                <ExtrasGroup title="Toppings" items={toppings} selected={extrasSelected} onToggle={toggleExtra} onPreview={setPreview} />
                <ExtrasGroup title="Cremes" items={cremes} selected={extrasSelected} onToggle={toggleExtra} onPreview={setPreview} />
                <ExtrasGroup title="Coberturas" items={coberturas} selected={extrasSelected} onToggle={toggleExtra} onPreview={setPreview} />
                <ExtrasGroup title="Caldas" items={caldas} selected={extrasSelected} onToggle={toggleExtra} onPreview={setPreview} />
                <ExtrasGroup title="Frutas" items={frutas} selected={extrasSelected} onToggle={toggleExtra} onPreview={setPreview} />
              </fieldset>

              {!allowPaidExtras && sizeId && extrasSelected.length >= extrasLimit ? (
                <p style={{ marginTop: 10, color: "#ffd56a" }}>
                  Limite atingido. Se você tentar marcar mais, o sistema vai perguntar se quer pagar extras.
                </p>
              ) : null}
            </section>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={handleAddToCart} style={{ ...ui.buttonPrimary, flex: 1 }}>
              Adicionar ao carrinho
            </button>

            <a
              href="/cart"
              style={{
                ...ui.buttonSecondary,
                flex: 1,
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              Ir pro carrinho
            </a>
          </div>
        </section>
      </main>

      {cartCount > 0 ? (
        <a
          href="/cart"
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            zIndex: 1200,
            textDecoration: "none",
            color: "#fff",
            background: "linear-gradient(135deg, #a855f7, #7c3aed)",
            boxShadow: "0 16px 32px rgba(124,58,237,0.38)",
            borderRadius: 999,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            maxWidth: "calc(100vw - 32px)",
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: "rgba(255,255,255,0.16)",
              display: "grid",
              placeItems: "center",
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            🛒
          </span>

          <span style={{ display: "grid", lineHeight: 1.2 }}>
            <span style={{ fontWeight: 900, fontSize: 14 }}>
              Ver carrinho
            </span>
            <span style={{ fontSize: 12, opacity: 0.95 }}>
              {cartCount} {cartCount === 1 ? "item" : "itens"} • {money(cartTotal)}
            </span>
          </span>
        </a>
      ) : null}

      {preview ? (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
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
              maxWidth: 560,
              background: "linear-gradient(135deg, rgba(38,16,60,0.98), rgba(17,11,26,0.98))",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14 }}>
              <b style={{ color: "#fff" }}>{preview.title}</b>
              <button onClick={() => setPreview(null)} style={ui.buttonGhost}>
                X
              </button>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.url} alt={preview.title} style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
        </div>
      ) : null}

      {paidModalOpen ? (
        <div
          onClick={confirmPaidExtrasNo}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.82)",
            display: "grid",
            placeItems: "center",
            padding: 18,
            zIndex: 10000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              background: "linear-gradient(135deg, rgba(38,16,60,0.98), rgba(17,11,26,0.98))",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: 16,
              boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b style={{ color: "#fff" }}>Limite atingido</b>
              <button onClick={confirmPaidExtrasNo} style={ui.buttonGhost}>
                X
              </button>
            </div>

            <p style={{ color: "#ece1ff", marginTop: 12, lineHeight: 1.5 }}>
              Você já escolheu <b>{extrasLimit}</b> adicionais.
              <br />
              Quer adicionar mais? Cada extra custa <b>{money(EXTRA_PRICE)}</b>.
            </p>

            <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
              <button onClick={confirmPaidExtrasNo} style={ui.buttonSecondary}>
                Não, manter só os incluídos
              </button>
              <button onClick={confirmPaidExtrasYes} style={ui.buttonPrimary}>
                Sim, quero pagar extras (+{money(EXTRA_PRICE)} cada)
              </button>
            </div>

            <p style={{ color: "#d8cfff", fontSize: 12, marginTop: 10 }}>
              Isso evita confusão no final.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

function tabButton(active: boolean): React.CSSProperties {
  return active
    ? {
        ...ui.buttonPrimary,
        padding: 10,
      }
    : {
        ...ui.buttonSecondary,
        padding: 10,
      };
}

function ReadyProductsQuantitySection({
  title,
  items,
  qtyMap,
  onMinus,
  onPlus,
  setPreview,
  footerText,
}: {
  title: string;
  items: Product[];
  qtyMap: Record<string, number>;
  onMinus: (id: string) => void;
  onPlus: (id: string) => void;
  setPreview: (v: { url: string; title: string } | null) => void;
  footerText?: string;
}) {
  return (
    <section style={ui.section}>
      <b style={{ color: "#fff" }}>{title}</b>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {items.map((item) => (
          <QuantityCard
            key={item.id}
            title={item.name}
            subtitle={
              <>
                {item.size_ml ? `${item.size_ml}ml • ` : ""}
                {item.price != null ? `${money(Number(item.price))}` : ""}
                {item.description ? ` • ${item.description}` : ""}
              </>
            }
            qty={qtyMap[item.id] || 0}
            onMinus={() => onMinus(item.id)}
            onPlus={() => onPlus(item.id)}
            imageUrl={item.image_url}
            onPreview={() => setPreview({ url: item.image_url!, title: item.name })}
          />
        ))}
      </div>

      {footerText ? <p style={{ ...ui.subtitle, marginTop: 10 }}>{footerText}</p> : null}
    </section>
  );
}

function ChoiceCard({
  checked,
  onSelect,
  title,
  subtitle,
  imageUrl,
  onPreview,
  type,
  name,
}: {
  checked: boolean;
  onSelect: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  imageUrl?: string | null;
  onPreview?: () => void;
  type: "radio" | "checkbox";
  name?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        justifyContent: "space-between",
        border: checked ? "1px solid rgba(187,134,252,0.8)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 12,
        background: checked
          ? "linear-gradient(135deg, rgba(168,85,247,0.18), rgba(255,255,255,0.03))"
          : "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ flex: 1 }}>
        {type === "radio" ? (
          <RadioPill
            checked={checked}
            onChange={onSelect}
            name={name}
            label={
              <span>
                <div style={{ fontWeight: 700 }}>{title}</div>
                {subtitle ? (
                  <div style={{ marginTop: 4, fontSize: 13, color: "#ded1f6" }}>{subtitle}</div>
                ) : null}
              </span>
            }
          />
        ) : (
          <CheckPill
            checked={checked}
            onChange={onSelect}
            label={
              <span>
                <div style={{ fontWeight: 700 }}>{title}</div>
                {subtitle ? (
                  <div style={{ marginTop: 4, fontSize: 13, color: "#ded1f6" }}>{subtitle}</div>
                ) : null}
              </span>
            }
          />
        )}
      </div>

      {imageUrl ? (
        <Thumb
          url={imageUrl}
          title={String(typeof title === "string" ? title : "foto")}
          onOpen={onPreview!}
        />
      ) : null}
    </div>
  );
}

function QuantityCard({
  title,
  subtitle,
  qty,
  onMinus,
  onPlus,
  imageUrl,
  onPreview,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  qty: number;
  onMinus: () => void;
  onPlus: () => void;
  imageUrl?: string | null;
  onPreview?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        justifyContent: "space-between",
        border: qty > 0 ? "1px solid rgba(187,134,252,0.8)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 12,
        background: qty > 0
          ? "linear-gradient(135deg, rgba(168,85,247,0.18), rgba(255,255,255,0.03))"
          : "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ flex: 1, color: "#fff" }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        {subtitle ? (
          <div style={{ marginTop: 4, fontSize: 13, color: "#ded1f6" }}>{subtitle}</div>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {imageUrl ? (
          <Thumb
            url={imageUrl}
            title={String(typeof title === "string" ? title : "foto")}
            onOpen={onPreview!}
          />
        ) : null}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 999,
            padding: "6px 8px",
          }}
        >
          <button type="button" onClick={onMinus} style={qtyButtonStyle}>
            −
          </button>
          <span style={{ minWidth: 18, textAlign: "center", color: "#fff", fontWeight: 800 }}>
            {qty}
          </span>
          <button type="button" onClick={onPlus} style={qtyButtonStyle}>
            +
          </button>
        </div>
      </div>
    </div>
  );
}

function ExtrasGroup({
  title,
  items,
  selected,
  onToggle,
  onPreview,
}: {
  title: string;
  items: Product[];
  selected: string[];
  onToggle: (id: string) => void;
  onPreview: (v: { url: string; title: string } | null) => void;
}) {
  if (!items.length) return null;

  return (
    <div style={{ marginTop: 14 }}>
      <b style={{ fontSize: 14, color: "#fff" }}>{title}</b>

      <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
        {items.map((e) => (
          <div
            key={e.id}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              justifyContent: "space-between",
              border: selected.includes(e.id)
                ? "1px solid rgba(187,134,252,0.8)"
                : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: 12,
              background: selected.includes(e.id)
                ? "linear-gradient(135deg, rgba(168,85,247,0.18), rgba(255,255,255,0.03))"
                : "rgba(255,255,255,0.03)",
            }}
          >
            <div style={{ flex: 1 }}>
              <CheckPill
                checked={selected.includes(e.id)}
                onChange={() => onToggle(e.id)}
                label={
                  <span>
                    <div style={{ fontWeight: 700 }}>{e.name}</div>
                    {e.description ? (
                      <div style={{ marginTop: 4, fontSize: 13, color: "#ded1f6" }}>{e.description}</div>
                    ) : null}
                  </span>
                }
              />
            </div>

            {e.image_url ? (
              <Thumb url={e.image_url} title={e.name} onOpen={() => onPreview({ url: e.image_url!, title: e.name })} />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Thumb({ url, title, onOpen }: { url: string; title: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Ver foto de ${title}`}
      style={{
        width: 46,
        height: 46,
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)",
        padding: 0,
        flexShrink: 0,
        background: "transparent",
        cursor: "pointer",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </button>
  );
}

const qtyButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: 18,
  fontWeight: 900,
  cursor: "pointer",
  lineHeight: 1,
  display: "grid",
  placeItems: "center",
};