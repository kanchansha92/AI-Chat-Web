import { request, authHeader } from "./authService";
import type { PlanId } from "./plans";

export type PlanMark = "check" | "dot" | "cross";

export interface AdminPlanFeature {
  label: string;
  mark: PlanMark;
}

export interface AdminPlan {
  id: PlanId;
  name: string;
  kicker: string;
  monthly: number;
  annual: number;
  highlighted?: boolean;
  features: AdminPlanFeature[];
}

export interface PlansConfig {
  plans: AdminPlan[];
}

export interface MetricCard {
  value: number;
  series: number[];
}
export interface MrrCard extends MetricCard {
  currency: string;
}
export interface ActiveCard extends MetricCard {
  seriesLabel?: string;
}
export interface ModerationCard extends MetricCard {
  total: number;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  plan: PlanId;
  theme: "PAPER" | "LAMPLIGHT";
  avatar: string | null;
  onboardingDone: boolean;
  createdAt: string;
}

export interface MetricsResponse {
  generatedAt: string;
  cards: {
    signupsToday: MetricCard;
    mrr: MrrCard;
    activeConversations: ActiveCard;
    moderationEvents: ModerationCard;
  };
  totals: {
    users: number;
    planCounts: Record<PlanId, number>;
    // What is really being billed (backend reads these off Subscription rows,
    // not off the cached plan column).
    activeSubscriptions: number;
    trialing: number;
    pastDue: number;
    creditPackRevenuePaise: number;
  };
  recentUsers: Pick<AdminUserRow, "id" | "name" | "email" | "plan" | "avatar" | "createdAt">[];
}

export interface UsersListResponse {
  users: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface AdminSubscription {
  id: string;
  userId: string;
  plan: PlanId;
  cycle: "MONTHLY" | "ANNUAL";
  status: string;
  mandateStatus: string;
  paymentMethodType: string;
  paymentMethodLast4: string | null;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  graceUntil: string | null;
  renewalFailedCount: number;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string };
}

export interface AdminPayment {
  id: string;
  userId: string | null;
  kind: string;
  status: string;
  amountPaise: number;
  refundedPaise: number;
  currency: string;
  plan: PlanId | null;
  cycle: string | null;
  packId: string | null;
  creditsGranted: number | null;
  providerPaymentId: string | null;
  providerOrderId: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string };
}

export interface AdminWebhookEvent {
  id: string;
  provider: string;
  eventId: string;
  eventType: string;
  status: "PENDING" | "PROCESSED" | "FAILED" | "IGNORED";
  error: string | null;
  attempts: number;
  receivedAt: string;
  processedAt: string | null;
}

export interface AdminPlanChange {
  id: string;
  fromPlan: PlanId;
  toPlan: PlanId;
  reason: string;
  actorId: string | null;
  note: string | null;
  createdAt: string;
}

export interface AdminLedgerRow {
  id: string;
  type: string;
  amount: number;
  feature: string;
  balanceAfter: number;
  note: string | null;
  createdAt: string;
}

export interface UserDetailResponse {
  user: AdminUserRow & { dob: string | null; language: string; intent: string | null };
  stats: {
    characters: number;
    messages: number;
    blockedMessages: number;
    journalThreads: number;
    groups: number;
    lastActiveAt: string | null;
  };
  subscription: AdminSubscription | null;
  credits: { total: number; purchased: number; granted: number; grants: unknown[] };
  usage: {
    plan: PlanId;
    trialing: boolean;
    pastDue: boolean;
    meters: Record<string, { metric: string; used: number; limit: number | null; unlimited: boolean }>;
  } | null;
  planChanges: AdminPlanChange[];
  payments: AdminPayment[];
  ledger: AdminLedgerRow[];
}

export interface ProvidersConfig {
  llm: {
    provider: string;
    model: string;
    baseUrl: string;
    timeoutMs: number;
    fallbackOrder: string[];
  };
  moderation: {
    useModel: boolean;
    // No `thresholds` here on purpose. lib/configStore.js deliberately stopped
    // sending them - lib/moderation.js returns a boolean and scores nothing for
    // them to compare against. Declaring them as always-present is what let
    // ProvidersPage call `.toFixed()` on `undefined` with the compiler's
    // blessing, and blank the admin section at runtime.
  };
  keyStatus: { llm: boolean; google: boolean; facebook: boolean };
  live: { model: string; modelKeySet: boolean };
}

