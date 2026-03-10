import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoachingCard {
  titleKey: string;
  descKey: string;
  exampleKey?: string;
}

const CARDS: CoachingCard[] = [
  {
    titleKey: "aiAssistant.coaching.prompt.beSpecific",
    descKey: "aiAssistant.coaching.prompt.beSpecificDesc",
    exampleKey: "aiAssistant.coaching.prompt.beSpecificExample",
  },
  {
    titleKey: "aiAssistant.coaching.prompt.provideContext",
    descKey: "aiAssistant.coaching.prompt.provideContextDesc",
  },
  {
    titleKey: "aiAssistant.coaching.prompt.setCriteria",
    descKey: "aiAssistant.coaching.prompt.setCriteriaDesc",
    exampleKey: "aiAssistant.coaching.prompt.setCriteriaExample",
  },
  {
    titleKey: "aiAssistant.coaching.prompt.useExamples",
    descKey: "aiAssistant.coaching.prompt.useExamplesDesc",
  },
  {
    titleKey: "aiAssistant.coaching.prompt.iteratePrompt",
    descKey: "aiAssistant.coaching.prompt.iteratePromptDesc",
  },
];

export function PromptCoachingTab() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-foreground">
        {t("aiAssistant.coaching.prompt.title")}
      </p>
      {CARDS.map((card, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={card.titleKey}
            className="rounded-md border border-border/60 bg-muted/20 overflow-hidden"
          >
            <button
              className="w-full flex items-center gap-2 px-2.5 py-2 text-left"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
            >
              {isOpen ? (
                <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              )}
              <span className="text-xs font-medium text-foreground">
                {t(card.titleKey)}
              </span>
            </button>
            <div
              className={cn(
                "grid transition-all duration-150",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <div className="px-2.5 pb-2.5 space-y-2">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t(card.descKey)}
                  </p>
                  {card.exampleKey && (
                    <pre className="text-[10px] bg-background rounded border border-border/50 p-2 whitespace-pre-wrap text-muted-foreground leading-relaxed">
                      {t(card.exampleKey)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
