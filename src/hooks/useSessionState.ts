import { useEffect, useState } from 'react';

/**
 * useState that survives in-tab navigation (e.g. going to a tender and back
 * via the breadcrumbs) by mirroring the value into sessionStorage.
 */
export function useSessionState<T>(key: string, initial: T, override?: T | null) {
  const [value, setValue] = useState<T>(() => {
    if (override !== undefined && override !== null) return override;
    try {
      const raw = sessionStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage may be unavailable (private mode); ignore */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
