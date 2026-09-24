/* User-facing strings from ember-content-brief §9, verbatim, mirroring the
   backend's lib/copy.js. Import from here instead of inlining error text. */

/* §9.1 form validation */
export const formCopy = {
  email: {
    empty: "email, please.",
    malformed: "that doesn't look like an email yet.",
    taken: "there's already an account with this email.",
  },
  // password rules differ between signup (strength checked) and login (match).
  passwordSignup: {
    empty: "password, please.",
    tooShort: "at least 10 characters.",
    tooObvious: "too obvious. mix in a number, maybe?",
  },
  passwordLogin: {
    empty: "password, please.",
    noMatch: "that email and password don't match.",
  },
  name: {
    empty: "a name to call you by?",
    tooLong: "that's a lot of characters. shorten it?",
  },
  dob: {
    empty: "birth date, please.",
    invalid: "that date doesn't look right.",
    // §12.3 - absolute age gate. Matches ageGateCopy.underage / backend copy.js.
    underage: "privateaile is 18 only. try again in a few years.",
  },
} as const;

/* §9.2 network errors */
export const networkCopy = {
  offline: "you're offline. things might be quieter than usual.",
  slow: "this is taking a moment.", // inline, after 4s
  failedMidStream: "connection slipped. try again?", // inline bubble, Retry / Skip
  // A request the server accepted and then never answered. Kept distinct from
  // failedMidStream so "it went quiet" doesn't read to the user as "you're offline".
  tookTooLong: "that took too long. try again?",
  serverError: "something on our end. we know about it.",
  rateLimited: "a lot of messages, very fast. give it a second.",
} as const;

/* §9.3 server errors (full screen) */
export const serverErrorCopy = {
  notFound: {
    headline: "That page isn't here.",
    body: "try going home. or just go back.",
  },
  serverError: {
    headline: "Something on our end.",
    body: "we know. we're looking. it's probably a few minutes.",
  },
  maintenance: {
    headline: "We're patching things.",
    body: "back in a bit. follow @privateaile for updates.",
  },
  rateLimited: {
    headline: "Slow down a moment.",
    body: "a lot of requests, very fast. five minutes should clear it.",
  },
} as const;

/* §9.4 payment errors */
export const paymentCopy = {
  declined: "that card was declined. try another? UPI usually works.",
  threeDSFailed: "the bank check didn't complete. try again, or pick UPI.",
  insufficientFunds: "not enough on the card. another method?",
  expired: "that card's expired. add a new one?",
  generic: "that payment didn't go through. nothing was charged.",
} as const;

/* §9.5 chat-specific errors */
export const chatErrorCopy = {
  characterDeleted: "this character was deleted.",
  memoryLimit: "they remember a lot already. forget some old facts to make room?",
  streamingAborted: "that response was cut short.",
  finishIt: "finish it?",
  // c.1 - the thread arrives a page at a time; these belong to the control
  // above the oldest message held.
  loadOlder: "earlier messages",
  loadingOlder: "reading back…",
  loadOlderFailed: "couldn't reach further back. try again?",
  threadStart: "this is where it started.",
} as const;

/* §12. Moderation-pause copy (§12.1 / §12.2) is server-sent, see
   chatService#Moderation; the client owns the rest. */

/* §12.3 age gate */
export const ageGateCopy = {
  // Absolute - no bypass. The DOB stays as entered, only the button greys out.
  underage: "privateaile is 18 only. try again in a few years.",
} as const;

/* §12.4 trial ending */
/* The optional 15-day Basic trial. The reminders here land on the same days
   the backend emails them (config/plans.js TRIAL.reminderDays), so the two
   never say different things. */
export const trialCopy = {
  banner: (days: number) => `${days} ${days === 1 ? "day" : "days"} of your Basic trial left.`,
  bannerLastDay: "last day of your Basic trial.",
  bannerCta: "keep or cancel →",
  offer: {
    headline: "Try Basic for 15 days.",
    body: "₹0 today. you add a card or UPI to set it up, we remind you on day 12 and day 14, and it only becomes a plan if you leave it running.",
    primary: "start the trial",
    cancel: "not now",
  },
  paywall: {
    headline: "That one's on a paid plan.",
    body: "your characters, journal and conversations stay exactly as they are either way - this just opens more room.",
    primary: "see plans",
    cancel: "not now",
  },
  locked: "on a paid plan",
} as const;

