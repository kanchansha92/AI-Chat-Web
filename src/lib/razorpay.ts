import type { Checkout } from "../services/billingService";

// Razorpay Checkout, loaded on demand.
//
// The script is only fetched when someone actually starts a payment - a Free
// user who never begins a trial never loads it, and is never asked for a card.
//
// `checkout.keyId` is the PUBLISHABLE key id the server puts in the checkout
// payload. The key secret and the webhook secret live on the server and are
// never sent here. Nothing this module returns is trusted: the handler hands
// the ids straight back to the server, which re-fetches the real state from
// Razorpay's API before anything is activated.

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

type RazorpayHandlerResponse = {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature: string;
};

type RazorpayOptions = Record<string, unknown>;
interface RazorpayInstance {
  open(): void;
  on(event: string, cb: (payload: unknown) => void): void;
  close?(): void;
}
type RazorpayCtor = new (options: RazorpayOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

let loading: Promise<RazorpayCtor> | null = null;

export class CheckoutDismissed extends Error {
  constructor() {
    super("checkout dismissed");
    this.name = "CheckoutDismissed";
  }
}

export class CheckoutFailed extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "CheckoutFailed";
    this.code = code;
  }
}

/** Load checkout.js once. Rejects if the script cannot be reached. */
export function loadRazorpay(): Promise<RazorpayCtor> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (loading) return loading;
  loading = new Promise<RazorpayCtor>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    const done = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new CheckoutFailed("— the payment window could not load. check your connection?"));
    };
    script.addEventListener("load", done, { once: true });
    script.addEventListener(
      "error",
      () => {
        loading = null;
        reject(new CheckoutFailed("— the payment window could not load. check your connection?"));
      },
      { once: true }
    );
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    } else if (window.Razorpay) {
      done();
    }
  });
  return loading;
}

export interface OpenCheckoutOptions {
  checkout: Checkout;
  name?: string;
  email?: string;
  /** Shown as the line item in the Razorpay window. */
  description: string;
}

/**
 * Open the payment window and resolve with the ids it hands back.
 *
 * Resolving here means "the window said it succeeded" and nothing more - the
 * caller must pass the ids to the server's verify endpoint, which is what
 * actually decides whether anything was paid for.
 */
export function openCheckout({
  checkout,
  name,
  email,
  description,
}: OpenCheckoutOptions): Promise<RazorpayHandlerResponse> {
  return loadRazorpay().then(
    (Razorpay) =>
      new Promise<RazorpayHandlerResponse>((resolve, reject) => {
        let settled = false;
        const options: RazorpayOptions = {
          key: checkout.keyId,
          name: "Ember",
          description,
          // A subscription (including the no-charge trial mandate) and a
          // one-off order are two different checkout shapes.
          ...(checkout.subscriptionId
            ? { subscription_id: checkout.subscriptionId }
            : { order_id: checkout.orderId, amount: checkout.amountPaise, currency: checkout.currency || "INR" }),
          // Changing the card on a live subscription rather than paying.
          ...(checkout.cardChange ? { subscription_card_change: 1, recurring: 1 } : {}),
          prefill: { ...(name ? { name } : {}), ...(email ? { email } : {}) },
          theme: { color: "#b4543a" },
          retry: { enabled: false },
          handler: (response: RazorpayHandlerResponse) => {
            settled = true;
            resolve(response);
          },
          modal: {
            ondismiss: () => {
              if (!settled) reject(new CheckoutDismissed());
            },
            escape: true,
          },
        };
        const rzp = new Razorpay(options);
        rzp.on("payment.failed", (payload: unknown) => {
          settled = true;
          const err = (payload as { error?: { description?: string; code?: string; reason?: string } })?.error;
          reject(new CheckoutFailed(err?.description || "— that payment didn't go through.", err?.reason || err?.code));
        });
        rzp.open();
      })
  );
}
