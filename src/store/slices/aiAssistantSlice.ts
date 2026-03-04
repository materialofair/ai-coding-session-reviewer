/**
 * AI Assistant Slice
 *
 * Manages AI Chat Panel (ACP) state: provider selection,
 * CLI status, analysis, and chat conversation.
 */

import { invoke } from "@tauri-apps/api/core";
import type { StateCreator } from "zustand";
import type { FullAppStore } from "./types";

function trace(message: string, detail?: unknown) {
  if (detail === undefined) {
    console.debug(`[AI_TRACE] [store] ${message}`);
    return;
  }
  console.debug(`[AI_TRACE] [store] ${message}`, detail);
}

// Debounce helper for auto-save
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

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
  contextSessionId?: string;
  contextProjectPath?: string;
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

interface AcpSessionListItem {
  id: string;
}

const UUID_PATTERN =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function normalizeRecoveredSession(
  session: AiChatSession
): { session: AiChatSession; wasNormalized: boolean } {
  let wasNormalized = false;
  const messages = session.messages.map((message) => {
    if (!message.isStreaming) return message;
    wasNormalized = true;
    return { ...message, isStreaming: false };
  });

  if (!wasNormalized) {
    return { session, wasNormalized: false };
  }

  return {
    session: {
      ...session,
      messages,
    },
    wasNormalized: true,
  };
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
  loadAcpSessions: () => Promise<void>;
  saveCurrentAcpSession: () => Promise<void>;
  autoSaveAcpSession: (sessionId: string) => void;
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

  createAiChatSession: (title) => {
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
    });

    // Save immediately after creation
    get().saveCurrentAcpSession().catch((error: unknown) => {
      console.error("Failed to save new session:", error);
    });
  },

  switchAiChatSession: (sessionId) =>
    set((state) => {
      const targetSession = state.aiChatSessions.find((s) => s.id === sessionId);
      trace("switchAiChatSession", {
        requestedSessionId: sessionId,
        found: Boolean(targetSession),
        isAiStreaming: state.isAiStreaming,
        currentActiveSessionId: state.activeAiChatSessionId,
      });
      if (!targetSession || state.isAiStreaming) return state;
      return {
        activeAiChatSessionId: sessionId,
        aiMessages: targetSession.messages,
      };
    }),

  deleteAiChatSession: (sessionId) => {
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
    });

    // Delete from disk (persisted sessions use UUID ids only)
    if (!isUuid(sessionId)) {
      trace("deleteAiChatSession:skipDiskDelete", { sessionId, reason: "non_uuid_id" });
      return;
    }

    invoke("delete_acp_session", { sessionId }).catch((error) => {
      console.error("Failed to delete ACP session:", error);
    });
  },

  appendAiMessage: (msg) => {
    const activeSessionId = get().activeAiChatSessionId;
    trace("appendAiMessage", {
      activeSessionId,
      id: msg.id,
      role: msg.role,
      isStreaming: Boolean(msg.isStreaming),
      contentLen: msg.content.length,
    });
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
    });

    // Auto-save after message append (debounced; no promise is returned).
    try {
      get().autoSaveAcpSession(activeSessionId);
    } catch (error) {
      console.error("Failed to auto-save after message append:", error);
    }
  },

  appendAiStreamDelta: (id, delta) => {
    let targetSessionId: string | null = null;
    set((state) => {
      let matched = 0;
      const now = new Date().toISOString();
      const sessions = state.aiChatSessions.map((session) => {
        const hasTarget = session.messages.some((msg) => msg.id === id);
        if (!hasTarget) return session;
        targetSessionId = session.id;
        matched += 1;
        return {
          ...session,
          updatedAt: now,
          messages: session.messages.map((msg) =>
            msg.id === id ? { ...msg, content: msg.content + delta } : msg
          ),
        };
      });
      const active = sessions.find((s) => s.id === state.activeAiChatSessionId);
      trace("appendAiStreamDelta", {
        requestId: id,
        deltaLen: delta.length,
        matchedSessions: matched,
        activeSessionId: state.activeAiChatSessionId,
      });
      return { aiChatSessions: sessions, aiMessages: active?.messages ?? state.aiMessages };
    });

    if (targetSessionId != null) {
      try {
        get().autoSaveAcpSession(targetSessionId);
      } catch (error) {
        console.error("Failed to auto-save after stream delta:", error);
      }
    }
  },

  finalizeAiStream: (id) => {
    let targetSessionId: string | null = null;
    set((state) => {
      let matched = 0;
      const now = new Date().toISOString();
      const sessions = state.aiChatSessions.map((session) => {
        const hasTarget = session.messages.some((msg) => msg.id === id);
        if (!hasTarget) return session;
        targetSessionId = session.id;
        matched += 1;
        return {
          ...session,
          updatedAt: now,
          messages: session.messages.map((msg) =>
            msg.id === id ? { ...msg, isStreaming: false } : msg
          ),
        };
      });
      const active = sessions.find((s) => s.id === state.activeAiChatSessionId);
      trace("finalizeAiStream", {
        requestId: id,
        matchedSessions: matched,
        activeSessionId: state.activeAiChatSessionId,
      });
      return {
        aiChatSessions: sessions,
        aiMessages: active?.messages ?? state.aiMessages,
        isAiStreaming: false,
        activeRequestId: null,
      };
    });

    if (targetSessionId != null) {
      const session = get().aiChatSessions.find((item) => item.id === targetSessionId);
      if (session != null) {
        invoke("save_acp_session", { session }).catch((error) => {
          console.error("Failed to save finalized ACP session:", error);
        });
      }
    }
  },

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

  setIsAiStreaming: (v) => {
    trace("setIsAiStreaming", { value: v });
    set({ isAiStreaming: v });
  },

  setActiveRequestId: (id) => {
    trace("setActiveRequestId", { id });
    set({ activeRequestId: id });
  },

  loadAcpSessions: async () => {
    try {
      trace("loadAcpSessions:start", {
        activeSessionId: get().activeAiChatSessionId,
        isAiStreaming: get().isAiStreaming,
      });
      const sessionList = await invoke<AcpSessionListItem[]>("list_acp_sessions");
      trace("loadAcpSessions:list", { count: sessionList.length });
      if (sessionList.length === 0) {
        return;
      }

      const loadedSessions: AiChatSession[] = [];
      const normalizedSessionsToPersist: AiChatSession[] = [];
      for (const { id: sessionId } of sessionList) {
        try {
          const loaded = await invoke<AiChatSession>("load_acp_session", { sessionId });
          const { session, wasNormalized } = normalizeRecoveredSession(loaded);
          loadedSessions.push(session);
          if (wasNormalized) {
            normalizedSessionsToPersist.push(session);
          }
        } catch (error) {
          console.error(`Failed to load ACP session ${sessionId}:`, error);
        }
      }

      if (loadedSessions.length > 0) {
        loadedSessions.sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        const mostRecent = loadedSessions[0];
        if (mostRecent == null) {
          return;
        }
        set((state) => {
          const activeInMemory = state.aiChatSessions.find(
            (s) => s.id === state.activeAiChatSessionId
          );
          const shouldPreserveInMemory =
            Boolean(activeInMemory) &&
            (state.isAiStreaming || (activeInMemory?.messages.length ?? 0) > 0);

          if (shouldPreserveInMemory && activeInMemory) {
            trace("loadAcpSessions:preserveInMemoryActiveSession", {
              loadedCount: loadedSessions.length,
              activeSessionId: state.activeAiChatSessionId,
              inMemoryMessageCount: activeInMemory.messages.length,
              isAiStreaming: state.isAiStreaming,
            });
            const merged = [...loadedSessions];
            const existingIndex = merged.findIndex((s) => s.id === activeInMemory.id);
            if (existingIndex >= 0) {
              merged[existingIndex] = activeInMemory;
            } else {
              merged.unshift(activeInMemory);
            }
            return {
              aiChatSessions: merged,
              activeAiChatSessionId: activeInMemory.id,
              aiMessages: activeInMemory.messages,
            };
          }

          trace("loadAcpSessions:apply", {
            loadedCount: loadedSessions.length,
            mostRecentId: mostRecent.id,
            previousActiveSessionId: state.activeAiChatSessionId,
          });
          return {
            aiChatSessions: loadedSessions,
            activeAiChatSessionId: mostRecent.id,
            aiMessages: mostRecent.messages,
            isAiStreaming: false,
            isAiAnalyzing: false,
            activeRequestId: null,
          };
        });

        if (normalizedSessionsToPersist.length > 0) {
          await Promise.allSettled(
            normalizedSessionsToPersist.map((session) =>
              invoke("save_acp_session", { session })
            )
          );
        }
      }
    } catch (error) {
      console.error("Failed to load ACP sessions:", error);
    }
  },

  saveCurrentAcpSession: async () => {
    const state = get();
    const currentSession = state.aiChatSessions.find(
      (s) => s.id === state.activeAiChatSessionId
    );
    if (currentSession == null) {
      return;
    }

    try {
      await invoke("save_acp_session", { session: currentSession });
    } catch (error) {
      console.error("Failed to save ACP session:", error);
    }
  },

  autoSaveAcpSession: debounce(async (sessionId: string) => {
    const state = get();
    const session = state.aiChatSessions.find((s) => s.id === sessionId);
    if (session == null) {
      return;
    }

    try {
      await invoke("save_acp_session", { session });
    } catch (error) {
      console.error("Failed to auto-save ACP session:", error);
    }
  }, 500),
});
