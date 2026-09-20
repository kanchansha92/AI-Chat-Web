import { request, authHeader } from "./authService";

// Everything about money comes from the server. There are no prices, limits or
// plan rules in this file - only the shapes the API sends back. The one thing
// the client holds is the Razorpay *publishable* key id, which the server
// includes in each checkout payload (lib/billing/razorpay.js); the secret and
// the webhook secret never leave the server.

export type PlanId = "FREE" | "BASIC" | "PLUS" | "ULTRA";
export type BillingCycle = "MONTHLY" | "ANNUAL";
export type SubscriptionStatus =
  | "INCOMPLETE"
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELLED"
  | "EXPIRED"
  | "PAUSED";

/** The limit block for a plan, exactly as config/plans.js defines it. */
export interface PlanLimits {
  messagesPerDay: number | null;
  premiumRepliesPerDay: number;
  autoPremium: boolean;
  regenerateAsPremium: boolean;
  modelSelection: boolean;
  speed: string;
  memory: "SESSION" | "STORY" | "LONG_TERM";
  pinnedFacts: boolean;
  activeCharacters: number | null;
  newCharactersPerMonth: number | null;
  multipleStories: boolean;
  publicSharing: boolean;
  personas: number | null;
  personaChangesPerMonth: number | null;
  styleProfiles: number | null;
  group: { maxMembers: number; groupsPerMonth: number | null };
  imagesPerMonth: number;
  imagesLifetime: number | null;
  hdImagesPerMonth: number;
  referenceEdits: boolean;
  voiceMinutesPerMonth: number;
  spokenRepliesPerMonth: number;
  journal: { photos: boolean; documents: boolean; storageBytes: number };
  documentUploadsPerMonth: number;
  monthlyCredits: number;
  rolloverMonths: number;
  creditPurchases: boolean;
  earlyAccess: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  badge: string | null;
  highlighted: boolean;
  price: { monthly: number; annual: number };
  marketing: string[];
  limits: PlanLimits;
}

export interface CreditPack {
  id: string;
  priceRupees: number;
  credits: number;
}

export interface PlanCatalogue {
  plans: Plan[];
  trial: { days: number; reminderDays: number[]; messagesPerDay: number; plan: PlanId; cycle: BillingCycle };
  creditCosts: Record<string, number>;
  models: { id: string; label: string; cost: number }[];
  packs: CreditPack[];
  paymentsConfigured: boolean;
}

export interface Subscription {
  id: string;
  plan: PlanId;
  cycle: BillingCycle;
  status: SubscriptionStatus;
  mandateStatus: "NONE" | "PENDING" | "ACTIVE" | "REVOKED";
  paymentMethodType: "NONE" | "CARD" | "UPI" | "NETBANKING" | "WALLET" | "OTHER";
  paymentMethodLast4: string | null;
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  endedAt: string | null;
  graceUntil: string | null;
  pendingPlan: PlanId | null;
  pendingCycle: BillingCycle | null;
  renewalFailedCount: number;
}

export interface BillingState {
  plan: PlanId;
  planSource: "FREE" | "TRIAL" | "PAID" | "GRANT";
  trialing: boolean;
  pastDue: boolean;
  trialUsedAt: string | null;
  trialAvailable: boolean;
  trialDaysRemaining: number | null;
  subscription: Subscription | null;
  paymentsConfigured: boolean;
  keyId: string | null;
}

/** What the server hands back to open Razorpay Checkout with. */
export interface Checkout {
  provider: "RAZORPAY";
  keyId: string;
  subscriptionId?: string;
  orderId?: string;
  plan?: PlanId;
  cycle?: BillingCycle;
  trial?: boolean;
  upgrade?: boolean;
  cardChange?: boolean;
  amountDueTodayPaise: number;
  firstChargeAt?: string;
  firstChargeAmountPaise?: number;
  credits?: number;
  packId?: string;
  amountPaise?: number;
  currency?: string;
}

