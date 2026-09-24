import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../hook/hooks";
import { characterService } from "../services/characterService";
import { ApiError } from "../services/authService";

/* The shell is locked to h-dvh + overflow-hidden, so the page itself never
   scrolls on any breakpoint the deep tab's file list scrolls internally
   instead, which keeps the CTA on screen. */

export interface CharacterSource {
    name: string;
    size: number;
    type: string;
}

export interface NewCharacter {
    name: string;
    colour: string;
    quickLine: string;
    tones: string[];
    mode: "quick" | "deep";
    sources: CharacterSource[];
    createdAt: string;
}

const SWATCHES = [
    { label: "clay", value: "#c96e55" },
    { label: "sage", value: "#a8b08c" },
    { label: "rust", value: "#b5563f" },
    { label: "olive", value: "#8a8a70" },
    { label: "slate", value: "#7d95a3" },
] as const;

const TONES = ["warm", "dry", "playful", "quiet", "curious", "sharp"] as const;

const ACCEPTED = [".txt", ".zip", ".png", ".pdf"];

const AVATAR_ACCEPTED = [".png", ".jpg", ".jpeg", ".webp"];
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

function fileBadge(name: string): { label: string; bg: string } {
    const lower = name.toLowerCase();
    if (lower.includes("whatsapp")) return { label: "WA", bg: "#b5563f" };
    const ext = lower.split(".").pop() ?? "";
    switch (ext) {
        case "png":
        case "jpg":
        case "jpeg":
            return { label: ext.toUpperCase().slice(0, 3), bg: "#16224A" };
        case "txt":
            return { label: "TXT", bg: "#8a8a70" };
        case "pdf":
            return { label: "PDF", bg: "#25315E" };
        case "zip":
            return { label: "ZIP", bg: "#7d95a3" };
        default:
            return { label: ext.toUpperCase().slice(0, 3) || "FILE", bg: "#5C6375" };
    }
}

