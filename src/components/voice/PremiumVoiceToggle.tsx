import { useVoice } from "../../hook/useVoice";
import { usePremiumVoice } from "../../lib/voicePrefs";
import { voiceCopy } from "../../copy";

// "read replies in the warmer voice". It is only shown when the server says
// that voice exists (`premiumConfigured`), and the price it quotes is the
// server's own number - the client never works out what anything costs, and
// never deducts a credit. Turning it on only changes what the next speak
// button ASKS for.

export default function PremiumVoiceToggle({ className = "" }: { className?: string }) {
  const voice = useVoice();
  const [on, setOn] = usePremiumVoice();

  if (!voice.available || !voice.premiumAvailable) return null;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${voiceCopy.premiumLabel} — ${voiceCopy.premiumCost(voice.premiumCost)}`}
      title={voiceCopy.premiumCost(voice.premiumCost)}
      onClick={() => setOn(!on)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-serif text-[0.76rem] transition active:scale-[0.98] cursor-pointer ${
        on
          ? "border-rust/40 bg-rust/[0.08] text-rust"
          : "border-hairline text-ink-soft hover:text-ink hover:bg-ink/5"
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`h-3.5 w-6 rounded-full transition-colors ${on ? "bg-rust/70" : "bg-ink/15"} relative`}
      >
        <span
          className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-cream-light transition-[left] ${on ? "left-3" : "left-0.5"}`}
        />
      </span>
      <span>{voiceCopy.premiumLabel}</span>
      <span className="text-[0.7rem] opacity-70">{voiceCopy.premiumCost(voice.premiumCost)}</span>
    </button>
  );
}
