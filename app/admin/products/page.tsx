"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { supabase } from "@/lib/supabaseClient";
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

type ExtraCategory =
  | "toppings"
  | "cremes"
  | "coberturas"
  | "caldas"
  | "frutas"
  | "";

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

function toNum(v: string) {
  const n = Number(String(v).replace(",", "."));
  return isFinite(n) ? n : null;
}

export default function AdminProductsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  const [openSection, setOpenSection] = useState<string>("sizes");

  const [type, setType] = useState<ProductType>("size");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExtraCategory>("");
  const [price, setPrice] = useState("");
  const [sizeMl, setSizeMl] = useState("");
  const [extrasLimit, setExtrasLimit] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const canSave = useMemo(() => name.trim().length >= 2, [name]);

  const isPriceAndSizeType =
    type === "size" ||
    type === "milkshake" ||
    type === "bebida" ||
    type === "outro" ||
    type === "combo";

  async function load() {
    setLoading(true);
    setErr("");

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("type", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setProducts((data || []) as Product[]);
  }

  useEffect(() => {
    load();
  }, []);

  const sizes = products.filter((p) => p.type === "size");
  const acaiTypes = products.filter((p) => p.type === "acai_type");
  const sorveteFlavors = products.filter((p) => p.type === "sorvete_flavor");
  const milkshakes = products.filter((p) => p.type === "milkshake");
  const bebidas = products.filter((p) => p.type === "bebida");
  const outros = products.filter((p) => p.type === "outro");
  const combos = products.filter((p) => p.type === "combo");
  const extras = products.filter((p) => p.type === "extra");

  async function addProduct() {
    if (!canSave) return;

    const priceNum = toNum(price);
    const sizeNum = toNum(sizeMl);
    const limitNum = toNum(extrasLimit);
    const sortNum = toNum(sortOrder);

    const payload: any = {
      type,
      name: name.trim(),
      description: description.trim() || null,
      category: type === "extra" ? (category ? category : null) : null,
      price: isPriceAndSizeType ? (priceNum ?? 0) : null,
      size_ml: isPriceAndSizeType ? (sizeNum ?? null) : null,
      extras_limit: type === "size" ? (limitNum ?? 0) : null,
      sort_order: sortNum ?? 0,
      is_available: true,
      image_url: null,
    };

    const { error } = await supabase.from("products").insert(payload);
    if (error) {
      setErr(error.message);
      return;
    }

    resetForm();
    load();
  }

  function resetForm() {
    setName("");
    setDescription("");
    setCategory("");
    setPrice("");
    setSizeMl("");
    setExtrasLimit("");
    setSortOrder("0");
  }

  function openForType(nextType: ProductType, sectionKey: string) {
    setType(nextType);
    setOpenSection(sectionKey);
    resetForm();
  }

  async function updateProduct(id: string, patch: Partial<Product>) {
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) {
      setErr(error.message);
      return;
    }
    load();
  }

  async function deleteProduct(id: string) {
    if (!confirm("Apagar esse item?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      setErr(error.message);
      return;
    }
    load();
  }

  async function uploadImage(prod: Product, file: File) {
    setErr("");

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${prod.id}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("product-images")
      .upload(path, file, { cacheControl: "3600", upsert: true });

    if (upErr) {
      setErr(upErr.message);
      return;
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    await updateProduct(prod.id, { image_url: data.publicUrl });
  }

  return (
    <>
      <AppHeader />

      <main style={ui.appBg}>
        <section style={ui.page}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <h1 style={ui.title}>Admin: Produtos</h1>
            <div style={{ display: "flex", gap: 10 }}>
              <a href="/admin" style={{ textDecoration: "underline", fontSize: 14, color: "#e9dcff" }}>
                Voltar
              </a>
              <a href="/menu" style={{ textDecoration: "underline", fontSize: 14, color: "#e9dcff" }}>
                Ver cardápio
              </a>
            </div>
          </header>

          {err ? <p style={{ color: "#ff9d9d", marginTop: 10 }}>Erro: {err}</p> : null}

          <section style={ui.section}>
            <b style={{ color: "#fff" }}>Cadastro rápido</b>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button onClick={() => openForType("size", "sizes")} style={sectionButton(type === "size")}>
                Tamanhos
              </button>
              <button onClick={() => openForType("acai_type", "acai")} style={sectionButton(type === "acai_type")}>
                Tipos de Açaí
              </button>
              <button
                onClick={() => openForType("sorvete_flavor", "sorvete")}
                style={sectionButton(type === "sorvete_flavor")}
              >
                Sabores de Sorvete
              </button>
              <button onClick={() => openForType("milkshake", "milkshake")} style={sectionButton(type === "milkshake")}>
                Milkshakes
              </button>
              <button onClick={() => openForType("bebida", "bebidas")} style={sectionButton(type === "bebida")}>
                Bebidas
              </button>
              <button onClick={() => openForType("outro", "outros")} style={sectionButton(type === "outro")}>
                Outros produtos
              </button>
              <button onClick={() => openForType("combo", "combos")} style={sectionButton(type === "combo")}>
                Combos
              </button>
              <button onClick={() => openForType("extra", "extras")} style={sectionButton(type === "extra")}>
                Adicionais
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "#f2eaff" }}>Nome</span>
                <input value={name} onChange={(e) => setName(e.target.value)} style={ui.input} />
              </label>

              {type === "extra" ? (
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: "#f2eaff" }}>Categoria do adicional</span>
                  <select value={category} onChange={(e) => setCategory(e.target.value as ExtraCategory)} style={ui.input}>
                    <option value="">Selecione</option>
                    <option value="toppings">Toppings</option>
                    <option value="cremes">Cremes</option>
                    <option value="coberturas">Coberturas</option>
                    <option value="caldas">Caldas</option>
                    <option value="frutas">Frutas</option>
                  </select>
                </label>
              ) : (
                <div />
              )}

              <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
                <span style={{ color: "#f2eaff" }}>Descrição (opcional)</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Ex.: 2 açaís 400ml + 2 brownies"
                  style={{ ...ui.input, resize: "vertical", minHeight: 96 }}
                />
              </label>

              {isPriceAndSizeType ? (
                <>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ color: "#f2eaff" }}>Tamanho em ml (opcional)</span>
                    <input value={sizeMl} onChange={(e) => setSizeMl(e.target.value)} style={ui.input} />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ color: "#f2eaff" }}>Preço</span>
                    <input value={price} onChange={(e) => setPrice(e.target.value)} style={ui.input} />
                  </label>
                </>
              ) : null}

              {type === "size" ? (
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: "#f2eaff" }}>Limite de adicionais</span>
                  <input value={extrasLimit} onChange={(e) => setExtrasLimit(e.target.value)} style={ui.input} />
                </label>
              ) : null}

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "#f2eaff" }}>Ordem de exibição</span>
                <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={ui.input} />
              </label>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button onClick={addProduct} disabled={!canSave} style={{ ...ui.buttonPrimary, opacity: canSave ? 1 : 0.6 }}>
                Salvar item
              </button>
              <button onClick={resetForm} style={ui.buttonSecondary}>
                Limpar
              </button>
            </div>
          </section>

          <Accordion title="Tamanhos de Açaí e Sorvete" isOpen={openSection === "sizes"} onToggle={() => setOpenSection(openSection === "sizes" ? "" : "sizes")}>
            <ProductList items={sizes} emptyText="Nenhum tamanho cadastrado." uploadImage={uploadImage} updateProduct={updateProduct} deleteProduct={deleteProduct} type="size" />
          </Accordion>

          <Accordion title="Tipos de Açaí" isOpen={openSection === "acai"} onToggle={() => setOpenSection(openSection === "acai" ? "" : "acai")}>
            <ProductList items={acaiTypes} emptyText="Nenhum tipo de açaí cadastrado." uploadImage={uploadImage} updateProduct={updateProduct} deleteProduct={deleteProduct} type="acai_type" />
          </Accordion>

          <Accordion title="Sabores de Sorvete" isOpen={openSection === "sorvete"} onToggle={() => setOpenSection(openSection === "sorvete" ? "" : "sorvete")}>
            <ProductList items={sorveteFlavors} emptyText="Nenhum sabor de sorvete cadastrado." uploadImage={uploadImage} updateProduct={updateProduct} deleteProduct={deleteProduct} type="sorvete_flavor" />
          </Accordion>

          <Accordion title="Milkshakes" isOpen={openSection === "milkshake"} onToggle={() => setOpenSection(openSection === "milkshake" ? "" : "milkshake")}>
            <ProductList items={milkshakes} emptyText="Nenhum milkshake cadastrado." uploadImage={uploadImage} updateProduct={updateProduct} deleteProduct={deleteProduct} type="milkshake" />
          </Accordion>

          <Accordion title="Bebidas" isOpen={openSection === "bebidas"} onToggle={() => setOpenSection(openSection === "bebidas" ? "" : "bebidas")}>
            <ProductList items={bebidas} emptyText="Nenhuma bebida cadastrada." uploadImage={uploadImage} updateProduct={updateProduct} deleteProduct={deleteProduct} type="bebida" />
          </Accordion>

          <Accordion title="Outros produtos" isOpen={openSection === "outros"} onToggle={() => setOpenSection(openSection === "outros" ? "" : "outros")}>
            <ProductList items={outros} emptyText="Nenhum outro produto cadastrado." uploadImage={uploadImage} updateProduct={updateProduct} deleteProduct={deleteProduct} type="outro" />
          </Accordion>

          <Accordion title="Combos" isOpen={openSection === "combos"} onToggle={() => setOpenSection(openSection === "combos" ? "" : "combos")}>
            <ProductList items={combos} emptyText="Nenhum combo cadastrado." uploadImage={uploadImage} updateProduct={updateProduct} deleteProduct={deleteProduct} type="combo" />
          </Accordion>

          <Accordion title="Adicionais" isOpen={openSection === "extras"} onToggle={() => setOpenSection(openSection === "extras" ? "" : "extras")}>
            <ProductList items={extras} emptyText="Nenhum adicional cadastrado." uploadImage={uploadImage} updateProduct={updateProduct} deleteProduct={deleteProduct} type="extra" />
          </Accordion>
        </section>
      </main>
    </>
  );
}