export type ProviderTestResult =
  | { ok: true; target: "llm"; model: string; latencyMs: number; sample: string }
  | { ok: false; target: "llm"; model?: string; latencyMs?: number; reason: string }
  | {
      ok: true;
      target: "moderation";
      results: { text: string; blocked: boolean; reason: string | null }[];
    };

export const adminService = {
  // ─── billing (read-only, plus three audited writes) ───────────────────────
  subscriptions(params: { status?: string; q?: string; page?: number } = {}) {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.q) q.set("q", params.q);
    if (params.page) q.set("page", String(params.page));
    return request<{ subscriptions: AdminSubscription[]; total: number; page: number; pageCount: number }>(
      `/admin/subscriptions?${q.toString()}`,
      { headers: authHeader() }
    );
  },

  payments(params: { q?: string; status?: string; kind?: string; page?: number } = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, String(v));
    return request<{ payments: AdminPayment[]; total: number; page: number; pageCount: number }>(
      `/admin/payments?${q.toString()}`,
      { headers: authHeader() }
    );
  },

  webhooks() {
    return request<{ events: AdminWebhookEvent[] }>(`/admin/webhooks`, { headers: authHeader() });
  },

  /** Audited: writes a PlanChange with the admin's id and the note. */
  grantPlan(userId: string, plan: PlanId, note: string) {
    return request<{ from: PlanId; to: PlanId; user: { plan: PlanId; planSource: string } }>(
      `/admin/users/${userId}/plan`,
      { method: "POST", headers: authHeader(), body: JSON.stringify({ plan, note }) }
    );
  },

  /** Audited: writes a signed CreditTransaction. Never edits an existing one. */
  adjustCredits(userId: string, amount: number, note: string) {
    return request<{ transaction: { amount: number; balanceAfter: number }; credits: { total: number } }>(
      `/admin/users/${userId}/credits`,
      { method: "POST", headers: authHeader(), body: JSON.stringify({ amount, note }) }
    );
  },

  refundPayment(paymentId: string, note: string, amountPaise?: number) {
    return request<{ payment: AdminPayment }>(`/admin/payments/${paymentId}/refund`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({ note, ...(amountPaise ? { amountPaise } : {}) }),
    });
  },

  /** 200 for an admin, 403 otherwise. The route guard polls this. */
  session(): Promise<{ admin: true; email: string }> {
    return request("/admin/session", { headers: authHeader() });
  },

  metrics(): Promise<MetricsResponse> {
    return request("/admin/metrics", { headers: authHeader() });
  },

  users(params: { q?: string; plan?: string; page?: number; pageSize?: number }): Promise<UsersListResponse> {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.plan) qs.set("plan", params.plan);
    if (params.page) qs.set("page", String(params.page));
    if (params.pageSize) qs.set("pageSize", String(params.pageSize));
    const query = qs.toString();
    return request(`/admin/users${query ? `?${query}` : ""}`, { headers: authHeader() });
  },

  user(id: string): Promise<UserDetailResponse> {
    return request(`/admin/users/${id}`, { headers: authHeader() });
  },

  getPlans(): Promise<PlansConfig> {
    return request("/admin/plans", { headers: authHeader() });
  },

  savePlans(config: PlansConfig): Promise<PlansConfig> {
    return request("/admin/plans", {
      method: "PUT",
      headers: authHeader(),
      body: JSON.stringify(config),
    });
  },

  getProviders(): Promise<ProvidersConfig> {
    return request("/admin/providers", { headers: authHeader() });
  },

  saveProviders(config: {
    llm: Partial<ProvidersConfig["llm"]>;
    moderation: Partial<ProvidersConfig["moderation"]>;
  }): Promise<ProvidersConfig> {
    return request("/admin/providers", {
      method: "PUT",
      headers: authHeader(),
      body: JSON.stringify(config),
    });
  },

  testProvider(target: "llm" | "moderation"): Promise<ProviderTestResult> {
    return request("/admin/providers/test", {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({ target }),
    });
  },
};
