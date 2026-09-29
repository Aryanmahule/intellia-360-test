"use client";

import { useEffect, useState } from "react";

/**
 * State backed by localStorage, safe to render on the server.
 *
 * The value starts as `initialValue` on both the server and the first client
 * render — reading storage during render would blow up in SSR and, worse,
 * produce markup that does not match what the server sent. The stored value is
 * adopted right after mount, and nothing is written back until it has been.
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      // set-state-in-effect is exactly what is wanted here: localStorage does
      // not exist during the server render, so the stored value can only be
      // adopted after mount. Reading it during render would break SSR and
      // produce markup that disagrees with what the server sent.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setValue(JSON.parse(raw));
    } catch {
      /* storage unavailable — fall back to the in-memory default */
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable — app still works in-memory */
    }
  }, [key, value, hydrated]);

  return [value, setValue];
}
