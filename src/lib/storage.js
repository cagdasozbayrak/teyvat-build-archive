// Use window.storage when a host provides it. Otherwise use localStorage. Both methods
// catch storage errors and return { key, value } or null.
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
