export class AdminValidationError extends Error {}

export const PRODUCT_TYPES = [
  "size",
  "acai_type",
  "sorvete_flavor",
  "milkshake",
  "extra",
  "bebida",
  "outro",
  "combo",
] as const;

export const EXTRA_CATEGORIES = [
  "toppings",
  "cremes",
  "coberturas",
  "caldas",
  "frutas",
] as const;

export const ORDER_STATUSES = [
  "novo",
  "confirmado",
  "preparando",
  "pronto",
  "saiu_para_entrega",
  "entregue",
  "cancelado",
] as const;

type ProductType = (typeof PRODUCT_TYPES)[number];
type ExtraCategory = (typeof EXTRA_CATEGORIES)[number];
type OrderStatus = (typeof ORDER_STATUSES)[number];

type UnknownRecord = Record<string, unknown>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function record(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AdminValidationError("Dados inválidos.");
  }

  return value as UnknownRecord;
}

function onlyKeys(value: UnknownRecord, allowed: readonly string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new AdminValidationError("O payload contém campos não permitidos.");
  }
}

function requiredName(value: unknown) {
  if (typeof value !== "string") {
    throw new AdminValidationError("O nome é obrigatório.");
  }

  const normalized = value.trim();
  if (normalized.length < 2 || normalized.length > 120) {
    throw new AdminValidationError("O nome deve ter entre 2 e 120 caracteres.");
  }

  return normalized;
}

function nullableText(value: unknown, maxLength: number) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new AdminValidationError("Texto inválido.");
  }

  return value.trim() || null;
}

function finiteNumber(value: unknown, field: string, nullable = false) {
  if (nullable && value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AdminValidationError(`${field} deve ser um número válido.`);
  }

  return value;
}

function nonNegativeNumber(value: unknown, field: string, nullable = false) {
  const parsed = finiteNumber(value, field, nullable);
  if (parsed !== null && parsed < 0) {
    throw new AdminValidationError(`${field} não pode ser negativo.`);
  }

  return parsed;
}

function integer(value: unknown, field: string, nullable = false) {
  const parsed = nonNegativeNumber(value, field, nullable);
  if (parsed !== null && !Number.isInteger(parsed)) {
    throw new AdminValidationError(`${field} deve ser um número inteiro.`);
  }

  return parsed;
}

function booleanValue(value: unknown, field: string) {
  if (typeof value !== "boolean") {
    throw new AdminValidationError(`${field} deve ser verdadeiro ou falso.`);
  }

  return value;
}

function oneOf<T extends readonly string[]>(value: unknown, values: T, field: string): T[number] {
  if (typeof value !== "string" || !values.includes(value)) {
    throw new AdminValidationError(`${field} inválido.`);
  }

  return value as T[number];
}

export function parseUuid(value: unknown, field = "ID") {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new AdminValidationError(`${field} inválido.`);
  }

  return value;
}

export function parseCreateProductInput(input: unknown) {
  const value = record(input);
  onlyKeys(value, [
    "type",
    "name",
    "description",
    "category",
    "price",
    "size_ml",
    "extras_limit",
    "sort_order",
    "is_available",
  ]);

  const type = oneOf(value.type, PRODUCT_TYPES, "Tipo de produto") as ProductType;
  const category =
    value.category === null
      ? null
      : (oneOf(value.category, EXTRA_CATEGORIES, "Categoria") as ExtraCategory);

  return {
    type,
    name: requiredName(value.name),
    description: nullableText(value.description, 1000),
    category,
    price: nonNegativeNumber(value.price, "Preço", true),
    size_ml: integer(value.size_ml, "Tamanho", true),
    extras_limit: integer(value.extras_limit, "Limite de adicionais", true),
    sort_order: integer(value.sort_order, "Ordem de exibição"),
    is_available: booleanValue(value.is_available, "Disponibilidade"),
    image_url: null,
  };
}

export function parseProductUpdateInput(id: unknown, input: unknown) {
  const value = record(input);
  const allowed = [
    "name",
    "description",
    "category",
    "price",
    "size_ml",
    "extras_limit",
    "sort_order",
    "is_available",
  ] as const;

  onlyKeys(value, allowed);
  if (Object.keys(value).length === 0) {
    throw new AdminValidationError("Nenhum campo foi informado.");
  }

  const patch: UnknownRecord = {};
  if ("name" in value) patch.name = requiredName(value.name);
  if ("description" in value) patch.description = nullableText(value.description, 1000);
  if ("category" in value) {
    patch.category =
      value.category === null
        ? null
        : oneOf(value.category, EXTRA_CATEGORIES, "Categoria");
  }
  if ("price" in value) patch.price = nonNegativeNumber(value.price, "Preço", true);
  if ("size_ml" in value) patch.size_ml = integer(value.size_ml, "Tamanho", true);
  if ("extras_limit" in value) {
    patch.extras_limit = integer(value.extras_limit, "Limite de adicionais", true);
  }
  if ("sort_order" in value) patch.sort_order = integer(value.sort_order, "Ordem de exibição");
  if ("is_available" in value) {
    patch.is_available = booleanValue(value.is_available, "Disponibilidade");
  }

  return { id: parseUuid(id, "Produto"), patch };
}

export function parseCreateDeliveryAreaInput(input: unknown) {
  const value = record(input);
  onlyKeys(value, ["name", "fee", "is_active", "sort_order"]);

  return {
    name: requiredName(value.name),
    fee: nonNegativeNumber(value.fee, "Taxa"),
    is_active: booleanValue(value.is_active, "Status"),
    sort_order: integer(value.sort_order, "Ordem de exibição"),
  };
}

export function parseDeliveryAreaUpdateInput(id: unknown, input: unknown) {
  const value = record(input);
  const allowed = ["name", "fee", "is_active", "sort_order"] as const;
  onlyKeys(value, allowed);
  if (Object.keys(value).length === 0) {
    throw new AdminValidationError("Nenhum campo foi informado.");
  }

  const patch: UnknownRecord = {};
  if ("name" in value) patch.name = requiredName(value.name);
  if ("fee" in value) patch.fee = nonNegativeNumber(value.fee, "Taxa");
  if ("is_active" in value) patch.is_active = booleanValue(value.is_active, "Status");
  if ("sort_order" in value) patch.sort_order = integer(value.sort_order, "Ordem de exibição");

  return { id: parseUuid(id, "Área de delivery"), patch };
}

export function parseStoreSettingsInput(input: unknown) {
  const value = record(input);
  onlyKeys(value, ["open_time", "close_time", "force_closed"]);

  const time = (candidate: unknown, field: string) => {
    if (typeof candidate !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(candidate)) {
      throw new AdminValidationError(`${field} inválido.`);
    }
    return candidate;
  };

  return {
    open_time: time(value.open_time, "Horário de abertura"),
    close_time: time(value.close_time, "Horário de fechamento"),
    force_closed: booleanValue(value.force_closed, "Fechamento forçado"),
  };
}

export function parseOrderStatusInput(id: unknown, status: unknown) {
  return {
    id: parseUuid(id, "Pedido"),
    status: oneOf(status, ORDER_STATUSES, "Status") as OrderStatus,
  };
}
