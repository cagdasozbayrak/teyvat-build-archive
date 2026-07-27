export const STORAGE_KEY = "gbt:data:v1";
export const TALENT_MAX = 10;
export const DEFAULT_TARGET = 8;

// Clamp to an integer within [lo, hi].
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n | 0));
