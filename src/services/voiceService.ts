import { request, requestFile, authHeader, ApiError } from "./authService";

// The voice API, through the app's own fetch layer (services/authService), so
// voice gets the same token, the same timeout, the same 401 handling and the
// same ApiError shape as everything else. Nothing about a provider, a key or a
// model is known here: the client only ever talks to our backend.
//
// Two things only:
//   POST /api/voice/stt   a recording  → text (the server measures and meters it)
//   POST /api/voice/tts   a messageId  → audio for that stored reply
//
// GET /api/voice/status says whether voice is switched on at all, what this
// plan allows, and which voices may be asked for. Every number here comes from
// the server; the client holds no limits of its own, and the API still refuses
// anything a plan does not allow.

export interface VoiceLimits {
  /** 0 = voice is not part of this plan. */
  voiceMinutesPerMonth: number;
  spokenRepliesPerMonth: number;
  /** Credits one premium spoken reply costs (server-side truth, shown as-is). */
  premiumVoiceCost: number;
}

export interface VoiceStatus {
  configured: boolean;
  premiumConfigured: boolean;
  provider: string | null;
  /** Why voice is off, in the server's words. Null when it is on. */
  reason: string | null;
  maxChars: number;
  maxAudioBytes: number;
  voices: string[];
  defaultVoice: string | null;
  limits: VoiceLimits;
}

export interface Transcription {
  text: string;
  /** What the server measured and metered. Shown, never calculated here. */
  seconds: number;
}

export interface SpokenReply {
  blob: Blob;
  mimeType: string;
}

export interface SpeakOptions {
  premium?: boolean;
  voice?: string;
  format?: "mp3" | "wav";
  signal?: AbortSignal;
}

/** A recording the browser produced, named so the server can sniff it safely. */
function filenameFor(blob: Blob): string {
  const type = (blob.type || "").toLowerCase();
  if (type.includes("ogg")) return "recording.ogg";
  if (type.includes("wav")) return "recording.wav";
  if (type.includes("mpeg") || type.includes("mp3")) return "recording.mp3";
  if (type.includes("mp4") || type.includes("m4a") || type.includes("aac")) return "recording.m4a";
  return "recording.webm";
}

export const voiceService = {
  /** Is voice on, and what does this plan allow? */
  getVoiceStatus(): Promise<VoiceStatus> {
    return request<VoiceStatus>(`/voice/status`, { headers: authHeader() });
  },

  /**
   * Send a finished recording for transcription. The browser's own duration is
   * never sent: the backend measures the audio and meters it, and that is the
   * only number anyone is billed on.
   */
  async speechToText(audio: Blob, signal?: AbortSignal): Promise<Transcription> {
    const form = new FormData();
    form.append("audio", audio, filenameFor(audio));
    return request<Transcription>(`/voice/stt`, {
      method: "POST",
      headers: authHeader(),
      body: form,
      ...(signal ? { signal } : {}),
    });
  },

  /**
   * Speak a stored reply. The server reads the text from the message itself
   * (so only a reply you own can be spoken) and answers with audio bytes.
   */
  async textToSpeech(messageId: string, options: SpeakOptions = {}): Promise<SpokenReply> {
    const body: Record<string, unknown> = { messageId };
    if (options.premium) body.premium = true;
    if (options.voice) body.voice = options.voice;
    if (options.format) body.format = options.format;

    const res = await requestFile(`/voice/tts`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(body),
      ...(options.signal ? { signal: options.signal } : {}),
    });
    if (res.kind !== "file") {
      // A 200 that is not audio should not happen; treat it as a provider miss
      // rather than handing an empty <audio> to the player.
      throw new ApiError("- the voice did not come back. try again?", 502, undefined, "VOICE_PROVIDER_ERROR");
    }
    return { blob: res.blob, mimeType: res.blob.type || "audio/mpeg" };
  },
};

/** Seconds → "12:35". Used for the recorder's timer and for what is left. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * What is left, the way a person says it: minutes while there is plenty,
 * m:ss once it is down to the last few. "200:00" is not how anyone reads
 * three and a bit hours.
 */
export function formatRemaining(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s >= 600) return `${Math.floor(s / 60)} min`;
  return formatDuration(s);
}

/**
 * Whether voice can be used at all, from the server's answer alone.
 * `limits.voiceMinutesPerMonth` is 0 on a plan without voice - the same number
 * the API enforces, so nothing is hardcoded here or anywhere else.
 */
export function voiceIncludedIn(status: VoiceStatus | null): boolean {
  return Boolean(status && status.limits.voiceMinutesPerMonth > 0);
}
