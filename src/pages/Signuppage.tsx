import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAppDispatch } from "../hook/hooks";
import { authService, ApiError } from "../services/authService";
import { setAuth } from "../redux/authSlice";
import { signInWithGoogle, signInWithFacebook } from "../services/socialAuth";
import {
    validateName,
    validateEmail,
    validateSignupPassword,
    validateDob,
} from "../lib/validate";
import { useSlowRequest } from "../hooks/useSlowRequest";
import { networkCopy } from "../copy";

// Per-field errors; `dob` covers all three date inputs at once.
type FieldErrors = {
    name?: string;
    email?: string;
    password?: string;
    dob?: string;
};

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return (
        <p className="font-serif  text-rust text-[0.78rem] sm:text-[0.82rem] mt-1">
            {message}
        </p>
    );
}

function FieldLabel({ children }: { children: string }) {
    return (
        <p className="font-serif  text-rust text-[0.85rem] sm:text-[1.02rem] tracking-wide mb-1">
            {children}
        </p>
    );
}

function GoogleIcon() {
    return (
        <span className="h-5 w-5 rounded-full bg-cream-soft flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="h-3 w-3">
                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3.02h3.86c2.26-2.09 3.56-5.17 3.56-8.89z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.84l-3.86-3.02c-1.07.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.12A11.996 11.996 0 0 0 12 24z" />
                <path fill="#FBBC05" d="M5.27 14.34A7.19 7.19 0 0 1 4.89 12c0-.81.14-1.6.38-2.34V6.54H1.27A11.996 11.996 0 0 0 0 12c0 1.94.46 3.77 1.27 5.46l4-3.12z" />
                <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.79l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.27 6.54l4 3.12C6.22 6.86 8.87 4.75 12 4.75z" />
            </svg>
        </span>
    );
}

function FacebookIcon() {
    return (
        <span className="h-5 w-5 rounded-full bg-[#1877F2] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="h-3 w-3 fill-white">
                <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.16 8.44 9.94v-7.03H7.9v-2.91h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34V22c4.78-.78 8.44-4.94 8.44-9.94z" />
            </svg>
        </span>
    );
}

