import { useTranslation } from "react-i18next";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

interface UnresolvedIssue {
  sessionId: string;
  messageUuid: string;
  timestamp: string;
  issueType: string;
  context: string;
  severity: string;
}

interface UnresolvedIssuesViewProps {
  issues: UnresolvedIssue[];
}

const SEVERITY_ICONS = {
  high: AlertCircle,
  medium: AlertTriangle,
  low: Info,
};

const SEVERITY_COLORS = {
  high: "text-red-500",
  medium: "text-yellow-500",
  low: "text-blue-500",
};

export function UnresolvedIssuesView({ issues }: UnresolvedIssuesViewProps) {
  const { t } = useTranslation();

  if (issues.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        {t("aiAssistant.unresolved.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-foreground">{t("aiAssistant.unresolved.title")}</p>
      {issues.map((issue, i) => {
        const sev = (issue.severity as keyof typeof SEVERITY_ICONS) || "low";
        const Icon = SEVERITY_ICONS[sev] ?? Info;
        const colorClass = SEVERITY_COLORS[sev] ?? SEVERITY_COLORS.low;
        const typeKey = `aiAssistant.unresolved.type.${issue.issueType}`;
        const sevKey = `aiAssistant.unresolved.severity.${sev}`;

        return (
          <div
            key={i}
            className="rounded border border-border bg-muted/20 px-2 py-1.5 space-y-1"
          >
            <div className="flex items-center gap-1.5">
              <Icon className={`w-3 h-3 flex-shrink-0 ${colorClass}`} />
              <span className="text-[10px] font-medium text-foreground">
                {t(typeKey, { defaultValue: issue.issueType })}
              </span>
              <span className={`text-[10px] ml-auto ${colorClass}`}>
                {t(sevKey, { defaultValue: issue.severity })}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {issue.context.slice(0, 150)}
              {issue.context.length > 150 ? "…" : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}
