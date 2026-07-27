// Persistence shim.
// Uses the host's window.storage when present (some embedded hosts inject it),
// otherwise falls back to localStorage so the app works when run standalone.
// Both methods return { key, value } | null and never throw.
export const store = {
  async get(key) {
    if (typeof window !== "undefined" && window.storage && window.storage.get) {
      return window.storage.get(key);
    }
    try {
      const v = localStorage.getItem(key);
      return v == null ? null : { key, value: v };
    } catch (e) {
      return null;
    }
  },
  async set(key, value) {
    if (typeof window !== "undefined" && window.storage && window.storage.set) {
      return window.storage.set(key, value);
    }
    try {
      localStorage.setItem(key, value);
      return { key, value };
    } catch (e) {
      return null;
    }
  },
};
