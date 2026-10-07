import { useCallback, useEffect, useState } from "react";

/** localStorage-backed state. Starts with the initial value so static HTML hydrates cleanly. */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) setValue(JSON.parse(item) as T);
    } catch {
      /* corrupted or blocked storage: keep defaults */
    }
  }, [key]);

  const save = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage full or disabled */
      }
    },
    [key],
  );

  return [value, save] as const;
}

export default useLocalStorage;
