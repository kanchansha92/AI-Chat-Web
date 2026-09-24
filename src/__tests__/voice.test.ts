import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { voiceService, formatDuration, formatRemaining, voiceIncludedIn } from "../services/voiceService";
import type { VoiceStatus } from "../services/voiceService";
import { ApiError } from "../services/authService";
import { onNetEvent } from "../lib/netStatus";
import { refusalFrom } from "../components/UpgradePrompt";
import { getPremiumVoice, setPremiumVoice } from "../lib/voicePrefs";
import { cacheKeyFor, hasCachedAudio, forgetSpokenReply } from "../hooks/useVoicePlayer";
import { isRecordingSupported } from "../hooks/useVoiceRecorder";

// The client half of voice, without a browser: what is actually sent, what is
// done with what comes back, and which refusals reach the upgrade sheet.
// Anything that decides an allowance, a credit or a limit is the server's
// (backend/test/voice.test.js) - nothing here can grant a single second.

const store = new Map<string, string>();
const localStorageShim = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
};

let calls: { url: string; init: RequestInit }[] = [];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function audioResponse(bytes = "fake-mp3") {
  return new Response(new Blob([bytes], { type: "audio/mpeg" }), {
    status: 200,
    headers: { "content-type": "audio/mpeg" },
  });
}

function mockFetch(handler: (url: string, init: RequestInit) => Response) {
  vi.stubGlobal("fetch", async (url: string | URL, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init);
  });
}

const status: VoiceStatus = {
  configured: true,
  premiumConfigured: false,
  provider: "openai",
  reason: null,
  maxChars: 2000,
  maxAudioBytes: 10 * 1024 * 1024,
  voices: ["alloy", "nova"],
  defaultVoice: "alloy",
  limits: { voiceMinutesPerMonth: 60, spokenRepliesPerMonth: 100, premiumVoiceCost: 1 },
};

beforeEach(() => {
  calls = [];
  store.clear();
  vi.stubGlobal("localStorage", localStorageShim);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("voiceService", () => {
  it("reads the status the server sends, and keeps no limits of its own", async () => {
    mockFetch(() => jsonResponse(status));
    const got = await voiceService.getVoiceStatus();
    expect(got.limits.voiceMinutesPerMonth).toBe(60);
    expect(calls[0].url).toMatch(/\/voice\/status$/);
    // Every number shown comes from this object - a plan with 0 minutes is how
    // "voice is not on this plan" is recognised.
    expect(voiceIncludedIn(got)).toBe(true);
    expect(voiceIncludedIn({ ...got, limits: { ...got.limits, voiceMinutesPerMonth: 0 } })).toBe(false);
    expect(voiceIncludedIn(null)).toBe(false);
  });

  it("sends a recording as multipart, and sends no duration of its own", async () => {
    mockFetch(() => jsonResponse({ text: "Explain React hooks.", seconds: 5 }));
    const out = await voiceService.speechToText(new Blob(["x"], { type: "audio/webm" }));
    expect(out).toEqual({ text: "Explain React hooks.", seconds: 5 });

    const { url, init } = calls[0];
    expect(url).toMatch(/\/voice\/stt$/);
    expect(init.method).toBe("POST");
    const body = init.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect([...body.keys()]).toEqual(["audio"]);
    // the browser's own idea of how long it was is never part of the request
    expect([...body.keys()]).not.toContain("seconds");
    const file = body.get("audio") as File;
    expect(file.name).toBe("recording.webm");
  });

  it("names the recording after what the browser actually produced", async () => {
    mockFetch(() => jsonResponse({ text: "hi", seconds: 1 }));
    await voiceService.speechToText(new Blob(["x"], { type: "audio/ogg;codecs=opus" }));
    await voiceService.speechToText(new Blob(["x"], { type: "audio/mp4" }));
    const names = calls.map((c) => ((c.init.body as FormData).get("audio") as File).name);
    expect(names).toEqual(["recording.ogg", "recording.m4a"]);
  });

  it("speaks a message by id - never by text - and hands back the audio", async () => {
    mockFetch(() => audioResponse());
    const out = await voiceService.textToSpeech("11111111-1111-4111-8111-111111111111", { premium: true });
    expect(out.mimeType).toBe("audio/mpeg");
    expect(await out.blob.text()).toBe("fake-mp3");

    const { url, init } = calls[0];
    expect(url).toMatch(/\/voice\/tts$/);
    const sent = JSON.parse(init.body as string);
    expect(sent).toEqual({ messageId: "11111111-1111-4111-8111-111111111111", premium: true });
    expect(sent.text).toBeUndefined();
  });

  it("leaves premium out of the request unless it was asked for", async () => {
    mockFetch(() => audioResponse());
    await voiceService.textToSpeech("abc");
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ messageId: "abc" });
  });

  it("treats a 200 that is not audio as a provider miss", async () => {
    mockFetch(() => jsonResponse({ nothing: true }));
    await expect(voiceService.textToSpeech("abc")).rejects.toMatchObject({
      code: "VOICE_PROVIDER_ERROR",
    });
  });

  it("passes the server's refusal through as an ApiError with its code", async () => {
    mockFetch(() =>
      jsonResponse(
        { error: { code: "PLAN_LIMIT", metric: "SPOKEN_REPLIES", limit: 100, used: 100, message: "- no spoken replies left this month." } },
        403
      )
    );
    const err = await voiceService.textToSpeech("abc").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
    expect(err.code).toBe("PLAN_LIMIT");
  });
});

