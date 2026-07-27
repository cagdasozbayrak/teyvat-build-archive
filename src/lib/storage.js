// Persistence shim.
// Uses the host's window.storage when present (some embedded hosts inject it),
// otherwise falls back to localStorage so the app works when run standalone.
// Both methods return { key, value } | null and never throw.
export const store = {
  async get(key) {
    try {
      if (typeof window !== "undefined" && window.storage && window.storage.get) {
        return await window.storage.get(key);
      }
      const v = localStorage.getItem(key);
      return v == null ? null : { key, value: v };
    } catch (e) {
      return null;
    }
  },
  async set(key, value) {
    try {
      if (typeof window !== "undefined" && window.storage && window.storage.set) {
        return await window.storage.set(key, value);
      }
      localStorage.setItem(key, value);
      return { key, value };
    } catch (e) {
      return null;
    }
  },
};
