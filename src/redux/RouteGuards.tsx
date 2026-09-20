import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAppSelector } from "../hook/hooks";

/** Require a signed-in user. Renders nothing while bootstrap is still running,
 * so a valid session isn't bounced to /signin before the check finishes. */
export function RequireAuth({ children }: { children: ReactNode }) {
    const status = useAppSelector((s) => s.auth.status);

    if (status === "idle" || status === "loading") {
        return null;
    }

    if (status === "unauthenticated") {
        return <Navigate to="/signin" replace />;
    }

    return <>{children}</>;
}

/** Keeps a signed-in user off the auth forms: /home if onboarding is done,
 * /onboarding if not. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
    const status = useAppSelector((s) => s.auth.status);
    const user = useAppSelector((s) => s.auth.user);
    const token = useAppSelector((s) => s.auth.token);

    // Wait out bootstrap only if there's a token to validate, otherwise a
    // signed-in user gets a flash of the landing screen before the bounce.
    if ((status === "idle" || status === "loading") && token) {
        return null;
    }

    if (status === "authenticated") {
        if (user?.onboardingDone) {
            return <Navigate to="/home" replace />;
        }
        return <Navigate to="/onboarding" replace />;
    }

    return <>{children}</>;
}

/** Skips /onboarding for users who already finished it. */
export function RequireOnboarding({ children }: { children: ReactNode }) {
    const status = useAppSelector((s) => s.auth.status);
    const user = useAppSelector((s) => s.auth.user);

    if (status === "idle" || status === "loading") {
        return null;
    }

    if (status === "unauthenticated") {
        return <Navigate to="/signin" replace />;
    }

    if (user?.onboardingDone) {
        return <Navigate to="/home" replace />;
    }

    return <>{children}</>;
}