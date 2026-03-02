/**
 * AI Assistant Slice
 *
 * Manages AI Chat Panel (ACP) state: provider selection,
 * CLI status, analysis, and chat conversation.
 */

import { invoke } from "@tauri-apps/api/core";
import type { StateCreator } from "zustand";
import type { FullAppStore } from "./types";

// ============================================================================
// Types
// ============================================================================

export type AiProvider = "claude" | "codex" | "opencode";
export type AiAnalysisScope = "current" | "all";
export type AiAnalysisType =
  | "summary"
  | "repeated"
  | "unresolved"
  | "prompt_skill_optimization"
  | "chat";
/** Which provider's session data to feed into the AI analysis.
 *  `"auto"` = use whatever session/project is selected in the main app. */
export type AiDataSourceProvider = "auto" | AiProvider;

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface AiChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AiChatMessage[];
}

export interface CliStatus {
  installed: boolean;
  path?: string;
  version?: string;
  lastChecked: string;
}

export interface CliDetectResult {
  installed: boolean;
  path?: string;
  version?: string;
}

// ============================================================================
// State Interface
// ============================================================================

export interface AiAssistantSliceState {
  isAiPanelOpen: boolean;
  aiPanelWidth: number;
  /** Which CLI to run the analysis (AI execution engine) */
  selectedAiProvider: AiProvider;
  cliStatuses: Record<string, CliStatus>;
  /** Which provider's session files to read (data source, independent of execution engine) */
  aiDataSourceProvider: AiDataSourceProvider;
  aiAnalysisScope: AiAnalysisScope;
  aiAnalysisType: AiAnalysisType;
  isAiAnalyzing: boolean;
  aiChatSessions: AiChatSession[];
  activeAiChatSessionId: string;
  aiMessages: AiChatMessage[];
  isAiStreaming: boolean;
  activeRequestId: string | null;
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface AiAssistantSliceActions {
  setAiPanelOpen: (open: boolean) => void;
  toggleAiPanel: () => void;
  setAiPanelWidth: (width: number) => void;
  setAiProvider: (provider: AiProvider) => void;
  setCliStatus: (cli: string, status: CliStatus) => void;
  detectAllCli: () => Promise<void>;
  setAiDataSourceProvider: (provider: AiDataSourceProvider) => void;
  setAiAnalysisScope: (scope: AiAnalysisScope) => void;
  setAiAnalysisType: (type: AiAnalysisType) => void;
  createAiChatSession: (title?: string) => void;
  switchAiChatSession: (sessionId: string) => void;
  deleteAiChatSession: (sessionId: string) => void;
  appendAiMessage: (msg: AiChatMessage) => void;
  appendAiStreamDelta: (id: string, delta: string) => void;
  finalizeAiStream: (id: string) => void;
  clearAiMessages: () => void;
  setIsAiAnalyzing: (v: boolean) => void;
  setIsAiStreaming: (v: boolean) => void;
  setActiveRequestId: (id: string | null) => void;
}

export type AiAssistantSlice = AiAssistantSliceState & AiAssistantSliceActions;

// ============================================================================
// Helpers
// ============================================================================

function getInitialPanelWidth(): number {
  try {
    const stored = localStorage.getItem("aiPanelWidth");
    if (stored != null) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= 300 && parsed <= 800) {
        return parsed;
      }
    }
  } catch {
    // localStorage not available
  }
  return 400;
}

// ============================================================================
// Initial State
// ============================================================================