describe("a feature that is switched off does not take the app down with it", () => {
  it("does not send a coded 503 to the maintenance page", async () => {
    const seen: string[] = [];
    const off = onNetEvent((e) => {
      if (e.type === "redirect") seen.push(e.to);
    });
    mockFetch(() => jsonResponse({ error: { code: "VOICE_UNAVAILABLE", message: "- voice is not switched on here yet." } }, 503));
    const err = await voiceService.getVoiceStatus().catch((e) => e);
    expect(err.code).toBe("VOICE_UNAVAILABLE");
    expect(seen).toEqual([]);
    off();
  });

  it("still sends a bare 503 there - that one really is the server", async () => {
    const seen: string[] = [];
    const off = onNetEvent((e) => {
      if (e.type === "redirect") seen.push(e.to);
    });
    mockFetch(() => new Response("<html>gateway</html>", { status: 503 }));
    await voiceService.getVoiceStatus().catch(() => undefined);
    expect(seen).toEqual(["/maintenance"]);
    off();
  });
});

describe("refusals reach the upgrade sheet", () => {
  const refusal = (code: string, status: number, extra: Record<string, unknown> = {}) =>
    refusalFrom(new ApiError("- no.", status, undefined, code, { error: { code, ...extra } }));

  it("recognises every way voice can be refused", () => {
    expect(refusal("PLAN_FEATURE", 403, { feature: "VOICE", upgradeTo: "BASIC" })).toMatchObject({
      code: "PLAN_FEATURE",
      feature: "VOICE",
      upgradeTo: "BASIC",
    });
    expect(refusal("PLAN_LIMIT", 403, { metric: "VOICE_SECONDS" })).toMatchObject({ metric: "VOICE_SECONDS" });
    expect(refusal("CREDITS_REQUIRED", 402, { needed: 1, balance: 0 })).toMatchObject({ needed: 1 });
    expect(refusal("SUBSCRIPTION_PAST_DUE", 403)).toMatchObject({ code: "SUBSCRIPTION_PAST_DUE" });
    expect(refusal("VOICE_UNAVAILABLE", 503)).toMatchObject({ code: "VOICE_UNAVAILABLE" });
  });

  it("leaves anything else to the ordinary error path", () => {
    expect(refusal("INVALID_AUDIO", 400)).toBeNull();
    expect(refusal("VOICE_PROVIDER_ERROR", 502)).toBeNull();
    expect(refusalFrom(new Error("network"))).toBeNull();
  });
});

describe("the premium-voice preference", () => {
  it("is remembered, and is only ever a request - never a charge", () => {
    expect(getPremiumVoice()).toBe(false);
    setPremiumVoice(true);
    expect(getPremiumVoice()).toBe(true);
    expect(store.get("ember_voice_premium_v1")).toBe("1");
    setPremiumVoice(false);
    expect(getPremiumVoice()).toBe(false);
    expect(store.has("ember_voice_premium_v1")).toBe(false);
  });
});

describe("spoken audio is kept per message and per variant", () => {
  it("tells the two voices apart and forgets a message on demand", () => {
    expect(cacheKeyFor("m1", false)).toBe("m1:standard");
    expect(cacheKeyFor("m1", true)).toBe("m1:premium");
    expect(hasCachedAudio("m1")).toBe(false);
    // nothing has been played, so forgetting is a no-op rather than a throw
    forgetSpokenReply("m1");
    expect(hasCachedAudio("m1")).toBe(false);
  });
});

describe("plain helpers", () => {
  it("shows time the way a person reads it", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(8)).toBe("0:08");
    expect(formatDuration(95)).toBe("1:35");
    expect(formatDuration(755)).toBe("12:35");
  });

  it("says what is left the way a person would", () => {
    expect(formatRemaining(12000)).toBe("200 min");
    expect(formatRemaining(600)).toBe("10 min");
    expect(formatRemaining(599)).toBe("9:59");
    expect(formatRemaining(45)).toBe("0:45");
    expect(formatRemaining(0)).toBe("0:00");
  });

  it("knows recording is not possible without a browser that can", () => {
    // node has no MediaRecorder: the button says so instead of failing later
    expect(isRecordingSupported()).toBe(false);
  });
});
