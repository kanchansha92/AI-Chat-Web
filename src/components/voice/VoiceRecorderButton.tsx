import { useCallback, useRef, useState } from "react";
import { useVoice } from "../../hook/useVoice";
import { useVoiceRecorder } from "../../hooks/useVoiceRecorder";
import { voiceService, formatDuration } from "../../services/voiceService";
import { ApiError } from "../../services/authService";
import { refusalFrom } from "../UpgradePrompt";
import type { Refusal } from "../UpgradePrompt";
import { voiceCopy } from "../../copy";

// Say it instead of typing it. The recording becomes text in the composer -
// the person can read it, fix it and decide whether to send, exactly as if they
// had typed it. Nothing is sent to the character by voice.
//
// Where the states live:
//   idle → recording (mic held open, timer running, nothing uploaded yet)
//        → transcribing (the finished recording is with the server)
//        → idle, with the words in the composer
// A cancel at any point throws the audio away without a request.

export type RecorderSize = "sm" | "md";

function MicIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

function StopIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </svg>
  );
}

function Spinner({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return <span aria-hidden="true" className={`${className} rounded-full border-2 border-current/30 border-t-current animate-spin`} />;
}

export default function VoiceRecorderButton({
  onTranscript,
  onRefusal,
  onToast,
  disabled = false,
  size = "md",
  className = "",
}: {
  /** The transcribed words, for the composer to hold. */
  onTranscript: (text: string) => void;
  /** A refusal from the server (or from the plan) worth a sheet. */
  onRefusal: (refusal: Refusal) => void;
  /** Everything else worth a line: microphone trouble, a failed transcription. */
  onToast: (message: string) => void;
  disabled?: boolean;
  size?: RecorderSize;
  className?: string;
}) {
  const voice = useVoice();
  const [transcribing, setTranscribing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (audio: Blob) => {
      setTranscribing(true);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const out = await voiceService.speechToText(audio, controller.signal);
        const text = (out.text || "").trim();
        if (!text) onToast(voiceCopy.nothingHeard);
        else onTranscript(text);
        // The meters moved on the server - read them again rather than guess.
        voice.refreshUsage();
      } catch (e) {
        if (e instanceof ApiError) {
          const refused = refusalFrom(e);
          if (refused) onRefusal(refused);
          else onToast(e.message || voiceCopy.sttFailed);
          // A limit refusal moves nothing, but a 402/403 means the numbers on
          // screen are stale - and a success we could not read did charge.
          voice.refreshUsage();
        } else {
          onToast(voiceCopy.sttFailed);
        }
      } finally {
        abortRef.current = null;
        setTranscribing(false);
      }
    },
    [onRefusal, onToast, onTranscript, voice]
  );

  const recorder = useVoiceRecorder({
    onRecorded: (audio) => void send(audio),
    // microphone trouble goes straight out as a line the person can act on
    onError: onToast,
    maxBytes: voice.status?.maxAudioBytes,
  });

  // A server with no voice provider at all shows nothing: a microphone that can
  // only ever apologise is worse than no microphone.
  if (voice.ready && !voice.configured) return null;

  const recording = recorder.state === "recording" || recorder.state === "stopping";
  const busy = transcribing || recorder.state === "requesting" || recorder.state === "stopping";
  const box = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  const onClick = () => {
    if (disabled || busy) return;
    if (recording) {
      recorder.stop();
      return;
    }
    // Not on this plan (or not switched on): the server would say the same
    // thing, so say it here without spending a request on it.
    if (voice.refusal) {
      onRefusal(voice.refusal);
      return;
    }
    if (!recorder.supported) {
      onToast(voiceCopy.unsupported);
      return;
    }
    // start() reports microphone trouble through onError, not by throwing.
    void recorder.start();
  };

  const label = recording ? voiceCopy.stop : transcribing ? voiceCopy.transcribing : voiceCopy.record;

  return (
    <>
      {recording && (
        <div
          role="status"
          aria-live="polite"
          className="absolute left-1 bottom-[calc(100%+8px)] z-40 flex items-center gap-2.5 rounded-full border border-rust/30 bg-cream-light px-3 py-1.5 shadow-[0_18px_40px_-20px_rgba(22,34,74,0.5)] chat-pop"
        >
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-rust animate-pulse" />
          <span className="font-serif text-[0.82rem] text-ink">
            {voiceCopy.recording} <span className="tabular-nums text-ink-soft">{formatDuration(recorder.seconds)}</span>
          </span>
          <button
            type="button"
            onClick={() => recorder.stop()}
            aria-label={voiceCopy.stop}
            className="rounded-full bg-rust text-cream-soft font-serif text-[0.76rem] px-2.5 py-1 hover:bg-rust-hover active:scale-95 transition cursor-pointer"
          >
            stop
          </button>
          <button
            type="button"
            onClick={() => recorder.cancel()}
            aria-label={voiceCopy.cancel}
            className="rounded-full border border-ink/15 text-ink-soft font-serif text-[0.76rem] px-2.5 py-1 hover:bg-ink/5 transition cursor-pointer"
          >
            cancel
          </button>
        </div>
      )}
      {recording && voice.usageLabel && (
        <span className="absolute left-1 bottom-[calc(100%+46px)] z-40 rounded-full border border-hairline bg-cream-light/95 px-2.5 py-0.5 font-caveat text-[0.78rem] text-muted whitespace-nowrap">
          {voice.usageLabel}
        </span>
      )}
      {transcribing && (
        <div
          role="status"
          aria-live="polite"
          className="absolute left-1 bottom-[calc(100%+8px)] z-40 flex items-center gap-2 rounded-full border border-hairline bg-cream-light px-3 py-1.5 shadow-[0_18px_40px_-20px_rgba(22,34,74,0.5)]"
        >
          <Spinner className="h-3 w-3 text-rust" />
          <span className="font-serif text-[0.82rem] text-ink-soft">{voiceCopy.transcribing}</span>
        </div>
      )}
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-pressed={recording}
        aria-busy={busy}
        disabled={disabled || busy}
        onClick={onClick}
        className={`${box} rounded-full flex items-center justify-center shrink-0 transition active:scale-95 ${
          recording
            ? "bg-rust text-cream-soft cursor-pointer"
            : disabled || busy
              ? "border border-hairline text-ink-soft/40 cursor-default"
              : "border border-hairline text-ink-soft hover:text-ink hover:bg-ink/5 cursor-pointer"
        } ${className}`}
      >
        {transcribing ? <Spinner /> : recording ? <StopIcon /> : <MicIcon className={size === "sm" ? "h-4 w-4" : "h-[1.05rem] w-[1.05rem]"} />}
      </button>
    </>
  );
}
