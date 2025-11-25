// Polyfill localStorage for SSR - better-auth accesses it during initialization
// This runs before any other server-side code
export async function register() {
  if (typeof window === "undefined") {
    const storage: Record<string, string> = {};
    (global as unknown as { localStorage: Storage }).localStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach((k) => delete storage[k]);
      },
      key: (index: number) => Object.keys(storage)[index] ?? null,
      get length() {
        return Object.keys(storage).length;
      },
    };
  }
}
