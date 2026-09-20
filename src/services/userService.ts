import { request, authHeader, type AuthUser } from "./authService";

export type OnboardingTheme = "PAPER" | "LAMPLIGHT";
export type OnboardingIntent = "COMPANY" | "ROLEPLAY" | "JOURNAL" | "LOOKING";

export const userService = {
  completeOnboarding(payload: {
    theme: OnboardingTheme;
    intent: OnboardingIntent;
  }): Promise<{ user: AuthUser }> {
    return request<{ user: AuthUser }>("/users/me/onboarding", {
      method: "PATCH",
      headers: authHeader(),
      body: JSON.stringify(payload),
    });
  },

  /**
   * Send only what changed. A 409 (ApiError with fields.email) means the
   * address is already taken.
   */
  updateProfile(payload: {
    name?: string;
    email?: string;
  }): Promise<{ user: AuthUser }> {
    return request<{ user: AuthUser }>("/users/me", {
      method: "PATCH",
      headers: authHeader(),
      body: JSON.stringify(payload),
    });
  },

  /**
   * The theme toggle. This used to be a Redux-only flip with no request behind
   * it, so the choice lasted until the next reload - at which point App.tsx
   * reapplied `data-theme` from the server's copy and it snapped back.
   */
  updateTheme(theme: OnboardingTheme): Promise<{ user: AuthUser }> {
    return request<{ user: AuthUser }>("/users/me/preferences", {
      method: "PATCH",
      headers: authHeader(),
      body: JSON.stringify({ theme }),
    });
  },

  /**
   * A wrong current password comes back as an ApiError with
   * fields.currentPassword.
   *
   * Changing the password now revokes every session, so the response carries a
   * fresh `token` for this tab - store it, or the next request 401s.
   */
  changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ user: AuthUser; token: string; message: string }> {
    return request<{ user: AuthUser; token: string; message: string }>("/users/me/password", {
      method: "PATCH",
      headers: authHeader(),
      body: JSON.stringify(payload),
    });
  },

  /** png/jpg/webp under 5mb; the server rejects anything else. */
  uploadAvatar(file: File): Promise<{ user: AuthUser }> {
    const form = new FormData();
    form.append("avatar", file);
    return request<{ user: AuthUser }>("/users/me/avatar", {
      method: "POST",
      headers: authHeader(),
      body: form,
    });
  },

  removeAvatar(): Promise<{ user: AuthUser }> {
    return request<{ user: AuthUser }>("/users/me/avatar", {
      method: "DELETE",
      headers: authHeader(),
    });
  },

  /**
   * Nothing is destroyed yet - this starts a 30-day grace that signing back in
   * cancels. `endsAt` is when the data actually goes.
   */
  scheduleDeletion(): Promise<{ deletionScheduledAt: string; endsAt: string }> {
    return request<{ deletionScheduledAt: string; endsAt: string }>("/users/me/deletion", {
      method: "POST",
      headers: authHeader(),
    });
  },

  /** Fire-and-forget: the export is emailed later as a 7-day download link. */
  requestExport(): Promise<{ requested: boolean; message: string }> {
    return request<{ requested: boolean; message: string }>("/users/me/export", {
      method: "POST",
      headers: authHeader(),
    });
  },
};
