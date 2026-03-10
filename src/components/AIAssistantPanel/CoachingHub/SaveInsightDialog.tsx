import { useState, useId } from "react";
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

interface SaveInsightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultContent?: string;
  sourceSessionId?: string;
}

const CATEGORIES: { value: ExperienceCategory; labelKey: string }[] = [
  { value: "prompt_pattern", labelKey: "aiAssistant.experience.categoryPrompt" },
  { value: "skill_workflow", labelKey: "aiAssistant.experience.categorySkill" },
  { value: "acceptance_criteria", labelKey: "aiAssistant.experience.categoryCriteria" },
];

export function SaveInsightDialog({
  open,
  onOpenChange,
  defaultContent = "",
  sourceSessionId,
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
            <Input
              id={titleId}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("aiAssistant.experience.titlePlaceholder")}
              className="h-8 text-xs"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <Label htmlFor={tagsId} className="text-xs">
              {t("aiAssistant.experience.tagsLabel")}
            </Label>
            <Input
              id={tagsId}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t("aiAssistant.experience.tagsPlaceholder")}
              className="h-8 text-xs"
            />
          </div>

          {/* Content */}
          <div className="space-y-1">
            <Label htmlFor={contentId} className="text-xs">
              {t("aiAssistant.experience.contentLabel")}
            </Label>
            <Textarea
              id={contentId}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("aiAssistant.experience.contentPlaceholder")}
              className="min-h-[120px] text-xs resize-y"
            />
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