function SignUpPage() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [day, setDay] = useState("");
    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");
    const [error, setError] = useState("");
    const [fieldErr, setFieldErr] = useState<FieldErrors>({});
    const [loading, setLoading] = useState(false);
    const slow = useSlowRequest(loading);
    const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);

    const clearField = (key: keyof FieldErrors) =>
        setFieldErr((p) => (p[key] ? { ...p, [key]: undefined } : p));

    // Same call as sign-in: the server creates the account on first use and recognises it after.
    const handleSocial = async (provider: "google" | "facebook") => {
        setError("");
        setSocialLoading(provider);
        try {
            const accessToken =
                provider === "google" ? await signInWithGoogle() : await signInWithFacebook();
            const { token, user } =
                provider === "google"
                    ? await authService.google(accessToken)
                    : await authService.facebook(accessToken);
            dispatch(setAuth({ token, user }));
            navigate("/onboarding");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "that didn't go through.");
        } finally {
            setSocialLoading(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const next: FieldErrors = {
            name: validateName(name) ?? undefined,
            email: validateEmail(email) ?? undefined,
            password: validateSignupPassword(password) ?? undefined,
            dob: validateDob(day, month, year) ?? undefined,
        };
        setFieldErr(next);
        if (next.name || next.email || next.password || next.dob) return;

        const paddedMonth = month.padStart(2, "0");
        const paddedDay = day.padStart(2, "0");
        const dob = `${year}-${paddedMonth}-${paddedDay}`;

        setLoading(true);
        try {
            const { token, user } = await authService.register({ name, email, password, dob });
            dispatch(setAuth({ token, user }));
            navigate("/onboarding");
        } catch (err: unknown) {
            // Server field messages (an email already taken, say) win over the banner.
            if (err instanceof ApiError) {
                if (err.fields && Object.keys(err.fields).length > 0) {
                    setFieldErr(err.fields as FieldErrors);
                } else if (err.status === 0) {
                    setError(networkCopy.failedMidStream);
                } else {
                    setError(err.message);
                }
            } else {
                setError(networkCopy.serverError);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 h-[100dvh] w-full overflow-hidden app-gradient flex items-start lg:items-center justify-center px-4 pt-3 pb-3 sm:pt-6 lg:py-8">
            <main className="w-full max-w-[380px] sm:max-w-[480px] lg:max-w-[500px] h-full lg:h-auto max-h-[820px] flex flex-col">
                <div className="relative flex items-center justify-center lg:items-start lg:justify-start pt-2 pb-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => navigate("/")}
                        aria-label="Go back"
                        className="lg:hidden absolute left-0 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-cream-dark text-ink flex items-center justify-center hover:brightness-95 active:scale-95 transition"
                    >
                        <span className="font-display text-sm sm:text-base leading-none -translate-x-px">‹</span>
                    </button>
                    <p className="font-serif  text-ink-soft text-[1rem] sm:text-[1.5rem] lg:text-[1.8rem] tracking-wide">
                        get started
                    </p>
                </div>

                <div className="flex-1 flex flex-col justify-start min-h-0">
                    <h1 className="font-display text-ink text-[1.5rem] sm:text-[1.9rem] lg:text-[2.15rem] leading-[1.15] font-medium mt-4 sm:mt-5">
                        A notebook of your <span className=" text-rust">own</span>.
                    </h1>
                    <p className="font-serif  text-ink-soft text-[0.8rem] sm:text-[0.95rem] lg:text-[1rem] mt-2 mb-1">
                        adults only · 18+ · private by default.
                    </p>
                    {/* Before the form, not under the button. The policy says
                      replies are written by sending the conversation to an AI
                      company - worth knowing before the account exists. */}
                    <p className="font-caveat text-muted text-[0.8rem] sm:text-[0.88rem] mb-4 sm:mb-5">
                        by signing up you agree to how we handle your words &mdash;{" "}
                        <Link to="/privacy" className="text-rust hover:text-rust-hover underline underline-offset-2">
                            read the privacy policy
                        </Link>
                        .
                    </p>

                    {error && (
                        <div className="font-serif  text-rust text-[0.8rem] sm:text-[0.88rem] mb-3 bg-rust/5 border border-rust/20 px-3.5 py-2.5 rounded-2xl">
                            {error}
                        </div>
                    )}

                    <form className="flex flex-col gap-3 sm:gap-4 w-full" onSubmit={handleSubmit}>
                        <div>
                            <FieldLabel>your name</FieldLabel>
                            <input
                                type="text"
                                placeholder="what should we call you?"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    clearField("name");
                                }}
                                aria-invalid={fieldErr.name ? true : undefined}
                                className="w-full rounded-2xl bg-cream-dark text-ink font-serif text-[0.85rem] sm:text-[0.95rem] px-3.5 sm:px-4 py-2.5 sm:py-3 outline-none border border-transparent focus:border-rust/40 transition-colors placeholder:text-ink-soft/60 placeholder:"
                            />
                            <FieldError message={fieldErr.name} />
                        </div>

                        <div>
                            <FieldLabel>email</FieldLabel>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    clearField("email");
                                }}
                                aria-invalid={fieldErr.email ? true : undefined}
                                className="w-full rounded-2xl bg-cream-dark text-ink font-serif text-[0.85rem] sm:text-[0.95rem] px-3.5 sm:px-4 py-2.5 sm:py-3 outline-none border border-transparent focus:border-rust/40 transition-colors placeholder:text-ink-soft/60 placeholder:"
                            />
                            <FieldError message={fieldErr.email} />
                        </div>

                        <div>
                            <FieldLabel>password</FieldLabel>
                            <input
                                type="password"
                                placeholder="at least 10 characters"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    clearField("password");
                                }}
                                aria-invalid={fieldErr.password ? true : undefined}
                                className="w-full rounded-2xl bg-cream-dark text-ink font-serif text-[0.85rem] sm:text-[0.95rem] px-3.5 sm:px-4 py-2.5 sm:py-3 outline-none border border-transparent focus:border-rust/40 transition-colors placeholder:text-ink-soft/60 placeholder:"
                            />
                            <FieldError message={fieldErr.password} />
                        </div>

                        <div>
                            <FieldLabel>date of birth · stays locked</FieldLabel>
                            <div className="flex gap-2 sm:gap-3">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Day"
                                    aria-label="Day"
                                    maxLength={2}
                                    value={day}
                                    onChange={(e) => {
                                        setDay(e.target.value.replace(/\D/g, ""));
                                        clearField("dob");
                                    }}
                                    aria-invalid={fieldErr.dob ? true : undefined}
                                    className="w-full rounded-2xl bg-cream-dark text-ink font-serif text-[0.85rem] sm:text-[0.95rem] px-3.5 sm:px-4 py-2.5 sm:py-3 text-center outline-none border border-transparent focus:border-rust/40 transition-colors placeholder:text-ink-soft/60"
                                />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Month"
                                    aria-label="Month"
                                    maxLength={2}
                                    value={month}
                                    onChange={(e) => {
                                        setMonth(e.target.value.replace(/\D/g, ""));
                                        clearField("dob");
                                    }}
                                    aria-invalid={fieldErr.dob ? true : undefined}
                                    className="w-full rounded-2xl bg-cream-dark text-ink font-serif text-[0.85rem] sm:text-[0.95rem] px-3.5 sm:px-4 py-2.5 sm:py-3 text-center outline-none border border-transparent focus:border-rust/40 transition-colors placeholder:text-ink-soft/60"
                                />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Year"
                                    aria-label="Year"
                                    maxLength={4}
                                    value={year}
                                    onChange={(e) => {
                                        setYear(e.target.value.replace(/\D/g, ""));
                                        clearField("dob");
                                    }}
                                    aria-invalid={fieldErr.dob ? true : undefined}
                                    className="w-full rounded-2xl bg-cream-dark text-ink font-serif text-[0.85rem] sm:text-[0.95rem] px-3.5 sm:px-4 py-2.5 sm:py-3 text-center outline-none border border-transparent focus:border-rust/40 transition-colors placeholder:text-ink-soft/60"
                                />
                            </div>
                            <FieldError message={fieldErr.dob} />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-full bg-rust text-cream-soft cursor-pointer font-display  text-[0.9rem] sm:text-[1.05rem] py-3 sm:py-3.5 mt-2 shadow-[0_6px_16px_-4px_rgba(97,107,120,0.55)] transition-all duration-150 hover:brightness-105 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust"
                        >
                            {loading ? "opening it…" : "Open my notebook →"}
                        </button>

                        {slow && loading && (
                            <p className="text-center font-caveat  text-muted text-[0.82rem] -mt-1">
                                {networkCopy.slow}
                            </p>
                        )}
                    </form>

                    <div className="flex items-center gap-3 my-4 sm:my-5">
                        <div className="dotted-rule flex-1" aria-hidden="true" />
                        <span className="font-serif  text-muted text-[0.75rem] sm:text-[0.85rem]">or</span>
                        <div className="dotted-rule flex-1" aria-hidden="true" />
                    </div>

                    <div className="flex flex-col sm:flex-col md:flex-row gap-2.5 sm:gap-3">
                        <button
                            type="button"
                            onClick={() => handleSocial("google")}
                            disabled={socialLoading !== null || loading}
                            className="w-full cursor-pointer rounded-full bg-cream-dark text-ink font-serif text-[0.85rem] sm:text-[0.95rem] py-2.5 sm:py-3 flex items-center justify-center gap-2.5 border border-transparent hover:border-rust/30 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <GoogleIcon />
                            {socialLoading === "google" ? "connecting…" : "Continue with Google"}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSocial("facebook")}
                            disabled={socialLoading !== null || loading}
                            className="w-full cursor-pointer rounded-full bg-cream-dark text-ink font-serif text-[0.85rem] sm:text-[0.95rem] py-2.5 sm:py-3 flex items-center justify-center gap-2.5 border border-transparent hover:border-rust/30 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <FacebookIcon />
                            {socialLoading === "facebook" ? "connecting…" : "Continue with Facebook"}
                        </button>
                    </div>
                </div>

                <p className="font-serif  text-ink-soft text-[0.75rem] sm:text-[0.85rem] text-center shrink-0 pb-2 sm:pb-4">
                    already have one?{" "}
                    <button
                        type="button"
                        onClick={() => navigate("/signin")}
                        className="text-rust  underline-offset-2 hover:underline cursor-pointer"
                    >
                        sign in →
                    </button>
                </p>
            </main>
        </div>
    );
}

export default SignUpPage;