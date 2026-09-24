import { useVoice } from "../../hook/useVoice";
import { useVoicePlayer } from "../../hooks/useVoicePlayer";
import { usePremiumVoice } from "../../lib/voicePrefs";
import { refusalFrom } from "../UpgradePrompt";
import type { Refusal } from "../UpgradePrompt";
import { ApiError } from "../../services/authService";
import { voiceCopy } from "../../copy";

// Hear a reply read out. The button addresses the message by its id: the
// server reads the text from the message itself, so only a reply the person
// owns can ever be spoken, and the audio it makes is kept - tapping again
// plays what is already here instead of asking for it twice.

function SpeakerIcon({ className = "h-[0.95rem] w-[0.95rem]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5.5 6.8 9H4.5A1.5 1.5 0 0 0 3 10.5v3A1.5 1.5 0 0 0 4.5 15h2.3L11 18.5z" />
      <path d="M15.2 9.2a4 4 0 0 1 0 5.6" />
      <path d="M17.8 6.6a7.6 7.6 0 0 1 0 10.8" />
    </svg>
  );
}

function PauseIcon({ className = "h-[0.95rem] w-[0.95rem]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <rect x="7" y="6" width="3.4" height="12" rx="1.2" />
      <rect x="13.6" y="6" width="3.4" height="12" rx="1.2" />
    </svg>
  );
}

function PlayIcon({ className = "h-[0.95rem] w-[0.95rem]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 5.6v12.8a1 1 0 0 0 1.52.85l10-6.4a1 1 0 0 0 0-1.7l-10-6.4A1 1 0 0 0 8 5.6z" />
    </svg>
  );
}

function Spinner({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return <span aria-hidden="true" className={`${className} rounded-full border-2 border-current/30 border-t-current animate-spin`} />;
}

export default function VoicePlayButton({
  messageId,
  onRefusal,
  onToast,
  className = "",
  disabled = false,
}: {
  messageId: string;
  onRefusal: (refusal: Refusal) => void;
  onToast: (message: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const voice = useVoice();
  const [premium] = usePremiumVoice();
  const player = useVoicePlayer({
    onRefused: (e: ApiError) => {
      const refused = refusalFrom(e);
      if (refused) onRefusal(refused);
      else onToast(e.message || voiceCopy.ttsFailed);
      // Something was (or was not) charged - read the meters again.
      voice.refreshUsage();
    },
    onError: onToast,
  });

  // Nothing to offer when the server has no voice provider at all.
  if (voice.ready && !voice.configured) return null;

  const mine = player.messageId === messageId;
  const loading = mine && player.state === "loading";
  const playing = mine && player.state === "playing";
  const paused = mine && player.state === "paused";

  const label = loading
    ? voiceCopy.generating
    : playing
      ? voiceCopy.pause
      : paused
        ? voiceCopy.resume
        : voiceCopy.speak;

  const onClick = () => {
    if (disabled || loading) return;
    if (playing) {
      player.pause();
      return;
    }
    if (paused) {
      player.resume();
      return;
    }
    if (voice.refusal) {
      onRefusal(voice.refusal);
      return;
    }
    const usePremium = premium && voice.premiumAvailable;
    void player.play(messageId, { premium: usePremium }).then(() => {
      // A generated reply moves both meters (and a credit, if it was premium).
      voice.refreshUsage();
    });
  };

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={playing}
      aria-busy={loading}
      disabled={disabled || loading}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`h-7 w-7 rounded-full flex items-center justify-center transition active:scale-95 ${
        playing || paused ? "text-rust bg-rust/10" : "text-ink-soft/60 hover:text-rust hover:bg-ink/[0.06]"
      } ${disabled || loading ? "cursor-default" : "cursor-pointer"} ${className}`}
    >
      {loading ? <Spinner /> : playing ? <PauseIcon /> : paused ? <PlayIcon /> : <SpeakerIcon />}
    </button>
  );
}
