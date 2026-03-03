import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAppStore } from "../../store/useAppStore";
import { CliStatusBadge } from "./CliStatusBadge";
import type { AiProvider } from "../../store/slices/aiAssistantSlice";

const PROVIDERS: { value: AiProvider; labelKey: string }[] = [
  { value: "claude", labelKey: "aiAssistant.provider.claude" },
  { value: "codex", labelKey: "aiAssistant.provider.codex" },
  { value: "opencode", labelKey: "aiAssistant.provider.opencode" },
];

export function ProviderSelector() {
  const { t } = useTranslation();
  const { selectedAiProvider, setAiProvider } = useAppStore((s) => ({
    selectedAiProvider: s.selectedAiProvider,
    setAiProvider: s.setAiProvider,
  }));

  const current = PROVIDERS.find((p) => p.value === selectedAiProvider) ?? PROVIDERS[0]!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
          {t(current.labelKey)}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {PROVIDERS.map((p) => (
          <DropdownMenuItem
            key={p.value}
            onClick={() => setAiProvider(p.value)}
            className={`flex flex-col items-start gap-0.5 ${
              p.value === selectedAiProvider ? "bg-accent/20" : ""
            }`}
          >
            <span className="text-xs font-medium">{t(p.labelKey)}</span>
            <CliStatusBadge cli={p.value} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
