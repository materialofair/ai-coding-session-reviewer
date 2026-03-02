import { memo, useEffect, useState } from "react";
import { CheckCircle2, Clock3, AlertTriangle, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Renderer } from "@/shared/RendererHeader";
import { ToolIcon } from "../ToolIcon";
import { layout } from "../renderers";

const PREVIEW_MAX_LEN = 6000;

type ToolResultLike = Record<string, unknown>;

interface Props {
  toolUse: Record<string, unknown>;
  toolResults: ToolResultLike[];
  compact?: boolean;
}

const truncateText = (text: string) => {
  if (text.length <= PREVIEW_MAX_LEN) return text;
  return `${text.slice(0, PREVIEW_MAX_LEN)}\n...`;
};

const stringifyPreview = (value: unknown) => {
  if (typeof value === "string") return truncateText(value);
  try {
    return truncateText(JSON.stringify(value, null, 2));
  } catch {
    return String(value);
  }
};

const isResultError = (result: ToolResultLike) => {
  if (result.is_error === true) return true;
  const content = result.content;
  if (content && typeof content === "object") {
    return "error_code" in content;
  }
  return typeof result.type === "string" && result.type.includes("error");
};

const getToolDisplayName = (
  toolName: string,
  t: (key: string, options?: Record<string, unknown>) => string
) => {
  if (toolName === "Bash") {
    return t("tools.terminal");
  }
  return toolName || t("common.unknown");
};

export const UnifiedToolExecutionRenderer = memo(function UnifiedToolExecutionRenderer({
  toolUse,
  toolResults,
  compact = false,
}: Props) {
  const { t } = useTranslation();

  const toolName = (toolUse.name as string) || "";
  const toolId = (toolUse.id as string) || "";
  const toolInput = (toolUse.input as Record<string, unknown>) ?? {};

  const hasResult = toolResults.length > 0;
  const hasError = hasResult && toolResults.some(isResultError);
  const isPending = !hasResult;
  const [isExpanded, setIsExpanded] = useState(!compact || hasError || isPending);

  useEffect(() => {
    setIsExpanded(!compact || hasError || isPending);
  }, [compact, hasError, isPending, toolId]);

  const statusBadge = hasError ? (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-destructive/30", layout.smallText, "bg-destructive/10 text-destructive")}>
      <AlertTriangle className={layout.iconSizeSmall} />
      {t("common.error")}
    </span>
  ) : isPending ? (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-warning/30", layout.smallText, "bg-warning/10 text-warning")}>
      <Clock3 className={layout.iconSizeSmall} />
      {t("common.pending")}
    </span>
  ) : (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-success/30", layout.smallText, "bg-success/10 text-success")}>
      <CheckCircle2 className={layout.iconSizeSmall} />
      {t("common.completed")}
    </span>
  );

  const primaryPreview =
    typeof toolInput.command === "string"
      ? toolInput.command
      : typeof toolInput.file_path === "string"
        ? toolInput.file_path
        : typeof toolInput.path === "string"
          ? toolInput.path
          : null;

  return (
    <Renderer
      className={cn(
        "border-border/60 bg-background/90",
        hasError && "bg-destructive/5 border-destructive/40"
      )}
      hasError={hasError}
    >
      <Renderer.Header
        title={getToolDisplayName(toolName, t)}
        icon={<ToolIcon toolName={toolName} className={cn(layout.iconSize, "text-muted-foreground")} />}
        titleClassName="text-foreground"
        rightContent={
          <div className={cn("flex items-center", layout.iconGap)}>
            {statusBadge}
              {toolId && (
                <code
                  className={cn(
                    layout.monoText,
                    "max-w-[22rem] truncate px-2 py-0.5 rounded-md border border-border/50 bg-muted/35 text-muted-foreground"
                  )}
                  title={`${t("common.id")}: ${toolId}`}
                >
                  {t("common.id")}: {toolId}
                </code>
              )}
            </div>
          }
        />
      <Renderer.Content>
        <div className="space-y-2">
          {primaryPreview && (
            <pre className={cn(layout.monoText, "p-2 bg-muted/35 text-foreground rounded-md overflow-x-auto whitespace-pre-wrap border border-border/50", !isExpanded && "line-clamp-1")}>
              {primaryPreview}
            </pre>
          )}

          {compact && hasResult && !hasError && (
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className={cn(
                "w-full flex items-center justify-between px-2 py-1.5 rounded-md border border-border/50 bg-muted/25",
                "text-xs text-muted-foreground hover:text-foreground transition-colors"
              )}
              aria-expanded={isExpanded}
            >
              <span>
                {isExpanded
                  ? t("common.collapse", { defaultValue: "Collapse" })
                  : t("common.expand", { defaultValue: "Expand details" })}
              </span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-180")} />
            </button>
          )}

          {isExpanded && (
            <>
              <details className="mb-2" open={hasError || isPending}>
                <summary className={cn(layout.smallText, "cursor-pointer text-muted-foreground")}>
                  {t("common.input")}
                </summary>
                <pre className={cn(layout.monoText, "mt-2 p-2 bg-muted/35 text-foreground rounded-md border border-border/50 overflow-x-auto whitespace-pre-wrap", layout.codeMaxHeight)}>
                  {stringifyPreview(toolInput)}
                </pre>
              </details>

              {toolResults.length > 0 ? (
                <div className="space-y-2">
                  {toolResults.map((result, idx) => (
                    <details key={idx} open={hasError}>
                      <summary className={cn(layout.smallText, "cursor-pointer text-muted-foreground")}>
                        {t("toolResult.toolExecutionResult")} #{idx + 1}
                      </summary>
                      <pre className={cn(layout.monoText, "mt-2 p-2 bg-muted/35 text-foreground rounded-md border border-border/50 overflow-x-auto whitespace-pre-wrap", layout.codeMaxHeight)}>
                        {stringifyPreview(result.content)}
                      </pre>
                    </details>
                  ))}
                </div>
              ) : (
                <div className={cn(layout.smallText, "text-muted-foreground italic")}>
                  {t("common.pending")}
                </div>
              )}
            </>
          )}
        </div>
      </Renderer.Content>
    </Renderer>
  );
});
