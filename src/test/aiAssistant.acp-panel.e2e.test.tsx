import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const {
  mockInvoke,
  mockListen,
  mockToastError,
  eventHandlers,
} = vi.hoisted(() => {
  const handlers: Record<string, ((event: { payload: any }) => void)[]> = {};
  return {
    mockInvoke: vi.fn(),
    mockListen: vi.fn((eventName: string, cb: (event: { payload: any }) => void) => {
      handlers[eventName] ??= [];
      handlers[eventName].push(cb);
      return Promise.resolve(() => {
        handlers[eventName] = (handlers[eventName] ?? []).filter((fn) => fn !== cb);
      });
    }),
    mockToastError: vi.fn(),
    eventHandlers: handlers,
  };
});

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: vi.fn(),
  },
}));

vi.mock("react-i18next", async () => {
  const actual = await vi.importActual<typeof import("react-i18next")>("react-i18next");
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, opts?: Record<string, string>) => opts?.defaultValue ?? key,
    }),
  };
});

import { useAiAssistant } from "@/hooks/useAiAssistant";
import { useAppStore } from "@/store/useAppStore";

function emitEvent(name: string, payload: unknown) {
  const handlers = eventHandlers[name] ?? [];
  for (const handler of handlers) {
    handler({ payload });
  }
}

