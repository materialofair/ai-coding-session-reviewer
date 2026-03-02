import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Loader2, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "../../store/useAppStore";
import type {
  AiAnalysisScope,
  AiAnalysisType,
  AiDataSourceProvider,
} from "../../store/slices/aiAssistantSlice";

interface AnalysisSelectorProps {
  onStartAnalysis: () => void;
}

export function AnalysisSelector({ onStartAnalysis }: AnalysisSelectorProps) {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const {
    aiDataSourceProvider,
    aiAnalysisScope,
    aiAnalysisType,
    isAiAnalyzing,
    isAiStreaming,
    setAiDataSourceProvider,
    setAiAnalysisScope,
    setAiAnalysisType,
  } = useAppStore((s) => ({
    aiDataSourceProvider: s.aiDataSourceProvider,
    aiAnalysisScope: s.aiAnalysisScope,
    aiAnalysisType: s.aiAnalysisType,
    isAiAnalyzing: s.isAiAnalyzing,
    isAiStreaming: s.isAiStreaming,
    setAiDataSourceProvider: s.setAiDataSourceProvider,
    setAiAnalysisScope: s.setAiAnalysisScope,
    setAiAnalysisType: s.setAiAnalysisType,
  }));

  const isLoading = isAiAnalyzing || isAiStreaming;

  const dataSourceLabel = useMemo(() => {
    if (aiDataSourceProvider === "auto") return t("aiAssistant.dataSource.auto");
    if (aiDataSourceProvider === "claude") return "Claude";
    if (aiDataSourceProvider === "codex") return "Codex";
    return "OpenCode";
  }, [aiDataSourceProvider, t]);

  const scopeLabel = useMemo(
    () =>
      aiAnalysisScope === "current"
        ? t("aiAssistant.scope.current")
        : t("aiAssistant.scope.all"),
    [aiAnalysisScope, t]
  );

  const dataSources: { value: AiDataSourceProvider; label: string }[] = [
    { value: "auto", label: t("aiAssistant.dataSource.auto") },
    { value: "claude", label: "Claude" },
    { value: "codex", label: "Codex" },
    { value: "opencode", label: "OpenCode" },
  ];

  const scopes: { value: AiAnalysisScope; label: string }[] = [
    { value: "current", label: t("aiAssistant.scope.current") },
    { value: "all", label: t("aiAssistant.scope.all") },
  ];

  const types: { value: AiAnalysisType; label: string }[] = [
    { value: "summary", label: t("aiAssistant.analysis.summary") },
    { value: "repeated", label: t("aiAssistant.analysis.repeated") },
    { value: "unresolved", label: t("aiAssistant.analysis.unresolved") },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex bg-muted/70 rounded-lg p-0.5 gap-0.5">
        {types.map((type) => (
          <button
            key={type.value}
            className={cn(
              "flex-1 text-[11px] py-1.5 px-1 rounded-md transition-all duration-150 leading-tight",
              aiAnalysisType === type.value
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setAiAnalysisType(type.value)}
          >
            {type.label}
          </button>
        ))}
      </div>

      <Button
        size="sm"
        className="w-full text-xs h-9 gap-1.5 rounded-lg"
        onClick={onStartAnalysis}
        disabled={isLoading}
        aria-label={t("aiAssistant.analysis.start")}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t("aiAssistant.analysis.analyzing")}
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            {t("aiAssistant.analysis.start")}
          </>
        )}
      </Button>

      <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-2 py-1.5">
        <p className="text-[10px] text-muted-foreground truncate">
          {dataSourceLabel}
          {aiDataSourceProvider === "auto" ? ` · ${scopeLabel}` : ""}
        </p>
        <button
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
        >
          <SlidersHorizontal className="w-3 h-3" />
          {showAdvanced ? (
            <>
              {t("common.collapse", { defaultValue: "Collapse" })}
              <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              {t("common.expand", { defaultValue: "More" })}
              <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      </div>

      {showAdvanced && (
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-2.5 animate-in fade-in-50">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">
              {t("aiAssistant.dataSource.label")}
            </p>
            <div className="flex bg-muted/70 rounded-md p-0.5 gap-0.5">
              {dataSources.map((ds) => (
                <button
                  key={ds.value}
                  className={cn(
                    "flex-1 text-[11px] py-1 px-1 rounded transition-all duration-150 leading-tight",
                    aiDataSourceProvider === ds.value
                      ? "bg-background text-foreground shadow-sm font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setAiDataSourceProvider(ds.value)}
                >
                  {ds.label}
                </button>
              ))}
            </div>
          </div>

          {aiDataSourceProvider === "auto" && (
            <div className="flex bg-muted/70 rounded-md p-0.5 gap-0.5">
              {scopes.map((s) => (
                <button
                  key={s.value}
                  className={cn(
                    "flex-1 text-xs py-1 px-2 rounded transition-all duration-150",
                    aiAnalysisScope === s.value
                      ? "bg-background text-foreground shadow-sm font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setAiAnalysisScope(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
