import { useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import type { AiChatMessage } from "../store/slices/aiAssistantSlice";

interface StreamChunk {
  requestId: string;
  request_id?: string;
  delta: string;
  elapsedMs: number;
  elapsed_ms?: number;
}

interface StreamDone {
  requestId: string;
  request_id?: string;
  elapsedMs: number;
  elapsed_ms?: number;
}

interface StreamError {
  requestId: string;
  request_id?: string;
  error: string;
  code: string;
}

function trace(message: string, detail?: unknown) {
  if (detail === undefined) {
    console.debug(`[AI_TRACE] ${message}`);
    return;
  }
  console.debug(`[AI_TRACE] ${message}`, detail);
}

export function useAiAssistant() {
  const { t } = useTranslation();
  const store = useAppStore();
  const unlistenRef = useRef<Array<() => void>>([]);

  // Detect all CLIs on mount
  useEffect(() => {
    store.detectAllCli();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Set up Tauri event listeners
  useEffect(() => {
    // Cancellation flag prevents duplicate listeners from async race in React StrictMode
    let cancelled = false;

    const setupListeners = async () => {
      trace("setupListeners:start");
      const u1 = await listen<StreamChunk>("ai_stream_chunk", ({ payload }) => {
        const requestId = payload.requestId ?? payload.request_id ?? "";
        const elapsedMs = payload.elapsedMs ?? payload.elapsed_ms ?? 0;
        trace("event:ai_stream_chunk", {
          requestId,
          deltaLen: payload.delta.length,
          elapsedMs,
          payloadKeys: Object.keys(payload ?? {}),
        });
        if (!requestId) {
          trace("event:ai_stream_chunk:missingRequestId", payload);
          return;
        }
        store.appendAiStreamDelta(requestId, payload.delta);
      });
      const u2 = await listen<StreamDone>("ai_stream_done", ({ payload }) => {
        const requestId = payload.requestId ?? payload.request_id ?? "";
        trace("event:ai_stream_done", {
          ...payload,
          resolvedRequestId: requestId,
          payloadKeys: Object.keys(payload ?? {}),
        });
        if (!requestId) {
          trace("event:ai_stream_done:missingRequestId", payload);
          return;
        }
        store.finalizeAiStream(requestId);
        store.setIsAiAnalyzing(false);
        store.setIsAiStreaming(false);
      });
      const u3 = await listen<StreamError>("ai_stream_error", ({ payload }) => {
        const requestId = payload.requestId ?? payload.request_id ?? "";
        trace("event:ai_stream_error", {
          ...payload,
          resolvedRequestId: requestId,
          payloadKeys: Object.keys(payload ?? {}),
        });
        if (requestId) {
          store.finalizeAiStream(requestId);
        } else {
          trace("event:ai_stream_error:missingRequestId", payload);
        }
        store.setIsAiAnalyzing(false);
        store.setIsAiStreaming(false);
        const msg = getErrorMessage(t, payload.code, payload.error, store.selectedAiProvider);
        toast.error(msg);
      });

      if (cancelled) {
        // Effect cleaned up before async completed — unlisten immediately
        trace("setupListeners:cancelled-before-ready");
        u1();
        u2();
        u3();
        return;
      }
      unlistenRef.current = [u1, u2, u3];
      trace("setupListeners:ready");
    };

    setupListeners();
    return () => {
      trace("setupListeners:cleanup");
      cancelled = true;
      unlistenRef.current.forEach((u) => u());
      unlistenRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getSessionPaths = useCallback(async (): Promise<string[]> => {
    const state = useAppStore.getState();
    const dataSource = state.aiDataSourceProvider;
    trace("getSessionPaths:start", {
      dataSource,
      selectedSession: state.selectedSession?.session_id ?? null,
      selectedProject: state.selectedProject?.name ?? null,
      scope: state.aiAnalysisScope,
    });

    // Non-auto: fetch all session files for the specified provider from disk
    if (dataSource !== "auto") {
      try {
        const paths = await invoke<string[]>("get_provider_session_paths", { provider: dataSource });
        trace("getSessionPaths:provider", { provider: dataSource, count: paths.length });
        return paths;
      } catch (error) {
        trace("getSessionPaths:error", String(error));
        toast.error(t("aiAssistant.error.unknown", { message: String(error) }));
        return [];
      }
    }

    // Auto mode priority:
    // 1) selected session -> task-level context
    // 2) selected project (without session) -> all sessions in that project
    // 3) fallback to manual scope behavior
    if (state.selectedSession?.file_path) {
      trace("getSessionPaths:fromSelectedSession");
      return [state.selectedSession.file_path];
    }

    if (state.selectedProject) {
      const paths = state.sessions.map((s) => s.file_path).filter(Boolean);
      trace("getSessionPaths:fromSelectedProject", { count: paths.length });
      return paths;
    }

    if (state.aiAnalysisScope === "all") {
      const paths = state.sessions.map((s) => s.file_path).filter(Boolean);
      trace("getSessionPaths:fromAllScope", { count: paths.length });
      return paths;
    }
    trace("getSessionPaths:empty");
    return [];
  }, [store.aiAnalysisScope, store.aiDataSourceProvider, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const startAnalysis = useCallback(async () => {
    trace("startAnalysis:start");
    const sessionPaths = await getSessionPaths();
    if (sessionPaths.length === 0) {
      trace("startAnalysis:noSessionPaths");
      toast.error(t("aiAssistant.analysis.noSession"));
      return;
    }

    const requestId = crypto.randomUUID();
    store.setIsAiAnalyzing(true);
    store.setIsAiStreaming(true);
    store.setActiveRequestId(requestId);
    store.appendAiMessage({
      id: requestId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      isStreaming: true,
    });

    try {
      trace("startAnalysis:invoke:analyze_session", {
        requestId,
        sessionPathCount: sessionPaths.length,
        provider: store.selectedAiProvider,
      });
      await invoke("analyze_session", {
        sessionPaths,
        analysisType: store.aiAnalysisType,
        provider: store.selectedAiProvider,
        requestId,
      });
      trace("startAnalysis:invoke:resolved", { requestId });
    } catch (error) {
      trace("startAnalysis:invoke:rejected", { requestId, error: String(error) });
      store.finalizeAiStream(requestId);
      store.setIsAiAnalyzing(false);
      store.setIsAiStreaming(false);
      toast.error(t("aiAssistant.error.unknown", { message: String(error) }));
    }
  }, [getSessionPaths, store, t]);

  const sendMessage = useCallback(
    async (text: string) => {
      trace("sendMessage:start", {
        textLen: text.length,
        trimmedLen: text.trim().length,
        isAiStreaming: store.isAiStreaming,
        selectedProvider: store.selectedAiProvider,
        activeSessionId: useAppStore.getState().activeAiChatSessionId,
      });
      if (!text.trim() || store.isAiStreaming) {
        trace("sendMessage:blocked:emptyOrStreaming");
        return;
      }
      if (store.aiMessages.length >= 20) {
        trace("sendMessage:blocked:limitReached", { current: store.aiMessages.length });
        toast.error(t("aiAssistant.chat.limitReached", { max: "10" }));
        return;
      }

      // Check if CLI is installed
      const cliStatus = store.cliStatuses[store.selectedAiProvider];
      if (!cliStatus?.installed) {
        trace("sendMessage:blocked:cliNotInstalled", {
          provider: store.selectedAiProvider,
          cliStatus,
        });
        toast.error(t("aiAssistant.error.cliNotFound", { cli: store.selectedAiProvider }));
        return;
      }

      const userMsg: AiChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };
      store.appendAiMessage(userMsg);

      const requestId = crypto.randomUUID();
      trace("sendMessage:requestCreated", { requestId });
      store.setIsAiStreaming(true);
      store.setActiveRequestId(requestId);
      store.appendAiMessage({
        id: requestId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        isStreaming: true,
      });

      const sessionPaths = await getSessionPaths();
      const messages = useAppStore
        .getState()
        .aiMessages.filter((m) => !m.isStreaming)
        .map((m) => ({ role: m.role, content: m.content }));
      trace("sendMessage:invoke:chat_with_ai", {
        requestId,
        messagesCount: messages.length,
        sessionPathCount: sessionPaths.length,
        provider: store.selectedAiProvider,
      });

      try {
        await invoke("chat_with_ai", {
          messages,
          contextSessionPaths: sessionPaths,
          provider: store.selectedAiProvider,
          requestId,
        });
        trace("sendMessage:invoke:resolved", { requestId });
      } catch (error) {
        trace("sendMessage:invoke:rejected", { requestId, error: String(error) });
        store.finalizeAiStream(requestId);
        store.setIsAiStreaming(false);
        const errorMsg = String(error);
        console.error("Chat error:", errorMsg);
        toast.error(t("aiAssistant.error.unknown", { message: errorMsg }));
      }
    },
    [getSessionPaths, store, t]
  );

  const exportReport = useCallback(async () => {
    const messages = useAppStore.getState().aiMessages;
    if (messages.length === 0) return;

    // Build markdown content
    const projectName = useAppStore.getState().selectedProject?.name ?? "unknown";
    const timestamp = new Date().toISOString();
    const lines = [
      `# AI Analysis Report`,
      ``,
      `**Project**: ${projectName}`,
      `**Generated**: ${timestamp}`,
      ``,
      `---`,
      ``,
    ];
    for (const msg of messages) {
      if (msg.isStreaming) continue;
      const role = msg.role === "user" ? "**You**" : "**AI Assistant**";
      lines.push(`### ${role}`);
      lines.push(``);
      lines.push(msg.content);
      lines.push(``);
    }
    const content = lines.join("\n");

    try {
      const dir = await open({ directory: true });
      if (!dir) return;
      const filePath = await invoke<string>("export_ai_report", {
        content,
        outputDir: dir,
      });
      toast.success(t("aiAssistant.export.success", { path: filePath }));
    } catch (error) {
      toast.error(t("aiAssistant.export.error", { error: String(error) }));
    }
  }, [t]);

  return { startAnalysis, sendMessage, exportReport };
}

function getErrorMessage(
  t: (key: string, opts?: Record<string, string>) => string,
  code: string,
  error: string,
  cli: string
): string {
  switch (code) {
    case "CLI_NOT_FOUND":
      if (error.includes("ACP adapter unavailable")) {
        return error;
      }
      return t("aiAssistant.error.cliNotFound", { cli });
    case "CLI_AUTH_ERROR":
      return t("aiAssistant.error.authRequired", { cli });
    case "RATE_LIMIT":
      return t("aiAssistant.error.rateLimit");
    case "TIMEOUT":
      return t("aiAssistant.error.timeout");
    case "EMPTY_CONTEXT":
      return t("aiAssistant.error.emptyContext");
    default:
      return t("aiAssistant.error.unknown", { message: error });
  }
}
