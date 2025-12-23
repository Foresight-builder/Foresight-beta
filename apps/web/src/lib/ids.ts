export const normalizeId = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const normalizePositiveId = (value: unknown): number | null => {
  const n = normalizeId(value);
  if (n === null || n <= 0) return null;
  return n;
};

export const isValidId = (id: number | null): id is number =>
  typeof id === "number" && Number.isFinite(id);

export const isValidPositiveId = (id: number | null): id is number => isValidId(id) && id > 0;
