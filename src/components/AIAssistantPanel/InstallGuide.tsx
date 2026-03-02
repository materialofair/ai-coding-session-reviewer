import { useTranslation } from "react-i18next";
import { Terminal, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AiProvider } from "../../store/slices/aiAssistantSlice";

const INSTALL_COMMANDS: Record<AiProvider, string> = {
  claude: "npm install -g @anthropic-ai/claude-code",
  codex: "npm install -g @openai/codex",
  opencode: "# See opencode.ai for instructions",
};

interface InstallGuideProps {
  cli: AiProvider;
}

export function InstallGuide({ cli }: InstallGuideProps) {
  const { t } = useTranslation();
  const command = INSTALL_COMMANDS[cli];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      toast.success(t("aiAssistant.install.copyCommand"));
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Terminal className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <p className="text-xs font-medium text-foreground">
          {t("aiAssistant.install.title", { cli })}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("aiAssistant.install.description", { cli })}
      </p>
      <div className="flex items-center gap-2 bg-background rounded border border-border px-2 py-1">
        <code className="text-xs flex-1 text-foreground font-mono">{command}</code>
        <Button
          variant="ghost"
          size="icon"
          className="w-5 h-5 flex-shrink-0"
          onClick={handleCopy}
          aria-label={t("aiAssistant.install.copyCommand")}
        >
          <Copy className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
