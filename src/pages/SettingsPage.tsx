import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PlanBadge from "../components/PlanBadge";
import { formatCredits } from "../services/creditsService";
import { loadBilling } from "../redux/billingSlice";
import { useAppDispatch, useAppSelector } from "../hook/hooks";
import { logout, setUser } from "../redux/authSlice";
import type { AuthUser } from "../services/authService";
import { userService } from "../services/userService";

// Phone-width card list below md; two-panel layout with a sticky profile rail above it.

const AVATAR_BROWN = "#5b3a2e";

// The four plans, named the way the pricing page names them
// (services/plans.ts is the single place that knows).
function planLabel(plan: AuthUser["plan"] | undefined): string {
  switch (plan) {
    case "BASIC":
      return "Basic";
    case "PLUS":
      return "Plus";
    case "ULTRA":
      return "Ultra";
    default:
      return "Free";
  }
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.1rem] w-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.1rem] w-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5l2.6 5.3 5.9.86-4.25 4.14 1 5.87L12 17.9l-5.25 2.77 1-5.87L3.5 9.66l5.9-.86z" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.1rem] w-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5z" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.1rem] w-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.1rem] w-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.1rem] w-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.2l7 2.6v5.4c0 4.3-2.9 7.7-7 9.6-4.1-1.9-7-5.3-7-9.6V5.8z" />
      <path d="M9.2 12.2l2 2 3.6-3.9" />
    </svg>
  );
}
function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.1rem] w-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.2a2.5 2.5 0 1 1 3.5 2.3c-.9.5-1.3 1-1.3 2" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function Row({
  icon,
  title,
  subtitle,
  danger = false,
  trailing,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  danger?: boolean;
  trailing?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left flex items-center gap-3.5 px-4 py-3.5 md:px-5 md:py-4 hover:bg-cream/60 active:scale-[0.995] transition cursor-pointer"
    >
      <span
        className={`h-9 w-9 md:h-10 md:w-10 rounded-full flex items-center justify-center shrink-0 transition ${danger
          ? "text-danger bg-danger/10 group-hover:bg-danger/15"
          : "text-charcoal-light bg-cream group-hover:bg-cream-dark/70"
          }`}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block font-serif text-[1.05rem] leading-snug ${danger ? "text-danger" : "text-ink"}`}>
          {title}
        </span>
        <span className="block font-caveat  text-muted text-[0.84rem] truncate">{subtitle}</span>
      </span>
      <span className={`shrink-0 text-muted/70 flex items-center transition group-hover:translate-x-0.5 ${danger ? "group-hover:text-danger" : "group-hover:text-rust"}`}>
        {trailing ?? <ChevronIcon />}
      </span>
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-caveat  text-rust text-[0.9rem] md:text-[0.95rem] tracking-wide mt-7 mb-2.5 px-1">
      {children}
    </p>
  );
}

function GroupHeader({ kicker, title, blurb }: { kicker: string; title: string; blurb: string }) {
  return (
    <div className="mb-3">
      <p className="font-caveat  text-rust text-[0.98rem] tracking-wide">{kicker}</p>
      <h2 className="font-display text-ink text-[1.5rem] leading-tight mt-0.5">{title}</h2>
      <p className="font-serif  text-muted text-[0.95rem] mt-1">{blurb}</p>
    </div>
  );
}

const NAV = [
  { id: "account", label: "account" },
  { id: "preferences", label: "preferences" },
  { id: "privacy", label: "privacy" },
  { id: "support", label: "support" },
] as const;

export default function SettingsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  // The effective plan and the balance come from the server, so a trial or a
  // lapsed subscription shows here without the user row changing.
  const billing = useAppSelector((s) => s.billing.billing);
  const credits = useAppSelector((s) => s.billing.credits);

  useEffect(() => {
    dispatch(loadBilling());
  }, [dispatch]);

  const [signingOut, setSigningOut] = useState(false);
  const [active, setActive] = useState<string>("account");

  const name = user?.name ?? "-";
  const email = user?.email ?? "";
  const plan = planLabel(user?.plan);
  const isPaid = (user?.plan ?? "FREE") !== "FREE";
  const theme = user?.theme ?? "PAPER";
  const themeWord = theme === "LAMPLIGHT" ? "lamplight" : "paper";

  // Flip immediately so the tap feels instant, then persist via
  // PATCH /users/me/preferences. On failure, put it back rather than leaving a
  // choice that quietly reverts on the next reload.
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
    await dispatch(logout());
    navigate("/", { replace: true });
  };

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    setActive(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const profileCard = (
    <button
      type="button"
      onClick={() => navigate("/settings/profile")}
      className="w-full text-left flex items-center gap-4 rounded-[1.2rem] bg-cream-light border border-hairline/60 px-4 py-4 md:px-5 md:py-5 hover:border-hairline hover:shadow-[0_8px_22px_-12px_rgba(0,0,0,0.28)] hover:-translate-y-0.5 active:scale-[0.99] transition cursor-pointer"
    >
      <span
        style={{ backgroundColor: AVATAR_BROWN }}
        className="h-14 w-14 rounded-full flex items-center justify-center font-instrument  text-cream-soft text-[1.5rem] shrink-0 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22)] overflow-hidden"
      >
        {user?.avatar ? (
          <img src={user.avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          (name[0] ?? "·").toUpperCase()
        )}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-serif text-ink text-[1.25rem] font-medium leading-tight truncate">{name}</span>
        <span className="block font-caveat  text-muted text-[0.9rem] truncate">{email}</span>
        <span
          className={`inline-block mt-1.5 rounded-full px-2.5 py-0.5 text-[0.72rem] font-serif tracking-wide ${isPaid ? "bg-rust text-cream-soft" : "bg-cream text-muted border border-hairline/70"
            }`}
        >
          {plan}
        </span>
      </span>
      <span className="shrink-0 text-muted/70">
        <ArrowIcon />
      </span>
    </button>
  );

  const accountRows = (
    <div className="rounded-[1.2rem] bg-cream-light border border-hairline/60 divide-y divide-hairline/50 overflow-hidden">
      <Row
        icon={<MailIcon />}
        title="Profile & account"
        subtitle="name, email, password"
        onClick={() => navigate("/settings/profile")}
      />
      <Row
        icon={<StarIcon />}
        title="Plan & billing"
        subtitle={
          billing?.trialing
            ? `${plan} trial${billing.trialDaysRemaining !== null ? ` · ${billing.trialDaysRemaining} days left` : ""}`
            : isPaid
              ? `${plan} plan`
              : "free · see what else there is"
        }
        trailing={
          <span className="pr-0.5">
            <PlanBadge plan={billing?.plan} trialing={Boolean(billing?.trialing)} pastDue={Boolean(billing?.pastDue)} />
          </span>
        }
        onClick={() => navigate("/settings/billing")}
      />
      <Row
        icon={<StarIcon />}
        title="Credits"
        subtitle="what's left, and top-ups"
        trailing={
          credits ? (
            <span className="font-caveat text-rust text-[0.85rem] pr-0.5">{formatCredits(credits.total)}</span>
          ) : undefined
        }
        onClick={() => navigate("/settings/credits")}
      />
      <Row
        icon={<StarIcon />}
        title="Usage"
        subtitle="messages, images, voice — where you stand"
        onClick={() => navigate("/settings/usage")}
      />
      <Row
        icon={<MailIcon />}
        title="Personas"
        subtitle="who you are, in a conversation"
        onClick={() => navigate("/settings/personas")}
      />
    </div>
  );

  const preferenceRows = (
    <div className="rounded-[1.2rem] bg-cream-light border border-hairline/60 overflow-hidden">
      <Row
        icon={<MoonIcon />}
        title="Theme"
        subtitle="paper or lamplight"
        trailing={<span className="font-caveat  text-rust text-[0.85rem] pr-0.5">{themeWord}</span>}
        onClick={toggleTheme}
      />
    </div>
  );

  const privacyRows = (
    <div className="rounded-[1.2rem] bg-cream-light border border-hairline/60 divide-y divide-hairline/50 overflow-hidden">
      <Row
        icon={<ShieldIcon />}
        title="Privacy policy"
        subtitle="where your words go"
        onClick={() => navigate("/settings/legal#privacy")}
      />
      <Row
        icon={<DownloadIcon />}
        title="Export your data"
        subtitle="JSON · all of it"
        onClick={() => navigate("/settings/export")}
      />
      <Row
        icon={<TrashIcon />}
        title="Delete account"
        subtitle="30-day grace"
        danger
        onClick={() => navigate("/settings/delete")}
      />
    </div>
  );

  const supportRows = (
    <div className="rounded-[1.2rem] bg-cream-light border border-hairline/60 overflow-hidden">
      <Row
        icon={<HelpIcon />}
        title="Help & support"
        subtitle="faqs · contact us"
        onClick={() => navigate("/settings/help")}
      />
    </div>
  );

  return (
    <div className="min-h-[100dvh] w-full app-gradient px-5 md:px-8 lg:px-10 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] md:pt-10 md:pb-16">
      <main className="md:hidden mx-auto w-full max-w-[440px] flex flex-col">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate("/home")}
            className="h-9 w-9 rounded-full bg-cream-light border border-hairline/70 text-ink-soft flex items-center justify-center hover:brightness-95 active:scale-95 transition cursor-pointer"
          >
            <BackIcon />
          </button>
          <p className="flex-1 text-center font-serif  text-ink-soft text-[1.05rem]">settings</p>
          <span className="h-9 w-9 shrink-0" aria-hidden="true" />
        </div>

        <div className="mt-6">{profileCard}</div>

        <SectionLabel>account</SectionLabel>
        {accountRows}

        <SectionLabel>preferences</SectionLabel>
        {preferenceRows}

        <SectionLabel>privacy</SectionLabel>
        {privacyRows}

        <SectionLabel>support</SectionLabel>
        {supportRows}

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="mt-8 self-center font-serif  text-[0.98rem] text-muted hover:text-rust transition cursor-pointer disabled:opacity-60"
        >
          {signingOut ? "signing out…" : "sign out"}
        </button>

        <p className="mt-5 text-center font-caveat  text-muted/70 text-[0.78rem]">
          privateaile · a quiet place to think, write, remember, and create.
        </p>
      </main>

      <div className="hidden md:block mx-auto w-full max-w-[1060px]">
        <header className="flex items-end justify-between gap-4 border-b border-hairline/60 pb-6">
          {/* The back arrow and the small "settings" label are the mobile
              header's job - on a large screen the page title stands alone. */}
          <div>
            <h1 className="font-display text-ink text-[2rem] lg:text-[2.3rem] leading-tight">
              Your account
            </h1>
          </div>
          <p className="hidden lg:block font-caveat  text-muted/70 text-[0.9rem] pb-1">
            privateaile · a quiet place to think, write, remember, and create.
          </p>
        </header>

        <div className="grid grid-cols-[268px_1fr] lg:grid-cols-[300px_1fr] gap-9 lg:gap-14 pt-8">
          <aside className="sticky top-8 self-start flex flex-col gap-5">
            {profileCard}

            <nav className="rounded-[1.2rem] bg-cream-light border border-hairline/60 p-2">
              {NAV.map((n) => {
                const isActive = active === n.id;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => scrollTo(n.id)}
                    className={`w-full text-left flex items-center gap-2.5 rounded-[0.9rem] px-3.5 py-2.5 transition cursor-pointer ${isActive ? "bg-cream text-ink" : "text-muted hover:bg-cream/60 hover:text-ink"
                      }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition ${isActive ? "bg-rust scale-100" : "bg-hairline scale-90"
                        }`}
                    />
                    <span className="font-serif  text-[1.02rem]">{n.label}</span>
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="self-start ml-1 font-serif  text-[0.98rem] text-muted hover:text-rust transition cursor-pointer disabled:opacity-60"
            >
              {signingOut ? "signing out…" : "sign out"}
            </button>
          </aside>

          <div className="flex flex-col gap-10 pb-8">
            <section
              id="account"
              ref={(el) => { sectionRefs.current.account = el; }}
              className="scroll-mt-8"
            >
              <GroupHeader kicker="account" title="Profile & billing" blurb="who you are, and how you're subscribed." />
              {accountRows}
            </section>

            <section
              id="preferences"
              ref={(el) => { sectionRefs.current.preferences = el; }}
              className="scroll-mt-8"
            >
              <GroupHeader kicker="preferences" title="How it feels" blurb="set the mood of the pages you write on." />
              {preferenceRows}
            </section>

            <section
              id="privacy"
              ref={(el) => { sectionRefs.current.privacy = el; }}
              className="scroll-mt-8"
            >
              <GroupHeader kicker="privacy" title="Your words, your call" blurb="take everything with you, or close the book." />
              {privacyRows}
            </section>

            <section
              id="support"
              ref={(el) => { sectionRefs.current.support = el; }}
              className="scroll-mt-8"
            >
              <GroupHeader kicker="support" title="Need a hand?" blurb="faqs, and a real inbox if that's not enough." />
              {supportRows}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
