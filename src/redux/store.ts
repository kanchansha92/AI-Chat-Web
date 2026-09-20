import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import generalChatsReducer from "./generalChatsSlice";
import pinsReducer from "./pinsSlice";
import billingReducer from "./billingSlice";
import { setupPersistence } from "./persist";
import { onNetEvent } from "../lib/netStatus";
import { sessionEnded } from "./sessionEnded";

export const store = configureStore({
    reducer: {
        auth: authReducer,
        generalChats: generalChatsReducer,
        pins: pinsReducer,
        billing: billingReducer,
    },
});

// Mirrors the client-only slices into localStorage under the same keys as before.
setupPersistence(store);

// A 401 anywhere ends the session. The fetch layer cannot dispatch - importing
// the store from services/authService would be a cycle - so it raises this on
// the net bus and the store empties the slices holding the signed-out person's
// content. The persistence subscription above then writes that empty state
// through to localStorage.
onNetEvent((e) => {
    if (e.type === "signedOut") store.dispatch(sessionEnded());
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
