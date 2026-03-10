import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "../../common/Markdown";
import { cn } from "@/lib/utils";
import type { ExperienceEntrySummary } from "../../../store/slices/aiAssistantSlice";

interface ExperienceEntryCardProps {
  entry: ExperienceEntrySummary;
  onDelete: (id: string) => void;
  onLoadContent: (id: string) => Promise<string>;
}

const CATEGORY_STYLES: Record<string, string> = {
  prompt_pattern: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  skill_workflow: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  acceptance_criteria: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  prompt_pattern: "Prompt",
  skill_workflow: "Skill",
  acceptance_criteria: "Criteria",
};

export function ExperienceEntryCard({ entry, onDelete, onLoadContent }: ExperienceEntryCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!expanded && content == null) {
      setLoading(true);
      try {
        const loaded = await onLoadContent(entry.id);
        setContent(loaded);
      } catch {
        setContent(t("aiAssistant.experience.loadError"));
      } finally {
        setLoading(false);
      }
    }
    setExpanded((v) => !v);
  };

  const relativeDate = (() => {
    const diff = Date.now() - new Date(entry.createdAt).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return t("time.today", { defaultValue: "Today" });
    if (days === 1) return t("time.yesterday", { defaultValue: "Yesterday" });
    return t("time.daysAgo", { defaultValue: "{{count}}d ago", count: days });
  })();

  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 overflow-hidden">
      <div className="flex items-start gap-2 px-3 py-2">
        <button
          className="mt-0.5 flex-shrink-0"
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-label={expanded ? t("common.collapse") : t("common.expand")}
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Badge
              variant="outline"
              className={cn("text-[9px] px-1.5 py-0 h-4 border", CATEGORY_STYLES[entry.category])}
            >
              {CATEGORY_LABELS[entry.category] ?? entry.category}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{relativeDate}</span>
          </div>
          <p className="text-[11px] font-medium text-foreground truncate">{entry.title}</p>
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/70 text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
          onClick={() => onDelete(entry.id)}
          aria-label={t("aiAssistant.experience.delete")}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      {expanded && (
        <div className="px-3 pb-2.5 border-t border-border/40 pt-2 animate-in fade-in-50">
          {loading ? (
            <p className="text-[11px] text-muted-foreground">{t("common.loading")}</p>
          ) : content != null ? (
            <Markdown className="text-[11px] [&_.prose]:text-[11px]">{content}</Markdown>
          ) : null}
        </div>
      )}
    </div>
  );
}