function formatSize(bytes: number): string {
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)}mb`;
    return `${Math.max(1, Math.round(bytes / 1024))}kb`;
}

const fieldBase =
    "w-full rounded-[10px] bg-cream-light border border-hairline text-ink font-serif " +
    "text-[0.85rem] px-3.5 py-2.5 outline-none focus:border-rust/50 transition-colors " +
    "placeholder:text-ink-soft/60 placeholder: " +
    "md:rounded-xl md:bg-cream md:px-4 md:py-2.5 md:text-[0.9rem]";

const labelBase =
    "block font-caveat  text-rust text-[0.95rem] mb-1.5 tracking-wide md:text-[1rem]";

function CharacterBuilderPage() {
    const navigate = useNavigate();
    const user = useAppSelector((s) => s.auth.user);

    const [mode, setMode] = useState<"quick" | "deep">("quick");
    const [name, setName] = useState("");
    const [quickLine, setQuickLine] = useState("");
    const [colour, setColour] = useState<string>("#a8b08c"); // sage
    const [tones, setTones] = useState<Set<string>>(new Set(["warm", "dry"]));
    const [files, setFiles] = useState<File[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [nameError, setNameError] = useState(false);
    const [justCreated, setJustCreated] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [avatar, setAvatar] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [avatarDragOver, setAvatarDragOver] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const firstName = user?.name?.split(" ")[0] ?? "you";
    const initial = name.trim().charAt(0).toUpperCase();

    // Revoke on change/unmount, otherwise every re-pick leaks an object URL.
    useEffect(() => {
        if (!avatar) {
            setAvatarPreview(null);
            return;
        }
        const url = URL.createObjectURL(avatar);
        setAvatarPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [avatar]);

    const pickAvatar = (incoming: FileList | null) => {
        const file = incoming?.[0];
        if (!file) return;

        const ok = AVATAR_ACCEPTED.some((ext) => file.name.toLowerCase().endsWith(ext));
        if (!ok) {
            setAvatarError("png or jpg, please.");
            return;
        }
        if (file.size > AVATAR_MAX_BYTES) {
            setAvatarError("that one's a bit big. under 5mb?");
            return;
        }
        setAvatarError(null);
        setAvatar(file);
    };

    const removeAvatar = () => {
        setAvatar(null);
        setAvatarError(null);
        if (avatarInputRef.current) avatarInputRef.current.value = "";
    };

    const onAvatarDrop = (e: DragEvent) => {
        e.preventDefault();
        setAvatarDragOver(false);
        pickAvatar(e.dataTransfer.files);
    };

    const toggleTone = (tone: string) =>
        setTones((prev) => {
            const next = new Set(prev);
            if (next.has(tone)) next.delete(tone);
            else next.add(tone);
            return next;
        });

    const addFiles = (incoming: FileList | null) => {
        if (!incoming?.length) return;

        // FileList is live and empties when the input is reset or the drop
        // event ends, so copy it out here before anything else runs.
        const picked = Array.from(incoming).filter((f) =>
            ACCEPTED.some((ext) => f.name.toLowerCase().endsWith(ext))
        );
        if (!picked.length) return;

        setFiles((prev) => {
            const next = [...prev];
            for (const f of picked) {
                const dupe = next.some((x) => x.name === f.name && x.size === f.size);
                if (!dupe) next.push(f);
            }
            return next;
        });
    };
    const removeFile = (index: number) =>
        setFiles((prev) => prev.filter((_, i) => i !== index));

    const onDrop = (e: DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        addFiles(e.dataTransfer.files);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (submitting || justCreated) return;

        const trimmed = name.trim();
        if (!trimmed) {
            setNameError(true);
            document.getElementById("charName")?.focus();
            return;
        }

        setSubmitting(true);
        setSubmitError(null);
        try {
            const { character: saved } = await characterService.create(
                {
                    name: trimmed,
                    colour,
                    quickLine: quickLine.trim(),
                    tones: [...tones],
                    mode,
                },
                mode === "deep" ? files : [],
                // Both modes can carry a photo; only the source files are deep-only.
                avatar
            );

            setJustCreated(saved.name);
            setTimeout(() => {
                navigate("/home", { state: { newCharacterId: saved.id } });
            }, 900);
        } catch (err) {
            if (err instanceof ApiError && err.fields?.name) {
                setNameError(true);
                document.getElementById("charName")?.focus();
            }
            // Show a server-side avatar rejection next to the picker, not just
            // in the footer error.
            if (err instanceof ApiError && err.fields?.avatar) {
                setAvatarError(err.fields.avatar);
            }
            setSubmitError(
                err instanceof ApiError
                    ? err.message
                    : "something on our end. try once more?"
            );
            setSubmitting(false);
        }
    };


    /* Quick and deep both render these, so the two tabs can't drift apart.
       Each takes the wrapper's spacing classes from its caller. */

    const avatarField = (cls = "") => (
        <div className={cls}>
            <span className={labelBase}>their face</span>
            <div className="flex items-center gap-3 md:gap-4">
                <div
                    className={`group relative shrink-0 transition-transform duration-150
                                hover:scale-[1.04] ${avatarDragOver ? "scale-[1.04]" : ""}`}
                >
                    <button
                        type="button"
                        aria-label={avatar ? "Change profile picture" : "Add a profile picture"}
                        onClick={() => avatarInputRef.current?.click()}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setAvatarDragOver(true);
                        }}
                        onDragLeave={() => setAvatarDragOver(false)}
                        onDrop={onAvatarDrop}
                        style={{ backgroundColor: avatarPreview ? undefined : colour }}
                        className={`grid h-14 w-14 cursor-pointer place-items-center overflow-hidden
                                    rounded-full border-2 transition-colors duration-150
                                    focus-visible:outline-2 focus-visible:outline-offset-2
                                    focus-visible:outline-ink md:h-[72px] md:w-[72px]
                                    shadow-[inset_0_-3px_6px_rgba(0,0,0,0.12)]
                                    ${avatarDragOver ? "border-rust" : "border-ink/15"}`}
                    >
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <span className="font-display text-[1.25rem] font-medium text-cream-light md:text-[1.55rem]">
                                {initial || "?"}
                            </span>
                        )}
                    </button>

                    {/* sibling of the button, not a child - the button's
                        overflow-hidden would clip it */}
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-0.5 -bottom-0.5 grid h-6 w-6
                                   place-items-center rounded-full border border-hairline bg-cream-light
                                   text-ink-soft shadow-[0_2px_6px_rgba(22,34,74,0.18)]
                                   transition-colors group-hover:text-rust md:h-[26px] md:w-[26px]"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.1-1.8h8.4L17.3 7h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9Z" />
                            <circle cx="12" cy="13" r="3.2" />
                        </svg>
                    </span>
                </div>

                <div className="min-w-0">
                    <p className="font-caveat text-ink-soft text-[0.85rem] leading-snug md:text-[0.9rem]">
                        {avatar
                            ? "looking like themselves."
                            : "a photo, or leave it and they'll wear their colour."}
                    </p>
                    <div className="mt-1 flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            className="cursor-pointer font-serif text-[0.8rem] text-rust underline
                                       underline-offset-2 transition hover:text-rust-hover md:text-[0.85rem]"
                        >
                            {avatar ? "change" : "add a photo"}
                        </button>
                        {avatar && (
                            <button
                                type="button"
                                onClick={removeAvatar}
                                className="cursor-pointer font-serif text-[0.8rem] text-ink-soft/80
                                           transition hover:text-ink md:text-[0.85rem]"
                            >
                                remove
                            </button>
                        )}
                    </div>
                </div>

                <input
                    ref={avatarInputRef}
                    type="file"
                    accept={AVATAR_ACCEPTED.join(",")}
                    className="hidden"
                    onChange={(e) => {
                        pickAvatar(e.target.files);
                        e.target.value = "";
                    }}
                />
            </div>
            {avatarError && (
                <p className="mt-1.5 font-caveat text-rust text-[0.85rem]">{avatarError}</p>
            )}
        </div>
    );

    const nameField = (placeholder: string, cls = "") => (
        <div className={cls}>
            <label htmlFor="charName" className={labelBase}>
                their name
            </label>
            <input
                id="charName"
                name="name"
                type="text"
                autoComplete="off"
                maxLength={40}
                placeholder={placeholder}
                value={name}
                onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(false);
                }}
                className={`${fieldBase} ${nameError ? "border-rust" : ""}`}
            />
            {nameError && (
                <p className="mt-1 font-caveat  text-rust text-[0.85rem]">
                    they need a name first.
                </p>
            )}
        </div>
    );

    const colourField = (cls = "") => (
        <div className={cls}>
            <span className={labelBase}>pick a colour</span>
            <div role="radiogroup" aria-label="Character colour" className="flex gap-3 md:gap-3.5">
                {SWATCHES.map((s) => {
                    const selected = colour === s.value;
                    return (
                        <button
                            key={s.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-label={s.label}
                            onClick={() => setColour(s.value)}
                            style={{ backgroundColor: s.value }}
                            className={`relative h-9 w-9 cursor-pointer rounded-full border-2 md:h-10 md:w-10
                                        shadow-[inset_0_-3px_6px_rgba(0,0,0,0.12)] transition-transform duration-150
                                        hover:scale-[1.08] focus-visible:outline-2 focus-visible:outline-offset-2
                                        focus-visible:outline-ink ${selected ? "scale-[1.06] border-ink" : "border-transparent"
                                }`}
                        >
                            {selected && (
                                <span
                                    className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center
                                               rounded-full bg-ink font-serif text-[10px] text-cream-light
                                               md:-top-1.5 md:h-[18px] md:w-[18px] md:text-[11px]"
                                >
                                    ✓
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    const quickLineField = (cls = "") => (
        <div className={cls}>
            <label htmlFor="charLine" className={labelBase}>
                a quick line
            </label>
            <textarea
                id="charLine"
                name="quickLine"
                maxLength={200}
                placeholder="early thirties, painter, lives above the bakery, dry sense of humour."
                value={quickLine}
                onChange={(e) => setQuickLine(e.target.value)}
                className={`${fieldBase} min-h-[36px] resize-none text-[0.8rem] leading-relaxed md:min-h-[70px] md:text-[0.9rem]`}
            />
        </div>
    );

    const tonesField = (cls = "") => (
        <div className={cls}>
            <span className={labelBase}>how do they sound?</span>
            <div aria-label="Tone of voice" className="flex flex-wrap gap-1 md:gap-2">
                {TONES.map((tone) => {
                    const selected = tones.has(tone);
                    return (
                        <button
                            key={tone}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggleTone(tone)}
                            className={`cursor-pointer rounded-full px-3 py-[3px] font-caveat  text-[0.9rem] leading-normal transition-all duration-150 md:px-3.5 md:text-[0.95rem] ${selected
                                ? "border-[1.5px] border-rust-hover bg-rust font-semibold text-cream-light shadow-[0_2px_7px_rgba(37,49,94,0.35)]"
                                : "border-[1.5px] border-dashed border-ink/50 bg-transparent text-ink hover:border-solid hover:border-rust/50"
                                }`}
                        >
                            {tone}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="h-dvh w-full overflow-hidden app-gradient md:grid md:place-items-center md:px-6 md:py-5">
            <main
                className="mx-auto flex h-full w-full max-w-[440px] flex-col px-5
                           pt-[max(0.875rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]
                           md:h-auto md:max-h-full md:max-w-[760px] md:overflow-y-auto md:no-scrollbar
                           md:rounded-[28px] md:border md:border-hairline
                           md:bg-cream-light md:px-10 md:pt-7 md:pb-8
                           md:shadow-[0_24px_60px_rgba(22,34,74,0.12)]"
            >
                <div className="relative mb-[18px] flex h-9 shrink-0 items-center justify-center md:mb-2 md:h-8 md:justify-end">
                    <button
                        type="button"
                        aria-label="Go back"
                        onClick={() => navigate("/home")}
                        className="absolute left-0 grid h-9 w-9 cursor-pointer place-items-center rounded-full
                                   bg-cream-light border border-hairline text-ink-soft transition
                                   hover:brightness-95 active:scale-95 md:hidden"
                    >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 5l-7 7 7 7" />
                        </svg>
                    </button>
                    <span className="font-serif  text-ink text-[0.85rem] md:text-[0.95rem]">
                        a new character
                    </span>
                </div>

                <header className="mb-4 shrink-0 md:mb-5 md:flex md:items-end md:justify-between md:gap-6">
                    {mode === "quick" ? (
                        <>
                            <h1 className="font-display text-ink text-[1.2rem] leading-[1.28] font-medium md:text-[1.9rem] md:leading-[1.15]">
                                Someone <span className=" text-rust font-normal">new</span>
                                <br className="md:hidden" /> for the page.
                            </h1>
                            <p className="mt-1 font-serif  text-ink-soft text-[0.8rem] leading-snug md:mt-0 md:max-w-60 md:text-right md:text-[0.9rem]">
                                a name, a line, a tone. that's enough for a first scene, {firstName}.
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className="font-display text-ink text-[1.2rem] leading-[1.28] font-medium md:text-[1.9rem] md:leading-[1.15]">
                                The <span className=" text-rust font-normal">deep</span> way.
                            </h1>
                            <p className="mt-1 font-serif  text-ink-soft text-[0.8rem] leading-snug md:mt-0 md:max-w-60 md:text-right md:text-[0.9rem]">
                                add writing samples so they have a voice of their own.
                            </p>
                        </>
                    )}
                </header>

                <div
                    role="tablist"
                    aria-label="Builder mode"
                    className="mb-4 flex shrink-0 rounded-full border border-ink/25 bg-cream-light p-1 md:mb-5 md:max-w-72"
                >
                    {(["quick", "deep"] as const).map((m) => {
                        const active = mode === m;
                        return (
                            <button
                                key={m}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setMode(m)}
                                className={`flex-1 cursor-pointer rounded-full py-2 font-display  text-[0.9rem] font-medium transition-all duration-200 md:text-[0.95rem] ${active
                                    ? "bg-ink text-cream-light shadow-[0_3px_10px_rgba(22,34,74,0.25)]"
                                    : "bg-transparent text-ink-soft hover:text-ink"
                                    }`}
                            >
                                <span className={`mr-1.5 text-[0.75rem] md:text-[0.8rem] ${active ? "text-rust-light" : ""}`}>
                                    {m === "quick" ? "✎" : "★"}
                                </span>
                                {m === "quick" ? "Quick" : "Deep"}
                            </button>
                        );
                    })}
                </div>

                {/* The one boundary the product keeps everywhere: characters are
                    fiction. Someone you've lost belongs in the journal, where
                    Ember reflects on what you write instead of speaking as them. */}
                <p className="mb-4 shrink-0 font-caveat text-muted text-[0.92rem] leading-snug md:mb-5 md:text-[0.98rem]">
                    characters are fiction, always. if you want to write about a real person, or someone
                    you've lost, the{" "}
                    <button
                        type="button"
                        onClick={() => navigate("/journal/new")}
                        className="cursor-pointer text-rust underline underline-offset-2 hover:text-rust-hover"
                    >
                        journal
                    </button>{" "}
                    is the place - ember will reflect with you there, never speak as them.
                </p>

                <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col md:flex-none">
                    {mode === "quick" ? (
                        /* quick tab: on desktop, face/name/colour left, line/tones right */
                        <div
                            className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-0.5
                                       md:grid md:min-h-fit md:flex-none md:overflow-visible
                                       md:grid-cols-2 md:items-start md:gap-x-9"
                        >
                            <div>
                                {avatarField("mb-3 md:mb-5")}
                                {nameField("Devika", "mb-4 md:mb-5")}
                                {colourField("mb-4 md:mb-0")}
                            </div>

                            <div>
                                {quickLineField("mb-2 md:mb-5")}
                                {tonesField("mb-5 md:mb-0")}
                            </div>
                        </div>
                    ) : (
                        /* deep tab: the quick fields plus the dropzone and upload list */
                        <div
                            className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-0.5
                                       md:grid md:min-h-fit md:flex-none md:overflow-visible
                                       md:grid-cols-2 md:items-start md:gap-x-9"
                        >
                            <div>
                                {avatarField("mb-3 md:mb-5")}
                                {nameField("Aria", "mb-4 md:mb-5")}
                                {colourField("mb-4 md:mb-5")}
                                {quickLineField("mb-4 md:mb-0")}
                            </div>

                            <div>
                                {tonesField("mb-4 md:mb-5")}

                                <div className="mb-4 md:mb-5">
                                    <span className={labelBase}>give them a voice</span>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Upload files: drop files here or tap to browse"
                                        onClick={() => fileInputRef.current?.click()}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                fileInputRef.current?.click();
                                            }
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setDragOver(true);
                                        }}
                                        onDragLeave={() => setDragOver(false)}
                                        onDrop={onDrop}
                                        className={`cursor-pointer rounded-2xl border-2 border-dashed px-4 py-4 text-center
                                                    transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2
                                                    focus-visible:outline-rust md:py-5 ${dragOver
                                                ? "border-rust bg-rust/10"
                                                : "border-rust/60 bg-rust/5 hover:border-rust hover:bg-rust/10"
                                            }`}
                                    >
                                        <span className="block font-serif text-rust text-lg leading-none">↑</span>
                                        <p className="mt-2 font-serif text-[0.9rem]">
                                            <span className=" text-rust">drop files here</span>{" "}
                                            <span className=" text-ink">or tap</span>
                                        </p>
                                        <p className="mt-1 font-caveat  text-ink-soft text-[0.8rem]">
                                            sample dialogue, story notes, a character sheet. they'll pick up the voice.
                                        </p>
                                        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                                            {ACCEPTED.map((ext) => (
                                                <span
                                                    key={ext}
                                                    className="rounded-md border border-ink/30 bg-cream-light px-1.5 py-0.5
                                                               font-serif text-[0.65rem] text-ink-soft"
                                                >
                                                    {ext}
                                                </span>
                                            ))}
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            accept={ACCEPTED.join(",")}
                                            className="hidden"
                                            onChange={(e) => {
                                                addFiles(e.target.files);
                                                e.target.value = "";
                                            }}
                                        />
                                    </div>
                                </div>

                                {files.length > 0 && (
                                    <div className="mb-2 md:mb-0">
                                        <span className={`${labelBase} shrink-0`}>uploaded so far</span>
                                        <ul className="no-scrollbar flex max-h-[184px] flex-col gap-2 overflow-y-auto md:max-h-[248px]">
                                            {files.map((f, i) => {
                                                const badge = fileBadge(f.name);
                                                return (
                                                    <li
                                                        key={`${f.name}-${f.size}`}
                                                        className="flex shrink-0 items-center gap-3 rounded-xl border border-hairline
                                                                   bg-cream-light px-3 py-2.5 md:bg-cream"
                                                    >
                                                        <span
                                                            style={{ backgroundColor: badge.bg }}
                                                            className="grid h-8 w-8 shrink-0 place-items-center rounded-md
                                                                       font-serif text-[0.6rem] font-semibold tracking-wide text-cream-light"
                                                        >
                                                            {badge.label}
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate font-serif  text-ink text-[0.85rem] leading-snug">
                                                                {f.name}
                                                            </span>
                                                            <span className="block font-caveat  text-muted text-[0.75rem] leading-snug">
                                                                {formatSize(f.size)}
                                                            </span>
                                                        </span>
                                                        <button
                                                            type="button"
                                                            aria-label={`Remove ${f.name}`}
                                                            onClick={() => removeFile(i)}
                                                            className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full
                                                                       text-ink-soft/70 transition hover:bg-rust/10 hover:text-rust"
                                                        >
                                                            ×
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {submitError && (
                        <p className="mb-2 shrink-0 text-center font-caveat  text-rust text-[0.9rem] md:text-right">
                            {submitError}
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={!!justCreated || submitting}
                        className="mt-3 w-full shrink-0 cursor-pointer rounded-[14px] bg-rust px-8 py-3
                                   font-display  text-[1.05rem] text-cream-light
                                   shadow-[0_5px_14px_-4px_rgba(37,49,94,0.55),inset_0_-2px_0_rgba(0,0,0,0.1)]
                                   transition duration-150 hover:bg-rust-hover active:scale-[0.98]
                                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust
                                   disabled:cursor-not-allowed disabled:opacity-70
                                   md:mt-5 md:ml-auto md:block md:w-auto md:min-w-[280px] md:rounded-2xl"
                    >
                        {justCreated
                            ? `${justCreated} is on the page ✓`
                            : submitting
                                ? "bringing them in…"
                                : mode === "quick"
                                    ? "Bring them in →"
                                    : `Bring ${name.trim() || "them"} in →`}
                    </button>
                </form>
            </main>
        </div>
    );
}

export default CharacterBuilderPage;