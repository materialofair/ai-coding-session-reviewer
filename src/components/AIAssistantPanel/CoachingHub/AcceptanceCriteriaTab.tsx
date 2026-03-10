import { useTranslation } from "react-i18next";
import { Copy, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AcceptanceCriteriaTab() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const template = t("aiAssistant.coaching.criteria.templateContent");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-foreground">
        {t("aiAssistant.coaching.criteria.title")}
      </p>

      {/* Functional Requirements */}
      <div className="rounded-md border border-border/60 bg-muted/20 p-2.5 space-y-1">
        <p className="text-xs font-medium text-foreground">
          {t("aiAssistant.coaching.criteria.functional")}
        </p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {t("aiAssistant.coaching.criteria.functionalDesc")}
        </p>
      </div>

      {/* Quality Gates */}
      <div className="rounded-md border border-border/60 bg-muted/20 p-2.5 space-y-1">
        <p className="text-xs font-medium text-foreground">
          {t("aiAssistant.coaching.criteria.quality")}
        </p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {t("aiAssistant.coaching.criteria.qualityDesc")}
        </p>
      </div>

      {/* Copyable Template */}
      <div className="rounded-md border border-border/60 bg-muted/20 overflow-hidden">
        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/40">
          <p className="text-[11px] font-medium text-foreground">
            {t("aiAssistant.coaching.criteria.template")}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6"
            onClick={handleCopy}
            aria-label={t("aiAssistant.coaching.criteria.template")}
          >
            {copied ? (
              <CheckCircle className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
        <pre className="text-[10px] p-2.5 whitespace-pre-wrap text-muted-foreground leading-relaxed font-mono">
          {template}
        </pre>
      </div>
    </div>
  );
}