const initialAiAssistantState: AiAssistantSliceState = {
  isAiPanelOpen: false,
  aiPanelWidth: getInitialPanelWidth(),
  selectedAiProvider: "claude",
  cliStatuses: {},
  aiDataSourceProvider: "auto",
  aiAnalysisScope: "current",
  aiAnalysisType: "summary",
  isAiAnalyzing: false,
  aiChatSessions: [
    {
      id: "chat-1",
      title: "Chat 1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    },
  ],
  activeAiChatSessionId: "chat-1",
  aiMessages: [],
  isAiStreaming: false,
  activeRequestId: null,
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createAiAssistantSlice: StateCreator<
  FullAppStore,
  [],
  [],
  AiAssistantSlice
> = (set, get) => ({
  ...initialAiAssistantState,

  setAiPanelOpen: (open) => set({ isAiPanelOpen: open }),

  toggleAiPanel: () =>
    set((state) => ({ isAiPanelOpen: !state.isAiPanelOpen })),

  setAiPanelWidth: (width) => {
    const clamped = Math.max(300, Math.min(800, width));
    try {
      localStorage.setItem("aiPanelWidth", String(clamped));
    } catch {
      // ignore
    }
    set({ aiPanelWidth: clamped });
  },

  setAiProvider: (provider) => set({ selectedAiProvider: provider }),

  setCliStatus: (cli, status) =>
    set((state) => ({
      cliStatuses: { ...state.cliStatuses, [cli]: status },
    })),

  detectAllCli: async () => {
    const providers: AiProvider[] = ["claude", "codex", "opencode"];
    await Promise.allSettled(
      providers.map(async (cli) => {
        try {
          const result = await invoke<CliDetectResult>("detect_cli", {
            cliName: cli,
          });
          get().setCliStatus(cli, {
            ...result,
            lastChecked: new Date().toISOString(),
          });
        } catch (error) {
          get().setCliStatus(cli, {
            installed: false,
            lastChecked: new Date().toISOString(),
          });
          console.error(`Failed to detect ${cli}:`, error);
        }
      })
    );
  },

  setAiDataSourceProvider: (provider) => set({ aiDataSourceProvider: provider }),

  setAiAnalysisScope: (scope) => set({ aiAnalysisScope: scope }),

  setAiAnalysisType: (type) => set({ aiAnalysisType: type }),

  createAiChatSession: (title) =>
    set((state) => {
      const nextIndex = state.aiChatSessions.length + 1;
      const now = new Date().toISOString();
      const sessionId = crypto.randomUUID();
      const newSession: AiChatSession = {
        id: sessionId,
        title: title?.trim() || `Chat ${nextIndex}`,
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      return {
        aiChatSessions: [...state.aiChatSessions, newSession],
        activeAiChatSessionId: sessionId,
        aiMessages: [],
        isAiStreaming: false,
        activeRequestId: null,
      };
    }),

  switchAiChatSession: (sessionId) =>
    set((state) => {
      const targetSession = state.aiChatSessions.find((s) => s.id === sessionId);
      if (!targetSession || state.isAiStreaming) return state;
      return {
        activeAiChatSessionId: sessionId,
        aiMessages: targetSession.messages,
      };
    }),

  deleteAiChatSession: (sessionId) =>
    set((state) => {
      if (state.aiChatSessions.length <= 1) {
        const now = new Date().toISOString();
        const current = state.aiChatSessions[0] ?? {
          id: "chat-1",
          title: "Chat 1",
          createdAt: now,
          updatedAt: now,
          messages: [],
        };
        const resetSession: AiChatSession = {
          ...current,
          messages: [],
          updatedAt: now,
        };
        return {
          aiChatSessions: [resetSession],
          activeAiChatSessionId: resetSession.id,
          aiMessages: [],
          isAiStreaming: false,
          activeRequestId: null,
        };
      }

      const remaining = state.aiChatSessions.filter((s) => s.id !== sessionId);
      const nextActive =
        state.activeAiChatSessionId === sessionId
          ? remaining[0]
          : remaining.find((s) => s.id === state.activeAiChatSessionId) || remaining[0];
      if (nextActive == null) {
        return state;
      }

      return {
        aiChatSessions: remaining,
        activeAiChatSessionId: nextActive.id,
        aiMessages: nextActive.messages,
      };
    }),

  appendAiMessage: (msg) =>
    set((state) => {
      const MAX_MESSAGES = 20; // 10 turns
      const now = new Date().toISOString();
      const sessions = state.aiChatSessions.map((session) => {
        if (session.id !== state.activeAiChatSessionId) return session;
        const messages = [...session.messages, msg].slice(-MAX_MESSAGES);
        return { ...session, messages, updatedAt: now };
      });
      const active = sessions.find((s) => s.id === state.activeAiChatSessionId);
      return { aiChatSessions: sessions, aiMessages: active?.messages ?? [] };
    }),

  appendAiStreamDelta: (id, delta) =>
    set((state) => {
      const now = new Date().toISOString();
      const sessions = state.aiChatSessions.map((session) => {
        const hasTarget = session.messages.some((msg) => msg.id === id);
        if (!hasTarget) return session;
        return {
          ...session,
          updatedAt: now,
          messages: session.messages.map((msg) =>
            msg.id === id ? { ...msg, content: msg.content + delta } : msg
          ),
        };
      });
      const active = sessions.find((s) => s.id === state.activeAiChatSessionId);
      return { aiChatSessions: sessions, aiMessages: active?.messages ?? state.aiMessages };
    }),

  finalizeAiStream: (id) =>
    set((state) => {
      const now = new Date().toISOString();
      const sessions = state.aiChatSessions.map((session) => {
        const hasTarget = session.messages.some((msg) => msg.id === id);
        if (!hasTarget) return session;
        return {
          ...session,
          updatedAt: now,
          messages: session.messages.map((msg) =>
            msg.id === id ? { ...msg, isStreaming: false } : msg
          ),
        };
      });
      const active = sessions.find((s) => s.id === state.activeAiChatSessionId);
      return {
        aiChatSessions: sessions,
        aiMessages: active?.messages ?? state.aiMessages,
        isAiStreaming: false,
        activeRequestId: null,
      };
    }),

  clearAiMessages: () =>
    set((state) => {
      const now = new Date().toISOString();
      const sessions = state.aiChatSessions.map((session) =>
        session.id === state.activeAiChatSessionId
          ? { ...session, messages: [], updatedAt: now }
          : session
      );
      return { aiChatSessions: sessions, aiMessages: [] };
    }),

  setIsAiAnalyzing: (v) => set({ isAiAnalyzing: v }),

  setIsAiStreaming: (v) => set({ isAiStreaming: v }),

  setActiveRequestId: (id) => set({ activeRequestId: id }),
});
