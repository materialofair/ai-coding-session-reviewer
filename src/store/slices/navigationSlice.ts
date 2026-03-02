import type { StateCreator } from "zustand";
import type { FullAppStore } from "./types";

export interface NavigationSliceState {
    targetMessageUuid: string | null;
    shouldHighlightTarget: boolean;
}

export interface NavigationSliceActions {
    navigateToMessage: (uuid: string) => void;
    clearTargetMessage: () => void;
}

export type NavigationSlice = NavigationSliceState & NavigationSliceActions;

export const createNavigationSlice: StateCreator<
    FullAppStore,
    [],
    [],
    NavigationSlice
> = (set) => ({
    targetMessageUuid: null,
    shouldHighlightTarget: false,

    navigateToMessage: (uuid) => set({
        targetMessageUuid: uuid,
        shouldHighlightTarget: true
    }),

    clearTargetMessage: () => set({
        targetMessageUuid: null,
        shouldHighlightTarget: false
    })
});
