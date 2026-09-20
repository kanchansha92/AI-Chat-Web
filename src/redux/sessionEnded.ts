import { createAction } from "@reduxjs/toolkit";

/**
 * The session is over - either the user signed out, or the server answered 401
 * and the fetch layer ended it for them.
 *
 * It lives in its own module rather than in authSlice so that the slices
 * holding a person's content can react to it without importing authSlice (which
 * imports services/authService, which would then import them back).
 *
 * Every slice that holds content belonging to the signed-in person must handle
 * this by returning genuinely EMPTY state - not its own `initialState`, which
 * is read from localStorage at module load and would restore the very data the
 * sign-out is meant to remove.
 */
export const sessionEnded = createAction("app/sessionEnded");
