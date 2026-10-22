/**
 * Universal environment variable accessor that works seamlessly in Vite browser and Node.js testing environments.
 */
export const getEnv = (key: string, defaultValue = ''): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env as any)[key] !== undefined) {
    return String((import.meta.env as any)[key]);
  }
  const proc = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;
  if (proc?.env && proc.env[key] !== undefined) {
    return String(proc.env[key]);
  }
  return defaultValue;
};

