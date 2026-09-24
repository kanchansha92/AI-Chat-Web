import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { authService, ApiError } from "../services/authService";

function FieldLabel({ children }: { children: string }) {
    return (
        <p className="font-serif  text-rust text-[0.85rem] sm:text-[1.02rem] tracking-wide mb-1">
            {children}
        </p>
    );
}

function ForgotPasswordPage() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    // Same line back whether or not the account exists, so nothing here leaks who's registered.
    const [sentMessage, setSentMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email.trim()) {
            setError("email, please.");
            return;
        }

        setLoading(true);
        try {
            const { message } = await authService.forgotPassword(email.trim());
            setSentMessage(message || "if there's an account for that email, a link is on its way.");
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setError(err.fields?.email ?? err.message);
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
                    <button
                        type="button"
                        onClick={() => navigate("/signin")}
                        aria-label="Go back"
                        className="lg:hidden absolute left-0 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-cream-dark text-ink flex items-center justify-center hover:brightness-95 active:scale-95 transition"
                    >
                        <span className="font-display text-sm sm:text-base leading-none -translate-x-px">‹</span>
                    </button>
                    <p className="font-serif  text-ink-soft text-[1rem] sm:text-[1.5rem] lg:text-[1.8rem] tracking-wide">
                        no trouble
                    </p>
                </div>

                <div className="flex-1 flex flex-col justify-start min-h-0">
                    <h1 className="font-display text-ink text-[1.5rem] sm:text-[1.9rem] lg:text-[2.15rem] leading-[1.15] font-medium mt-4 sm:mt-5">
                        Forgot your
                        <br />
                        <span className=" text-rust">password</span>?
                    </h1>
                    <p className="font-serif  text-ink-soft text-[0.8rem] sm:text-[0.95rem] lg:text-[1rem] mt-2 mb-5 sm:mb-6">
                        tell us your email and we'll send a link.
                    </p>

                    {sentMessage ? (
                        <div className="flex flex-col gap-4">
                            <div className="font-serif  text-ink text-[0.85rem] sm:text-[0.95rem] bg-cream-dark border border-rust/15 px-4 py-4 rounded-2xl leading-relaxed">
                                {sentMessage}
                            </div>
                            <p className="font-serif  text-ink-soft text-[0.8rem] sm:text-[0.9rem] leading-relaxed">
                                the link works for 30 minutes. check your spam folder if it's not there in a minute or two.
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate("/signin")}
                                className="w-full rounded-full bg-rust text-cream-soft cursor-pointer font-display  text-[0.9rem] sm:text-[1.05rem] py-3 sm:py-3.5 mt-1 shadow-[0_6px_16px_-4px_rgba(37,49,94,0.55)] transition-all duration-150 hover:brightness-105 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust"
                            >
                                back to sign in →
                            </button>
                        </div>
                    ) : (
                        <>
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
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full rounded-2xl bg-cream-dark text-ink font-serif text-[0.85rem] sm:text-[0.95rem] px-3.5 sm:px-4 py-2.5 sm:py-3 outline-none border border-transparent focus:border-rust/40 transition-colors placeholder:text-ink-soft/60 placeholder:"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full rounded-full bg-rust text-cream-soft cursor-pointer font-display  text-[0.9rem] sm:text-[1.05rem] py-3 sm:py-3.5 mt-2 shadow-[0_6px_16px_-4px_rgba(37,49,94,0.55)] transition-all duration-150 hover:brightness-105 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust"
                                >
                                    {loading ? "sending…" : "Send the link →"}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <p className="font-serif  text-ink-soft text-[0.75rem] sm:text-[0.85rem] text-center shrink-0 pb-2 sm:pb-4">
                    remembered it?{" "}
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

export default ForgotPasswordPage;
