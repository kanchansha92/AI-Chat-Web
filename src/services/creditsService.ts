import { request, authHeader } from "./authService";
import type { CreditPack } from "./billingService";

// Credits are ledger money: the client shows the balance the server reports and
// never computes one of its own.

export interface CreditGrantRow {
  id: string;
  source: "PLAN_MONTHLY" | "ADMIN" | "PROMO" | "TRIAL";
  periodKey: string;
  remaining: number;
  expiresAt: string;
}

export interface CreditBalance {
  total: number;
  purchased: number;
  granted: number;
  grants: CreditGrantRow[];
  costs: Record<string, number>;
  models: { id: string; label: string; cost: number }[];
  packs: CreditPack[];
}

export interface LedgerRow {
  id: string;
  type: "GRANT" | "PURCHASE" | "SPEND" | "REFUND" | "EXPIRE" | "ADJUST";
  amount: number;
  feature: string;
  modelId: string | null;
  refType: string | null;
  refId: string | null;
  balanceAfter: number;
  note: string | null;
  createdAt: string;
}

export const creditsService = {
  balance(): Promise<CreditBalance> {
    return request(`/credits`, { headers: authHeader() });
  },

  ledger(cursor?: string | null, limit = 50): Promise<{ items: LedgerRow[]; nextCursor: string | null }> {
    const q = new URLSearchParams();
    if (cursor) q.set("cursor", cursor);
    q.set("limit", String(limit));
    return request(`/credits/ledger?${q.toString()}`, { headers: authHeader() });
  },

  /**
   * Open an order for a pack. `idempotencyKey` makes a double click reuse the
   * same order instead of opening a second one.
   */
  order(packId: string, idempotencyKey: string) {
    return request<{ checkout: import("./billingService").Checkout }>(`/credits/packs/order`, {
      method: "POST",
      headers: { ...authHeader(), "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ packId }),
    });
  },

  verify(payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<{ granted: boolean; balance: { total: number; purchased: number; granted: number } }> {
    return request(`/credits/packs/verify`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(payload),
    });
  },
};

/** "1.5" not "1.50", "12" not "12.00" - credits read like small change. */
export function formatCredits(n: number): string {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, "");
}
