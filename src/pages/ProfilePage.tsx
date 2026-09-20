import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hook/hooks";
import { setUser } from "../redux/authSlice";
import { userService } from "../services/userService";
import { ApiError, setToken, type AuthUser } from "../services/authService";

// Single column below md, sticky profile rail plus a card panel above it.

const AVATAR_BROWN = "#5b3a2e";
const NAME_MAX = 40; // these three mirror the backend limits
const PASSWORD_MIN = 10;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5mb

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

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

const NAV = [
  { id: "profile", label: "profile" },
  { id: "password", label: "password" },
  { id: "account", label: "account" },
] as const;

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.05rem] w-[1.05rem]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8.5a2 2 0 0 1 2-2h1.3l1-1.6a1.5 1.5 0 0 1 1.27-.7h4.26a1.5 1.5 0 0 1 1.27.7l1 1.6H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[0.95rem] w-[0.95rem]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5l5 5 11-11" />
    </svg>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[1.3rem] bg-cream-light border border-hairline/60 p-5 md:p-8 shadow-[0_18px_44px_-32px_rgba(22,32,43,0.4)]">
      {children}
    </div>
  );
}

function CardHead({ kicker, title, blurb }: { kicker: string; title: string; blurb: string }) {
  return (
    <div className="mb-5">
      <p className="font-caveat  text-rust text-[0.95rem] tracking-wide leading-none">{kicker}</p>
      <h2 className="font-display text-ink text-[1.35rem] md:text-[1.55rem] leading-tight mt-1">{title}</h2>
      <p className="font-serif  text-muted text-[0.9rem] mt-1">{blurb}</p>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  autoComplete,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string | null;
  autoComplete?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="font-caveat  text-rust text-[0.9rem]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1.5 w-full bg-transparent border-0 border-b outline-none font-serif text-[1.05rem] text-ink placeholder:text-ink-soft/45 py-2 transition-colors ${error ? "border-rust" : "border-hairline focus:border-rust"
          }`}
      />
      {error && <p className="font-caveat  text-rust text-[0.78rem] mt-1.5">{error}</p>}
    </div>
  );
}

function Action({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full font-serif  text-[0.98rem] px-6 py-2.5 transition active:scale-[0.98] ${disabled
        ? "bg-rust/35 text-cream-soft/80 cursor-default"
        : "bg-rust text-cream-soft hover:bg-rust-hover cursor-pointer shadow-[0_6px_16px_-6px_rgba(97,107,120,0.55)]"
        }`}
    >
      {children}
    </button>
  );
}