describe("ACP Panel E2E (hook + store)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(eventHandlers)) {
      delete eventHandlers[key];
    }

    const now = new Date().toISOString();
    useAppStore.setState({
      selectedAiProvider: "claude",
      cliStatuses: {
        claude: { installed: true, path: "/usr/local/bin/claude", lastChecked: now },
        codex: { installed: true, path: "/usr/local/bin/codex", lastChecked: now },
        opencode: { installed: true, path: "/usr/local/bin/opencode", lastChecked: now },
      },
      aiDataSourceProvider: "auto",
      aiAnalysisScope: "current",
      aiChatSessions: [
        {
          id: "chat-e2e",
          title: "Chat E2E",
          createdAt: now,
          updatedAt: now,
          messages: [],
        },
      ],
      activeAiChatSessionId: "chat-e2e",
      aiMessages: [],
      isAiStreaming: false,
      isAiAnalyzing: false,
      activeRequestId: null,
      sessions: [],
      selectedSession: null,
      selectedProject: null,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("streams assistant message when backend emits snake_case and camelCase payloads", async () => {
    mockInvoke.mockImplementation(async (cmd: string, payload?: Record<string, any>) => {
      if (cmd === "detect_cli") {
        return { installed: true, path: `/mock/${payload?.cliName ?? "cli"}`, version: "test" };
      }

      if (cmd === "chat_with_ai") {
        const requestId = payload?.requestId as string;
        setTimeout(() => {
          emitEvent("ai_stream_chunk", {
            request_id: requestId,
            delta: "Hello ",
            elapsed_ms: 10,
          });
        }, 0);
        setTimeout(() => {
          emitEvent("ai_stream_chunk", {
            requestId,
            delta: "ACP",
            elapsedMs: 20,
          });
        }, 5);
        setTimeout(() => {
          emitEvent("ai_stream_done", {
            request_id: requestId,
            elapsed_ms: 25,
          });
        }, 10);
        return null;
      }

      if (cmd === "list_acp_sessions") {
        return [];
      }

      if (cmd === "save_acp_session") {
        return null;
      }

      return null;
    });

    const { result } = renderHook(() => useAiAssistant());

    await waitFor(() => {
      expect(mockListen).toHaveBeenCalledTimes(3);
    });

    await act(async () => {
      await result.current.sendMessage("hi");
    });

    await waitFor(() => {
      const messages = useAppStore.getState().aiMessages;
      expect(messages.length).toBe(2);
      expect(messages[0]?.role).toBe("user");
      expect(messages[0]?.content).toBe("hi");
      expect(messages[1]?.role).toBe("assistant");
      expect(messages[1]?.content).toBe("Hello ACP");
      expect(messages[1]?.isStreaming).toBe(false);
      expect(useAppStore.getState().isAiStreaming).toBe(false);
    });

    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("preserves active in-memory session when loading ACP sessions", async () => {
    const now = new Date().toISOString();
    useAppStore.setState({
      aiChatSessions: [
        {
          id: "active-chat",
          title: "Active",
          createdAt: now,
          updatedAt: now,
          messages: [
            {
              id: "user-1",
              role: "user",
              content: "hi",
              timestamp: now,
            },
            {
              id: "req-1",
              role: "assistant",
              content: "streaming...",
              timestamp: now,
              isStreaming: true,
            },
          ],
        },
      ],
      activeAiChatSessionId: "active-chat",
      aiMessages: [
        {
          id: "user-1",
          role: "user",
          content: "hi",
          timestamp: now,
        },
        {
          id: "req-1",
          role: "assistant",
          content: "streaming...",
          timestamp: now,
          isStreaming: true,
        },
      ],
      isAiStreaming: true,
    });

    mockInvoke.mockImplementation(async (cmd: string, payload?: Record<string, any>) => {
      if (cmd === "list_acp_sessions") {
        return [{ id: "disk-chat" }];
      }
      if (cmd === "load_acp_session" && payload?.sessionId === "disk-chat") {
        return {
          id: "disk-chat",
          title: "Disk Chat",
          createdAt: now,
          updatedAt: now,
          messages: [],
        };
      }
      if (cmd === "detect_cli") {
        return { installed: true, path: "/mock/cli", version: "test" };
      }
      return null;
    });

    const { result } = renderHook(() => useAiAssistant());
    void result;

    await act(async () => {
      await useAppStore.getState().loadAcpSessions();
    });

    const state = useAppStore.getState();
    expect(state.activeAiChatSessionId).toBe("active-chat");
    expect(state.aiMessages.length).toBe(2);
    expect(state.aiMessages[1]?.content).toBe("streaming...");
  });

  it("normalizes stale streaming messages loaded from disk and persists sanitized session", async () => {
    const now = new Date().toISOString();
    mockInvoke.mockImplementation(async (cmd: string, payload?: Record<string, any>) => {
      if (cmd === "list_acp_sessions") {
        return [{ id: "550e8400-e29b-41d4-a716-446655440000" }];
      }
      if (
        cmd === "load_acp_session" &&
        payload?.sessionId === "550e8400-e29b-41d4-a716-446655440000"
      ) {
        return {
          id: "550e8400-e29b-41d4-a716-446655440000",
          title: "Recovered Chat",
          createdAt: now,
          updatedAt: now,
          messages: [
            {
              id: "req-stale",
              role: "assistant",
              content: "",
              timestamp: now,
              isStreaming: true,
            },
          ],
        };
      }
      if (cmd === "save_acp_session") {
        return null;
      }
      return null;
    });

    await act(async () => {
      await useAppStore.getState().loadAcpSessions();
    });

    const state = useAppStore.getState();
    expect(state.activeAiChatSessionId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(state.aiMessages.length).toBe(1);
    expect(state.aiMessages[0]?.isStreaming).toBe(false);
    expect(state.isAiStreaming).toBe(false);

    const saveCalls = mockInvoke.mock.calls.filter(([cmd]) => cmd === "save_acp_session");
    expect(saveCalls.length).toBe(1);
    expect(saveCalls[0]?.[1]?.session?.messages?.[0]?.isStreaming).toBe(false);
  });

  it("deletes chat session and persists deletion for uuid session ids", async () => {
    const now = new Date().toISOString();
    const firstId = "550e8400-e29b-41d4-a716-446655440000";
    const secondId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

    useAppStore.setState({
      aiChatSessions: [
        {
          id: firstId,
          title: "First",
          createdAt: now,
          updatedAt: now,
          messages: [],
        },
        {
          id: secondId,
          title: "Second",
          createdAt: now,
          updatedAt: now,
          messages: [],
        },
      ],
      activeAiChatSessionId: firstId,
      aiMessages: [],
      isAiStreaming: false,
    });

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "delete_acp_session") return null;
      return null;
    });

    act(() => {
      useAppStore.getState().deleteAiChatSession(firstId);
    });

    const state = useAppStore.getState();
    expect(state.aiChatSessions.map((session) => session.id)).toEqual([secondId]);
    expect(state.activeAiChatSessionId).toBe(secondId);
    expect(mockInvoke).toHaveBeenCalledWith("delete_acp_session", {
      sessionId: firstId,
    });
  });
});