/* §12.5 account deletion (3-step) */
export const deletionCopy = {
  confirm: {
    headline: "Delete everything?",
    body: "your account, your characters, your journal, your conversations. a 30-day grace period sign back in any time before that and it all comes back. after 30 days, nothing recovers.",
    primary: "start deletion",
    cancel: "keep my account",
  },
  typeToConfirm: {
    headline: "One last check.",
    body: "type delete my account below to confirm.",
    phrase: "delete my account",
    confirm: "Confirm",
  },
  // step 3 - final full-screen state. {date} -> the grace-end date.
  done: {
    headline: "Gone.",
    body: "your account is scheduled for deletion in 30 days. sign in any time before {date} to undo it. after that, every trace of it is removed. take care.",
    close: "Close",
  },
  failed: "that didn't go through. try again?",
} as const;

/* §12.6 reporting a character / response */
export const reportCopy = {
  headline: "Tell us what's off.",
  sub: "we read these. a real person does.",
  // value maps to the backend ReportReason enum
  reasons: [
    { value: "IMPERSONATION", label: "they impersonated a real person" },
    { value: "SEXUAL", label: "sexual content" },
    { value: "VIOLENCE", label: "violence or harm" },
    { value: "PRETENDED_HUMAN", label: "they pretended to be human" },
    { value: "OTHER", label: "something else" },
  ],
  notePlaceholder: "anything else worth knowing?",
  send: "Send report",
  cancel: "cancel",
  sent: "thank you. we'll look at it.",
  failed: "that didn't send. try again?",
} as const;

/* §12.7 data export (2-step) */
export const exportCopy = {
  confirm: {
    headline: "All yours.",
    body: "we'll pack your account into a JSON file characters, conversations, journal, settings. ready in five minutes, usually. we'll email you when it's done.",
    button: "Generate export",
  },
  requested: "packing it up. we'll email you.",
  failed: "that didn't go through. try again?",
} as const;

/* help & support */
export type HelpTopic = "account" | "billing" | "data" | "safety" | "app";

