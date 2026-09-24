import { useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { authService, ApiError } from "../services/authService";

function FieldLabel({ children }: { children: string }) {
    return (
        <p className="font-serif  text-rust text-[0.85rem] sm:text-[1.02rem] tracking-wide mb-1">
            {children}
        </p>
    );
}

// Mirrors PASSWORD_MIN_LEN in the backend's validation.js. The server still decides.
const PASSWORD_MIN_LEN = 10;

function ResetPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") ?? "";

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!password) {
            setError("a new password, please.");
            return;
        }
        if (password.length < PASSWORD_MIN_LEN) {
            setError("password needs at least 10 characters.");
            return;
        }
        if (password !== confirm) {
            setError("those two don't match.");
            return;
        }

        setLoading(true);
        try {
            await authService.resetPassword({ token, password });
            setDone(true);
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setError(err.fields?.password ?? err.fields?.token ?? err.message);
            } else {
                setError(err instanceof Error ? err.message : "something on our end. we know about it.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 h-[100dvh] w-full overflow-hidden app-gradient flex items-start justify-center px-4 pt-3 pb-3 sm:pt-6">
            <main className="w-full max-w-[380px] sm:max-w-[480px] lg:max-w-[500px] h-full max-h-[820px] flex flex-col">
                <div className="relative flex items-center justify-center lg:items-start lg:justify-start pt-2 pb-1 shrink-0">
                    <p className="font-serif  text-ink-soft text-[1rem] sm:text-[1.5rem] lg:text-[1.8rem] tracking-wide">
                        almost there
                    </p>
                </div>

                <div className="flex-1 flex flex-col justify-start min-h-0">
                    {!token ? (
                        // No token: the link was truncated somewhere between the email and here.
                        <div className="flex flex-col gap-4 mt-4 sm:mt-5">
                            <h1 className="font-display text-ink text-[1.5rem] sm:text-[1.9rem] lg:text-[2.15rem] leading-[1.15] font-medium">
                                That link's
                                <br />
                                <span className=" text-rust">not complete</span>.
                            </h1>
                            <p className="font-serif  text-ink-soft text-[0.85rem] sm:text-[0.95rem] leading-relaxed">
                                open the reset link from your email directly, or ask for a new one.
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate("/forgot-password")}
                                className="w-full rounded-full bg-rust text-cream-soft cursor-pointer font-display  text-[0.9rem] sm:text-[1.05rem] py-3 sm:py-3.5 mt-1 shadow-[0_6px_16px_-4px_rgba(37,49,94,0.55)] transition-all duration-150 hover:brightness-105 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust"
                            >
                                ask for a new link →
                            </button>
                        </div>
                    ) : done ? (
                        <div className="flex flex-col gap-4 mt-4 sm:mt-5">
                            <h1 className="font-display text-ink text-[1.5rem] sm:text-[1.9rem] lg:text-[2.15rem] leading-[1.15] font-medium">
                                Password
                                <br />
                                <span className=" text-rust">reset</span>.
                            </h1>
                            <p className="font-serif  text-ink-soft text-[0.85rem] sm:text-[0.95rem] leading-relaxed">
                                you can sign in now with your new password.
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate("/signin")}
                                className="w-full rounded-full bg-rust text-cream-soft cursor-pointer font-display  text-[0.9rem] sm:text-[1.05rem] py-3 sm:py-3.5 mt-1 shadow-[0_6px_16px_-4px_rgba(37,49,94,0.55)] transition-all duration-150 hover:brightness-105 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust"
                            >
                                Sign in →
                            </button>
                        </div>
                    ) : (
                        <>
                            <h1 className="font-display text-ink text-[1.5rem] sm:text-[1.9rem] lg:text-[2.15rem] leading-[1.15] font-medium mt-4 sm:mt-5">
                                Set a new
                                <br />
                                <span className=" text-rust">password</span>.
                            </h1>
                            <p className="font-serif  text-ink-soft text-[0.8rem] sm:text-[0.95rem] lg:text-[1rem] mt-2 mb-5 sm:mb-6">
                                at least 10 characters. this link works for 30 minutes.
                            </p>

                            {error && (
                                <div className="font-serif  text-rust text-[0.8rem] sm:text-[0.88rem] mb-3 bg-rust/5 border border-rust/20 px-3.5 py-2.5 rounded-2xl">
                                    {error}
                                </div>
                            )}

                            <form className="flex flex-col gap-3 sm:gap-4" onSubmit={handleSubmit}>
                                <div>
                                    <FieldLabel>new password</FieldLabel>
                                    <input
                                        type="password"
                                        placeholder="········"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full rounded-2xl bg-cream-dark text-ink font-serif text-[0.85rem] sm:text-[0.95rem] px-3.5 sm:px-4 py-2.5 sm:py-3 outline-none border border-transparent focus:border-rust/40 transition-colors placeholder:text-ink-soft/60"
                                    />
                                </div>

                                <div>
                                    <FieldLabel>confirm password</FieldLabel>
                                    <input
                                        type="password"
                                        placeholder="········"
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        className="w-full rounded-2xl bg-cream-dark text-ink font-serif text-[0.85rem] sm:text-[0.95rem] px-3.5 sm:px-4 py-2.5 sm:py-3 outline-none border border-transparent focus:border-rust/40 transition-colors placeholder:text-ink-soft/60"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full rounded-full bg-rust text-cream-soft cursor-pointer font-display  text-[0.9rem] sm:text-[1.05rem] py-3 sm:py-3.5 mt-2 shadow-[0_6px_16px_-4px_rgba(37,49,94,0.55)] transition-all duration-150 hover:brightness-105 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust"
                                >
                                    {loading ? "saving…" : "Set password →"}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <p className="font-serif  text-ink-soft text-[0.75rem] sm:text-[0.85rem] text-center shrink-0 pb-2 sm:pb-4">
                    <button
                        type="button"
                        onClick={() => navigate("/signin")}
                        className="text-rust  underline-offset-2 hover:underline cursor-pointer"
                    >
                        back to sign in →
                    </button>
                </p>
            </main>
        </div>
    );
}

export default ResetPasswordPage;
