import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAppDispatch } from "../hook/hooks";
import { authService, ApiError } from "../services/authService";
import { setAuth } from "../redux/authSlice";
import { signInWithGoogle, signInWithFacebook } from "../services/socialAuth";
import { validateEmail, validateLoginPassword } from "../lib/validate";
import { useSlowRequest } from "../hooks/useSlowRequest";
import { formCopy, networkCopy } from "../copy";
// import { authService } from "./services/authService";
// import { useAppDispatch } from "./store/hooks";
// import { setAuth } from "./store/authSlice";

// Per-field errors, rendered under the input each one belongs to.
type FieldErrors = { email?: string; password?: string };

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

function SignInPage() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [fieldErr, setFieldErr] = useState<FieldErrors>({});
    const [loading, setLoading] = useState(false);
    // fires once the request has been running for 4s
    const slow = useSlowRequest(loading);
    // which social button is mid-flow - disables both, leaves the form usable
    const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const next: FieldErrors = {
            email: validateEmail(email) ?? undefined,
            password: validateLoginPassword(password) ?? undefined,
        };
        setFieldErr(next);
        if (next.email || next.password) return;

        setLoading(true);
        try {
            const { token, user } = await authService.login({ email, password });
            dispatch(setAuth({ token, user }));
            navigate("/onboarding");
        } catch (err: unknown) {
            // A wrong pair comes back as a bare 401 with no field info, so pin the
            // message to the password box. Server-sent field errors win over that.
            if (err instanceof ApiError) {
                if (err.fields && Object.keys(err.fields).length > 0) {
                    setFieldErr(err.fields as FieldErrors);
                } else if (err.status === 401) {
                    setFieldErr({ password: formCopy.passwordLogin.noMatch });
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

    // Provider token is obtained in the browser, then traded with our backend for a session.
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

    return (
        <div className="flex-1 h-[100dvh] w-full overflow-hidden app-gradient flex items-start justify-center px-4 pt-3 pb-3 sm:pt-6">
            <main className="w-full max-w-[380px] sm:max-w-[480px] lg:max-w-[500px] h-full max-h-[820px] flex flex-col">
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
                        welcome back
                    </p>
                </div>

                <div className="flex-1 flex flex-col justify-start min-h-0">
                    <h1 className="font-display text-ink text-[1.5rem] sm:text-[1.9rem] lg:text-[2.15rem] leading-[1.15] font-medium mt-4 sm:mt-5">
                        Pick up where you
                        <br />
                        <span className=" text-rust">left off</span>.
                    </h1>
                    <p className="font-serif  text-ink-soft text-[0.8rem] sm:text-[0.95rem] lg:text-[1rem] mt-2 mb-5 sm:mb-6">
                        the notebook is where you left it.
                    </p>

                    {error && (
                        <div className="font-serif  text-rust text-[0.8rem] sm:text-[0.88rem] mb-3 bg-rust/5 border border-rust/20 px-3.5 py-2.5 rounded-2xl">
                            {error}
                        </div>
                    )}

                    <form className="flex flex-col gap-3 sm:gap-4" onSubmit={handleSubmit}>
                        <div>
                            <FieldLabel>email</FieldLabel>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (fieldErr.email) setFieldErr((p) => ({ ...p, email: undefined }));
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
                                placeholder="········"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (fieldErr.password) setFieldErr((p) => ({ ...p, password: undefined }));
                                }}
                                aria-invalid={fieldErr.password ? true : undefined}
                                className="w-full rounded-2xl bg-cream-dark text-ink font-serif text-[0.85rem] sm:text-[0.95rem] px-3.5 sm:px-4 py-2.5 sm:py-3 outline-none border border-transparent focus:border-rust/40 transition-colors placeholder:text-ink-soft/60"
                            />
                            <FieldError message={fieldErr.password} />
                            <div className="flex justify-end mt-1.5">
                                <button
                                    type="button"
                                    onClick={() => navigate("/forgot-password")}
                                    className="font-serif  text-ink-soft text-[0.75rem] sm:text-[0.82rem] underline-offset-2 hover:underline hover:text-rust cursor-pointer transition-colors"
                                >
                                    forgot your password?
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-full bg-rust text-cream-soft cursor-pointer font-display  text-[0.9rem] sm:text-[1.05rem] py-3 sm:py-3.5 mt-2 shadow-[0_6px_16px_-4px_rgba(97,107,120,0.55)] transition-all duration-150 hover:brightness-105 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust"
                        >
                            {loading ? "signing in…" : "Sign in →"}
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

                    <div className="flex flex-col gap-2.5 sm:gap-3">
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
                    no account yet?{" "}
                    <button
                        type="button"
                        onClick={() => navigate("/signup")}
                        className="text-rust  underline-offset-2 hover:underline cursor-pointer"
                    >
                        create one →
                    </button>
                </p>
            </main>
        </div>
    );
}

export default SignInPage;