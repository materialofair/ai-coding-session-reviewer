import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportButtonProps {
  onExport: () => void;
  hasContent: boolean;
}

export function ExportButton({ onExport, hasContent }: ExportButtonProps) {
  const { t } = useTranslation();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs text-muted-foreground h-6 px-2 gap-1"
      onClick={onExport}
      disabled={!hasContent}
      aria-label={t("aiAssistant.export.button")}
    >
      <Download className="w-3 h-3" />
      {t("aiAssistant.export.button")}
    </Button>
  );
}
