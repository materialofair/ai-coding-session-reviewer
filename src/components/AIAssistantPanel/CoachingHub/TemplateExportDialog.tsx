import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "../../../store/useAppStore";

interface TemplateExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds?: string[];
}

type ExportFormat = "prompt_template" | "skill_definition" | "claude_md";

const FORMATS: { value: ExportFormat; labelKey: string }[] = [
  { value: "prompt_template", labelKey: "aiAssistant.experience.promptTemplate" },
  { value: "skill_definition", labelKey: "aiAssistant.experience.skillDefinition" },
  { value: "claude_md", labelKey: "aiAssistant.experience.claudeMdSnippet" },
];

export function TemplateExportDialog({
  open,
  onOpenChange,
  selectedIds,
}: TemplateExportDialogProps) {
  const { t } = useTranslation();
  const experienceEntries = useAppStore((s) => s.experienceEntries);

  const [format, setFormat] = useState<ExportFormat>("prompt_template");
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds ?? []));
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const allIds = experienceEntries.map((e) => e.id);
  const toggleId = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === allIds.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  };

  const handleExport = useCallback(async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    try {
      const dir = await openDialog({ directory: true, title: t("aiAssistant.export.chooseDir") });
      if (!dir) return;

      setExporting(true);
      const path = await invoke<string>("export_experience_templates", {
        ids,
        outputDir: dir,
        format,
      });
      setResult(path);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(false);
    }
  }, [selected, format, t]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setResult(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("aiAssistant.experience.exportTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Format selector */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">
              {t("aiAssistant.experience.exportFormat")}
            </p>
            <div className="flex bg-muted/70 rounded-lg p-0.5 gap-0.5">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  className={cn(
                    "flex-1 text-[11px] py-1.5 px-1 rounded-md transition-all duration-150 leading-tight",
                    format === f.value
                      ? "bg-background text-foreground shadow-sm font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setFormat(f.value)}
                >
                  {t(f.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Entry selection */}
          {!selectedIds && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {t("aiAssistant.experience.selectEntries")}
                </p>
                <button
                  className="text-[10px] text-primary hover:underline"
                  onClick={toggleAll}
                >
                  {selected.size === allIds.length
                    ? t("aiAssistant.experience.deselectAll")
                    : t("aiAssistant.experience.selectAll")}
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border border-border/60 p-2">
                {experienceEntries.map((entry) => (
                  <label
                    key={entry.id}
                    className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-muted/30 rounded px-1 py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(entry.id)}
                      onChange={() => toggleId(entry.id)}
                      className="rounded border-border"
                    />
                    <span className="truncate">{entry.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <p className="text-[11px] text-green-600 dark:text-green-400">
              {t("aiAssistant.experience.exportSuccess", { path: result })}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={exporting || selected.size === 0}
          >
            {exporting
              ? t("aiAssistant.experience.exporting")
              : t("aiAssistant.experience.export")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
