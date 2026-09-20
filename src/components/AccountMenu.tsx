import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hook/hooks";
import { logout as logoutAction, setUser } from "../redux/authSlice";
import { userService } from "../services/userService";
import { planLabel } from "../services/plans";
import { formatCredits } from "../services/creditsService";

function GearIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.55 1.55M7.15 16.85 5.6 18.4M18.4 18.4l-1.55-1.55M7.15 7.15 5.6 5.6" />
        </svg>
    );
}

function SparkIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3.5l2.47 5.4 5.78.62-4.35 3.98 1.2 5.75L12 16.7l-5.1 2.55 1.2-5.75-4.35-3.98 5.78-.62L12 3.5z" />
        </svg>
    );
}

function ThemeIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.6v2M12 19.4v2M21.4 12h-2M4.6 12h-2M18.6 5.4l-1.4 1.4M6.8 17.2l-1.4 1.4M18.6 18.6l-1.4-1.4M6.8 6.8 5.4 5.4" />
        </svg>
    );
}

function UpgradeIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V6" />
            <path d="M6.5 11.5 12 5.5l5.5 6" />
        </svg>
    );
}

function SignOutIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 17l5-5-5-5M20 12H9M12 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21H12" />
        </svg>
    );
}

function CaretIcon({ open }: { open: boolean }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 9l6 6 6-6" />
        </svg>
    );
}

// the popup opens upwards because this row sits at the foot of the sidebar

type Props = {
    /** lets the mobile drawer close itself after a nav */
    onNavigate?: () => void;
    compact?: boolean;
};

export default function AccountMenu({ onNavigate, compact = false }: Props) {
    const user = useAppSelector((s) => s.auth.user);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const [open, setOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const wrapRef = useRef<HTMLDivElement | null>(null);

    const firstName = (user?.name ?? "").trim().split(" ")[0] || "-";
    const billing = useAppSelector((s) => s.billing.billing);
    const credits = useAppSelector((s) => s.billing.credits);
    const theme = user?.theme ?? "PAPER";
    const themeWord = theme === "LAMPLIGHT" ? "lamplight" : "paper";

    // The effective plan is the server's, not the cached one on the user row:
    // a trial or a lapsed subscription changes it without the user changing.
    const plan = billing?.plan ?? user?.plan ?? "FREE";
    const planWord = planLabel(plan).toLowerCase();
    const isTopTier = plan === "ULTRA";

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const go = (to: string) => {
        setOpen(false);
        onNavigate?.();
        navigate(to);
    };

    // Flip immediately so the tap feels instant, then persist. If the request
    // fails, put it back - a toggle that silently reverts on the next reload
    // (which is what happened when there was no endpoint at all) is worse than
    // one that visibly refuses.
    const toggleTheme = async () => {
        if (!user) return;
        const next = theme === "PAPER" ? "LAMPLIGHT" : "PAPER";
        dispatch(setUser({ ...user, theme: next }));
        try {
            const { user: saved } = await userService.updateTheme(next);
            dispatch(setUser(saved));
        } catch {
            dispatch(setUser(user));
        }
    };

    const handleSignOut = async () => {
        setSigningOut(true);
        try {
            setOpen(false);
            onNavigate?.();
            await dispatch(logoutAction());
            navigate("/");
        } catch (e) {
            console.error("logout failed", e);
        } finally {
            setSigningOut(false);
        }
    };

    const itemCls =
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-ink-soft hover:bg-cream-dark/60 hover:text-ink font-serif text-[0.88rem] transition text-left cursor-pointer";

    return (
        <div ref={wrapRef} className="relative">
            {open && (
                <div
                    role="menu"
                    className="absolute bottom-full left-0 right-0 mb-2 z-50 rounded-2xl border border-hairline bg-cream-light shadow-[0_10px_36px_rgba(60,50,40,0.16)] p-1.5 origin-bottom"
                >
                    <button
                        type="button"
                        role="menuitem"
                        className={`${itemCls} text-rust hover:bg-rust/5 hover:text-rust`}
                        onClick={() => go(isTopTier ? "/settings/billing" : "/plans")}
                    >
                        <UpgradeIcon />
                        <span>{isTopTier ? "manage plan" : "Upgrade Privateaile plan"}</span>
                    </button>

                    <div className="my-1.5 border-t border-hairline" />

                    <button type="button" role="menuitem" className={itemCls} onClick={() => go("/settings")}>
                        <GearIcon />
                        <span>settings</span>
                    </button>

                    <button type="button" role="menuitem" className={itemCls} onClick={() => go("/plans")}>
                        <SparkIcon />
                        <span>plans</span>
                        <span className="ml-auto font-caveat text-muted text-[0.85rem]">
                            {billing?.trialing ? `${planWord} trial` : planWord}
                        </span>
                    </button>

                    {/* only worth a row once there is a balance to look at */}
                    {credits && (credits.total > 0 || plan !== "FREE") && (
                        <button type="button" role="menuitem" className={itemCls} onClick={() => go("/settings/credits")}>
                            <SparkIcon />
                            <span>credits</span>
                            <span className="ml-auto font-caveat text-muted text-[0.85rem]">
                                {formatCredits(credits.total)}
                            </span>
                        </button>
                    )}

                    <button type="button" role="menuitem" className={itemCls} onClick={toggleTheme}>
                        <ThemeIcon />
                        <span>themes</span>
                        <span className="ml-auto font-caveat text-rust text-[0.85rem]">{themeWord}</span>
                    </button>

                    <div className="my-1.5 border-t border-hairline" />

                    <button
                        type="button"
                        role="menuitem"
                        className={`${itemCls} hover:bg-rust/5 hover:text-rust disabled:opacity-60`}
                        onClick={handleSignOut}
                        disabled={signingOut}
                    >
                        <SignOutIcon />
                        <span>{signingOut ? "signing out…" : "sign out"}</span>
                    </button>
                </div>
            )}

            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className={`w-full flex items-center gap-3 ${compact ? "px-2 py-2" : "px-2 py-2.5"
                    } rounded-2xl hover:bg-cream-dark/50 transition text-left cursor-pointer ${open ? "bg-cream-dark/50" : ""}`}
            >
                <div className="h-9 w-9 lg:h-10 lg:w-10 rounded-full bg-rust/10 text-rust flex items-center justify-center font-display  text-base lg:text-lg select-none shrink-0">
                    {firstName[0]?.toUpperCase()}
                </div>
                <div className="overflow-hidden min-w-0 flex-1">
                    <p className="font-display  text-ink text-sm truncate">{user?.name}</p>
                    <p className="font-serif text-muted text-xs truncate">{user?.email}</p>

                    <span className="mt-1 flex items-center gap-1.5 min-w-0">
                        <span
                            className={`inline-flex items-center px-1.5 py-[1px] rounded-full border font-serif text-[0.65rem] leading-[1.35] tracking-wide shrink-0 ${isTopTier
                                ? "border-rust/40 bg-rust/10 text-rust"
                                : plan === "PLUS"
                                    ? "border-rust/30 bg-rust/5 text-rust"
                                    : "border-hairline bg-cream-dark/40 text-muted"
                                }`}
                        >
                            {planWord}
                        </span>
                        {!isTopTier && (
                            <span className="font-caveat text-rust text-[0.8rem] leading-none truncate">upgrade</span>
                        )}
                    </span>
                </div>
                <CaretIcon open={open} />
            </button>
        </div>
    );
}
