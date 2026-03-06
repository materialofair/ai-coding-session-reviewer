import {
  Loader2,
  RefreshCw,
  BarChart3,
  MessageSquare,
  Activity,
  FileEdit,
  Terminal,
  SlidersHorizontal,
  Columns,
} from "lucide-react";

import { TooltipButton } from "@/shared/TooltipButton";
import { useAppStore } from "@/store/useAppStore";
import type { UseAnalyticsReturn } from "@/types/analytics";
import type { UseUpdaterReturn } from "@/hooks/useUpdater";

import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { SettingDropdown } from "./SettingDropdown";

interface HeaderProps {
  analyticsActions: UseAnalyticsReturn["actions"];
  analyticsComputed: UseAnalyticsReturn["computed"];
  updater: UseUpdaterReturn;
}

export const Header = ({ analyticsActions, analyticsComputed, updater }: HeaderProps) => {
  const { t } = useTranslation();

  const {
    selectedProject,
    selectedSession,
    isLoadingMessages,
    refreshCurrentSession,
  } = useAppStore();

  const computed = analyticsComputed;
  const isClaudeProject = (selectedProject?.provider ?? "claude") === "claude";
  const appVersion = updater.state.currentVersion || "—";

  const handleLoadTokenStats = async () => {
    if (!selectedProject) return;
    try {
      await analyticsActions.switchToTokenStats();
    } catch (error) {
      console.error("Failed to load token stats:", error);
    }
  };

  const handleLoadAnalytics = async () => {
    if (!selectedProject) return;
    try {
      await analyticsActions.switchToAnalytics();
    } catch (error) {
      console.error("Failed to load analytics:", error);
    }
  };

  const handleLoadRecentEdits = async () => {
    if (!selectedProject) return;
    try {
      await analyticsActions.switchToRecentEdits();
    } catch (error) {
      console.error("Failed to load recent edits:", error);
    }
  };

  const handleLoadBoard = async () => {
    if (!selectedProject) return;
    try {
      await analyticsActions.switchToBoard();
    } catch (error) {
      console.error("Failed to load board:", error);
      window.alert(t("session.board.error.loadBoard"));
    }
  };

  return (
    <header
      id="app-header"
      role="banner"
      className="relative z-10 mx-3 mt-3 flex items-center justify-between gap-4 overflow-hidden rounded-[28px] border border-border/60 bg-background/72 px-4 py-3 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)] backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.22))] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
      <div className="pointer-events-none absolute left-6 top-0 h-20 w-20 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-400/15" />
      <div className="pointer-events-none absolute right-12 top-0 h-20 w-20 rounded-full bg-amber-400/10 blur-3xl dark:bg-amber-300/10" />

      {/* Left: Logo & Title */}
      <div className="relative z-10 flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-border/60 bg-card/80 shadow-sm">
          <img
            src="/app-icon.png"
            alt="Claude Code History"
            className="h-7 w-7"
          />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              {t('common.appName')}
            </h1>
            <span className="rounded-full border border-border/60 bg-background/75 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              v{appVersion}
            </span>
            {selectedProject && (
              <span className="max-w-[240px] truncate rounded-full border border-border/60 bg-background/65 px-2.5 py-1 text-[11px] font-medium text-foreground">
                {selectedProject.name}
              </span>
            )}
          </div>
          {selectedSession ? (
            <p className="mt-1 flex max-w-xl flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{t('common.appDescription')}</span>
              <span className="text-border">•</span>
              <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/55 bg-background/60 px-2.5 py-1 font-mono text-[11px]">
                {selectedSession.summary ||
                  `${t("session.title")} ${selectedSession.session_id.slice(-8)}`}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">{t('common.appDescription')}</p>
          )}
        </div>
      </div>

      {/* Center: Quick Stats (when session selected) */}
      {selectedSession && computed.isMessagesView && (
        <div className="relative z-10 hidden items-center gap-2 rounded-full border border-border/60 bg-background/65 px-3 py-2 lg:flex">
          <span className="status-dot active" />
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-2xs font-mono text-muted-foreground">
            {selectedSession.actual_session_id.slice(0, 8)}
          </span>
        </div>
      )}

      {/* Right: Actions */}
      <div className="relative z-10 flex items-center gap-2">
        {selectedProject && (
          <div className="flex items-center gap-1 rounded-[18px] border border-border/60 bg-card/72 p-1 shadow-sm">
            {/* Analytics */}
            <NavButton
              icon={computed.isLoadingAnalytics ? Loader2 : BarChart3}
              label={t("analytics.dashboard")}
              isActive={computed.isAnalyticsView}
              isLoading={computed.isLoadingAnalytics}
              onClick={() => {
                if (computed.isAnalyticsView) {
                  analyticsActions.switchToMessages();
                } else {
                  handleLoadAnalytics();
                }
              }}
              disabled={computed.isLoadingAnalytics}
            />

            {/* Token Stats */}
            <NavButton
              icon={computed.isLoadingTokenStats ? Loader2 : Activity}
              label={t('messages.tokenStats.existing')}
              isActive={computed.isTokenStatsView}
              isLoading={computed.isLoadingTokenStats}
              onClick={() => {
                if (computed.isTokenStatsView) {
                  analyticsActions.switchToMessages();
                } else {
                  handleLoadTokenStats();
                }
              }}
              disabled={computed.isLoadingTokenStats}
            />

            {/* Recent Edits */}
            <NavButton
              icon={computed.isLoadingRecentEdits ? Loader2 : FileEdit}
              label={t("recentEdits.title")}
              isActive={computed.isRecentEditsView}
              isLoading={computed.isLoadingRecentEdits}
              onClick={() => {
                if (computed.isRecentEditsView) {
                  analyticsActions.switchToMessages();
                } else {
                  handleLoadRecentEdits();
                }
              }}
              disabled={computed.isLoadingRecentEdits}
            />

            {/* Session Board */}
            <NavButton
              icon={Columns}
              label={
                isClaudeProject
                  ? t("session.board.title")
                  : `${t("session.board.title")} (Claude only)`
              }
              isActive={computed.isBoardView}
              disabled={!isClaudeProject}
              onClick={() => {
                if (computed.isBoardView) {
                  analyticsActions.switchToMessages();
                } else {
                  handleLoadBoard();
                }
              }}
            />
          </div>
        )}

        {selectedSession && (
          <div className="flex items-center gap-1 rounded-[18px] border border-border/60 bg-card/72 p-1 shadow-sm">
            {/* Messages */}
            <NavButton
              icon={MessageSquare}
              label={t("message.view")}
              isActive={computed.isMessagesView}
              onClick={() => {
                if (!computed.isMessagesView) {
                  analyticsActions.switchToMessages();
                }
              }}
            />

            {/* Refresh */}
            <TooltipButton
              onClick={() => refreshCurrentSession()}
              disabled={isLoadingMessages}
              className={cn(
                "rounded-2xl border border-transparent px-2.5 py-2 transition-all",
                "text-muted-foreground hover:border-border/70 hover:bg-background/80 hover:text-foreground"
              )}
              content={t("session.refresh")}
            >
              <RefreshCw
                className={cn("w-4 h-4", isLoadingMessages && "animate-spin")}
              />
            </TooltipButton>
          </div>
        )}

        <div className="flex items-center gap-1 rounded-[18px] border border-border/60 bg-card/72 p-1 shadow-sm">
          {/* Settings Manager */}
          <NavButton
            icon={SlidersHorizontal}
            label={t("settingsManager.title")}
            isActive={computed.isSettingsView}
            onClick={() => {
              if (computed.isSettingsView) {
                analyticsActions.switchToMessages();
              } else {
                analyticsActions.switchToSettings();
              }
            }}
          />

          {/* Settings Dropdown */}
          <SettingDropdown updater={updater} />
        </div>
      </div>
    </header>
  );
};

/* Navigation Button Component */
interface NavButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive?: boolean;
  isLoading?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const NavButton = ({
  icon: Icon,
  label,
  isActive,
  isLoading,
  onClick,
  disabled,
}: NavButtonProps) => {
  return (
    <TooltipButton
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-2xl border border-transparent px-2.5 py-2 transition-all",
        "text-muted-foreground",
        isActive
          ? "border-accent/20 bg-accent/12 text-accent shadow-sm"
          : "hover:border-border/70 hover:bg-background/80 hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      content={label}
    >
      <Icon className={cn("w-4 h-4", isLoading && "animate-spin")} />
    </TooltipButton>
  );
};
