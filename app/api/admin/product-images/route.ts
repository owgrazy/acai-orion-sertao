import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminValidationError, parseUuid } from "@/lib/admin/validation";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const { supabase } = await requireAdmin();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Upload inválido." }, { status: 400 });
  }
  const file = formData.get("file");
  const productIdValue = formData.get("productId");

  let productId: string;
  try {
    productId = parseUuid(productIdValue, "Produto");
  } catch (error) {
    const message = error instanceof AdminValidationError ? error.message : "Produto inválido.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Selecione uma imagem." }, { status: 400 });
  }

  const extension = IMAGE_EXTENSIONS[file.type];
  if (!extension) {
    return NextResponse.json(
      { ok: false, error: "Formato de imagem não permitido." },
      { status: 400 }
    );
  }

  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { ok: false, error: "A imagem deve ter no máximo 5 MB." },
      { status: 400 }
    );
  }

  const path = `${productId}/${crypto.randomUUID()}.${extension}`;
  let uploadError: unknown;
  try {
    const result = await supabase.storage
      .from("product-images")
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    uploadError = result.error;
  } catch {
    uploadError = true;
  }

  if (uploadError) {
    return NextResponse.json(
      { ok: false, error: "Não foi possível enviar a imagem." },
      { status: 500 }
    );
  }

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  let updateError: unknown;
  try {
    const result = await supabase
      .from("products")
      .update({ image_url: data.publicUrl })
      .eq("id", productId);
    updateError = result.error;
  } catch {
    updateError = true;
  }

  if (updateError) {
    try {
      await supabase.storage.from("product-images").remove([path]);
    } catch {
      // The primary error remains the failed product association.
    }
    return NextResponse.json(
      { ok: false, error: "A imagem foi enviada, mas não pôde ser associada ao produto." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
