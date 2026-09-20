import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hook/hooks";
import { setUser } from "../redux/authSlice";
import { userService, type OnboardingIntent, type OnboardingTheme } from "../services/userService";
// import { useAppDispatch, useAppSelector } from "./store/hooks";
// import { logout as logoutAction } from "./store/authSlice";
// import { logout as logoutAction } from "../redux/authSlice";
type OptionCardProps = {
    title: string;
    desc: string;
    selected: boolean;
    onSelect: () => void;
};

function OptionCard({ title, desc, selected, onSelect }: OptionCardProps) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`text-left rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 border transition-colors cursor-pointer ${selected
                ? "bg-rust/10 border-rust"
                : "bg-cream-dark border-hairline hover:border-rust/30"
                }`}
        >
            <p
                className={`font-display  text-[0.95rem] sm:text-[1.1rem] leading-snug ${selected ? "text-rust" : "text-ink"
                    }`}
            >
                {title}
            </p>
            <p
                className={`font-serif  text-[0.7rem] sm:text-[0.8rem] mt-0.5 ${selected ? "text-rust/80" : "text-muted"
                    }`}
            >
                {desc}
            </p>
        </button>
    );
}

const THEME_MAP: Record<"paper" | "lamplight", OnboardingTheme> = {
    paper: "PAPER",
    lamplight: "LAMPLIGHT",
};

const INTENT_MAP: Record<"company" | "roleplay" | "journal" | "looking", OnboardingIntent> = {
    company: "COMPANY",
    roleplay: "ROLEPLAY",
    journal: "JOURNAL",
    looking: "LOOKING",
};

function OnboardingPage() {
    const navigate = useNavigate();
    const user = useAppSelector((s) => s.auth.user);
    const dispatch = useAppDispatch();
    const [feel, setFeel] = useState<"paper" | "lamplight" | null>("paper");
    const [brings, setBrings] = useState<
        "company" | "roleplay" | "journal" | "looking" | null
    >("company");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const handleContinue = async () => {
        if (!feel || !brings || saving) return;
        setSaving(true);
        setSaveError(null);
        try {
            const { user: updated } = await userService.completeOnboarding({
                theme: THEME_MAP[feel],
                intent: INTENT_MAP[brings],
            });
            dispatch(setUser(updated));
            navigate("/home");
        } catch {
            setSaveError("something on our end. try once more?");
            setSaving(false);
        }
    };


    return (
        <div className="h-[100dvh] min-h-screen w-full overflow-hidden app-gradient flex items-start justify-center px-4 pt-3 pb-3 sm:pt-6">
            <main className="w-full max-w-[380px] sm:max-w-[480px] md:max-w-[640px] lg:max-w-[720px] max-h-full flex flex-col">
                <div className="relative flex items-center justify-center pt-2 pb-1 shrink-0">
                    <p className="font-serif  text-ink-soft text-center text-[0.85rem] sm:text-[1.05rem] tracking-wide">
                        a quick <span className="font-caveat text-rust text-[1.05rem] sm:text-[1.3rem]">two questions</span>
                        {user ? <span className="text-muted">, {user.name}</span> : null}
                    </p>
                    {/* <button
                        type="button"
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className="absolute right-0 font-serif  text-muted text-[0.75rem] sm:text-[0.85rem] underline-offset-2 hover:underline hover:text-rust disabled:opacity-50 cursor-pointer"
                    >
                        {signingOut ? "signing out…" : "sign out"}
                    </button> */}
                </div>

                <div className="mt-4 sm:mt-6">
                    <p className="font-serif  text-rust text-[0.75rem] sm:text-[0.85rem] tracking-wide mb-1.5">
                        question 1 of 2
                    </p>
                    <h2 className="font-display text-ink text-[1.35rem] sm:text-[1.65rem] leading-[1.2] font-medium">
                        How do you want it
                        <br />
                        to <span className=" text-rust">feel</span>?
                    </h2>

                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mt-3">
                        <OptionCard
                            title="Paper"
                            desc="cream, by daylight"
                            selected={feel === "paper"}
                            onSelect={() => setFeel("paper")}
                        />
                        <OptionCard
                            title="Lamplight"
                            desc="warm brown, by night"
                            selected={feel === "lamplight"}
                            onSelect={() => setFeel("lamplight")}
                        />
                    </div>

                    <p className="font-serif  text-rust text-[0.75rem] sm:text-[0.85rem] tracking-wide mb-1.5 mt-5 sm:mt-6">
                        question 2 of 2
                    </p>
                    <h2 className="font-display text-ink text-[1.35rem] sm:text-[1.65rem] leading-[1.2] font-medium">
                        What did you come <span className=" text-rust">here</span> for?
                    </h2>

                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mt-3">
                        <OptionCard
                            title="Think"
                            desc="talk things through, slowly"
                            selected={brings === "company"}
                            onSelect={() => setBrings("company")}
                        />
                        <OptionCard
                            title="Create"
                            desc="characters, stories, roleplay"
                            selected={brings === "roleplay"}
                            onSelect={() => setBrings("roleplay")}
                        />
                        <OptionCard
                            title="Write"
                            desc="journal, remember, reflect"
                            selected={brings === "journal"}
                            onSelect={() => setBrings("journal")}
                        />
                        <OptionCard
                            title="Just looking"
                            desc="no plans yet"
                            selected={brings === "looking"}
                            onSelect={() => setBrings("looking")}
                        />
                    </div>

                    {saveError && (
                        <p className="font-caveat  text-rust text-[0.85rem] text-center mt-3">
                            {saveError}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={handleContinue}
                        disabled={saving}
                        className="w-full cursor-pointer rounded-full bg-rust text-cream-soft font-serif  text-[0.9rem] sm:text-[1rem] py-3 sm:py-3.5 mt-4 sm:mt-5 shadow-[0_6px_16px_-8px_rgba(97,107,120,0.5)] transition-transform duration-150 hover:brightness-105 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {saving ? "settling in…" : "Open the notebook →"}
                    </button>
                </div>
            </main>
        </div>
    );
}

export default OnboardingPage;