import { useCallback, useEffect, useMemo, useState } from "react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { ProjectTree } from "./components/ProjectTree";
import { MessageViewer } from "./components/MessageViewer";
import { MessageNavigator } from "./components/MessageNavigator";
import { TokenStatsViewer } from "./components/TokenStatsViewer";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { RecentEditsViewer } from "./components/RecentEditsViewer";
import { SimpleUpdateManager } from "./components/SimpleUpdateManager";
import { SettingsManager } from "./components/SettingsManager";
import { SessionBoard } from "./components/SessionBoard/SessionBoard";
import { useAppStore } from "./store/useAppStore";
import { useAnalytics } from "./hooks/useAnalytics";
import { useUpdater } from "./hooks/useUpdater";
import { useResizablePanel } from "./hooks/useResizablePanel";

import { useTranslation } from "react-i18next";
import {
  AppErrorType,
  type ClaudeSession,
  type ClaudeProject,
  type SessionTokenStats,
} from "./types";
import type { GroupingMode } from "./types/metadata.types";
import {
  AlertTriangle,
  MessageSquare,
  Database,
  BarChart3,
  FileEdit,
  Coins,
  Settings,
  Clock3,
  Bug,
  Wrench,
  ArrowRight,
} from "lucide-react";
import { AIAssistantPanel } from "./components/AIAssistantPanel";
import { LoadingSpinner } from "@/components/ui/loading";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLanguageStore } from "./store/useLanguageStore";
import { type SupportedLanguage } from "./i18n";

import "./App.css";
import { Header } from "@/layouts/Header/Header";
import { ModalContainer } from "./layouts/Header/SettingDropdown/ModalContainer";
import { useModal } from "@/contexts/modal";
import { getProviderLabel, normalizeProviderIds } from "./utils/providers";

