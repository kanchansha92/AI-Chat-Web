import { useDispatch, useSelector, useStore, type TypedUseSelectorHook } from "react-redux";
import type { AppDispatch, RootState, store } from "../redux/store";

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/**
 * The store itself, for reading state at an exact moment rather than at render
 * time - "which chat are we in right now, immediately after that dispatch?".
 *
 * Prefer useAppSelector everywhere else: this does not subscribe, so a
 * component will not re-render when what it reads changes.
 */
export const useAppStore: () => typeof store = useStore;