function sectionButton(active: boolean): React.CSSProperties {
  return active
    ? { ...ui.buttonPrimary, padding: "10px 12px" }
    : { ...ui.buttonSecondary, padding: "10px 12px" };
}

function Accordion({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section style={{ ...ui.section, marginTop: 14 }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "transparent",
          border: "none",
          color: "#fff",
          fontSize: 18,
          fontWeight: 800,
          cursor: "pointer",
          padding: 0,
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: 20 }}>{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen ? <div style={{ marginTop: 14 }}>{children}</div> : null}
    </section>
  );
}

function ProductList({
  items,
  emptyText,
  uploadImage,
  updateProduct,
  deleteProduct,
  type,
}: {
  items: Product[];
  emptyText: string;
  uploadImage: (prod: Product, file: File) => Promise<void>;
  updateProduct: (id: string, patch: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  type: ProductType;
}) {
  if (!items.length) {
    return <p style={{ opacity: 0.8, color: "#ece1ff" }}>{emptyText}</p>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          uploadImage={uploadImage}
          updateProduct={updateProduct}
          deleteProduct={deleteProduct}
          type={type}
        />
      ))}
    </div>
  );
}

function ProductCard({
  product: p,
  uploadImage,
  updateProduct,
  deleteProduct,
  type,
}: {
  product: Product;
  uploadImage: (prod: Product, file: File) => Promise<void>;
  updateProduct: (id: string, patch: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  type: ProductType;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileLabel, setFileLabel] = useState("Nenhum arquivo selecionado");

  return (
    <div style={ui.card}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <b style={{ color: "#fff" }}>{p.name}</b>

          <div style={{ color: "#e9dcff", fontSize: 13, marginTop: 6 }}>
            {type === "size" || type === "milkshake" || type === "bebida" || type === "outro" || type === "combo" ? (
              <>
                {p.size_ml ? `${p.size_ml}ml • ` : ""}
                R$ {Number(p.price ?? 0).toFixed(2)}
                {type === "size" ? ` • limite ${p.extras_limit ?? 0}` : ""}
              </>
            ) : type === "extra" ? (
              <>Categoria: {labelExtraCategory(p.category)}</>
            ) : (
              <>Ordem de exibição: {p.sort_order ?? 0}</>
            )}
          </div>

          {p.description ? (
            <div
              style={{
                color: "#dcccff",
                fontSize: 13,
                marginTop: 8,
                maxWidth: 520,
                lineHeight: 1.45,
                whiteSpace: "pre-wrap",
              }}
            >
              {p.description}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <ToggleSwitch
            checked={p.is_available}
            onChange={() => updateProduct(p.id, { is_available: !p.is_available })}
          />

          <button onClick={() => deleteProduct(p.id)} style={ui.buttonGhost}>
            Apagar
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "120px 1fr",
          gap: 16,
          marginTop: 14,
          alignItems: "start",
        }}
      >
        <div>
          <div
            style={{
              width: 120,
              height: 120,
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              overflow: "hidden",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            {p.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#d8cfff" }}>
                sem foto
              </div>
            )}
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ color: "#f2eaff", fontSize: 14, marginBottom: 6 }}>Foto</div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFileLabel(f.name);
                  uploadImage(p, f);
                } else {
                  setFileLabel("Nenhum arquivo selecionado");
                }
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{ ...ui.buttonSecondary, width: "100%" }}
            >
              Selecionar imagem
            </button>

            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: "#dcccff",
                lineHeight: 1.35,
                wordBreak: "break-word",
              }}
            >
              {fileLabel}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "#f2eaff" }}>Nome</span>
            <input
              defaultValue={p.name}
              onBlur={(e) => updateProduct(p.id, { name: e.target.value })}
              style={ui.input}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "#f2eaff" }}>Descrição</span>
            <textarea
              defaultValue={p.description || ""}
              onBlur={(e) => updateProduct(p.id, { description: e.target.value || null })}
              rows={3}
              style={{ ...ui.input, resize: "vertical", minHeight: 96 }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "#f2eaff" }}>Ordem de exibição</span>
            <input
              defaultValue={String(p.sort_order ?? 0)}
              onBlur={(e) => {
                const v = toNum(e.target.value);
                updateProduct(p.id, { sort_order: (v ?? 0) as any });
              }}
              style={ui.input}
            />
          </label>

          {(p.type === "size" || p.type === "milkshake" || p.type === "bebida" || p.type === "outro" || p.type === "combo") ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: p.type === "size" ? "1fr 1fr 1fr" : "1fr 1fr",
                gap: 10,
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "#f2eaff" }}>ml</span>
                <input
                  defaultValue={String(p.size_ml ?? "")}
                  onBlur={(e) => {
                    const v = toNum(e.target.value);
                    updateProduct(p.id, { size_ml: v == null ? null : Math.round(v) });
                  }}
                  style={ui.input}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "#f2eaff" }}>Preço</span>
                <input
                  defaultValue={String(p.price ?? "")}
                  onBlur={(e) => {
                    const v = toNum(e.target.value);
                    updateProduct(p.id, { price: v == null ? null : v });
                  }}
                  style={ui.input}
                />
              </label>

              {p.type === "size" ? (
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: "#f2eaff" }}>Limite adicionais</span>
                  <input
                    defaultValue={String(p.extras_limit ?? 0)}
                    onBlur={(e) => {
                      const v = toNum(e.target.value);
                      updateProduct(p.id, { extras_limit: v == null ? 0 : Math.round(v) });
                    }}
                    style={ui.input}
                  />
                </label>
              ) : null}
            </div>
          ) : null}

          {p.type === "extra" ? (
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ color: "#f2eaff" }}>Categoria</span>
              <select
                defaultValue={p.category || ""}
                onBlur={(e) => updateProduct(p.id, { category: e.target.value || null })}
                style={ui.input}
              >
                <option value="">Selecione</option>
                <option value="toppings">Toppings</option>
                <option value="cremes">Cremes</option>
                <option value="coberturas">Coberturas</option>
                <option value="caldas">Caldas</option>
                <option value="frutas">Frutas</option>
              </select>
            </label>
          ) : null}
        </div>
      </div>

      <p style={{ marginTop: 10, color: "#dcccff", fontSize: 13 }}>
        Editou? Sai do campo que salva.
      </p>
    </div>
  );
}

function labelExtraCategory(category: string | null) {
  if (category === "toppings") return "Toppings";
  if (category === "cremes") return "Cremes";
  if (category === "coberturas") return "Coberturas";
  if (category === "caldas") return "Caldas";
  if (category === "frutas") return "Frutas";
  return "-";
}