/* ─── The user-facing privacy policy ──────────────────────────────────────────
 *
 * Content only. `pages/PrivacyPolicyPage.tsx` renders it; nothing else should
 * import it. It lives beside copy.ts rather than inside it because copy.ts is
 * imported by most of the app and this is a document, not UI strings.
 *
 * Written from PRIVACY.md §9 ("what the policy may claim - and may not") and
 * re-verified against the source on 17 September 2026. It describes the code as
 * it is TODAY: Groq for text, Pollinations for pictures, voice off unless a
 * provider is configured.
 *
 * ── BEFORE YOU PUBLISH ──────────────────────────────────────────────────────
 * Every bracketed token below is a placeholder. Search for "[" and fill in:
 *
 *   operator.entity          your legal name or company name
 *   operator.address         registered address (DPDP Rule 9 wants it findable)
 *   operator.effectiveDate   the date you publish this
 *   §6 modelProviderTerms    read Groq's terms and say, in one sentence,
 *                            whether they retain or train on what we send.
 *                            PRIVACY.md §9 lists this as the disclosure that
 *                            is currently missing - do not ship without it.
 *   §7 hostingNote           who hosts the database, and in which country
 *   §6 voiceProvider         only if you turn voice on
 *
 * ── WHEN THE CODE CHANGES ───────────────────────────────────────────────────
 * These sections are pinned to specific files. Changing any of them means
 * coming back here and bumping `version` + `lastUpdated`:
 *
 *   lib/llm.js, config/providers.json  -> §6 "The AI that writes the replies"
 *   lib/image.js                       -> §6 "Pictures"
 *   lib/models.js, config/plans.js     -> §6 "Choosing a different model"
 *   lib/voice.js                       -> §6 "Voice"
 *   lib/signedUrl.js                   -> §8 and §9 (the 12-hour number)
 *   lib/jobs.js                        -> §9 the retention table
 *   lib/billing/razorpay.js            -> §7 "Payments"
 *
 * The three sentences PRIVACY.md §9 says must NEVER appear here, whatever a
 * future edit is trying to say: "we can't see your conversations", "your data
 * never leaves our servers", and "encrypted" without saying encrypted where.
 * They would all be false.
 * ---------------------------------------------------------------------------- */

export const operator = {
  product: "Private Aile",
  entity: "[LEGAL ENTITY NAME]",
  address: "[REGISTERED ADDRESS]",
  country: "India",
  /* There is deliberately no named Grievance Officer here. Every route for a
     complaint or a rights request goes to privacyEmail instead, so there is
     one inbox to watch rather than two. If a named officer is added back
     later, DPDP Rule 9 expects the name to be published on the site and in
     the app, not only in a support reply. */
  privacyEmail: "care@privateaile.com",
  supportEmail: "care@privateaile.com",
  effectiveDate: "[DATE YOU PUBLISH THIS]",
  lastUpdated: "17 September 2026",
  version: "1.1",
  /** Published response time for a rights request or a complaint. DPDP
   *  Rule 14 requires a published period; it may not exceed 90 days. 30 is a
   *  promise you can keep with one inbox - lengthen it if you cannot. */
  responseDays: 30,
} as const;

export type PolicyBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; head: readonly [string, string]; rows: readonly (readonly [string, string])[] }
  | { kind: "note"; text: string };

export type PolicySection = {
  id: string;
  n: number;
  title: string;
  /** Short label for the table of contents rail. */
  short: string;
  blocks: readonly PolicyBlock[];
};

export const privacyIntro = {
  kicker: "the honest version",
  headline: "What Private Aile does with what you write.",
  standfirst:
    "Private Aile is a private place to think, write and talk to characters you invent. That only works if you know where your words go. This page says it plainly - including the parts that are less comfortable to say.",
  meta: `Version ${operator.version} · effective ${operator.effectiveDate} · last updated ${operator.lastUpdated}`,
  tocLabel: "on this page",
} as const;

