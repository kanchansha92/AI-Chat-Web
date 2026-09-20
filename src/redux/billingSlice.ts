import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { billingService } from "../services/billingService";
import type { BillingState, PlanCatalogue } from "../services/billingService";
import { creditsService } from "../services/creditsService";
import { usageService } from "../services/usageService";
import type { UsageSnapshot } from "../services/usageService";
import { sessionEnded } from "./sessionEnded";

// Plan, credits and usage as the SERVER last reported them.
//
// Nothing in this slice is ever set optimistically. A cancel, an upgrade, a
// credit spend: the reducer only moves when a response comes back, because a
// UI that unlocks a feature the server has not granted is worse than a UI that
// takes a moment to catch up.

interface Slice {
  billing: BillingState | null;
  credits: { total: number; purchased: number; granted: number } | null;
  usage: UsageSnapshot | null;
  catalogue: PlanCatalogue | null;
  status: "idle" | "loading" | "ready" | "error";
  /** Set while a checkout is in flight so two buttons can't both open one. */
  busy: boolean;
}

const initialState: Slice = {
  billing: null,
  credits: null,
  usage: null,
  catalogue: null,
  status: "idle",
  busy: false,
};

/** Everything the billing screens need, in one round of requests. */
export const loadBilling = createAsyncThunk("billing/load", async () => {
  const [billing, credits, usage] = await Promise.all([
    billingService.me(),
    creditsService.balance(),
    usageService.snapshot(),
  ]);
  return { billing, credits: { total: credits.total, purchased: credits.purchased, granted: credits.granted }, usage };
});

/** The public catalogue - prices and limits, fetched once. */
export const loadCatalogue = createAsyncThunk("billing/catalogue", async () => billingService.plans());

/**
 * After a checkout the webhook may still be in flight, so poll /billing/me
 * until the status moves (or we give up and show what we have).
 */
export const awaitActivation = createAsyncThunk(
  "billing/awaitActivation",
  async ({ was }: { was: string | null }) => {
    const deadline = Date.now() + 20_000;
    let latest = await billingService.me();
    while (Date.now() < deadline) {
      const now = latest.subscription ? latest.subscription.status : null;
      if (now !== was && now !== "INCOMPLETE") break;
      await new Promise((r) => setTimeout(r, 1500));
      latest = await billingService.me();
    }
    const credits = await creditsService.balance();
    return { billing: latest, credits: { total: credits.total, purchased: credits.purchased, granted: credits.granted } };
  }
);

const billingSlice = createSlice({
  name: "billing",
  initialState,
  reducers: {
    /** Straight from a server response (auth/me carries billing + credits). */
    setBilling(state, action: PayloadAction<BillingState | null>) {
      state.billing = action.payload;
      if (action.payload) state.status = "ready";
    },
    setCredits(state, action: PayloadAction<{ total: number; purchased: number; granted: number } | null>) {
      state.credits = action.payload;
    },
    setUsage(state, action: PayloadAction<UsageSnapshot | null>) {
      state.usage = action.payload;
    },
    /** A send came back with a fresh credit balance - keep the chip honest. */
    creditsChanged(state, action: PayloadAction<number>) {
      if (state.credits) state.credits = { ...state.credits, total: action.payload };
      else state.credits = { total: action.payload, purchased: 0, granted: 0 };
    },
    setBusy(state, action: PayloadAction<boolean>) {
      state.busy = action.payload;
    },
    clearBilling(state) {
      state.billing = null;
      state.credits = null;
      state.usage = null;
      state.status = "idle";
      state.busy = false;
    },
  },
  extraReducers: (b) => {
    b.addCase(loadBilling.pending, (state) => {
      if (state.status === "idle") state.status = "loading";
    });
    b.addCase(loadBilling.fulfilled, (state, action) => {
      state.billing = action.payload.billing;
      state.credits = action.payload.credits;
      state.usage = action.payload.usage;
      state.status = "ready";
    });
    b.addCase(loadBilling.rejected, (state) => {
      state.status = "error";
    });
    b.addCase(loadCatalogue.fulfilled, (state, action) => {
      state.catalogue = action.payload;
    });
    b.addCase(awaitActivation.fulfilled, (state, action) => {
      state.billing = action.payload.billing;
      state.credits = action.payload.credits;
      state.status = "ready";
    });
    // Signing out empties this with everything else the session held.
    b.addCase(sessionEnded, (state) => {
      state.billing = null;
      state.credits = null;
      state.usage = null;
      state.status = "idle";
      state.busy = false;
    });
    // GET /auth/me carries the same snapshot, so a refresh has the plan and the
    // balance before any billing screen is opened.
    b.addMatcher(
      (action): action is { type: string; payload: { billing?: BillingState | null; credits?: Slice["credits"] } } =>
        action.type === "auth/bootstrap/fulfilled",
      (state, action) => {
        if (action.payload && action.payload.billing) {
          state.billing = action.payload.billing;
          state.status = "ready";
        }
        if (action.payload && action.payload.credits) state.credits = action.payload.credits;
      }
    );
  },
});

export const { setBilling, setCredits, setUsage, creditsChanged, setBusy, clearBilling } = billingSlice.actions;
export default billingSlice.reducer;
