import { Fragment } from "react";
import { formatBytes } from "../services/billingService";
import type { Plan, PlanId, PlanLimits } from "../services/billingService";

// The side-by-side grid, read straight off the limits GET /api/billing/plans
// returns. Not a single number is restated here - change config/plans.js and
// this table changes with it.
//
// A row reads the plan's own limits, and may look at the plan one tier down
// (`prev`) when the honest wording is "everything before, plus this".

type CellValue = number | string | boolean | null;

interface RowContext {
  limits: PlanLimits;
  plan: Plan;
  prev: Plan | null;
  /** Message cap while the Basic trial is running, from catalogue.trial. */
  trialMessagesPerDay: number;
}

interface Row {
  label: string;
  read: (ctx: RowContext) => CellValue;
}

interface Group {
  title: string;
  rows: Row[];
}

const isPaid = (p: Plan) => p.price.monthly > 0;
const perMonth = (n: number | null) => (n === null ? null : n === 0 ? false : `${n}/month`);
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const GROUPS: Group[] = [
  {
    title: "Chat",
    rows: [
      {
        label: "Messages",
        read: ({ limits, plan, trialMessagesPerDay }) => {
          if (limits.messagesPerDay === null) return null;
          const base = `${limits.messagesPerDay}/day`;
          // The trial lifts the cap, and it starts from Free.
          return isPaid(plan) ? base : `${base} (${trialMessagesPerDay}/day on trial)`;
        },
      },
      { label: "General AI assistant", read: () => true },
      { label: "Roleplay mode", read: () => true },
      { label: "Switch chat → roleplay mid-conversation", read: () => true },
      {
        label: "Premium replies",
        read: ({ limits }) => (limits.premiumRepliesPerDay ? `${limits.premiumRepliesPerDay}/day` : false),
      },
      { label: "Auto-premium on key moments", read: ({ limits }) => limits.autoPremium },
      { label: "Regenerate as premium", read: ({ limits }) => limits.regenerateAsPremium },
      {
        label: "Memory",
        read: ({ limits }) =>
          limits.memory === "SESSION"
            ? "Session"
            : limits.memory === "STORY"
              ? "Story"
              : limits.pinnedFacts
                ? "Long-term + pinned"
                : "Long-term",
      },
      { label: "Auto mode / choose your model", read: ({ limits }) => (limits.modelSelection ? true : "Auto") },
      {
        label: "Claude, GPT & Gemini in general chat",
        read: ({ limits }) => (limits.modelSelection ? "Credits" : false),
      },
    ],
  },
  {
    title: "Characters",
    rows: [
      { label: "Active characters", read: ({ limits }) => limits.activeCharacters },
      {
        label: "New characters",
        read: ({ limits }) => (limits.newCharactersPerMonth === null ? null : perMonth(limits.newCharactersPerMonth)),
      },
      { label: "Turn any chat into a character", read: () => true },
      { label: "Multiple stories per character", read: ({ limits }) => limits.multipleStories },
      { label: "Share characters publicly", read: ({ limits }) => limits.publicSharing },
      {
        label: "Personas",
        read: ({ limits }) =>
          limits.personas === null
            ? null
            : limits.personaChangesPerMonth
              ? `${limits.personaChangesPerMonth} changes/mo`
              : limits.personas,
      },
      {
        label: "Style learning (upload chats or text)",
        read: ({ limits }) =>
          limits.styleProfiles === null ? null : limits.styleProfiles ? `${limits.styleProfiles} profiles` : false,
      },
    ],
  },
  {
    title: "Group roleplay",
    rows: [
      { label: "Characters per group", read: ({ limits }) => limits.group.maxMembers },
      {
        label: "Groups per month",
        read: ({ limits }) => (limits.group.maxMembers === 0 ? false : limits.group.groupsPerMonth),
      },
      { label: "Reply when it fits, or when @mentioned", read: ({ limits }) => limits.group.maxMembers > 0 },
      { label: "Edit a character for one group only", read: ({ limits }) => limits.group.maxMembers > 0 },
    ],
  },
  {
    title: "Images",
    rows: [
      {
        label: "Image generation",
        // Free gets a lifetime allowance; every paid plan is monthly.
        read: ({ limits }) =>
          limits.imagesPerMonth > 0 ? `${limits.imagesPerMonth}/month` : limits.imagesLifetime || false,
      },
      {
        label: "HD images included",
        read: ({ limits, plan }) =>
          limits.hdImagesPerMonth > 0 ? `${limits.hdImagesPerMonth}/month` : isPaid(plan) ? "Credits" : false,
      },
      { label: "Generate from your scene", read: () => true },
      { label: "Reference-image edits", read: ({ limits }) => (limits.referenceEdits ? "Credits" : false) },
    ],
  },
  {
    title: "Video",
    rows: [{ label: "Video generation", read: ({ limits }) => (limits.earlyAccess ? "Early access" : false) }],
  },
  {
    title: "Voice",
    rows: [
      {
        label: "Voice messages in",
        read: ({ limits }) => (limits.voiceMinutesPerMonth ? `${limits.voiceMinutesPerMonth} min/month` : false),
      },
      { label: "Spoken replies", read: ({ limits }) => perMonth(limits.spokenRepliesPerMonth) },
      { label: "Premium voices", read: ({ limits }) => (limits.voiceMinutesPerMonth ? "Credits" : false) },
    ],
  },
  {
    title: "Journal",
    rows: [
      {
        label: "Journal",
        read: ({ limits, prev }) => {
          const j = limits.journal;
          if (!j.photos) return "Text";
          const size = formatBytes(j.storageBytes);
          const had = prev?.limits.journal;
          if (j.documents) return had?.documents ? size : `+ documents · ${size}`;
          return had?.photos ? size : `+ photos · ${size}`;
        },
      },
      { label: "Document upload & Q&A", read: ({ limits }) => perMonth(limits.documentUploadsPerMonth) },
    ],
  },
  {
    title: "Credits & speed",
    rows: [
      {
        label: "Monthly credits",
        read: ({ limits }) =>
          limits.monthlyCredits
            ? limits.rolloverMonths
              ? `${limits.monthlyCredits} · roll over ${limits.rolloverMonths} mo`
              : limits.monthlyCredits
            : false,
      },
      { label: "Speed", read: ({ limits }) => capitalise(limits.speed) },
      { label: "Early access to new features", read: ({ limits }) => limits.earlyAccess },
    ],
  },
];

