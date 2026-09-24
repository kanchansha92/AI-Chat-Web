import { useCallback, useEffect, useRef, useState } from "react";
import { voiceService } from "../services/voiceService";
import { ApiError } from "../services/authService";
import { voiceCopy } from "../copy";

// Playing a spoken reply, with the audio kept for as long as the tab is open.
//
// A reply asked for twice is played from memory the second time: the server
// caches the audio too (and would not charge again), but there is no reason to
// make the round trip at all. One clip plays at a time - starting another stops
// the first, because two characters talking over each other is nobody's idea of
// a feature.

export type PlaybackState = "idle" | "loading" | "playing" | "paused";

/** messageId + variant → an object URL for audio already fetched this session. */
const audioCache = new Map<string, string>();
/** The one clip currently playing anywhere in the app. */
let activeAudio: HTMLAudioElement | null = null;
let stopActive: (() => void) | null = null;

export function cacheKeyFor(messageId: string, premium: boolean): string {
  return `${messageId}:${premium ? "premium" : "standard"}`;
}

/** Drop everything held for a message (its text changed, or it was deleted). */
export function forgetSpokenReply(messageId: string): void {
  for (const key of [...audioCache.keys()]) {
    if (key.startsWith(`${messageId}:`)) {
      const url = audioCache.get(key);
      if (url) URL.revokeObjectURL(url);
      audioCache.delete(key);
    }
  }
}

/** Stop whatever is speaking right now (leaving a chat, say). */
export function stopAllPlayback(): void {
  if (stopActive) stopActive();
}

export interface VoicePlayer {
  state: PlaybackState;
  /** The message this player is busy with, if any. */
  messageId: string | null;
  /** Fetch (or reuse) the audio for a reply and start playing it. */
  play: (messageId: string, options?: { premium?: boolean }) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

export function useVoicePlayer({
  onRefused,
  onError,
}: {
  /** Called with the server's refusal so the caller can show the usual sheet. */
  onRefused?: (error: ApiError) => void;
  /** Called with anything else worth a line (playback trouble, a bad clip). */
  onError?: (message: string) => void;
} = {}): VoicePlayer {
  const [state, setState] = useState<PlaybackState>("idle");
  const [messageId, setMessageId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  // Kept in a ref (updated in an effect, never during render) so `play` does
  // not have to be rebuilt every time the caller re-renders.
  const onRefusedRef = useRef(onRefused);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onRefusedRef.current = onRefused;
    onErrorRef.current = onError;
  });

  const fail = useCallback((message: string) => {
    if (onErrorRef.current) onErrorRef.current(message);
  }, []);

  const detach = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    }
    if (activeAudio === audio) {
      activeAudio = null;
      stopActive = null;
    }
    audioRef.current = null;
  }, []);

  const stop = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    detach();
    setState("idle");
    setMessageId(null);
  }, [detach]);

  // Leaving the screen ends the audio with it.
  useEffect(() => () => {
    requestRef.current?.abort();
    detach();
  }, [detach]);

  const play = useCallback(
    async (id: string, options: { premium?: boolean } = {}) => {
      const premium = Boolean(options.premium);
      const key = cacheKeyFor(id, premium);

      // Tapping the same reply again while it plays is a pause, not a re-fetch.
      if (audioRef.current && messageId === id && state === "playing") {
        audioRef.current.pause();
        setState("paused");
        return;
      }
      if (audioRef.current && messageId === id && state === "paused") {
        void audioRef.current.play().catch(() => fail(voiceCopy.playbackFailed));
        setState("playing");
        return;
      }
      if (state === "loading") return; // one request at a time

      // Anything else speaking stops first.
      if (stopActive) stopActive();
      detach();
      setMessageId(id);

      let url = audioCache.get(key);
      if (!url) {
        setState("loading");
        const controller = new AbortController();
        requestRef.current = controller;
        try {
          const { blob } = await voiceService.textToSpeech(id, {
            premium,
            signal: controller.signal,
          });
          url = URL.createObjectURL(blob);
          audioCache.set(key, url);
        } catch (e) {
          requestRef.current = null;
          setState("idle");
          setMessageId(null);
          if (e instanceof ApiError) {
            if (e.status === 0 && controller.signal.aborted) return; // we stopped it
            if (onRefusedRef.current) onRefusedRef.current(e);
            else fail(e.message);
          } else {
            fail(voiceCopy.ttsFailed);
          }
          return;
        }
        requestRef.current = null;
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      activeAudio = audio;
      stopActive = () => {
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        activeAudio = null;
        stopActive = null;
        if (audioRef.current === audio) {
          audioRef.current = null;
          setState("idle");
          setMessageId(null);
        }
      };
      audio.onended = () => {
        if (audioRef.current !== audio) return;
        detach();
        setState("idle");
        setMessageId(null);
      };
      audio.onerror = () => {
        if (audioRef.current !== audio) return;
        detach();
        setState("idle");
        setMessageId(null);
        fail(voiceCopy.playbackFailed);
      };
      try {
        await audio.play();
        setState("playing");
      } catch {
        // Autoplay policies, a missing codec, a revoked URL.
        detach();
        setState("idle");
        setMessageId(null);
        fail(voiceCopy.playbackFailed);
      }
    },
    [detach, fail, messageId, state]
  );

  const pause = useCallback(() => {
    if (state !== "playing" || !audioRef.current) return;
    audioRef.current.pause();
    setState("paused");
  }, [state]);

  const resume = useCallback(() => {
    if (state !== "paused" || !audioRef.current) return;
    void audioRef.current.play().catch(() => fail(voiceCopy.playbackFailed));
    setState("playing");
  }, [fail, state]);

  return { state, messageId, play, pause, resume, stop };
}

/** Has this reply already been fetched in this tab? (for tests and callers) */
export function hasCachedAudio(messageId: string, premium = false): boolean {
  return audioCache.has(cacheKeyFor(messageId, premium));
}
