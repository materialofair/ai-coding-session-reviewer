import type { StateCreator } from "zustand";
import type { FullAppStore } from "./types";

export interface NavigatorSliceState {
    /** Whether the right sidebar navigator is expanded */
    isNavigatorOpen: boolean;
}

export interface NavigatorSliceActions {
    toggleNavigator: () => void;
    setNavigatorOpen: (open: boolean) => void;
}

export type NavigatorSlice = NavigatorSliceState & NavigatorSliceActions;

const STORAGE_KEY = "navigator-open-v2";

export const createNavigatorSlice: StateCreator<
    FullAppStore,
    [],
    [],
    NavigatorSlice
> = (set) => ({
    isNavigatorOpen: (() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored === null ? false : stored === "true";
        } catch {
            return false;
        }
    })(),

    toggleNavigator: () => set((state) => {
        const next = !state.isNavigatorOpen;
        try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
        return { isNavigatorOpen: next };
    }),

    setNavigatorOpen: (open) => {
        try { localStorage.setItem(STORAGE_KEY, String(open)); } catch { /* ignore */ }
        set({ isNavigatorOpen: open });
    },
});
