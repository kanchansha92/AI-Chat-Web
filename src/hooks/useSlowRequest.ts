import { useEffect, useState } from "react";

// True once `active` has held for `delayMs`, so a "taking a moment" line can
// appear without flashing on fast responses. Resets as soon as `active` drops.

export function useSlowRequest(active: boolean, delayMs = 4000): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), delayMs);
    return () => clearTimeout(t);
  }, [active, delayMs]);

  return slow;
}
