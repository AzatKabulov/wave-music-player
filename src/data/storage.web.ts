export const deviceStorage = {
  async getItem(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Restore is optional in restricted browsers. */
    }
  },
};
