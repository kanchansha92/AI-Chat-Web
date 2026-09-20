import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
    authService,
    clearSession,
    getToken,
    setToken,
    type AuthUser,
} from "../services/authService";
import { sessionEnded } from "./sessionEnded";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
    token: string | null;
    user: AuthUser | null;
    status: AuthStatus;
}

const initialState: AuthState = {
    token: getToken(),
    user: null,
    status: "idle",
};

/** Called once on app start. Revalidates a saved token against GET /auth/me,
 * which is what makes login stick across a refresh. On failure the token is
 * cleared and status goes to "unauthenticated". */
export const bootstrap = createAsyncThunk("auth/bootstrap", async (_: void, { rejectWithValue }) => {
    const token = getToken();
    if (!token) {
        return rejectWithValue(null);
    }
    try {
        const { user, billing, credits } = await authService.me();
        return { token, user, billing, credits };
    } catch {
        setToken(null);
        return rejectWithValue(null);
    }
});

/**
 * Calls POST /auth/logout (best-effort), then clears local state either way.
 *
 * "Local state" is more than the token. This used to be `setToken(null)` alone,
 * which left the signed-out person's general-chat transcripts and pins in both
 * localStorage and the Redux store - so the next person to sign in on the same
 * machine found them in Home's "Recent" rail and in command-palette search, and
 * a reload did not clear them either. `clearSession()` handles browser storage;
 * `sessionEnded` empties the slices that hold them.
 */
export const logout = createAsyncThunk("auth/logout", async (_: void, { dispatch }) => {
    try {
        await authService.logout();
    } catch {
        // The token may already be expired; log out locally regardless.
    } finally {
        clearSession();
        dispatch(sessionEnded());
    }
});

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        /** Called after a successful register/login response. */
        setAuth: (state, action: PayloadAction<{ token: string; user: AuthUser }>) => {
            setToken(action.payload.token);
            state.token = action.payload.token;
            state.user = action.payload.user;
            state.status = "authenticated";
        },
        /** Replace the stored user after a profile change, keeping the token. */
        setUser: (state, action: PayloadAction<AuthUser>) => {
            state.user = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(bootstrap.pending, (state) => {
                state.status = "loading";
            })
            .addCase(bootstrap.fulfilled, (state, action) => {
                state.token = action.payload.token;
                state.user = action.payload.user;
                state.status = "authenticated";
            })
            .addCase(bootstrap.rejected, (state) => {
                state.token = null;
                state.user = null;
                state.status = "unauthenticated";
            })
            .addCase(logout.fulfilled, (state) => {
                state.token = null;
                state.user = null;
                state.status = "unauthenticated";
            });
    },
});

export const { setAuth, setUser } = authSlice.actions;
export default authSlice.reducer;