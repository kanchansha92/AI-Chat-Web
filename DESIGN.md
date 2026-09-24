# Ember — design notes

> Ember is a quiet place to think, write, remember, and create.

This file records the product direction the UI is built to, so that new screens
and copy stay in the same register. The colour tokens in `src/index.css` were
re-pointed in Sept 2026 to the brand reference (the landing mock): deep navy ink
and buttons on lavender-tinted paper. Token *names* are unchanged (`rust` is
still the accent, `cream` the paper), so every utility keeps working.

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
| Paper | Page `#F7F7FA`, tinted panels `cream #F4F2F9`, cards `cream-light #FCFCFD`. A faint grain (`--paper-grain`) sits under every page via `.app-gradient`; `.paper` is a sheet on the desk; `.ruled` draws notebook lines. |
| Ink | `charcoal #16224A` for headlines, `charcoal-light #5C6375` for body, `muted #6E717E` for labels. |
| Accent | `rust #25315E` (navy), hover `#1C264D`. One accent: primary buttons, the current thing, links. |
| Lavender | `lavender #EBE8F7` behind icons, `lavender-line #DCD6EC` for hairline curves, `hairline #E6E4EC` for borders. |
| Type | App screens: the Segoe UI stack via `@theme`. Landing page: Newsreader (serif headlines), Jost (text), Homemade Apple (the one handwritten flourish) - self-hosted in `src/assets/fonts`, scoped by `components/landing/landing.css`. |
| Margin notes | Captions that read like a note in the margin: "— a quiet morning". |
| Hand-drawn | `.hand-underline` under a word; thin line icons at 1.5px; the ink-drop mark. |
| Motion | Things settle in (`chat-rise`, `chat-fade`); nothing bounces or pulses to get attention. Reduced-motion turns it all off. |
| Dark | `data-theme="lamplight"` — the same room after dark: navy night (`#121833`), lavender accent (`#C9C4EE`). |

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
