import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "../../../store/useAppStore";

export function ExperienceLibrary() {
  const { t } = useTranslation();
  const {
    experienceEntries,
    isLoadingExperience,
    loadExperienceEntries,
    deleteExperienceEntry,
  } = useAppStore((s) => ({
    experienceEntries: s.experienceEntries,
    isLoadingExperience: s.isLoadingExperience,
    loadExperienceEntries: s.loadExperienceEntries,
    deleteExperienceEntry: s.deleteExperienceEntry,
  }));

  useEffect(() => {
    loadExperienceEntries();
  }, [loadExperienceEntries]);

  const handleDelete = (id: string) => {
    if (confirm(t("aiAssistant.experience.deleteConfirm"))) {
      deleteExperienceEntry(id);
    }
  };

  if (isLoadingExperience) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (experienceEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <BookOpen className="w-8 h-8 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground max-w-[200px]">
          {t("aiAssistant.experience.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-foreground">
        {t("aiAssistant.experience.title")}
      </p>
      {experienceEntries.map((entry) => (
        <div
          key={entry.id}
          className="rounded-md border border-border/60 bg-muted/20 p-2.5 space-y-1.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {entry.title}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {t(`aiAssistant.experience.category.${entry.category}`)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 flex-shrink-0 hover:text-destructive"
              onClick={() => handleDelete(entry.id)}
              aria-label={t("aiAssistant.experience.delete")}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