export const helpCopy = {
  headline: "How can we help?",
  sub: "faqs first. if that doesn't cover it, we're a real inbox away.",
  search: {
    placeholder: "search the faqs…",
    clear: "clear",
    // {n} -> number of matches
    results: "{n} answers",
    resultOne: "1 answer",
    empty: {
      headline: "Nothing on that yet.",
      body: "try fewer words, or just write to us below. a real person will answer.",
      action: "ask us instead",
    },
  },
  topics: {
    label: "browse by topic",
    all: "everything",
    names: {
      account: "account",
      billing: "plan & billing",
      data: "data & privacy",
      safety: "safety",
      app: "using privateaile",
    } as Record<HelpTopic, string>,
  },
  quickActions: {
    label: "quick things",
    items: [
      { key: "privacy", title: "Privacy policy", sub: "what we store, and what leaves our servers", to: "/settings/legal#privacy" },
      { key: "billing", title: "Plan & billing", sub: "see your tier, change it, or check a charge", to: "/settings/billing" },
      { key: "export", title: "Export your data", sub: "a JSON of everything you've written", to: "/settings/export" },
      { key: "profile", title: "Your profile", sub: "name, birth date, the basics", to: "/settings/profile" },
      { key: "delete", title: "Delete account", sub: "30-day grace. it all comes back if you return", to: "/settings/delete" },
    ],
  },
  faqs: [
    {
      topic: "app" as HelpTopic,
      q: "How do I change my theme?",
      a: "settings → preferences → theme. paper (cream, by daylight) or lamplight (warm brown, by night) it switches instantly, no reload.",
    },
    {
      topic: "account" as HelpTopic,
      q: "Can I get my data back after deleting my account?",
      a: "yes for 30 days. sign back in any time before the grace period ends and everything returns: characters, journal, conversations, all of it.",
    },
    {
      topic: "data" as HelpTopic,
      q: "How do I export everything I've written?",
      a: "settings → privacy → export your data. we pack it into a JSON file and email you a link, usually within five minutes.",
    },
    {
      topic: "billing" as HelpTopic,
      q: "I was charged but my plan didn't update.",
      a: "give it a minute most payments confirm almost instantly. if plan & billing still shows the old tier after that, email us with the date and we'll sort it.",
    },
    {
      topic: "billing" as HelpTopic,
      q: "What happens when my story-room trial ends?",
      a: "rooms with several characters, and scene-setting, move behind Plus. your characters, your journal and every conversation stay exactly where they are, whatever you decide.",
    },
    {
      topic: "safety" as HelpTopic,
      q: "How do I report a character or a response?",
      a: "there's a report option on any character or message. we read every one a real person, not a filter.",
    },
    /* This answer used to end "nothing you write is sold, shared, or used to
       train anything". The first and last are true; "shared" was not - writing
       a reply means sending the conversation to an AI provider, every turn
       (PRIVACY.md §3.1). An FAQ that contradicts the privacy policy is worse
       than no FAQ, so it says the same thing the policy does and links to it. */
    {
      topic: "data" as HelpTopic,
      q: "Who can read my conversations?",
      a: "you, and us - they're stored as ordinary text in our database, not end-to-end encrypted. if you report something, the person reviewing that report sees the message. and to write a reply at all, the conversation is sent to the AI company that generates it. nothing you write is sold, and nothing is used for advertising. the privacy policy has the full picture.",
    },
    {
      topic: "data" as HelpTopic,
      q: "Where do my words actually go?",
      a: "the privacy policy says it plainly - what we store, what leaves our servers, how long any of it lives, and who can read it. settings → privacy → privacy policy, or privateaile.app/legal.",
    },
    {
      topic: "account" as HelpTopic,
      q: "I forgot my password.",
      a: "on the sign-in page, tap forgot password. we'll email a reset link it's good for an hour.",
    },
    {
      topic: "app" as HelpTopic,
      q: "A character forgot something they used to know.",
      a: "each character keeps a small set of facts about you only what you've shared. open their page and forget a few older ones to make room for new ones.",
    },
    {
      topic: "safety" as HelpTopic,
      q: "Can Privateaile speak as someone I've lost?",
      a: "no, and it won't. you can write about them in the journal what they said, how they were, what you'd tell them and privateaile will reflect with you on what you wrote. it never pretends to be a real person, living or gone. characters are fiction, always.",
    },
    {
      topic: "app" as HelpTopic,
      q: "Are there streaks, points or reminders?",
      a: "none. privateaile doesn't count your days, score your writing, or send notifications to bring you back. come when you want to, leave when you're done.",
    },
    {
      topic: "safety" as HelpTopic,
      q: "Is anyone actually reading support emails?",
      a: "yes. no ticket queue, no bot reply a real person, usually within a day.",
    },
  ],
  contact: {
    kicker: "still stuck",
    headline: "Write to us.",
    body: "tell us what happened. a real person reads it, usually within a day.",
    button: "email support",
    address: "care@privateaile.com",
    form: {
      subjectLabel: "what's it about",
      subjectPlaceholder: "a few words",
      messageLabel: "what happened",
      messagePlaceholder: "as much or as little as you like. dates help, if it's about a charge.",
      send: "send it over",
      hint: "opens in your mail app, addressed to us.",
      missing: "a line or two about what happened, please.",
    },
  },
  footer: "privateaile · a quiet place to think, write, remember, and create.",
} as const;

/* Voice: dictation into the composer, and hearing a reply read back.
   Every refusal the SERVER sends already carries its own sentence
   (lib/errors.js), so these are only for what happens in the browser -
   microphones, permissions, playback - plus the one thing the client can
   answer without asking: a plan that has no voice at all. */
export const voiceCopy = {
  record: "Record a voice note",
  recording: "recording",
  stop: "Stop recording",
  cancel: "Discard recording",
  transcribing: "writing that down…",
  speak: "Speak this reply",
  speakShort: "Speak",
  generating: "finding their voice…",
  playing: "Playing",
  pause: "Pause",
  resume: "Resume",
  premiumLabel: "premium voice",
  premiumCost: (credits: number) => `${credits} credit${credits === 1 ? "" : "s"} each time`,
  premiumOff: "the warmer voice isn't switched on here yet.",
  // browser-side trouble, in plain words
  unsupported: "this browser can't record. try chrome, edge or firefox?",
  denied: "no microphone access. allow it in your browser, then try again.",
  noMic: "couldn't find a microphone.",
  micFailed: "couldn't start recording. try again?",
  empty: "that recording was too short to hear.",
  tooLong: (minutes: number) => `recordings stop at ${minutes} minutes.`,
  tooBig: "that recording is too big. try a shorter one.",
  nothingHeard: "nothing came through. try again?",
  sttFailed: "couldn't turn that into words. try again?",
  ttsFailed: "couldn't read that out. try again?",
  playbackFailed: "couldn't play that. try again?",
  unavailable: "voice is not switched on here yet.",
  notOnPlan: "voice is part of the paid plans.",
  usage: (left: string, replies: string) => `${left} of voice left · ${replies} spoken replies`,
} as const;
