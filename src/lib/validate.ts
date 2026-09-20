import { formCopy } from "../copy";

// Each check returns the message for the first problem it finds, or null. The
// server re-validates everything; this is only to save a round-trip.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return formCopy.email.empty;
  if (!EMAIL_RE.test(v)) return formCopy.email.malformed;
  return null;
}

export function validateName(value: string): string | null {
  const v = value.trim();
  if (!v) return formCopy.name.empty;
  if (v.length > 50) return formCopy.name.tooLong;
  return null;
}

export function validateSignupPassword(value: string): string | null {
  if (!value) return formCopy.passwordSignup.empty;
  if (value.length < 10) return formCopy.passwordSignup.tooShort;
  if (!/\d/.test(value)) return formCopy.passwordSignup.tooObvious;
  return null;
}

/** Presence only - the server owns whether it actually matches. */
export function validateLoginPassword(value: string): string | null {
  if (!value) return formCopy.passwordLogin.empty;
  return null;
}

/** Rejects impossible dates (31 Feb) and under-18s. The age gate is absolute. */
export function validateDob(day: string, month: string, year: string): string | null {
  if (!day || !month || !year) return formCopy.dob.empty;

  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) {
    return formCopy.dob.invalid;
  }
  if (y < 1900 || m < 1 || m > 12 || d < 1 || d > 31) return formCopy.dob.invalid;

  const dt = new Date(y, m - 1, d);
  // new Date() rolls 31 Feb over into March, so if the fields don't survive the
  // round-trip the date was never real.
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return formCopy.dob.invalid;
  }
  if (dt.getTime() > Date.now()) return formCopy.dob.invalid;

  const now = new Date();
  let age = now.getFullYear() - y;
  const hadBirthday =
    now.getMonth() > m - 1 || (now.getMonth() === m - 1 && now.getDate() >= d);
  if (!hadBirthday) age -= 1;
  if (age < 18) return formCopy.dob.underage;

  return null;
}
