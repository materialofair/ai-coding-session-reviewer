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
    loadAcpSessions,
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
    const loadAcpSessionsOnStartup = async () => {
      try {
        await loadAcpSessions();
      } catch (error) {
        console.error("Failed to load ACP sessions:", error);
      }
    };
    loadAcpSessionsOnStartup();
  }, [loadAcpSessions]);

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
      <div className="relative flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(120,162,255,0.14),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.12),_transparent_24%),linear-gradient(180deg,_rgba(248,250,252,0.96),_rgba(241,245,249,0.92))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.12),_transparent_24%),linear-gradient(180deg,_rgba(9,14,24,0.98),_rgba(11,18,32,0.94))]">
        <div className="pointer-events-none absolute inset-0 gradient-mesh opacity-70" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/50 via-white/10 to-transparent dark:from-white/6 dark:via-transparent dark:to-transparent" />
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
        <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden gap-3 px-3 pb-3">
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
            className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[30px] border border-border/60 bg-background/80 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.45)] backdrop-blur-xl"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/45 via-white/10 to-transparent dark:from-white/6 dark:via-transparent dark:to-transparent" />
            {/* Content Header for non-message views */}
            {(computed.isTokenStatsView ||
              computed.isAnalyticsView ||
              computed.isRecentEditsView ||
              computed.isSettingsView ||
              computed.isBoardView ||
              isViewingGlobalStats) && (
              <div className="relative border-b border-border/50 px-8 py-6">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,255,255,0.28))] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.34),rgba(15,23,42,0.1))]" />
                <div className="relative flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-card/75 shadow-sm">
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
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      {selectedProject?.name || t("project.explorer")}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
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
                    <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
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
            <div className="relative z-10 flex-1 overflow-hidden">
              {computed.isSettingsView ? (
                <div className="h-full flex flex-col p-4 md:p-5">
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
                  <div className="p-4 md:p-5">
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
                <div className="flex h-full overflow-hidden p-3">
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
                <div className="h-full overflow-auto p-4 md:p-5">
                  <div className="mx-auto w-full max-w-5xl space-y-5">
                    <div className="glass-panel noise-texture overflow-hidden rounded-[28px] p-6 md:p-8">
                      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                            {t("project.explorer")}
                          </p>
                          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                            {selectedProject.name}
                          </h2>
                          <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-[15px]">
                            {t(
                              "session.projectOverviewDescription",
                              { defaultValue: "项目已选中。你可以直接从下方最近会话进入任务复盘，或切换到看板/分析做项目复盘。" }
                            )}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:min-w-[320px] sm:grid-cols-3 lg:w-[380px]">
                          <div className="rounded-2xl border border-border/55 bg-background/60 p-4 shadow-sm">
                            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                              {t("session.projectOverview.totalSessions", { defaultValue: "会话总数" })}
                            </p>
                            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                              {projectSessionsOverview.length}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/55 bg-background/60 p-4 shadow-sm">
                            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                              {t("session.projectOverview.withErrors", { defaultValue: "包含错误" })}
                            </p>
                            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                              {projectSessionsOverview.filter((s) => s.has_errors).length}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/55 bg-background/60 p-4 shadow-sm">
                            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                              {t("session.projectOverview.withTools", { defaultValue: "包含工具调用" })}
                            </p>
                            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                              {projectSessionsOverview.filter((s) => s.has_tool_use).length}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-transform hover:-translate-y-0.5"
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
                          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
                          onClick={() => {
                            void analyticsActions.switchToBoard();
                          }}
                        >
                          {t("session.projectOverview.openBoard", { defaultValue: "进入会话看板" })}
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
                          onClick={() => {
                            void analyticsActions.switchToAnalytics();
                          }}
                        >
                          {t("session.projectOverview.openAnalytics", { defaultValue: "查看项目分析" })}
                        </button>
                      </div>
                    </div>

                    <div className="glass-panel rounded-[24px] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {t("session.projectOverview.recentSessions", { defaultValue: "最近会话" })}
                          </p>
                          <h3 className="mt-1 text-lg font-semibold text-foreground">
                            {t("session.projectOverview.recentSessions", { defaultValue: "最近会话" })}
                          </h3>
                        </div>
                        <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                          {projectSessionsOverview.length}
                        </span>
                      </div>
                      {projectSessionsOverview.length === 0 ? (
                        <p className="mt-4 text-sm text-muted-foreground">
                          {t("session.projectOverview.noSessions", { defaultValue: "当前项目还没有可用会话。" })}
                        </p>
                      ) : (
                        <div className="mt-4 grid gap-3">
                          {projectSessionsOverview.slice(0, 12).map((session) => (
                            <button
                              key={session.session_id}
                              type="button"
                              className="group flex w-full items-start justify-between gap-3 rounded-2xl border border-border/55 bg-background/65 px-4 py-3 text-left transition hover:border-border hover:bg-background/90 hover:shadow-sm"
                              onClick={() => void handleSessionSelect(session)}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-1 text-sm font-medium text-foreground">
                                  {session.summary ||
                                    `${t("session.title")} ${session.actual_session_id.slice(0, 8)}`}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
                              </div>
                              <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/70 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground">
                                <ArrowRight className="h-4 w-4" />
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
                <div className="flex h-full items-center justify-center p-6">
                  <div className="glass-panel noise-texture w-full max-w-xl rounded-[32px] p-8 text-center md:p-10">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] border border-border/60 bg-background/70 shadow-sm">
                      <MessageSquare className="h-10 w-10 text-muted-foreground/60" />
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      {t("common.appName")}
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                      {t("session.select")}
                    </h3>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
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
        <footer className="relative z-10 mx-3 mb-3 flex h-10 items-center justify-between rounded-[20px] border border-border/60 bg-background/70 px-4 text-2xs text-muted-foreground backdrop-blur-xl">
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
              <div className="flex items-center gap-1.5 rounded-full border border-border/50 bg-background/65 px-2.5 py-1">
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
