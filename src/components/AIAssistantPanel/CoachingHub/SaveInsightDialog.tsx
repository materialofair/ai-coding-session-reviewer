import { useState, useEffect, useId } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAppStore } from "../../../store/useAppStore";
import type { ExperienceCategory } from "../../../store/slices/aiAssistantSlice";

interface ExtractedInsight {
  title: string;
  category: string;
  tags: string[];
  content: string;
}

interface SaveInsightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultContent?: string;
  sourceSessionId?: string;
  isExtracting?: boolean;
  extractedInsight?: ExtractedInsight | null;
  extractionError?: string | null;
}

const CATEGORIES: { value: ExperienceCategory; labelKey: string }[] = [
  { value: "prompt_pattern", labelKey: "aiAssistant.experience.categoryPrompt" },
  { value: "skill_workflow", labelKey: "aiAssistant.experience.categorySkill" },
  { value: "acceptance_criteria", labelKey: "aiAssistant.experience.categoryCriteria" },
];

const VALID_CATEGORIES = new Set<string>(["prompt_pattern", "skill_workflow", "acceptance_criteria"]);

export function SaveInsightDialog({
  open,
  onOpenChange,
  defaultContent = "",
  sourceSessionId,
  isExtracting = false,
  extractedInsight = null,
  extractionError = null,
}: SaveInsightDialogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const tagsId = useId();
  const contentId = useId();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ExperienceCategory>("prompt_pattern");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState(defaultContent);
  const [saving, setSaving] = useState(false);

  const saveExperienceEntry = useAppStore((s) => s.saveExperienceEntry);

  // Pre-fill fields when AI extraction completes
  useEffect(() => {
    if (extractedInsight) {
      setTitle(extractedInsight.title);
      setCategory(
        VALID_CATEGORIES.has(extractedInsight.category)
          ? (extractedInsight.category as ExperienceCategory)
          : "prompt_pattern"
      );
      setTags(extractedInsight.tags.join(", "));
      setContent(extractedInsight.content);
    }
  }, [extractedInsight]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await saveExperienceEntry({
        category,
        title: title.trim(),
        content: content.trim(),
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        sourceSessionId,
      });
      onOpenChange(false);
      setTitle("");
      setTags("");
      setContent("");
    } finally {
      setSaving(false);
    }
  };

  // Reset content when dialog opens with new defaultContent
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && defaultContent) {
      setContent(defaultContent);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("aiAssistant.experience.saveTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Extraction status */}
          {isExtracting && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              {t("aiAssistant.experience.aiExtracting")}
            </div>
          )}
          {extractionError && !isExtracting && (
            <div className="text-xs bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 rounded-md px-3 py-2">
              {t("aiAssistant.experience.extractionFailed")}
            </div>
          )}

          {/* Category selector */}
          <div className="flex bg-muted/70 rounded-lg p-0.5 gap-0.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                className={cn(
                  "flex-1 text-[11px] py-1.5 px-1 rounded-md transition-all duration-150 leading-tight",
                  category === cat.value
                    ? "bg-background text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setCategory(cat.value)}
                disabled={isExtracting}
              >
                {t(cat.labelKey)}
              </button>
            ))}
          </div>

          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor={titleId} className="text-xs">
              {t("aiAssistant.experience.titleLabel")}
            </Label>
            {isExtracting ? (
              <div className="h-8 bg-muted/70 rounded-md animate-pulse" />
            ) : (
              <Input
                id={titleId}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("aiAssistant.experience.titlePlaceholder")}
                className="h-8 text-xs"
              />
            )}
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <Label htmlFor={tagsId} className="text-xs">
              {t("aiAssistant.experience.tagsLabel")}
            </Label>
            {isExtracting ? (
              <div className="h-8 bg-muted/70 rounded-md animate-pulse" />
            ) : (
              <Input
                id={tagsId}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={t("aiAssistant.experience.tagsPlaceholder")}
                className="h-8 text-xs"
              />
            )}
          </div>

          {/* Content */}
          <div className="space-y-1">
            <Label htmlFor={contentId} className="text-xs">
              {t("aiAssistant.experience.contentLabel")}
            </Label>
            {isExtracting ? (
              <div className="min-h-[120px] bg-muted/70 rounded-md animate-pulse" />
            ) : (
              <Textarea
                id={contentId}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("aiAssistant.experience.contentPlaceholder")}
                className="min-h-[120px] text-xs resize-y"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !title.trim() || !content.trim()}
          >
            {t("aiAssistant.experience.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
