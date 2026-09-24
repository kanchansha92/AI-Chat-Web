import { useCallback, useEffect, useRef, useState } from "react";
import { voiceCopy } from "../copy";

// Recording, and nothing else. This hook owns the microphone, the timer and the
// bytes; it does not know the voice API exists - the caller decides what to do
// with the finished recording. That keeps the upload, the metering and the
// refusal handling in one place (components/voice/VoiceRecorderButton).
//
// Nothing is uploaded while recording: the audio only leaves the browser when
// the person stops, and a cancel throws the bytes away without sending them.

export type RecorderState = "idle" | "requesting" | "recording" | "stopping";

/** Hard ceiling, so a forgotten open microphone cannot run up an allowance. */
const MAX_SECONDS = 5 * 60;
/** Below this a recording is a slip of the finger, not speech. */
const MIN_BYTES = 1200;

export interface VoiceRecorder {
  state: RecorderState;
  /** Whole seconds recorded so far. */
  seconds: number;
  supported: boolean;
  start: () => Promise<void>;
  /** Stop and hand the audio to `onRecorded`. */
  stop: () => void;
  /** Stop and throw the audio away. */
  cancel: () => void;
}

export function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function")
  );
}

/** The best container this browser will actually give us. */
function pickMimeType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  const canCheck = typeof window.MediaRecorder?.isTypeSupported === "function";
  if (!canCheck) return undefined;
  return candidates.find((t) => window.MediaRecorder.isTypeSupported(t));
}

function messageForMicError(e: unknown): string {
  const name = (e as { name?: string })?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError") return voiceCopy.denied;
  if (name === "NotFoundError" || name === "OverconstrainedError") return voiceCopy.noMic;
  if (name === "NotReadableError" || name === "AbortError") return voiceCopy.micFailed;
  return voiceCopy.micFailed;
}

export function useVoiceRecorder({
  onRecorded,
  onError,
  maxBytes,
}: {
  /** Called once, with the finished recording, only when the person stops. */
  onRecorded: (audio: Blob, seconds: number) => void;
  /** Microphone trouble, in words a person can act on. */
  onError: (message: string) => void;
  /** The server's own ceiling (GET /api/voice/status), not a number of ours. */
  maxBytes?: number;
}): VoiceRecorder {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const discardRef = useRef(false);
  // Both callbacks live in refs, updated in an effect rather than during
  // render, so a re-rendering parent never restarts a recording in progress.
  const onRecordedRef = useRef(onRecorded);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onRecordedRef.current = onRecorded;
    onErrorRef.current = onError;
  });

  const fail = useCallback((message: string) => onErrorRef.current(message), []);

  const teardown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const stream = streamRef.current;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  // An open microphone must not survive the component that opened it.
  useEffect(() => () => teardown(), [teardown]);

  const start = useCallback(async () => {
    if (state !== "idle") return;
    if (!isRecordingSupported()) {
      fail(voiceCopy.unsupported);
      return;
    }
    setState("requesting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setState("idle");
      fail(messageForMicError(e));
      return;
    }

    let recorder: MediaRecorder;
    try {
      const mimeType = pickMimeType();
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setState("idle");
      fail(voiceCopy.micFailed);
      return;
    }

    streamRef.current = stream;
    recorderRef.current = recorder;
    chunksRef.current = [];
    discardRef.current = false;
    startedAtRef.current = Date.now();
    setSeconds(0);

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onerror = () => {
      discardRef.current = true;
      fail(voiceCopy.micFailed);
      try {
        recorder.stop();
      } catch {
        /* already stopped */
      }
    };
    recorder.onstop = () => {
      const chunks = chunksRef.current;
      const elapsed = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      const discarded = discardRef.current;
      const type = recorder.mimeType || chunks[0]?.type || "audio/webm";
      teardown();
      setState("idle");
      setSeconds(0);
      if (discarded) return;
      const blob = new Blob(chunks, { type });
      if (blob.size < MIN_BYTES) {
        fail(voiceCopy.empty);
        return;
      }
      if (maxBytes && blob.size > maxBytes) {
        fail(voiceCopy.tooBig);
        return;
      }
      onRecordedRef.current(blob, elapsed);
    };

    try {
      recorder.start();
    } catch {
      teardown();
      setState("idle");
      fail(voiceCopy.micFailed);
      return;
    }
    setState("recording");

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_SECONDS) {
        fail(voiceCopy.tooLong(MAX_SECONDS / 60));
        try {
          recorderRef.current?.stop();
        } catch {
          /* already stopped */
        }
      }
    }, 250);
  }, [fail, state, maxBytes, teardown]);

  const stop = useCallback(() => {
    if (state !== "recording") return;
    setState("stopping");
    try {
      recorderRef.current?.stop();
    } catch {
      teardown();
      setState("idle");
      fail(voiceCopy.micFailed);
    }
  }, [fail, state, teardown]);

  const cancel = useCallback(() => {
    if (state !== "recording" && state !== "stopping") return;
    discardRef.current = true;
    setState("stopping");
    try {
      recorderRef.current?.stop();
    } catch {
      teardown();
      setState("idle");
    }
  }, [state, teardown]);

  return {
    state,
    seconds,
    supported: isRecordingSupported(),
    start,
    stop,
    cancel,
  };
}

export const RECORDER_MAX_SECONDS = MAX_SECONDS;
