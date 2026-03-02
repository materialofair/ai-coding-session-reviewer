import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { RepeatedGroup } from "../../utils/repeatedQuestionsDetector";

interface RepeatedQuestionsViewProps {
  groups: RepeatedGroup[];
}

export function RepeatedQuestionsView({ groups }: RepeatedQuestionsViewProps) {
  const { t } = useTranslation();

  if (groups.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        {t("aiAssistant.repeated.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-foreground">{t("aiAssistant.repeated.title")}</p>
      {groups.map((group, i) => (
        <GroupItem key={i} group={group} index={i + 1} />
      ))}
    </div>
  );
}

function GroupItem({ group, index }: { group: RepeatedGroup; index: number }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded border border-border bg-muted/20">
      <button
        className="w-full flex items-center justify-between px-2 py-1.5 text-left"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <span className="text-xs text-foreground">
          {t("aiAssistant.repeated.groupLabel", { n: index, count: group.messages.length })}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">
            {t("aiAssistant.repeated.similarity", { pct: Math.round(group.similarity * 100) })}
          </span>
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </div>
      </button>
      {expanded && (
        <div className="px-2 pb-2 space-y-1 border-t border-border/50">
          {group.messages.map((msg, j) => (
            <div
              key={j}
              className="text-[10px] text-muted-foreground bg-background rounded px-2 py-1"
            >
              <span className="text-foreground/60">
                {new Date(msg.timestamp).toLocaleDateString()} —{" "}
              </span>
              {msg.content.slice(0, 120)}
              {msg.content.length > 120 ? "…" : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