function App() {
  const {
    projects,
    sessions,
    selectedProject,
    selectedSession,
    messages,
    isLoading,
    isLoadingProjects,
    isLoadingSessions,
    isLoadingMessages,
    isLoadingTokenStats,
    error,
    sessionTokenStats,
    sessionConversationTokenStats,
    projectTokenStats,
    projectConversationTokenStats,
    projectTokenStatsSummary,
    projectConversationTokenStatsSummary,
    projectTokenStatsPagination,
    sessionSearch,
    initializeApp,
    selectProject,
    selectSession,
    deleteSessionFile,
    clearProjectSelection,
    setSessionSearchQuery,
    setSearchFilterType,
    goToNextMatch,
    goToPrevMatch,
    clearSessionSearch,
    loadGlobalStats,
    setAnalyticsCurrentView,
    loadMoreProjectTokenStats,
    loadMoreRecentEdits,
    updateUserSettings,
    getGroupedProjects,
    getDirectoryGroupedProjects,
    getEffectiveGroupingMode,
    hideProject,
    unhideProject,
    isProjectHidden,
    featureProject,
    unfeatureProject,
    isProjectFeatured,
    dateFilter,
    setDateFilter,
    fontScale,
    highContrast,
    isNavigatorOpen,
    toggleNavigator,
    activeProviders,
  } = useAppStore();

  const {
    state: analyticsState,
    actions: analyticsActions,
    computed,
  } = useAnalytics();

  const { t, i18n: i18nInstance } = useTranslation();
  const { language, loadLanguage } = useLanguageStore();
  const { openModal } = useModal();
  const updater = useUpdater();
  const appVersion = updater.state.currentVersion || "—";
  const globalOverviewDescription = useMemo(() => {
    const normalized = normalizeProviderIds(activeProviders);

    if (normalized.length === 0) {
      return t("analytics.globalOverviewDescription");
    }

    const labels = normalized.map((providerId) =>
      getProviderLabel((key, fallback) => t(key, fallback), providerId)
    );

    if (labels.length === 1) {
      return t(
        "analytics.globalOverviewDescriptionSingleProvider",
        "Aggregated statistics for {{provider}} projects on your machine",
        { provider: labels[0] }
      );
    }

    return t(
      "analytics.globalOverviewDescriptionMultiProvider",
      "Aggregated statistics for selected providers ({{providers}}) on your machine",
      { providers: labels.join(", ") }
    );
  }, [activeProviders, t]);
  const projectSessionsOverview = useMemo(() => {
    if (!selectedProject) return [];
    return [...sessions].sort((a, b) => {
      const ta = new Date(a.last_message_time || a.last_modified).getTime();
      const tb = new Date(b.last_message_time || b.last_modified).getTime();
      return tb - ta;
    });
  }, [selectedProject, sessions]);
  const liveStatusMessage = useMemo(() => {
    if (updater.state.isChecking) {
      return t("common.settings.checking");
    }
    if (isLoading) {
      return t("status.initializing");
    }
    if (computed.isAnyLoading) {
      return t("status.loadingStats");
    }
    if (isLoadingMessages) {
      return t("status.loadingMessages");
    }
    if (isLoadingProjects) {
      return t("status.scanning");
    }
    if (isLoadingSessions) {
      return t("status.loadingSessions");
    }

    return "";
  }, [
    updater.state.isChecking,
    isLoading,
    computed.isAnyLoading,
    isLoadingMessages,
    isLoadingProjects,
    isLoadingSessions,
    t,
  ]);

  const [isViewingGlobalStats, setIsViewingGlobalStats] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Sidebar resize
  const {
    width: sidebarWidth,
    isResizing: isSidebarResizing,
    handleMouseDown: handleSidebarResizeStart,
  } = useResizablePanel({
    defaultWidth: 256,
    minWidth: 200,
    maxWidth: 480,
    storageKey: "sidebar-width",
  });

  // Navigator resize (right sidebar)
  const {
    width: navigatorWidth,
    isResizing: isNavigatorResizing,
    handleMouseDown: handleNavigatorResizeStart,
  } = useResizablePanel({
    defaultWidth: 280,
    minWidth: 200,
    maxWidth: 400,
    storageKey: "navigator-width",
    direction: "left",
  });

  const handleGlobalStatsClick = useCallback(() => {
    setIsViewingGlobalStats(true);
    clearProjectSelection();
    setAnalyticsCurrentView("analytics");
    void loadGlobalStats();
  }, [clearProjectSelection, loadGlobalStats, setAnalyticsCurrentView]);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  // Project grouping (worktree or directory-based)
  const groupingMode = getEffectiveGroupingMode();
  const { groups: worktreeGroups, ungrouped: ungroupedProjects } = getGroupedProjects();
  const { groups: directoryGroups } = getDirectoryGroupedProjects();


  // Set grouping mode directly
  const handleGroupingModeChange = useCallback((newMode: GroupingMode) => {
    updateUserSettings({
      groupingMode: newMode,
      // Legacy support: keep worktreeGrouping in sync
      worktreeGrouping: newMode === "worktree",
      worktreeGroupingUserSet: true,
    });
  }, [updateUserSettings]);

  const handleSessionSelect = useCallback(async (session: ClaudeSession) => {
    setIsViewingGlobalStats(false);
    setAnalyticsCurrentView("messages");

    // 글로벌 통계에서 돌아올 때 세션의 프로젝트를 복원
    const currentProject = useAppStore.getState().selectedProject;
    if (!currentProject || currentProject.name !== session.project_name) {
      const project = projects.find((p) => p.name === session.project_name);
      if (project) {
        await selectProject(project);
      }
    }

    await selectSession(session);
  }, [projects, selectProject, selectSession, setAnalyticsCurrentView]);

  const handleSessionDelete = useCallback(async (session: ClaudeSession) => {
    await deleteSessionFile(session);
  }, [deleteSessionFile]);

  useEffect(() => {
    const initialize = async () => {
      try {
        await loadLanguage();
      } catch (error) {
        console.error("Failed to load language:", error);
      } finally {
        await initializeApp();
      }
    };
    initialize();
  }, [initializeApp, loadLanguage]);

  useEffect(() => {
    const scale = Number.isFinite(fontScale) ? fontScale / 100 : 1;
    document.documentElement.style.setProperty("--app-font-scale", String(scale));
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", highContrast);
  }, [highContrast]);

  // Restore messages when switching back to messages view with empty messages
  useEffect(() => {
    if (!computed.isMessagesView) return;
    const { selectedSession: session, messages: msgs } = useAppStore.getState();
    if (session != null && msgs.length === 0) {
      void (async () => {
        try {
          await selectSession(session);
        } catch (error) {
          console.error("Failed to restore session messages:", error);
        }
      })();
    }
  }, [computed.isMessagesView, selectSession]);

  const handleTokenStatClick = useCallback((stats: SessionTokenStats) => {
    const session = sessions.find(
      (s) =>
        s.actual_session_id === stats.session_id ||
        s.session_id === stats.session_id
    );

    if (session) {
      handleSessionSelect(session);
    } else {
      console.warn("Session not found in loaded list:", stats.session_id);
    }
  }, [sessions, handleSessionSelect]);

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      const currentLang = lng.startsWith("zh")
        ? lng.includes("TW") || lng.includes("HK")
          ? "zh-TW"
          : "zh-CN"
        : lng.split('-')[0];

      if (
        currentLang &&
        currentLang !== language &&
        ["en", "ko", "ja", "zh-CN", "zh-TW"].includes(currentLang)
      ) {
        useLanguageStore.setState({
          language: currentLang as SupportedLanguage,
        });
      }
    };

    i18nInstance.on("languageChanged", handleLanguageChange);
    return () => {
      i18nInstance.off("languageChanged", handleLanguageChange);
    };
  }, [language, i18nInstance]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openModal("globalSearch");
      }
      // Cmd+Shift+M to toggle navigator
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        toggleNavigator();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openModal, toggleNavigator]);

  const handleProjectSelect = useCallback(
    async (project: ClaudeProject) => {
      const currentProject = useAppStore.getState().selectedProject;

      // 같은 프로젝트를 다시 클릭하면 닫기 (토글)
      if (currentProject?.path === project.path) {
        clearProjectSelection();
        return;
      }

      const activeView = useAppStore.getState().analytics.currentView;
      setIsViewingGlobalStats(false);

      // Reset cache for previous project
      analyticsActions.clearAll();
      setDateFilter({ start: null, end: null });

      await selectProject(project);

      // Maintain previous view with new project data
      try {
        if (activeView === "tokenStats") {
          await analyticsActions.switchToTokenStats();
        } else if (activeView === "board") {
          await analyticsActions.switchToBoard();
        } else if (activeView === "recentEdits") {
          await analyticsActions.switchToRecentEdits();
        } else if (activeView === "analytics") {
          await analyticsActions.switchToAnalytics();
        } else if (activeView === "settings") {
          analyticsActions.switchToSettings();
        } else {
          analyticsActions.switchToMessages();
        }
      } catch (error) {
        console.error(`Failed to auto-load ${activeView} view:`, error);
      }
    },
    [
      clearProjectSelection,
      selectProject,
      analyticsActions,
      setDateFilter,
    ]
  );

  // Handle session hover for "skim to preview" in board view
  const handleSessionHover = useCallback((session: ClaudeSession) => {
    // Only if we are in Board View
    if (computed.isBoardView) {
      // Just update the selected session pointer without triggering view changes or full loadings
      // This assumes SessionBoard reacts to store's selectedSession
      useAppStore.getState().setSelectedSession(session);
    }
  }, [computed.isBoardView]);

  // Error State
  if (error && error.type !== AppErrorType.CLAUDE_FOLDER_NOT_FOUND) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            {t('common.errorOccurred')}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="action-btn primary"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background">
        <nav aria-label={t("common.a11y.skipNavigation", { defaultValue: "Skip navigation" })}>
          <a
            href="#project-explorer"
            className="absolute left-2 top-[-40px] z-[700] rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-all focus:top-2"
          >
            {t("common.a11y.skipToProjects", { defaultValue: "Skip to project explorer" })}
          </a>
          <a
            href="#main-content"
            className="absolute left-52 top-[-40px] z-[700] rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-all focus:top-2"
          >
            {t("common.a11y.skipToMain", { defaultValue: "Skip to main content" })}
          </a>
          {isNavigatorOpen && selectedSession && (
            <a
              href="#message-navigator"
              className="absolute left-[23rem] top-[-40px] z-[700] rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-all focus:top-2"
            >
              {t("common.a11y.skipToNavigator", { defaultValue: "Skip to message navigator" })}
            </a>
          )}
          <a
            href="#app-settings-button"
            className="absolute right-2 top-[-40px] z-[700] rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-all focus:top-2"
          >
            {t("common.a11y.skipToSettings", { defaultValue: "Skip to settings" })}
          </a>
        </nav>

        {/* Header */}
        <Header
          analyticsActions={analyticsActions}
          analyticsComputed={computed}
          updater={updater}
        />

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <ProjectTree
            projects={projects}
            sessions={sessions}
            selectedProject={selectedProject}
            selectedSession={selectedSession}
            onProjectSelect={handleProjectSelect}
            onSessionSelect={handleSessionSelect}
            onSessionDelete={handleSessionDelete}
            onSessionHover={handleSessionHover}
            onGlobalStatsClick={handleGlobalStatsClick}
            isLoading={isLoadingProjects || isLoadingSessions}
            isViewingGlobalStats={isViewingGlobalStats}
            width={isSidebarCollapsed ? undefined : sidebarWidth}
            isResizing={isSidebarResizing}
            onResizeStart={handleSidebarResizeStart}
            groupingMode={groupingMode}
            worktreeGroups={worktreeGroups}
            directoryGroups={directoryGroups}
            ungroupedProjects={ungroupedProjects}
            onGroupingModeChange={handleGroupingModeChange}
            onHideProject={hideProject}
            onUnhideProject={unhideProject}
            isProjectHidden={isProjectHidden}
            onFeatureProject={featureProject}
            onUnfeatureProject={unfeatureProject}
            isProjectFeatured={isProjectFeatured}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            asideId="project-explorer"
          />

          {/* Main Content Area */}
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 flex flex-col min-w-0 bg-background"
          >
            {/* Content Header for non-message views */}
            {(computed.isTokenStatsView ||
              computed.isAnalyticsView ||
              computed.isRecentEditsView ||
              computed.isSettingsView ||
              computed.isBoardView ||
              isViewingGlobalStats) && (
              <div className="px-6 py-4 border-b border-border/60 bg-gradient-to-r from-slate-50/80 via-background to-sky-50/70 dark:from-slate-900/35 dark:via-slate-900/20 dark:to-sky-950/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg border border-sky-200/70 bg-sky-100/80 dark:border-sky-500/25 dark:bg-sky-500/15 flex items-center justify-center">
                    {isViewingGlobalStats ? (
                      <Database className="w-5 h-5 text-accent" />
                    ) : computed.isSettingsView ? (
                      <Settings className="w-5 h-5 text-accent" />
                    ) : computed.isAnalyticsView ? (
                      <BarChart3 className="w-5 h-5 text-accent" />
                    ) : computed.isRecentEditsView ? (
                      <FileEdit className="w-5 h-5 text-accent" />
                    ) : computed.isBoardView ? (
                      <MessageSquare className="w-5 h-5 text-accent" />
                    ) : (
                      <Coins className="w-5 h-5 text-accent" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      {isViewingGlobalStats
                        ? t("analytics.globalOverview")
                        : computed.isSettingsView
                        ? t("settingsManager.title")
                        : computed.isAnalyticsView
                        ? t("analytics.dashboard")
                        : computed.isRecentEditsView
                        ? t("recentEdits.title")
                        : computed.isBoardView
                        ? t("session.board.title")
                        : t('messages.tokenStats.title')}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {isViewingGlobalStats
                        ? globalOverviewDescription
                        : computed.isSettingsView
                        ? t("settingsManager.description")
                        : computed.isRecentEditsView
                        ? t("recentEdits.description")
                        : computed.isBoardView
                        ? t(
                            "session.board.description",
                            "Comparative overview of different sessions"
                          )
                        : selectedSession?.summary ||
                          t("session.summaryNotFound")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {computed.isSettingsView ? (
                <div className="h-full flex flex-col p-6">
                  <SettingsManager
                    projectPath={selectedProject?.actual_path}
                    className="flex-1 min-h-0"
                  />
                </div>
              ) : computed.isBoardView ? (
                <SessionBoard />
              ) : computed.isRecentEditsView ? (
                <OverlayScrollbarsComponent
                  className="h-full"
                  options={{ scrollbars: { theme: "os-theme-custom", autoHide: "leave" } }}
                >
                  <RecentEditsViewer
                    recentEdits={analyticsState.recentEdits}
                    pagination={analyticsState.recentEditsPagination}
                    onLoadMore={() => selectedProject && loadMoreRecentEdits(selectedProject.path)}
                    isLoading={analyticsState.isLoadingRecentEdits}
                    error={analyticsState.recentEditsError}
                    initialSearchQuery={analyticsState.recentEditsSearchQuery}
                  />
                </OverlayScrollbarsComponent>
              ) : computed.isAnalyticsView || isViewingGlobalStats ? (
                <OverlayScrollbarsComponent
                  className="h-full"
                  options={{ scrollbars: { theme: "os-theme-custom", autoHide: "leave" } }}
                >
                  <AnalyticsDashboard
                    isViewingGlobalStats={isViewingGlobalStats}
                  />
                </OverlayScrollbarsComponent>
              ) : computed.isTokenStatsView ? (
                <OverlayScrollbarsComponent
                  className="h-full"
                  options={{ scrollbars: { theme: "os-theme-custom", autoHide: "leave" } }}
                >
                  <div className="p-6">
                    <TokenStatsViewer
                      title={t('messages.tokenStats.title')}
                      sessionStats={sessionTokenStats}
                      sessionConversationStats={sessionConversationTokenStats}
                      projectStats={projectTokenStats}
                      projectConversationStats={projectConversationTokenStats}
                      projectStatsSummary={projectTokenStatsSummary}
                      projectConversationStatsSummary={
                        projectConversationTokenStatsSummary
                      }
                      providerId={selectedProject?.provider ?? "claude"}
                      pagination={projectTokenStatsPagination}
                      onLoadMore={() => selectedProject && loadMoreProjectTokenStats(selectedProject.path)}
                      isLoading={isLoadingTokenStats}
                      dateFilter={dateFilter}
                      setDateFilter={setDateFilter}
                      onSessionClick={handleTokenStatClick}
                    />
                  </div>
                </OverlayScrollbarsComponent>
              ) : selectedSession ? (
                <div className="flex h-full overflow-hidden">
                  <div className="flex-1 min-w-0">
                    <MessageViewer
                      messages={messages}
                      isLoading={isLoading}
                      selectedSession={selectedSession}
                      sessionSearch={sessionSearch}
                      onSearchChange={setSessionSearchQuery}
                      onFilterTypeChange={setSearchFilterType}
                      onClearSearch={clearSessionSearch}
                      onNextMatch={goToNextMatch}
                      onPrevMatch={goToPrevMatch}
                      onBack={() => analyticsActions.switchToBoard()}
                    />
                  </div>
                  <MessageNavigator
                    messages={messages}
                    width={navigatorWidth}
                    isResizing={isNavigatorResizing}
                    onResizeStart={handleNavigatorResizeStart}
                    isCollapsed={!isNavigatorOpen}
                    onToggleCollapse={toggleNavigator}
                    asideId="message-navigator"
                  />
                </div>
              ) : selectedProject ? (
                <div className="h-full overflow-auto p-6">
                  <div className="mx-auto w-full max-w-5xl space-y-5">
                    <div className="rounded-xl border border-border/60 bg-card p-5">
                      <h2 className="text-xl font-semibold text-foreground">
                        {selectedProject.name}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t(
                          "session.projectOverviewDescription",
                          { defaultValue: "项目已选中。你可以直接从下方最近会话进入任务复盘，或切换到看板/分析做项目复盘。" }
                        )}
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                          <p className="text-xs text-muted-foreground">
                            {t("session.projectOverview.totalSessions", { defaultValue: "会话总数" })}
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-foreground">
                            {projectSessionsOverview.length}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                          <p className="text-xs text-muted-foreground">
                            {t("session.projectOverview.withErrors", { defaultValue: "包含错误" })}
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-foreground">
                            {projectSessionsOverview.filter((s) => s.has_errors).length}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                          <p className="text-xs text-muted-foreground">
                            {t("session.projectOverview.withTools", { defaultValue: "包含工具调用" })}
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-foreground">
                            {projectSessionsOverview.filter((s) => s.has_tool_use).length}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                          onClick={() => {
                            const latest = projectSessionsOverview[0];
                            if (latest) {
                              void handleSessionSelect(latest);
                            }
                          }}
                        >
                          {t("session.projectOverview.openLatest", { defaultValue: "打开最新会话" })}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50"
                          onClick={() => {
                            void analyticsActions.switchToBoard();
                          }}
                        >
                          {t("session.projectOverview.openBoard", { defaultValue: "进入会话看板" })}
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50"
                          onClick={() => {
                            void analyticsActions.switchToAnalytics();
                          }}
                        >
                          {t("session.projectOverview.openAnalytics", { defaultValue: "查看项目分析" })}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-card p-4">
                      <h3 className="text-sm font-semibold text-foreground">
                        {t("session.projectOverview.recentSessions", { defaultValue: "最近会话" })}
                      </h3>
                      {projectSessionsOverview.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {t("session.projectOverview.noSessions", { defaultValue: "当前项目还没有可用会话。" })}
                        </p>
                      ) : (
                        <div className="mt-3 grid gap-2">
                          {projectSessionsOverview.slice(0, 12).map((session) => (
                            <button
                              key={session.session_id}
                              type="button"
                              className="group w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-left hover:bg-muted/40"
                              onClick={() => void handleSessionSelect(session)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="line-clamp-1 text-sm font-medium text-foreground">
                                  {session.summary ||
                                    `${t("session.title")} ${session.actual_session_id.slice(0, 8)}`}
                                </p>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-foreground" />
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  {new Date(
                                    session.last_message_time || session.last_modified
                                  ).toLocaleString()}
                                </span>
                                {session.has_tool_use && (
                                  <span className="inline-flex items-center gap-1">
                                    <Wrench className="h-3.5 w-3.5" />
                                    {t("session.item.containsToolUse")}
                                  </span>
                                )}
                                {session.has_errors && (
                                  <span className="inline-flex items-center gap-1 text-destructive">
                                    <Bug className="h-3.5 w-3.5" />
                                    {t("session.item.containsErrors")}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty State */
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-sm mx-auto">
                    <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
                      <MessageSquare className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {t("session.select")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("session.selectDescription")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* AI Assistant Panel */}
          <AIAssistantPanel />
        </div>

        {/* Status Bar */}
        <footer className="h-7 px-4 flex items-center justify-between bg-sidebar border-t border-border/50 text-2xs text-muted-foreground">
          <div className="flex items-center gap-3 font-mono tabular-nums">
            <span>{t("status.versionLabel", "v{{version}}", { version: appVersion })}</span>
            <span className="text-border">•</span>
            <span>{t("project.count", { count: projects.length })}</span>
            <span className="text-border">•</span>
            <span>{t("session.count", { count: sessions.length })}</span>
            {selectedSession && computed.isMessagesView && (
              <>
                <span className="text-border">•</span>
                <span>{t("message.count", { count: messages.length })}</span>
              </>
            )}
          </div>

          {(isLoading ||
            isLoadingProjects ||
            isLoadingSessions ||
            isLoadingMessages ||
            computed.isAnyLoading) && (
              <div className="flex items-center gap-1.5">
                <LoadingSpinner size="xs" variant="muted" />
                <span>
                  {computed.isAnyLoading && t("status.loadingStats")}
                  {isLoadingProjects && t("status.scanning")}
                  {isLoadingSessions && t("status.loadingSessions")}
                  {isLoadingMessages && t("status.loadingMessages")}
                  {isLoading && t("status.initializing")}
                </span>
              </div>
            )}
        </footer>

        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {liveStatusMessage}
        </div>

        {/* Update Manager */}
        <SimpleUpdateManager updater={updater} />
      </div>

      {/* Modals */}
      <ModalContainer />
    </TooltipProvider>
  );
}

export default App;
