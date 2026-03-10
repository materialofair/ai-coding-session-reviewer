import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkillSection {
  titleKey: string;
  descKey: string;
  skills: string[];
}

const SECTIONS: SkillSection[] = [
  {
    titleKey: "aiAssistant.coaching.skill.planning",
    descKey: "aiAssistant.coaching.skill.planningDesc",
    skills: ["/plan", "brainstorming", "architect"],
  },
  {
    titleKey: "aiAssistant.coaching.skill.implementation",
    descKey: "aiAssistant.coaching.skill.implementationDesc",
    skills: ["TDD", "executor", "code generation"],
  },
  {
    titleKey: "aiAssistant.coaching.skill.debugging",
    descKey: "aiAssistant.coaching.skill.debuggingDesc",
    skills: ["analyze", "debugger", "stack trace analysis"],
  },
  {
    titleKey: "aiAssistant.coaching.skill.verification",
    descKey: "aiAssistant.coaching.skill.verificationDesc",
    skills: ["verifier", "code-review", "test runner"],
  },
];

export function SkillGuideTab() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-foreground">
        {t("aiAssistant.coaching.skill.title")}
      </p>
      {SECTIONS.map((section, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={section.titleKey}
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
                {t(section.titleKey)}
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
                    {t(section.descKey)}
                  </p>
                  <div>
                    <p className="text-[10px] font-medium text-foreground mb-1">
                      {t("aiAssistant.coaching.skill.whenToUse")}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {section.skills.map((skill) => (
                        <span
                          key={skill}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
