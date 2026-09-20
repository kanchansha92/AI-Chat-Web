import { paymentCopy } from "../copy";

export type PaymentErrorCode =
  | "declined"
  | "threeDSFailed"
  | "insufficientFunds"
  | "expired"
  | "generic";

export const PAYMENT_ERROR_CODES: PaymentErrorCode[] = [
  "declined",
  "threeDSFailed",
  "insufficientFunds",
  "expired",
  "generic",
];

// Gateway codes are free-form, so match loosely and fall through to "generic"
// rather than ever putting a raw gateway string in front of the user.
export function normalisePaymentCode(raw: string | null | undefined): PaymentErrorCode {
  const r = (raw ?? "").toLowerCase();
  if (/insufficient|funds|balance/.test(r)) return "insufficientFunds";
  if (/3ds|three_?ds|authentication|otp|bank check|bank_check/.test(r)) return "threeDSFailed";
  if (/expire/.test(r)) return "expired";
  if (/declin|do_not_honou?r|card_declined|failed_card|invalid_card/.test(r)) return "declined";
  return "generic";
}

export function paymentErrorMessage(code: PaymentErrorCode): string {
  switch (code) {
    case "declined":
      return paymentCopy.declined;
    case "threeDSFailed":
      return paymentCopy.threeDSFailed;
    case "insufficientFunds":
      return paymentCopy.insufficientFunds;
    case "expired":
      return paymentCopy.expired;
    case "generic":
      return paymentCopy.generic;
  }
}
