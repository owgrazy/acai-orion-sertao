export function makeId() {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}