function Saved({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1.5 font-caveat  text-[0.9rem] text-[#68775b]">
      <CheckIcon />
      {children}
    </span>
  );
}

function AvatarDisc({ src, initial, className }: { src: string | null; initial: string; className: string }) {
  return (
    <span
      style={{ backgroundColor: AVATAR_BROWN }}
      className={`rounded-full flex items-center justify-center font-instrument  text-cream-soft shrink-0 overflow-hidden shadow-[inset_0_-3px_8px_rgba(0,0,0,0.24)] ring-1 ring-black/5 ${className}`}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initial}
    </span>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  const fileRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErr, setProfileErr] = useState<{ name?: string; email?: string; form?: string }>({});
  const [profileSaved, setProfileSaved] = useState(false);

  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [pwErr, setPwErr] = useState<{ currentPassword?: string; newPassword?: string; confirm?: string; form?: string }>({});
  const [pwSaved, setPwSaved] = useState(false);

  const [active, setActive] = useState<string>("profile");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      // rootMargin narrows the trigger zone to a band across the middle of the viewport.
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);
  const scrollTo = (id: string) => {
    setActive(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!user) {
    // RequireAuth guarantees a session, but user can still be null for a tick
    // after a refresh while it rehydrates.
    return (
      <div className="min-h-[100dvh] w-full app-gradient flex items-center justify-center">
        <p className="font-caveat  text-muted text-[1rem]">a moment…</p>
      </div>
    );
  }

  const plan = planLabel(user.plan);
  const isPaid = user.plan !== "FREE";
  const initial = (user.name?.[0] ?? "·").toUpperCase();

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const profileDirty = trimmedName !== user.name || trimmedEmail !== user.email;
  const profileValid = trimmedName.length > 0 && trimmedName.length <= NAME_MAX && trimmedEmail.length > 0;
  const canSaveProfile = profileDirty && profileValid && !savingProfile;

  const pwFilled = currentPassword.length > 0 && newPassword.length > 0 && confirmPassword.length > 0;
  const canChangePw = pwFilled && !changingPw;

  const saveProfile = async () => {
    if (!canSaveProfile) return;
    setSavingProfile(true);
    setProfileErr({});
    setProfileSaved(false);

    const payload: { name?: string; email?: string } = {};
    if (trimmedName !== user.name) payload.name = trimmedName;
    if (trimmedEmail !== user.email) payload.email = trimmedEmail;

    try {
      const { user: updated } = await userService.updateProfile(payload);
      dispatch(setUser(updated));
      setName(updated.name);
      setEmail(updated.email);
      setProfileSaved(true);
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        setProfileErr({ name: e.fields.name, email: e.fields.email, form: e.fields.name || e.fields.email ? undefined : e.message });
      } else {
        setProfileErr({ form: e instanceof ApiError ? e.message : "something on our end. try again?" });
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const pickPhoto = () => fileRef.current?.click();

  const onPhotoPicked = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // clear the input or re-picking the same file won't fire onChange again
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarErr("that image is a bit much. under 5mb, please.");
      return;
    }

    setAvatarBusy(true);
    setAvatarErr(null);
    try {
      const { user: updated } = await userService.uploadAvatar(file);
      dispatch(setUser(updated));
    } catch (err) {
      setAvatarErr(err instanceof ApiError ? err.fields?.avatar ?? err.message : "couldn't upload that. try again?");
    } finally {
      setAvatarBusy(false);
    }
  };

  const removePhoto = async () => {
    if (!user.avatar || avatarBusy) return;
    setAvatarBusy(true);
    setAvatarErr(null);
    try {
      const { user: updated } = await userService.removeAvatar();
      dispatch(setUser(updated));
    } catch (err) {
      setAvatarErr(err instanceof ApiError ? err.message : "couldn't do that. try again?");
    } finally {
      setAvatarBusy(false);
    }
  };

  const changePw = async () => {
    if (!canChangePw) return;
    setPwErr({});
    setPwSaved(false);

    if (newPassword.length < PASSWORD_MIN) {
      setPwErr({ newPassword: "password needs at least 10 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwErr({ confirm: "those two don't match." });
      return;
    }

    setChangingPw(true);
    try {
      // Changing the password revokes every session, including this tab's, so
      // the response hands back a fresh token. Store it or the very next
      // request 401s and signs the user out of the page they are standing on.
      const { token } = await userService.changePassword({ currentPassword, newPassword });
      if (token) setToken(token);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwSaved(true);
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        setPwErr({
          currentPassword: e.fields.currentPassword,
          newPassword: e.fields.newPassword,
          form: e.fields.currentPassword || e.fields.newPassword ? undefined : e.message,
        });
      } else {
        setPwErr({ form: e instanceof ApiError ? e.message : "something on our end. try again?" });
      }
    } finally {
      setChangingPw(false);
    }
  };

  const photoControls = (align: "center" | "start") => (
    <div className={`flex flex-col ${align === "center" ? "items-center" : "items-start"} gap-1.5`}>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <button
          type="button"
          onClick={pickPhoto}
          disabled={avatarBusy}
          className="inline-flex items-center gap-1.5 font-serif  text-[0.98rem] text-ink hover:text-rust transition cursor-pointer disabled:opacity-60"
        >
          <CameraIcon />
          {avatarBusy ? "working…" : user.avatar ? "change photo" : "add a photo"}
        </button>
        {user.avatar && !avatarBusy && (
          <button
            type="button"
            onClick={removePhoto}
            className="font-serif  text-[0.95rem] text-muted hover:text-rust transition cursor-pointer"
          >
            remove
          </button>
        )}
      </div>
      <p
        className={`font-caveat  text-[0.78rem] ${avatarErr ? "text-rust" : "text-muted/80"}`}
        role={avatarErr ? "alert" : undefined}
      >
        {avatarErr ?? "png, jpg or webp · under 5mb"}
      </p>
    </div>
  );

  // Both layouts sit in the DOM at once (one hidden by CSS), so field ids take a
  // per-layout prefix - otherwise the labels focus the wrong copy of the input.
  const nameEmailCard = (idp: string) => (
    <Card>
      <CardHead kicker="who you are" title="Name & email" blurb="the name your characters know you by." />
      <div className="flex flex-col gap-6">
        <div>
          <Field
            id={`${idp}-profile-name`}
            label="name"
            value={name}
            onChange={(v) => {
              setName(v);
              setProfileErr((p) => ({ ...p, name: undefined, form: undefined }));
              setProfileSaved(false);
            }}
            placeholder="what should we call you?"
            autoComplete="name"
            maxLength={NAME_MAX + 20}
            error={profileErr.name}
          />
          {trimmedName.length > NAME_MAX && !profileErr.name && (
            <p className="font-caveat  text-rust text-[0.72rem] mt-1.5">
              {trimmedName.length} / {NAME_MAX} - shorten it?
            </p>
          )}
        </div>
        <Field
          id={`${idp}-profile-email`}
          label="email"
          type="email"
          value={email}
          onChange={(v) => {
            setEmail(v);
            setProfileErr((p) => ({ ...p, email: undefined, form: undefined }));
            setProfileSaved(false);
          }}
          placeholder="you@example.com"
          autoComplete="email"
          error={profileErr.email}
        />
      </div>
      {profileErr.form && <p className="font-caveat  text-rust text-[0.8rem] mt-4">{profileErr.form}</p>}
      <div className="mt-7 flex items-center gap-4">
        <Action onClick={saveProfile} disabled={!canSaveProfile}>
          {savingProfile ? "saving…" : "Save changes"}
        </Action>
        <Saved show={profileSaved && !profileDirty}>saved</Saved>
      </div>
    </Card>
  );

  const passwordCard = (idp: string) => (
    <Card>
      <CardHead kicker="password" title="A new password" blurb="you'll stay signed in on this device." />
      <div className="flex flex-col gap-6">
        <Field
          id={`${idp}-pw-current`}
          label="current password"
          type="password"
          value={currentPassword}
          onChange={(v) => {
            setCurrentPassword(v);
            setPwErr((p) => ({ ...p, currentPassword: undefined, form: undefined }));
            setPwSaved(false);
          }}
          placeholder="the one you use now"
          autoComplete="current-password"
          error={pwErr.currentPassword}
        />
        <div className="grid gap-6 md:grid-cols-2">
          <Field
            id={`${idp}-pw-new`}
            label="new password"
            type="password"
            value={newPassword}
            onChange={(v) => {
              setNewPassword(v);
              setPwErr((p) => ({ ...p, newPassword: undefined, form: undefined }));
              setPwSaved(false);
            }}
            placeholder="at least 10 characters"
            autoComplete="new-password"
            error={pwErr.newPassword}
          />
          <Field
            id={`${idp}-pw-confirm`}
            label="confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(v) => {
              setConfirmPassword(v);
              setPwErr((p) => ({ ...p, confirm: undefined }));
              setPwSaved(false);
            }}
            placeholder="once more"
            autoComplete="new-password"
            error={pwErr.confirm}
          />
        </div>
      </div>
      {pwErr.form && <p className="font-caveat  text-rust text-[0.8rem] mt-4">{pwErr.form}</p>}
      <div className="mt-7 flex items-center gap-4">
        <Action onClick={changePw} disabled={!canChangePw}>
          {changingPw ? "changing…" : "Change password"}
        </Action>
        <Saved show={pwSaved}>password changed</Saved>
      </div>
    </Card>
  );

  const accountCard = (
    <Card>
      <CardHead kicker="account" title="The details" blurb="set once, and quietly kept." />
      <dl className="divide-y divide-hairline/50">
        <div className="flex items-center justify-between py-3">
          <dt className="font-serif  text-muted text-[0.98rem]">plan</dt>
          <dd>
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-[0.74rem] font-serif tracking-wide ${isPaid ? "bg-rust text-cream-soft" : "bg-cream text-muted border border-hairline/70"
                }`}
            >
              {plan}
            </span>
          </dd>
        </div>
        <div className="flex items-center justify-between py-3">
          <dt className="font-serif  text-muted text-[0.98rem]">date of birth</dt>
          <dd className="font-serif text-ink text-[0.98rem]">{formatDate(user.dob)}</dd>
        </div>
        <div className="flex items-center justify-between py-3">
          <dt className="font-serif  text-muted text-[0.98rem]">with Privateaile since</dt>
          <dd className="font-serif text-ink text-[0.98rem]">{formatDate(user.createdAt)}</dd>
        </div>
      </dl>
      <p className="font-caveat  text-muted/80 text-[0.78rem] mt-4">
        your birth date sets the 18+ gate, so it stays as it is.
      </p>
    </Card>
  );

  return (
    <div className="min-h-[100dvh] w-full app-gradient px-5 md:px-8 lg:px-10 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] md:pt-10 md:pb-16">
      {/* one input, shared by every "change photo" button in both layouts */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onPhotoPicked}
      />

      <main className="md:hidden mx-auto w-full max-w-[460px] flex flex-col">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label="Back to settings"
            onClick={() => navigate("/settings")}
            className="h-9 w-9 rounded-full bg-cream-light border border-hairline/70 text-ink-soft flex items-center justify-center hover:brightness-95 active:scale-95 transition cursor-pointer"
          >
            <BackIcon />
          </button>
          <p className="flex-1 text-center font-serif  text-ink-soft text-[1.05rem]">profile &amp; account</p>
          <span className="h-9 w-9 shrink-0" aria-hidden="true" />
        </div>

        <div
          className="mt-6 rounded-[1.5rem] border border-hairline/60 px-6 py-8 flex flex-col items-center text-center shadow-[0_18px_44px_-32px_rgba(22,32,43,0.4)]"
          style={{
            background:
              "linear-gradient(160deg, rgba(104,119,91,0.16), rgba(97,107,120,0.10) 58%, rgba(250,248,245,0.7))",
          }}
        >
          <AvatarDisc src={user.avatar} initial={initial} className="h-24 w-24 text-[2.4rem]" />
          <h1 className="font-display text-ink text-[1.5rem] leading-tight mt-4">{user.name}</h1>
          <p className="font-caveat  text-muted text-[0.92rem] mt-0.5 max-w-full truncate">{user.email}</p>
          <span
            className={`inline-block mt-2.5 rounded-full px-3 py-0.5 text-[0.72rem] font-serif tracking-wide ${isPaid ? "bg-rust text-cream-soft" : "bg-cream text-muted border border-hairline/70"
              }`}
          >
            {plan} plan
          </span>
          <div className="mt-5">{photoControls("center")}</div>
        </div>

        <div className="mt-6 flex flex-col gap-6">
          {nameEmailCard("m")}
          {passwordCard("m")}
          {accountCard}
        </div>

        <p className="mt-7 text-center font-caveat  text-muted/70 text-[0.8rem]">ember · a quieter place</p>
      </main>

      <div className="hidden md:block mx-auto w-full max-w-[1120px]">
        <header className="flex items-end justify-between gap-4 border-b border-hairline/60 pb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Back to settings"
              onClick={() => navigate("/settings")}
              className="h-10 w-10 rounded-full bg-cream-light border border-hairline/70 text-ink-soft flex items-center justify-center hover:brightness-95 hover:-translate-x-0.5 active:scale-95 transition cursor-pointer"
            >
              <BackIcon />
            </button>
            <div>
              <p className="font-caveat  text-rust text-[1rem] tracking-wide leading-none">profile &amp; account</p>
              <h1 className="font-display text-ink text-[2rem] lg:text-[2.3rem] leading-tight mt-1">This is you</h1>
            </div>
          </div>
          <p className="hidden lg:block font-caveat  text-muted/70 text-[0.9rem] pb-1">ember · a quieter place</p>
        </header>

        <div className="grid grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr] gap-9 lg:gap-14 pt-8">
          <aside className="sticky top-8 self-start flex flex-col gap-5">
            <div
              className="rounded-[1.5rem] border border-hairline/60 p-7 flex flex-col items-center text-center shadow-[0_22px_50px_-30px_rgba(22,32,43,0.45)]"
              style={{
                background:
                  "linear-gradient(160deg, rgba(104,119,91,0.18), rgba(97,107,120,0.10) 55%, rgba(250,248,245,0.7))",
              }}
            >
              <AvatarDisc src={user.avatar} initial={initial} className="h-28 w-28 text-[2.8rem]" />
              <h2 className="font-display text-ink text-[1.6rem] leading-tight mt-4">{user.name}</h2>
              <p className="font-caveat  text-muted text-[0.92rem] mt-0.5 w-full truncate">{user.email}</p>
              <span
                className={`inline-block mt-3 rounded-full px-3 py-0.5 text-[0.72rem] font-serif tracking-wide ${isPaid ? "bg-rust text-cream-soft" : "bg-cream text-muted border border-hairline/70"
                  }`}
              >
                {plan} plan
              </span>

              <div className="dotted-rule w-full my-5" aria-hidden="true" />

              <p className="font-caveat  text-muted text-[0.82rem]">with ember since</p>
              <p className="font-serif text-ink-soft text-[0.95rem]">{formatDate(user.createdAt)}</p>

              <div className="mt-5">{photoControls("center")}</div>
            </div>

            <nav className="rounded-[1.3rem] bg-cream-light border border-hairline/60 p-2">
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
                    <span className={`h-1.5 w-1.5 rounded-full transition ${isActive ? "bg-rust scale-100" : "bg-hairline scale-90"}`} />
                    <span className="font-serif  text-[1.02rem]">{n.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex flex-col gap-8 pb-8">
            <section id="profile" ref={(el) => { sectionRefs.current.profile = el; }} className="scroll-mt-8">
              {nameEmailCard("d")}
            </section>
            <section id="password" ref={(el) => { sectionRefs.current.password = el; }} className="scroll-mt-8">
              {passwordCard("d")}
            </section>
            <section id="account" ref={(el) => { sectionRefs.current.account = el; }} className="scroll-mt-8">
              {accountCard}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