export const privacySections: readonly PolicySection[] = [
  /* ── 1 ───────────────────────────────────────────────────────────────── */
  {
    id: "summary",
    n: 1,
    title: "The short version",
    short: "in short",
    blocks: [
      {
        kind: "p",
        text: "This summary is not the policy - the sections below are - but if you read nothing else, read this.",
      },
      {
        kind: "list",
        items: [
          "Your conversations, journal entries and characters are stored on our servers, in an ordinary database. We can read them. So can anyone we give admin access to.",
          "To write a reply, we send the conversation - and the facts your character remembers about you - to an AI company. Photos you attach go too. This happens on every message.",
          "When the app makes a picture, the description of that picture is sent to a free image service in the web address itself, and web addresses get written into logs all over the internet.",
          "The assistant tab is different: those chats are never saved on our servers. They live in your browser and are erased when you sign out.",
          "We show no ads, run no analytics or tracking scripts, and sell nothing to anyone.",
          "You can download everything you have written at any time, and you can delete your account. Deletion has a 30-day grace period and is then permanent.",
          "Private Aile is for adults. 18 and over, no exceptions.",
        ],
      },
    ],
  },

  /* ── 2 ───────────────────────────────────────────────────────────────── */
  {
    id: "who",
    n: 2,
    title: "Who we are",
    short: "who we are",
    blocks: [
      {
        kind: "p",
        text: `${operator.product} is operated by ${operator.entity}, ${operator.address}, ${operator.country}. Under India's Digital Personal Data Protection Act, 2023, we are the Data Fiduciary for the personal data described here - the ones who decide what is collected and why, and the ones answerable for it.`,
      },
      {
        kind: "p",
        text: `For anything about your data - a question, a correction, a request to see or delete it, or a complaint - write to ${operator.privacyEmail}. That address reaches a person, and it is the right one to use even when the matter is formal.`,
      },
    ],
  },

  /* ── 3 ───────────────────────────────────────────────────────────────── */
  {
    id: "collect",
    n: 3,
    title: "What we collect",
    short: "what we collect",
    blocks: [
      {
        kind: "p",
        text: "Almost all of it is something you typed on purpose. There is no hidden collection layer, and nothing here comes from a data broker or from tracking you around the web.",
      },
      {
        kind: "table",
        head: ["What", "The detail"],
        rows: [
          ["Your account", "Name, email address, your password (stored only as a bcrypt hash - we never hold the password itself), date of birth, and the optional picture, theme, language and the answer you gave to \"what brings you here?\""],
          ["Signing in with Google or Facebook", "The account identifier that provider gives us, and the name, email and picture they pass along. We never receive your password for those accounts."],
          ["What you create", "Characters and their descriptions, personas, stories, style profiles, and any files you upload to build a character out of."],
          ["Conversations", "Your messages and the replies, in one-to-one chats and in group rooms, along with any photo or file you attach to a message."],
          ["Memory", "Short facts a character keeps about you. Each one records the message it was learned from, so deleting that message breaks the link."],
          ["Your journal", "Thread names, entries of up to 20,000 characters, photos and documents you attach on a paid plan, and the reflection the AI writes back."],
          ["Voice, if you use it", "The text of a reply we are asked to read aloud, and any recording you make for transcription. Recordings pass through our server in memory and are not stored."],
          ["Reports you file", "The reason, anything you add, and a copy of the message you reported. That copy is kept even if the original is later edited or deleted - otherwise a report could be erased by the person being reported."],
          ["Plan, payments and usage", "Your plan, subscription status, credit balance and ledger, and counts of what you have used. For a payment: the amount, the payment and order identifiers from Razorpay, the method type, and the last four digits of a card."],
          ["Technical, in passing", "Our servers see your IP address in order to apply rate limits and stop abuse. We do not build a profile from it or attach a browsing history to your account. Our hosting provider keeps its own connection logs - [WHO HOSTS THIS, AND WHERE]."],
        ],
      },
    ],
  },

  /* ── 4 ───────────────────────────────────────────────────────────────── */
  {
    id: "dont-collect",
    n: 4,
    title: "What we deliberately do not collect",
    short: "what we don't",
    blocks: [
      {
        kind: "list",
        items: [
          "The assistant tab. Chats in the general assistant are never written to our database. They exist in your browser and nowhere else, and signing out erases them.",
          "The prompts and replies that pass to the AI provider. Our server does not log them. When something goes wrong we record the error, not the conversation.",
          "Your card. Payment details are entered inside Razorpay's own checkout and never reach our servers.",
          "Analytics, advertising, tracking and third-party fonts. The app loads none. The only outside code that ever runs in the page is Google's or Facebook's sign-in script, and only after you click that button.",
          "Notifications, streaks and re-engagement nudges. We do not count your days or try to bring you back.",
        ],
      },
    ],
  },

  /* ── 5 ───────────────────────────────────────────────────────────────── */
  {
    id: "why",
    n: 5,
    title: "Why we use it",
    short: "why we use it",
    blocks: [
      {
        kind: "p",
        text: "Each purpose is listed separately, because you are entitled to know which piece of data is used for what rather than being handed one paragraph covering everything.",
      },
      {
        kind: "table",
        head: ["Purpose", "What it uses"],
        rows: [
          ["Running your account", "Name, email, password hash, date of birth, sign-in identifiers."],
          ["Writing a character's reply", "The character's description, the recent conversation, the facts that character remembers, and anything you attached to a message."],
          ["Reflecting on a journal entry", "The entry you asked us to reflect on, when you ask."],
          ["Making a picture", "A description written from the recent conversation."],
          ["Keeping the place safe", "Your message and the reply are checked for content that breaks the rules, and reports you file are read by a person."],
          ["Your plan and payments", "Plan, subscription, credits, usage counts and payment records."],
          ["Sending you necessary email", "Your name and email address - password resets, trial reminders, receipts, an export being ready, a deletion being scheduled. No marketing."],
          ["Preventing abuse", "IP address for rate limiting, and failed sign-in counts per account."],
          ["Meeting legal obligations", "Payment and tax records."],
        ],
      },
      {
        kind: "p",
        text: "Our basis for all of this is your consent, given when you create an account and use a feature, except where the law requires us to keep something (tax records, for example). You can withdraw consent by deleting your account - section 11.",
      },
    ],
  },

  /* ── 6 ───────────────────────────────────────────────────────────────── */
  {
    id: "ai",
    n: 6,
    title: "The AI, and what it is sent",
    short: "the AI",
    blocks: [
      {
        kind: "note",
        text: "This is the section most privacy policies are vague about. Privateaile cannot generate a reply on its own. Writing one means sending your words to another company.",
      },
      {
        kind: "p",
        text: "Text replies are generated by Groq, Inc. (GroqCloud), in the United States. Every time a character answers you, we send: the character's description, the recent messages in that conversation, the facts that character remembers about you, and any photo you attached - in full, inside the request. The same provider is used to check messages against our content rules, to pull short facts out of an exchange for a character's memory, to write a reflection on a journal entry when you ask for one, and to write the description used to make a picture.",
      },
      {
        kind: "p",
        text: "[READ GROQ'S TERMS AND SAY IN ONE SENTENCE WHETHER THEY RETAIN OR TRAIN ON WHAT WE SEND. THIS IS THE DISCLOSURE PRIVACY.md §9 SAYS IS MISSING - DO NOT PUBLISH THIS PAGE WITHOUT IT.]",
      },
      {
        kind: "p",
        text: "For our own part: we do not train any AI model on your writing, and we do not sell it or hand it to anyone for advertising.",
      },
      {
        kind: "p",
        text: "One thing works in your favour here. Messages that look like they are about self-harm are caught by a filter running on our own server, which answers without calling the AI provider at all. The most sensitive category is the one least likely to be sent anywhere.",
      },
      {
        kind: "p",
        text: "Choosing a different model. On a paid plan you can pick which model writes a particular reply. If you choose one, that conversation goes to the company behind it - Google, OpenAI or Anthropic - instead of to Groq, under their terms rather than ours. The model you pick is shown before you send.",
      },
      {
        kind: "p",
        text: "Pictures. Images are generated by Pollinations, a free service. The description of the picture - written by the AI from your recent conversation - is sent inside the web address rather than in the body of the request. Web addresses are recorded in access logs, proxies and caches across the internet, so a description derived from your private conversation should be assumed to exist somewhere outside our control. We have no account and no contract with this service. This is the weakest point in the product for privacy, we know it, and we would rather tell you than let you assume otherwise. If you would prefer not to take that risk, do not use picture generation.",
      },
      {
        kind: "p",
        text: "Voice. Spoken replies and voice input are off unless a provider is configured for your server. Where it is on, the text to be read aloud, and any recording you make, are sent to [VOICE PROVIDER] for processing and are not stored by us afterwards.",
      },
      {
        kind: "p",
        text: "All of these companies are outside India, mostly in the United States. Indian law permits this, and we are telling you because you should know where your words travel.",
      },
      {
        kind: "p",
        text: "Characters are fiction. Every reply you read is generated by software, not written by a person, and no character is or represents a real human being. Privateaile will not speak as someone you have lost.",
      },
    ],
  },

  /* ── 7 ───────────────────────────────────────────────────────────────── */
  {
    id: "others",
    n: 7,
    title: "The other companies involved",
    short: "other companies",
    blocks: [
      {
        kind: "p",
        text: "Beyond the AI providers in section 6, a small number of services are needed to run Privateaile at all. Each receives only what its job requires.",
      },
      {
        kind: "table",
        head: ["Who", "What they get"],
        rows: [
          ["Razorpay", "Payments and subscriptions. You enter card or UPI details inside their checkout, not ours. They return a payment identifier, the amount, the method type and the last four digits of a card, and that is all we store."],
          ["Resend", "Transactional email. Your name and email address, and the text of that specific message - a reset link, a receipt, a reminder. Never your conversations or your journal."],
          ["Google, Facebook", "Only if you choose to sign in with them. Their script loads at the moment you click the button and not before."],
          ["Our hosting and database provider", "[WHO HOSTS THIS, AND IN WHICH COUNTRY]. They hold the server your data sits on."],
        ],
      },
      {
        kind: "p",
        text: "We do not sell personal data, and we do not share it for anyone else's advertising. If we are ever legally compelled to hand something over, we will tell you unless we are forbidden from doing so.",
      },
    ],
  },

  /* ── 8 ───────────────────────────────────────────────────────────────── */
  {
    id: "files",
    n: 8,
    title: "Your files, and the links to them",
    short: "your files",
    blocks: [
      {
        kind: "p",
        text: "Photos and files you share in a chat, pictures the app generated, and anything you attach to a journal entry are not public. They are reachable only through a link we sign for you at the moment you load the page, and that signature expires in about twelve hours. If such a link ever leaks - through a screenshot, a browser history, somebody's proxy log - it stops working the same day rather than never.",
      },
      {
        kind: "p",
        text: "Files you upload to build a character are never served over the web at all. They are read on our server to write the character and are unreachable by any web address.",
      },
      {
        kind: "p",
        text: "Your profile picture is the exception: it is served publicly, because other people are meant to see it. Anyone who has its address keeps access to it.",
      },
      {
        kind: "p",
        text: "If you mark a character as shared, the card that strangers can open shows only its name, colour, picture, one line and its tags. Its memories, its source files, your messages and your identity are not reachable there.",
      },
    ],
  },

  /* ── 9 ───────────────────────────────────────────────────────────────── */
  {
    id: "retention",
    n: 9,
    title: "How long we keep things",
    short: "how long we keep it",
    blocks: [
      {
        kind: "table",
        head: ["What", "How long"],
        rows: [
          ["Your account and everything in it", "Until you delete it."],
          ["An account you have asked us to delete", "30 days, then permanently removed. Signing in during those 30 days cancels the deletion and brings everything back."],
          ["Assistant-tab chats", "Never stored on our servers. Erased from your browser when you sign out."],
          ["A link to one of your private files", "About 12 hours."],
          ["A picture the app generated", "Kept for as long as a message points at it, then removed about 30 days after nothing does."],
          ["Session memory on the free plan", "Facts a character learns are forgotten after a day."],
          ["A data-export link we email you", "7 days. The export itself is built when you open the link and is never stored as a file."],
          ["A PDF the assistant makes for you", "Not stored. It is built and sent to you."],
          ["Usage counts", "45 days. The finer-grained usage log, 90 days."],
          ["A message you reported", "The snapshot is kept so the report can still be reviewed."],
          ["Payment records", "Kept after your account is deleted, with your account link removed, because tax and accounting law requires it."],
        ],
      },
    ],
  },

  /* ── 10 ──────────────────────────────────────────────────────────────── */
  {
    id: "access",
    n: 10,
    title: "Who can read what you write",
    short: "who can read it",
    blocks: [
      {
        kind: "p",
        text: "Being straight about this matters more than sounding reassuring.",
      },
      {
        kind: "list",
        items: [
          "You can. Every part of the app that returns your content checks that it is yours first.",
          "We can. Your messages and journal entries are stored as ordinary text in our database. They are not end-to-end encrypted, and we are able to read them. We do not do so casually, and we have no feature that browses them.",
          "An administrator can. Privateaile has an admin role, held by as few people as possible and granted only from the database side, which can see account details and the operational side of the app. If someone with that role ever reads your content, it will be to investigate a report, a payment problem or a security incident.",
          "Whoever reviews a report you file, or a report filed about a message in your conversation, sees the copy of that message.",
          "The AI providers in section 6 receive what is described there, every time a reply is written.",
          "Nobody else. Not advertisers, not data brokers, not other users.",
        ],
      },
      {
        kind: "p",
        text: "A character remembers only what has been shared with it, and each fact is tied to the message that taught it. Delete that message and the fact loses its source; forget the fact and it is gone.",
      },
    ],
  },

  /* ── 11 ──────────────────────────────────────────────────────────────── */
  {
    id: "rights",
    n: 11,
    title: "Your rights, and how to use them",
    short: "your rights",
    blocks: [
      {
        kind: "p",
        text: "Under the Digital Personal Data Protection Act, 2023, you have the following rights. Most of them are a button in the app rather than a letter to us.",
      },
      {
        kind: "table",
        head: ["Right", "How"],
        rows: [
          ["A copy of your data", "Settings → privacy → export your data. We build a JSON file of your account, characters, conversations and journal and email you a link, good for 7 days."],
          ["Correcting or completing it", `Settings → profile for your own details. For anything you cannot edit yourself, write to ${operator.privacyEmail}.`],
          ["Erasing it", "Settings → privacy → delete account. A 30-day grace period, then everything is removed rather than archived. Signing in during those 30 days cancels it."],
          ["Withdrawing consent", "Stop using the feature, or delete your account. Withdrawing consent for the AI processing in section 6 means Privateaile cannot generate replies, which is most of what it does."],
          ["Nominating someone", `You may nominate a person to exercise these rights for you if you die or become incapacitated. Write to ${operator.privacyEmail} and we will record it.`],
          ["Raising a problem", `Write to ${operator.privacyEmail}. We acknowledge it and respond within ${operator.responseDays} days. If you are not satisfied with the outcome, you may take it to the Data Protection Board of India.`],
        ],
      },
      {
        kind: "p",
        text: `We answer rights requests within ${operator.responseDays} days. We will ask you to confirm the request from your account's email address, because an unverified request is how one person gets hold of another person's data.`,
      },
    ],
  },

  /* ── 12 ──────────────────────────────────────────────────────────────── */
  {
    id: "security",
    n: 12,
    title: "How we protect it",
    short: "security",
    blocks: [
      {
        kind: "list",
        items: [
          "Everything travels over HTTPS.",
          "Passwords are stored as bcrypt hashes. We cannot see your password, and neither can anyone who gets hold of the database.",
          "Every request for your content is checked against the account making it.",
          "Private files are reachable only through short-lived signed links, minted fresh each time and never stored.",
          "Changing your password ends every other signed-in session immediately.",
          "Sign-in attempts are limited by account and by network address.",
          "Admin access is a database-level permission, not something an account can grant itself.",
        ],
      },
      {
        kind: "p",
        text: "What we are not going to claim: your messages and journal entries are stored as plain text in the database, protected by the security of the server and the database rather than by encryption we hold a key to. Privateaile is not end-to-end encrypted. No system is perfectly secure, and anyone who tells you otherwise is selling something.",
      },
      {
        kind: "p",
        text: `If a breach ever affects your data, we will tell you what happened, what it means for you, what we have done about it and what you should do, and we will notify the Data Protection Board as the law requires. If you think you have found a security problem, please write to ${operator.privacyEmail} before telling anyone else.`,
      },
    ],
  },

  /* ── 13 ──────────────────────────────────────────────────────────────── */
  {
    id: "age",
    n: 13,
    title: "Privateaile is for adults",
    short: "18 and over",
    blocks: [
      {
        kind: "p",
        text: "You must be 18 or older to use Privateaile. We ask for your date of birth when you sign up and refuse the account if it puts you under 18. Indian law treats everyone under 18 as a child, and Privateaile is not built for children: we do not knowingly collect their data, we do not market to them, and we do not profile or track anyone for advertising at any age.",
      },
      {
        kind: "p",
        text: `If you believe someone under 18 has an account, write to ${operator.privacyEmail} and we will remove it.`,
      },
    ],
  },

  /* ── 14 ──────────────────────────────────────────────────────────────── */
  {
    id: "where",
    n: 14,
    title: "Where Privateaile is offered",
    short: "where it's offered",
    blocks: [
      {
        kind: "p",
        text: "Privateaile is offered in India and is built around Indian law. It is not offered to people in the European Union, the European Economic Area, or the United Kingdom, and we do not target those markets. If that changes, this policy changes with it and you will be told before it takes effect.",
      },
      {
        kind: "p",
        text: "Our servers and the companies in sections 6 and 7 are located outside India, mostly in the United States. Your data is transferred there in the ordinary course of the service running.",
      },
    ],
  },

  /* ── 15 ──────────────────────────────────────────────────────────────── */
  {
    id: "changes",
    n: 15,
    title: "When this page changes",
    short: "changes",
    blocks: [
      {
        kind: "p",
        text: "If we change who receives your data, what we collect, or how long we keep it, we will update this page, change the version at the top, and email you before the change takes effect. Smaller corrections - clearer wording, a fixed typo - will show up here with a new date and no email.",
      },
      {
        kind: "p",
        text: "We will not quietly widen what we do with your writing and rely on you not re-reading this page.",
      },
    ],
  },

  /* ── 16 ──────────────────────────────────────────────────────────────── */
  {
    id: "contact",
    n: 16,
    title: "Talk to us",
    short: "contact",
    blocks: [
      {
        kind: "p",
        text: `Privacy, data, rights requests and complaints: ${operator.privacyEmail}. Everything else - a question, a bug, a charge that looks wrong: ${operator.supportEmail}. Post: ${operator.entity}, ${operator.address}.`,
      },
      {
        kind: "p",
        text: "A real person reads these. No ticket queue, no bot reply.",
      },
    ],
  },
] as const;
