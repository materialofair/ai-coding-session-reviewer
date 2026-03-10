import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAppStore } from "../../../store/useAppStore";
import type { CoachingTab } from "../../../store/slices/aiAssistantSlice";
import { PromptCoachingTab } from "./PromptCoachingTab";
import { SkillGuideTab } from "./SkillGuideTab";
import { AcceptanceCriteriaTab } from "./AcceptanceCriteriaTab";
import { ExperienceLibrary } from "./ExperienceLibrary";

export function CoachingHub() {
  const { t } = useTranslation();
  const { coachingTab, setCoachingTab } = useAppStore((s) => ({
    coachingTab: s.coachingTab,
    setCoachingTab: s.setCoachingTab,
  }));

  const tabs: { value: CoachingTab; label: string }[] = [
    { value: "prompts", label: t("aiAssistant.coaching.prompts") },
    { value: "skills", label: t("aiAssistant.coaching.skills") },
    { value: "criteria", label: t("aiAssistant.coaching.criteria") },
    { value: "library", label: t("aiAssistant.coaching.library") },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Tab bar */}
      <div className="px-3 pt-2 pb-1 flex-shrink-0">
        <div className="flex bg-muted/70 rounded-lg p-0.5 gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              className={cn(
                "flex-1 text-[11px] py-1.5 px-1 rounded-md transition-all duration-150 leading-tight",
                coachingTab === tab.value
                  ? "bg-background text-foreground shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setCoachingTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content — scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {coachingTab === "prompts" && <PromptCoachingTab />}
        {coachingTab === "skills" && <SkillGuideTab />}
        {coachingTab === "criteria" && <AcceptanceCriteriaTab />}
        {coachingTab === "library" && <ExperienceLibrary />}
      </div>
    </div>
  );
}
