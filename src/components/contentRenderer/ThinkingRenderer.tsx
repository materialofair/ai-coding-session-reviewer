import { useState, useEffect, memo } from "react";
import { Bot, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { layout } from "@/components/renderers";
import { HighlightedText } from "../common/HighlightedText";

type Props = {
  thinking: string;
  searchQuery?: string;
  isCurrentMatch?: boolean;
  currentMatchIndex?: number;
};

export const ThinkingRenderer = memo(function ThinkingRenderer({
  thinking,
  searchQuery,
  isCurrentMatch = false,
  currentMatchIndex = 0,
}: Props) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  // 검색 쿼리가 있고 내용에 매칭되면 자동으로 펼치기
  useEffect(() => {
    if (searchQuery && thinking.toLowerCase().includes(searchQuery.toLowerCase())) {
      setIsExpanded(true);
    }
  }, [searchQuery, thinking]);

  if (!thinking) return null;

  const firstLine = thinking.split("\n")[0]?.slice(0, 100) || "";
  const hasMore = thinking.length > firstLine.length || thinking.includes("\n");

  return (
    <div
      className={cn(
        "mt-2 overflow-hidden rounded-xl border border-border/60",
        "bg-background/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center text-left",
          layout.headerPadding,
          layout.headerHeight,
          layout.iconGap,
          "hover:bg-muted/35 transition-colors"
        )}
      >
        <ChevronRight
          className={cn(
            layout.iconSize,
            "shrink-0 transition-transform duration-200 text-muted-foreground",
            isExpanded && "rotate-90"
          )}
        />
        <Bot className={cn(layout.iconSize, "text-muted-foreground shrink-0")} />
        <span className={cn(layout.titleText, "text-foreground")}>
          {t("thinkingRenderer.title")}
        </span>
        {!isExpanded && (
          <span className={cn(layout.smallText, "text-muted-foreground truncate")}>
            {firstLine}
            {hasMore && "..."}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className={layout.contentPadding}>
          <div className={cn(layout.bodyText, "text-foreground whitespace-pre-wrap")}>
            {searchQuery ? (
              <HighlightedText
                text={thinking}
                searchQuery={searchQuery}
                isCurrentMatch={isCurrentMatch}
                currentMatchIndex={currentMatchIndex}
              />
            ) : (
              thinking
            )}
          </div>
        </div>
      )}
    </div>
  );
});
