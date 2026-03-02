import { useTranslation } from "react-i18next";
import { Bot, X, Trash2, Download, Sparkles, ArrowLeftRight, Plus } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { useResizablePanel } from "../../hooks/useResizablePanel";
import { useAiAssistant } from "../../hooks/useAiAssistant";
import { ChatHistory } from "./ChatHistory";
import { ChatInput } from "./ChatInput";
import { ProviderSelector } from "./ProviderSelector";
import { Button } from "@/components/ui/button";

export function AIAssistantPanel() {
  const { t } = useTranslation();
  const {
    isAiPanelOpen,
    setAiPanelOpen,
    aiMessages,
    clearAiMessages,
    isAiAnalyzing,
    isAiStreaming,
    aiDataSourceProvider,
    aiAnalysisScope,
    aiChatSessions,
    activeAiChatSessionId,
    createAiChatSession,
    switchAiChatSession,
    setAiAnalysisScope,
  } = useAppStore((s) => ({
    isAiPanelOpen: s.isAiPanelOpen,
    setAiPanelOpen: s.setAiPanelOpen,
    aiMessages: s.aiMessages,
    clearAiMessages: s.clearAiMessages,
    isAiAnalyzing: s.isAiAnalyzing,
    isAiStreaming: s.isAiStreaming,
    aiDataSourceProvider: s.aiDataSourceProvider,
    aiAnalysisScope: s.aiAnalysisScope,
    aiChatSessions: s.aiChatSessions,
    activeAiChatSessionId: s.activeAiChatSessionId,
    createAiChatSession: s.createAiChatSession,
    switchAiChatSession: s.switchAiChatSession,
    setAiAnalysisScope: s.setAiAnalysisScope,
  }));

  const { width, isResizing, handleMouseDown } = useResizablePanel({
    defaultWidth: 400,
    minWidth: 300,
    maxWidth: 800,
    storageKey: "ai-panel-width",
    direction: "left",
  });

  const { sendMessage, exportReport } = useAiAssistant();

  if (!isAiPanelOpen) {
    return (
      <aside
        className="flex flex-col border-l border-border/50 bg-card/90 w-11 items-center pt-3 gap-2 flex-shrink-0"
        aria-label={t("aiAssistant.panel.title")}
      >
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-lg"
          onClick={() => setAiPanelOpen(true)}
          aria-label={t("aiAssistant.panel.open")}
          title={t("aiAssistant.panel.open")}
        >
          <Bot className="w-4 h-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside
      className="flex flex-col border-l border-border/50 bg-card/95 backdrop-blur-sm flex-shrink-0 relative"
      style={{ width, userSelect: isResizing ? "none" : undefined }}
      aria-label={t("aiAssistant.panel.title")}
    >
      {/* Drag handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 transition-colors z-10"
        onMouseDown={handleMouseDown}
        title={t("aiAssistant.panel.dragHint")}
      />

      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border/50 bg-gradient-to-b from-muted/25 to-transparent flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-primary/12 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground truncate">
              {t("aiAssistant.panel.title")}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <ProviderSelector />
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => setAiPanelOpen(false)}
              aria-label={t("aiAssistant.panel.close")}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            {isAiStreaming
              ? t("aiAssistant.status.streaming")
              : isAiAnalyzing
                ? t("aiAssistant.status.analyzing")
                : t("aiAssistant.status.ready")}
          </span>
        </div>

        <div className="mt-1.5 flex items-center gap-1.5">
          <select
            className="h-6 flex-1 rounded border border-border bg-background px-2 text-[10px] text-foreground focus:outline-none"
            value={activeAiChatSessionId}
            onChange={(e) => switchAiChatSession(e.target.value)}
            disabled={isAiStreaming}
            aria-label={t("aiAssistant.chat.sessionSelect")}
          >
            {aiChatSessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-1.5 text-[10px] gap-1"
            onClick={() => createAiChatSession(t("aiAssistant.chat.newSessionDefault"))}
            disabled={isAiStreaming || isAiAnalyzing}
            title={t("aiAssistant.chat.newSession")}
          >
            <Plus className="w-3 h-3" />
            {t("aiAssistant.chat.newSession")}
          </Button>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground truncate">
            {t("aiAssistant.chat.context", { defaultValue: "对话范围" })}：
            {aiDataSourceProvider === "auto"
              ? aiAnalysisScope === "current"
                ? t("aiAssistant.scope.current")
                : t("aiAssistant.scope.all")
              : aiDataSourceProvider === "claude"
                ? "Claude"
                : aiDataSourceProvider === "codex"
                  ? "Codex"
                  : "OpenCode"}
          </p>
          {aiDataSourceProvider === "auto" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-muted-foreground gap-1 hover:text-foreground"
              onClick={() =>
                setAiAnalysisScope(aiAnalysisScope === "current" ? "all" : "current")
              }
            >
              <ArrowLeftRight className="w-3 h-3" />
              {aiAnalysisScope === "current"
                ? t("aiAssistant.scope.all")
                : t("aiAssistant.scope.current")}
            </Button>
          )}
        </div>
      </div>

      {/* Chat History — scrollable */}
      <ChatHistory />

      {/* Input area */}
      <div className="px-3 py-2.5 border-t border-border/50 bg-muted/10 flex-shrink-0 space-y-2">
        <ChatInput onSend={sendMessage} />
        {aiMessages.length > 0 && (
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-muted-foreground gap-1.5 hover:text-foreground"
              onClick={exportReport}
            >
              <Download className="w-3 h-3" />
              {t("aiAssistant.export.button")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-muted-foreground gap-1.5 hover:text-destructive"
              onClick={clearAiMessages}
            >
              <Trash2 className="w-3 h-3" />
              {t("aiAssistant.chat.clear")}
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
