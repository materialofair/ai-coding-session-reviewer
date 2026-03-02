import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";

interface CliStatusBadgeProps {
  cli: string;
}

export function CliStatusBadge({ cli }: CliStatusBadgeProps) {
  const { t } = useTranslation();
  const { cliStatuses, detectAllCli } = useAppStore((s) => ({
    cliStatuses: s.cliStatuses,
    detectAllCli: s.detectAllCli,
  }));
  const status = cliStatuses[cli];

  if (!status) {
    return (
      <span className="text-[10px] text-muted-foreground">
        {t("aiAssistant.provider.detecting")}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div
        className={`w-1.5 h-1.5 rounded-full ${status.installed ? "bg-green-500" : "bg-red-500"}`}
      />
      <span className="text-[10px] text-muted-foreground">
        {status.installed
          ? status.version
            ? t("aiAssistant.provider.version", { version: status.version.split(" ")[0] })
            : cli
          : t("aiAssistant.provider.notInstalled")}
      </span>
      <button
        className="opacity-50 hover:opacity-100 transition-opacity"
        onClick={() => detectAllCli()}
        aria-label={t("aiAssistant.provider.refresh")}
      >
        <RefreshCw className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}
