import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onNetEvent } from "../lib/netStatus";
import OfflineBanner from "./OfflineBanner";

// The one app-wide listener for network events raised by the fetch layer
// (services/authService#request). Mounted inside the Router so it can navigate.

export default function NetworkHost() {
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const off = onNetEvent((e) => {
      if (e.type === "toast") {
        setToast(e.message);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 4000);
      } else if (e.type === "redirect") {
        navigate(e.to);
      }
    });
    return () => {
      off();
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [navigate]);

  return (
    <>
      <OfflineBanner />
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-[60] flex justify-center px-4"
        >
          <div className="pointer-events-none max-w-[440px] rounded-full bg-charcoal text-cream-soft font-serif  text-[0.9rem] px-4 py-2 shadow-[0_10px_28px_-12px_rgba(0,0,0,0.7)]">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