export interface InvoiceRow {
  id: string;
  kind: "SUBSCRIPTION" | "RENEWAL" | "CREDIT_PACK" | "TRIAL_AUTH";
  amountPaise: number;
  currency: string;
  status: string;
  plan: PlanId | null;
  cycle: BillingCycle | null;
  packId: string | null;
  creditsGranted: number | null;
  refundedPaise: number;
  providerPaymentId: string | null;
  createdAt: string;
}

export interface ProviderInvoice {
  id: string;
  status: string;
  amountPaise: number;
  currency: string;
  issuedAt: string | null;
  paidAt: string | null;
  shortUrl: string | null;
  paymentId: string | null;
}

export const billingService = {
  /** Public - the pricing page renders entirely from this. */
  plans(): Promise<PlanCatalogue> {
    return request(`/billing/plans`);
  },

  me(): Promise<BillingState> {
    return request(`/billing/me`, { headers: authHeader() });
  },

  startTrial(): Promise<{ checkout: Checkout; billing: BillingState }> {
    return request(`/billing/trial/start`, { method: "POST", headers: authHeader() });
  },

  cancelTrial(): Promise<{ billing: BillingState }> {
    return request(`/billing/trial/cancel`, { method: "POST", headers: authHeader() });
  },

  subscribe(plan: PlanId, cycle: BillingCycle): Promise<{ checkout: Checkout; billing: BillingState }> {
    return request(`/billing/subscribe`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({ plan, cycle }),
    });
  },

  /** The checkout callback. The server re-fetches the truth from Razorpay. */
  verify(payload: {
    razorpay_payment_id: string;
    razorpay_subscription_id: string;
    razorpay_signature: string;
  }): Promise<{ billing: BillingState }> {
    return request(`/billing/verify`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(payload),
    });
  },

  cancel(): Promise<{ billing: BillingState }> {
    return request(`/billing/cancel`, { method: "POST", headers: authHeader(), body: JSON.stringify({}) });
  },

  resume(): Promise<{ billing: BillingState; checkout: Checkout | null }> {
    return request(`/billing/resume`, { method: "POST", headers: authHeader(), body: JSON.stringify({}) });
  },

  changePlan(plan: PlanId, cycle: BillingCycle): Promise<{ billing: BillingState; checkout: Checkout | null }> {
    return request(`/billing/change-plan`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({ plan, cycle }),
    });
  },

  paymentMethod(): Promise<{ checkout: Checkout }> {
    return request(`/billing/payment-method`, { method: "POST", headers: authHeader(), body: JSON.stringify({}) });
  },

  invoices(): Promise<{ payments: InvoiceRow[]; providerInvoices: ProviderInvoice[] }> {
    return request(`/billing/invoices`, { headers: authHeader() });
  },
};

// ─── small shared formatters ──────────────────────────────────────────────────
// Presentation only. Every number they are given came from the server.

/** Indian digit grouping, no decimals: "₹1,499". */
export function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function formatPaise(paise: number): string {
  return formatINR(Math.round(paise / 100));
}

/** "14 mar 2026" - lowercased on purpose. */
export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  return d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toLowerCase();
}

export function priceFor(plan: Plan, cycle: BillingCycle): number {
  return cycle === "ANNUAL" ? plan.price.annual : plan.price.monthly;
}

export function cycleSuffix(cycle: BillingCycle): string {
  return cycle === "ANNUAL" ? "/ year" : "/ month";
}

const RANK: Record<PlanId, number> = { FREE: 0, BASIC: 1, PLUS: 2, ULTRA: 3 };

export function isUpgrade(from: PlanId, to: PlanId): boolean {
  return RANK[to] > RANK[from];
}

export function planRank(plan: PlanId): number {
  return RANK[plan] ?? 0;
}

/** Bytes as "500 MB" / "2 GB" - for the journal storage meter. */
export function formatBytes(bytes: number): string {
  if (!bytes) return "0 MB";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}
