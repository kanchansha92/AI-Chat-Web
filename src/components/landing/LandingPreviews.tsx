import type { ReactNode } from "react";
import CharacterFace from "../CharacterFace";
import { Typed } from "./motion";

/* Small, static pictures of the four rooms, for the signed-out landing page.
   They are built from the same classes the real screens use (chat-bubble-you,
   chat-bubble-them, paper, ruled), so they change with the theme tokens and
   never drift into a look the app doesn't have. Nothing here is interactive
   and nothing is fetched - they're illustrations, marked aria-hidden so a
   screen reader hears the section copy instead of a fake conversation. */

function Frame({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div
            aria-hidden="true"
            className="paper rounded-[1.4rem] overflow-hidden w-full select-none"
        >
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-hairline/80">
                <span className="h-2 w-2 rounded-full bg-hairline" />
                <span className="h-2 w-2 rounded-full bg-hairline" />
                <span className="h-2 w-2 rounded-full bg-hairline" />
                <span className="ml-2 font-caveat text-muted text-[0.8rem] truncate">{label}</span>
            </div>
            <div className="px-4 sm:px-5 py-4 sm:py-5">{children}</div>
        </div>
    );
}

function You({ children }: { children: ReactNode }) {
    return (
        <div className="flex justify-end">
            <p className="chat-bubble-you max-w-[85%] rounded-[1.1rem] rounded-br-md px-3.5 py-2 font-serif text-[0.86rem] leading-[1.5]">
                {children}
            </p>
        </div>
    );
}

function Them({ children, who }: { children: ReactNode; who?: { name: string; colour: string } }) {
    return (
        <div className="flex items-end gap-2">
            {who && (
                <CharacterFace
                    name={who.name}
                    colour={who.colour}
                    className="h-6 w-6 shrink-0 text-[0.7rem]"
                />
            )}
            <div className="max-w-[85%]">
                {who && <p className="font-caveat text-muted text-[0.75rem] mb-0.5 ml-1">{who.name}</p>}
                <p className="chat-bubble-them text-ink rounded-[1.1rem] rounded-bl-md px-3.5 py-2 font-serif text-[0.86rem] leading-[1.5]">
                    {children}
                </p>
            </div>
        </div>
    );
}

function Chip({ children }: { children: ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-cream px-2.5 py-1 font-serif text-[0.74rem] text-ink-soft">
            {children}
        </span>
    );
}

export function GeneralChatPreview() {
    return (
        <Frame label="general chat">
            <div className="flex flex-col gap-2.5">
                <You>help me say no to a wedding invite without sounding cold?</You>
                <Them>
                    <Typed text="Keep it warm and short. Something like: “I’m so happy for you both. I can’t be there on the day, but I’d love to take you to dinner when you’re back.”" />
                </Them>
                <div className="flex flex-wrap gap-1.5 pt-1">
                    <Chip>✦ imagine</Chip>
                    <Chip>premium reply</Chip>
                    <Chip>attach a pdf</Chip>
                </div>
            </div>
        </Frame>
    );
}

export function JournalPreview() {
    return (
        <Frame label="journal · the year I moved">
            <p className="font-caveat text-rust text-[0.85rem] leading-none">thursday, 11:40 pm</p>
            <div className="ruled mt-2 font-serif text-ink-soft text-[0.88rem] leading-[2rem]">
                <p>Unpacked the last box today. Found amma’s recipe card for rasam in a book.</p>
                <p>I didn’t cry, which surprised me. I just made it, badly, and ate it standing up.</p>
            </div>
            <div className="mt-3 rounded-[1rem] border border-dashed border-hairline bg-cream/70 px-3.5 py-3">
                <p className="font-caveat text-muted text-[0.78rem]"> a reflection, only because you asked</p>
                <p className="font-serif text-ink text-[0.85rem] leading-[1.55] mt-1">
                    <Typed text="Making it “badly” still sounds like keeping her close. What would you want to remember about how she made it?" />
                </p>
            </div>
        </Frame>
    );
}

export function CharacterPreview() {
    const mira = { name: "Mira", colour: "#8a7f9e" };
    return (
        <Frame label="character · Mira">
            <div className="flex items-center gap-3 pb-3 mb-3 border-b border-hairline/70">
                <CharacterFace name={mira.name} colour={mira.colour} className="h-10 w-10 text-[0.95rem]" />
                <div className="min-w-0">
                    <p className="font-display text-ink text-[0.98rem] leading-tight">Mira</p>
                    <p className="font-serif text-muted text-[0.76rem] truncate">lighthouse keeper, malabar coast, 1924</p>
                </div>
                <span className="ml-auto shrink-0 rounded-full border border-hairline px-2 py-0.5 font-caveat text-[0.72rem] text-muted">
                    fiction
                </span>
            </div>
            <div className="flex flex-col gap-2.5">
                <Them who={mira}>You came back before the storm. Did you bring the lamp oil, or only more questions?</Them>
                <You>only questions. what did you see out there last night?</You>
                <Them who={mira}>
                    <Typed text="A ship with no lights. You said you were afraid of the sea  so I’ll tell it gently." />
                </Them>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
                <Chip>remembers · you’re afraid of the sea</Chip>
                <Chip>story 2 of 3</Chip>
            </div>
        </Frame>
    );
}

export function GroupPreview() {
    const arjun = { name: "Arjun", colour: "#7a8f86" };
    const leela = { name: "Leela", colour: "#a48a78" };
    const dev = { name: "Dev", colour: "#6f7c93" };
    return (
        <Frame label="group room · monsoon tea stall">
            <div className="flex items-center gap-3 pb-3 mb-3 border-b border-hairline/70">
                <div className="flex -space-x-2">
                    {[arjun, leela, dev].map((c) => (
                        <CharacterFace
                            key={c.name}
                            name={c.name}
                            colour={c.colour}
                            className="h-8 w-8 text-[0.8rem] ring-2 ring-[var(--color-cream-light)]"
                        />
                    ))}
                </div>
                <p className="font-serif text-muted text-[0.78rem] leading-snug min-w-0">
                    <span className="text-ink-soft">scene:</span> the last stall open on a flooded road, 2 am
                </p>
            </div>
            <div className="flex flex-col gap-2.5">
                <Them who={arjun}>Three cutting chais. And whatever she’s having  she looks like she’s run from something.</Them>
                <Them who={leela}>I’ve run from nothing. I’m early for something.</Them>
                <You>*sets a wet envelope on the counter* for whichever of you is Dev.</You>
                <Them who={dev}>
                    <Typed text="…Nobody’s called me that in eleven years." delay={900} />
                </Them>
            </div>
        </Frame>
    );
}