function Tick() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[0.95rem] w-[0.95rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 6.5" />
    </svg>
  );
}

/** null reads as unlimited, false and 0 as "not on this plan". */
function Cell({ value }: { value: CellValue }) {
  if (value === null) {
    return <span className="font-serif text-[0.85rem] text-sage-deep">Unlimited</span>;
  }
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center text-rust">
        <Tick />
        <span className="sr-only">included</span>
      </span>
    );
  }
  if (value === false || value === 0) {
    return (
      <span className="text-muted" aria-label="not on this plan">
        —
      </span>
    );
  }
  return (
    <span className="font-serif text-[0.85rem] text-ink-soft">
      {typeof value === "number" ? value.toLocaleString("en-IN") : value}
    </span>
  );
}

export default function PlanComparison({
  plans,
  activePlan,
  trialMessagesPerDay,
}: {
  plans: Plan[];
  activePlan: PlanId;
  trialMessagesPerDay: number;
}) {
  if (plans.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="font-display text-ink text-[1.35rem] md:text-[1.6rem]">compare plans</h2>

      <div className="mt-4 overflow-x-auto rounded-[1.25rem] border border-hairline/60 bg-cream-light">
        <table className="w-full min-w-[680px] border-collapse">
          <caption className="sr-only">every limit, plan by plan</caption>
          <thead>
            <tr className="border-b border-hairline/60">
              <th scope="col" className="sticky left-0 z-10 bg-cream-light text-left px-4 py-3 w-[38%]">
                <span className="sr-only">feature</span>
              </th>
              {plans.map((p) => (
                <th
                  key={p.id}
                  scope="col"
                  className={`px-3 py-3 text-center ${p.id === activePlan ? "bg-cream" : ""}`}
                >
                  <span className={`font-display text-[1rem] ${p.id === activePlan ? "text-rust" : "text-ink"}`}>
                    {p.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {GROUPS.map((group) => (
              <Fragment key={group.title}>
                <tr className="bg-cream/70">
                  <th
                    scope="colgroup"
                    colSpan={plans.length + 1}
                    className="sticky left-0 bg-cream/70 text-left px-4 py-2"
                  >
                    <span className="font-serif text-[0.82rem] tracking-wide text-ink">{group.title}</span>
                  </th>
                </tr>

                {group.rows.map((row) => (
                  <tr key={row.label} className="border-t border-hairline/40">
                    <th scope="row" className="sticky left-0 z-10 bg-cream-light text-left font-normal px-4 py-2.5">
                      <span className="font-serif text-[0.85rem] leading-snug text-ink-soft">{row.label}</span>
                    </th>
                    {plans.map((p, i) => (
                      <td
                        key={p.id}
                        className={`px-3 py-2.5 text-center ${p.id === activePlan ? "bg-cream/60" : ""}`}
                      >
                        <Cell
                          value={row.read({
                            limits: p.limits,
                            plan: p,
                            prev: i > 0 ? plans[i - 1] : null,
                            trialMessagesPerDay,
                          })}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-center font-caveat text-muted text-[0.88rem]">
        every limit here comes from the server — what you see is what is enforced.
      </p>
    </section>
  );
}
