import { useEffect, useState } from "react";
import { networkCopy } from "../copy";

// Driven by the navigator online/offline events rather than polling, so it
// tracks the real device state between requests. The typeof guard is for SSR.

export default function OfflineBanner() {
  const [offline, setOffline] = useState<boolean>(
    typeof navigator !== "undefined" && navigator.onLine === false
  );

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-[max(0.4rem,env(safe-area-inset-top))]"
    >
      <div className="pointer-events-none w-full max-w-[520px] rounded-b-xl bg-charcoal/90 text-cream-soft text-center font-caveat  text-[0.9rem] px-4 py-1.5 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.6)]">
        {networkCopy.offline}
      </div>
    </div>
  );
}
