# Ember — design notes

> Ember is a quiet place to think, write, remember, and create.

This file records the product direction the UI is built to, so that new screens
and copy stay in the same register. The colour and font tokens in
`src/index.css` are deliberately unchanged by this pass — the existing palette
(cool cream, grey accent, lamplight browns) and the Segoe UI stack stay as they
are; the direction below is carried by layout, texture, copy and motion.

## Who it is for

Adults in India, roughly 22–40, who want a private place to journal, to write
about people and memories that matter, and to invent characters and stories.
Many of them have tried companion apps and did not like the gamification, the
sexual pressure or the constant pull to stay engaged.

Ember is **not** an AI girlfriend/boyfriend app, an NSFW platform, a
productivity assistant or an enterprise tool, and the UI should never suggest
that it is.

## The feeling

The user should be able to say: *"I can come here, write something, talk to
Ember, create something, and leave whenever I want."*

Priorities, in order: privacy · emotional comfort · simplicity · meaningful
conversation · creative expression · journaling · storytelling · user control.

## Visual language

| | |
|---|---|
| Paper | `--color-cream` family (values unchanged). A faint neutral grain (`--paper-grain`) sits under every page via `.app-gradient`; `.paper` is a sheet on the desk; `.ruled` draws notebook lines. |
| Ink | `--color-charcoal` (unchanged). |
| Accent | `--color-rust` (unchanged). One accent, used sparingly: primary buttons, the current thing, a word in a headline. |
| Type | The existing font stack, unchanged. `font-display` marks headlines, `font-serif` body, `font-caveat` margin notes — so a future font swap only touches `@theme`. |
| Margin notes | Captions that read like a note in the margin: "— a quiet morning". |
| Hand-drawn | `.hand-underline` under a word; thin line icons at 1.5px; the ember mark. |
| Motion | Things settle in (`chat-rise`, `chat-fade`); nothing bounces or pulses to get attention. Reduced-motion turns it all off. |
| Dark | `data-theme="lamplight"` — the same room after dark: warm browns, the accent lifted. |

### Avoid

Neon, futuristic "AI" visuals, aggressive gradients, glassmorphism (the
`chat-glass` class is now opaque paper), gaming UI, streaks, points, coins,
badges, notification nags, and any engagement trick.

## Copy

- Lowercase, unhurried, specific. Margin notes begin with an em dash: `— a line is enough.`
- Buttons say what happens: *Open a notebook →*, *Start writing →*, *Bring them in →*.
- Never "we missed you", never "come back", never a count of days.
- Ember is "someone to think alongside", not an assistant and not a companion.
- Characters are **fiction, always**. The builder says so in one line and points
  anyone writing about a real person to the journal.

## Memory and loss

When someone writes about a person they have lost, Ember helps them reflect on
the memory. It does **not** speak as that person. The experience is *"write
about the person and preserve the memory"*, never *"talk to the person you
lost"*. This is stated on the new-thread page, at the top of a thread flagged
"about a real person", in the character builder and in the help FAQs, and it is
enforced by the backend's moderation layer.
