// AITradeMinds — Kernel DI Registry. globalThis-pinned singleton store.
// Guarantees one-instance-per-key across hot reloads and imports (freeze rule).
const globalForRegistry = globalThis as typeof globalThis & {
  __aitmRegistry?: Map<string, unknown>;
};

const store: Map<string, unknown> = globalForRegistry.__aitmRegistry ?? new Map();
if (!globalForRegistry.__aitmRegistry) globalForRegistry.__aitmRegistry = store;

/** Get an existing singleton or create + register it once. */
export function singleton<T>(key: string, factory: () => T): T {
  if (store.has(key)) return store.get(key) as T;
  const instance = factory();
  store.set(key, instance);
  return instance;
}

export function has(key: string): boolean {
  return store.has(key);
}

export function registeredKeys(): string[] {
  return [...store.keys()];
}
