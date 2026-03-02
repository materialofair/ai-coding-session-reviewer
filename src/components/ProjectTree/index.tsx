// src/components/ProjectTree/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Folder,
  Database,
  List,
  FolderTree,
  GitBranch,
  PanelLeftClose,
  PanelLeft,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getLocale } from "../../utils/time";
import { ProjectContextMenu } from "../ProjectContextMenu";
import { useProjectTreeState } from "./hooks/useProjectTreeState";
import { GroupedProjectList } from "./components/GroupedProjectList";
import type { ProjectTreeProps } from "./types";
import type { ProviderId } from "../../types";
import { useAppStore } from "../../store/useAppStore";
import {
  buildTreeItemAnnouncement,
  findTypeaheadMatchIndex,
  getNextTreeItemIndex,
  type TreeNavigationKey,
} from "./treeKeyboard";
import {
  DEFAULT_PROVIDER_ID,
  getProviderId,
  getProviderLabel,
  normalizeProviderIds,
  PROVIDER_IDS,
} from "../../utils/providers";

type ProviderTabId = "all" | ProviderId;

export const ProjectTree: React.FC<ProjectTreeProps> = ({
  projects,
  sessions,
  selectedProject,
  selectedSession,
  onProjectSelect,
  onSessionSelect,
  onSessionHover,
  onGlobalStatsClick,
  isLoading,
  isViewingGlobalStats,
  width,
  isResizing,
  onResizeStart,
  groupingMode = "none",
  worktreeGroups = [],
  directoryGroups = [],
  ungroupedProjects,
  onGroupingModeChange,
  onHideProject,
  onUnhideProject,
  isProjectHidden,
  onFeatureProject,
  onUnfeatureProject,
  isProjectFeatured,
  isCollapsed = false,
  onToggleCollapse,
  asideId = "project-explorer",
}) => {
  const { t, i18n } = useTranslation();
  const keyboardHelpId = `${asideId}-keyboard-help`;
  const activeProviders = useAppStore((state) => state.activeProviders);
  const detectedProviders = useAppStore((state) => state.providers);
  const isDetectingProviders = useAppStore((state) => state.isDetectingProviders);
  const setActiveProviders = useAppStore((state) => state.setActiveProviders);
  const loadGlobalStats = useAppStore((state) => state.loadGlobalStats);
  const clearProjectSelection = useAppStore(
    (state) => state.clearProjectSelection
  );

  const {
    expandedProjects,
    setExpandedProjects,
    isProjectExpanded,
    contextMenu,
    handleContextMenu,
    closeContextMenu,
  } = useProjectTreeState(groupingMode);

  const providerCounts = useMemo(() => {
    const counts: Record<ProviderTabId, number> = {
      all: projects.length,
      claude: 0,
      codex: 0,
      opencode: 0,
    };

    for (const project of projects) {
      counts[getProviderId(project.provider)] += 1;
    }

    return counts;
  }, [projects]);

  const selectableProviderIds = useMemo<ProviderId[]>(() => {
    const detected = detectedProviders
      .filter((provider) => provider.is_available)
      .map((provider) => provider.id as ProviderId);
    const discoveredFromProjects = PROVIDER_IDS.filter((id) => providerCounts[id] > 0);
    const ordered = PROVIDER_IDS.filter((id) =>
      detected.includes(id) || discoveredFromProjects.includes(id)
    );
    return ordered.length > 0 ? ordered : [DEFAULT_PROVIDER_ID];
  }, [detectedProviders, providerCounts]);

  const selectedProviderFilters = useMemo<ProviderId[]>(
    () => PROVIDER_IDS.filter((id) => activeProviders.includes(id) && selectableProviderIds.includes(id)),
    [activeProviders, selectableProviderIds]
  );

  const isAllProvidersSelected = useMemo(
    () =>
      // While provider detection is in progress, treat as "all selected"
      // to avoid a brief flash of incorrect filter state.
      isDetectingProviders ||
      (selectableProviderIds.length > 0 &&
        selectableProviderIds.every((provider) => selectedProviderFilters.includes(provider))),
    [isDetectingProviders, selectableProviderIds, selectedProviderFilters]
  );

  const showProviderBadge = isAllProvidersSelected
    ? selectableProviderIds.length > 1
    : selectedProviderFilters.length !== 1;

  const matchesProviderFilter = useCallback(
    (project: (typeof projects)[number]) =>
      isAllProvidersSelected || selectedProviderFilters.includes(getProviderId(project.provider)),
    [isAllProvidersSelected, selectedProviderFilters]
  );

  const compareProjectsForDisplay = useCallback(
    (a: (typeof projects)[number], b: (typeof projects)[number]) => {
      const aFeatured = isProjectFeatured?.(a.actual_path) ?? false;
      const bFeatured = isProjectFeatured?.(b.actual_path) ?? false;
      if (aFeatured !== bFeatured) {
        return aFeatured ? -1 : 1;
      }

      const aTs = Date.parse(a.last_modified);
      const bTs = Date.parse(b.last_modified);
      const aValid = Number.isFinite(aTs);
      const bValid = Number.isFinite(bTs);
      if (aValid && bValid) return bTs - aTs;
      if (aValid) return -1;
      if (bValid) return 1;
      return b.last_modified.localeCompare(a.last_modified);
    },
    [isProjectFeatured]
  );

  const applyProviderSelection = useCallback(
    async (nextProviders: ProviderId[]) => {
      const normalized = normalizeProviderIds(nextProviders);
      if (normalized.length === 0) {
        return;
      }

      const current = normalizeProviderIds(activeProviders);
      const isUnchanged =
        current.length === normalized.length &&
        current.every((id, index) => id === normalized[index]);
      if (isUnchanged) {
        return;
      }

      const previousSelectedProjectPath = selectedProject?.path;
      const shouldClearSelection =
        selectedProject !== null &&
        !normalized.includes(getProviderId(selectedProject.provider));

      try {
        setActiveProviders(normalized);

        if (isViewingGlobalStats) {
          await loadGlobalStats();
        }

        // Clear selection only after provider switch finishes successfully.
        // This prevents rollback paths from leaving cleared selection behind.
        if (shouldClearSelection) {
          const latestSelectedProject = useAppStore.getState().selectedProject;
          if (latestSelectedProject?.path === previousSelectedProjectPath) {
            clearProjectSelection();
          }
        }
      } catch (error) {
        console.error("Failed to apply provider selection:", error);
        setActiveProviders(current);
        toast.error(t("common.provider.filterApplyError", "Failed to apply provider filter"));
      }
    },
    [
      activeProviders,
      clearProjectSelection,
      isViewingGlobalStats,
      loadGlobalStats,
      selectedProject,
      setActiveProviders,
      t,
    ]
  );

  const handleToggleProjectFeatured = useCallback(
    (projectPath: string) => {
      if (!onFeatureProject || !onUnfeatureProject || !isProjectFeatured) {
        return;
      }

      const toggleFeatured = async () => {
        if (isProjectFeatured(projectPath)) {
          await onUnfeatureProject(projectPath);
        } else {
          await onFeatureProject(projectPath);
        }
      };

      type DocumentWithViewTransition = Document & {
        startViewTransition?: (
          updateCallback: () => void | Promise<void>
        ) => { finished?: Promise<unknown> };
      };

      const doc = document as DocumentWithViewTransition;
      if (typeof doc.startViewTransition === "function") {
        void doc.startViewTransition(toggleFeatured).finished?.catch(() => {
          // Ignore transition errors and keep feature toggle behavior.
        });
      } else {
        void toggleFeatured();
      }
    },
    [isProjectFeatured, onFeatureProject, onUnfeatureProject]
  );

  const handleProviderTabClick = useCallback(async (provider: ProviderTabId) => {
    if (provider === "all") {
      await applyProviderSelection(selectableProviderIds);
      return;
    }
    await applyProviderSelection([provider]);
  }, [applyProviderSelection, selectableProviderIds]);

  const filteredProjects = useMemo(
    () => [...projects.filter(matchesProviderFilter)].sort(compareProjectsForDisplay),
    [projects, matchesProviderFilter, compareProjectsForDisplay]
  );

  const filteredDirectoryGroups = useMemo(() => {
    if (isAllProvidersSelected) {
      return directoryGroups
        .map((group) => ({
          ...group,
          projects: [...group.projects].sort(compareProjectsForDisplay),
        }))
        .sort((a, b) => {
          const aTop = a.projects[0];
          const bTop = b.projects[0];
          if (aTop && bTop) return compareProjectsForDisplay(aTop, bTop);
          if (aTop) return -1;
          if (bTop) return 1;
          return a.path.localeCompare(b.path);
        });
    }

    return directoryGroups
      .map((group) => ({
        ...group,
        projects: [...group.projects.filter(matchesProviderFilter)].sort(compareProjectsForDisplay),
      }))
      .filter((group) => group.projects.length > 0)
      .sort((a, b) => {
        const aTop = a.projects[0];
        const bTop = b.projects[0];
        if (aTop && bTop) return compareProjectsForDisplay(aTop, bTop);
        if (aTop) return -1;
        if (bTop) return 1;
        return a.path.localeCompare(b.path);
      });
  }, [directoryGroups, isAllProvidersSelected, matchesProviderFilter, compareProjectsForDisplay]);

  const { filteredWorktreeGroups, filteredUngroupedProjects } = useMemo(() => {
    const baseUngrouped = ungroupedProjects ?? projects;

    if (isAllProvidersSelected) {
      return {
        filteredWorktreeGroups: worktreeGroups
          .map((group) => ({
            ...group,
            children: [...group.children].sort(compareProjectsForDisplay),
          }))
          .sort((a, b) => compareProjectsForDisplay(a.parent, b.parent)),
        filteredUngroupedProjects: [...baseUngrouped].sort(compareProjectsForDisplay),
      };
    }

    const nextGroups: typeof worktreeGroups = [];
    const movedChildren: (typeof projects)[number][] = [];

    for (const group of worktreeGroups) {
      const includeParent = matchesProviderFilter(group.parent);
      const matchingChildren = group.children.filter(matchesProviderFilter);

      if (includeParent) {
        nextGroups.push({
          ...group,
          children: [...matchingChildren].sort(compareProjectsForDisplay),
        });
      } else if (matchingChildren.length > 0) {
        movedChildren.push(...matchingChildren);
      }
    }

    const baseFiltered = baseUngrouped.filter(matchesProviderFilter);
    const seenPaths = new Set(baseFiltered.map((project) => project.path));
    const movedChildrenToAdd = movedChildren.filter((child) => {
      if (seenPaths.has(child.path)) {
        return false;
      }
      seenPaths.add(child.path);
      return true;
    });
    const nextUngrouped = [...baseFiltered, ...movedChildrenToAdd].sort(compareProjectsForDisplay);

    return {
      filteredWorktreeGroups: nextGroups.sort((a, b) =>
        compareProjectsForDisplay(a.parent, b.parent)
      ),
      filteredUngroupedProjects: nextUngrouped,
    };
  }, [
    worktreeGroups,
    ungroupedProjects,
    projects,
    isAllProvidersSelected,
    matchesProviderFilter,
    compareProjectsForDisplay,
  ]);

  const providerTabs = useMemo(
    () => {
      const base = [
        {
          id: "all" as const,
          label: t("session.board.controls.all", "ALL"),
          count: providerCounts.all,
        },
      ];

      const providerTabs = PROVIDER_IDS.map((id) => ({
        id,
        label: getProviderLabel((key, fallback) => t(key, fallback), id),
        count: providerCounts[id],
      }));

      return [...base, ...providerTabs];
    },
    [providerCounts, t]
  );

  const activeProviderTab: ProviderTabId = useMemo(() => {
    if (isAllProvidersSelected) return "all";
    if (selectedProviderFilters.length === 1) return selectedProviderFilters[0];
    return "all";
  }, [isAllProvidersSelected, selectedProviderFilters]);

  const activeProviderLabel = useMemo(() => {
    if (activeProviderTab === "all") {
      return t("session.board.controls.all", "ALL");
    }
    return getProviderLabel((key, fallback) => t(key, fallback), activeProviderTab);
  }, [activeProviderTab, t]);

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      const currentLanguage = i18n.language || "en";
      const locale = getLocale(currentLanguage);

      if (diffMins < 60) {
        return t("common.time.minutesAgo", { count: diffMins });
      } else if (diffHours < 24) {
        return t("common.time.hoursAgo", { count: diffHours });
      } else if (diffDays < 7) {
        return t("common.time.daysAgo", { count: diffDays });
      } else {
        return date.toLocaleDateString(locale, {
          month: "short",
          day: "numeric",
        });
      }
    } catch {
      return dateStr;
    }
  };

  // Unified project click handler: syncs expand state with selection + accordion behavior
  const handleProjectClick = useCallback(
    (project: typeof selectedProject) => {
      if (!project) return;

      const isCurrentlySelected = selectedProject?.path === project.path;

      if (isCurrentlySelected) {
        // Deselecting: also collapse
        setExpandedProjects((prev) => {
          const next = new Set(prev);
          next.delete(project.path);
          return next;
        });
      } else {
        // Selecting new project: collapse all other projects (accordion), expand this one
        setExpandedProjects((prev) => {
          const next = new Set<string>();
          // Preserve group-level expansions (dir:, group: prefixed keys)
          for (const key of prev) {
            if (key.startsWith("dir:") || key.startsWith("group:")) {
              next.add(key);
            }
          }
          next.add(project.path);
          return next;
        });
      }

      onProjectSelect(project);
    },
    [selectedProject, onProjectSelect, setExpandedProjects]
  );

  const handleGlobalStatsClick = useCallback(() => {
    // Global stats 진입 시 현재 열려 있는 프로젝트 확장을 닫는다.
    setExpandedProjects((prev) => {
      if (prev.size === 0) {
        return prev;
      }

      let changed = false;
      const next = new Set<string>();
      for (const key of prev) {
        if (key.startsWith("dir:") || key.startsWith("group:")) {
          next.add(key);
          continue;
        }
        changed = true;
      }

      return changed ? next : prev;
    });

    onGlobalStatsClick();
  }, [onGlobalStatsClick, setExpandedProjects]);

  const sidebarStyle = isCollapsed ? { width: "48px" } : width ? { width: `${width}px` } : undefined;
  const treeRef = useRef<HTMLDivElement>(null);
  const typeaheadQueryRef = useRef("");
  const typeaheadTimeoutRef = useRef<number | null>(null);
  const [treeAnnouncement, setTreeAnnouncement] = useState("");

  const announceTree = useCallback((message: string) => {
    if (!message) return;
    setTreeAnnouncement((previous) => (previous === message ? `${message} ` : message));
  }, []);

  const describeTreeItem = useCallback((item: HTMLElement) => {
    const rawLabel = item.getAttribute("aria-label") || item.textContent || "";
    return buildTreeItemAnnouncement(
      rawLabel,
      {
        ariaExpanded: item.getAttribute("aria-expanded") as "true" | "false" | null,
        ariaSelected: item.getAttribute("aria-selected") as "true" | "false" | null,
      },
      {
        expanded: t("project.a11y.expandedState", "expanded"),
        collapsed: t("project.a11y.collapsedState", "collapsed"),
        selected: t("project.a11y.selectedState", "selected"),
      },
      t("project.explorer")
    );
  }, [t]);

  const syncRovingTabIndex = useCallback((preferredItem?: HTMLElement) => {
    const tree = treeRef.current;
    if (!tree) return;

    const treeItems = Array.from(
      tree.querySelectorAll<HTMLElement>('[role="treeitem"]')
    );
    if (treeItems.length === 0) {
      return;
    }

    const activeElement = document.activeElement;
    const focusedItem = activeElement instanceof HTMLElement
      ? activeElement.closest<HTMLElement>('[role="treeitem"]')
      : null;

    const selectedItem = treeItems.find((item) => item.getAttribute("aria-selected") === "true");
    const fallbackItem = selectedItem ?? treeItems[0];
    const nextTabStop = preferredItem ?? focusedItem ?? fallbackItem;

    for (const item of treeItems) {
      item.tabIndex = item === nextTabStop ? 0 : -1;
    }
  }, []);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => syncRovingTabIndex());
    return () => cancelAnimationFrame(frameId);
  }, [
    syncRovingTabIndex,
    filteredProjects.length,
    filteredDirectoryGroups.length,
    filteredWorktreeGroups.length,
    filteredUngroupedProjects.length,
    groupingMode,
    selectedProject?.path,
    isViewingGlobalStats,
  ]);

  const handleTreeKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const treeItems = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="treeitem"]')
    );
    if (treeItems.length === 0) {
      return;
    }

    const currentItem = (event.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]');
    const currentIndex = currentItem ? treeItems.indexOf(currentItem) : -1;
    if (currentIndex < 0) {
      return;
    }

    if (event.key === "*") {
      event.preventDefault();
      const currentLevel = Number(currentItem?.getAttribute("aria-level") ?? "1");
      const siblingGroups = treeItems.filter(
        (item) =>
          item !== currentItem &&
          Number(item.getAttribute("aria-level") ?? "1") === currentLevel &&
          item.getAttribute("data-tree-expandable") === "true" &&
          item.getAttribute("aria-expanded") === "false"
      );

      const siblingGroupKeys = siblingGroups
        .map((item) => item.getAttribute("data-tree-key"))
        .filter((key): key is string => Boolean(key));

      if (siblingGroupKeys.length > 0) {
        setExpandedProjects((prev) => {
          const next = new Set(prev);
          for (const groupKey of siblingGroupKeys) {
            next.add(groupKey);
          }
          return next;
        });
      }
      announceTree(
        t(
          "project.expandedSiblingGroups",
          "Expanded {{count}} sibling groups",
          { count: siblingGroups.length }
        )
      );
      return;
    }

    if (
      event.key.length === 1 &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      const nextQuery = `${typeaheadQueryRef.current}${event.key.toLowerCase()}`;
      typeaheadQueryRef.current = nextQuery;
      if (typeaheadTimeoutRef.current) {
        window.clearTimeout(typeaheadTimeoutRef.current);
      }
      typeaheadTimeoutRef.current = window.setTimeout(() => {
        typeaheadQueryRef.current = "";
        typeaheadTimeoutRef.current = null;
      }, 500);

      const labels = treeItems.map((item) => item.textContent ?? "");
      const matchIndex = findTypeaheadMatchIndex(labels, currentIndex, nextQuery);
      if (matchIndex >= 0) {
        event.preventDefault();
        const nextItem = treeItems[matchIndex];
        syncRovingTabIndex(nextItem);
        nextItem?.focus();
        if (nextItem) {
          announceTree(describeTreeItem(nextItem));
        }
      }
      return;
    }

    if (
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    const nextIndex = getNextTreeItemIndex(
      currentIndex,
      treeItems.length,
      event.key as TreeNavigationKey
    );
    if (nextIndex === currentIndex || nextIndex < 0) {
      return;
    }

    event.preventDefault();
    const nextItem = treeItems[nextIndex];
    if (!nextItem) return;
    syncRovingTabIndex(nextItem);
    nextItem.focus();
    announceTree(describeTreeItem(nextItem));
  }, [announceTree, describeTreeItem, setExpandedProjects, syncRovingTabIndex, t]);

  useEffect(() => () => {
    if (typeaheadTimeoutRef.current) {
      window.clearTimeout(typeaheadTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    const tree = treeRef.current;
    if (!tree) return;

    const selectedItem = tree.querySelector<HTMLElement>('[role="treeitem"][aria-selected="true"]');
    if (!selectedItem) return;

    announceTree(
      t("project.currentSelection", "Selected: {{item}}", {
        item: describeTreeItem(selectedItem),
      })
    );
  }, [announceTree, describeTreeItem, isViewingGlobalStats, selectedProject?.path, t]);

  // Collapsed View
  if (isCollapsed) {
    return (
      <aside
        id={asideId}
        aria-label={t("project.explorer")}
        tabIndex={-1}
        className={cn("flex-shrink-0 bg-sidebar border-r-0 flex h-full", isResizing && "select-none")}
        style={sidebarStyle}
      >
        <div className="flex-1 flex flex-col items-center py-3 gap-2 relative">
          {/* Right accent border */}
          <div className="absolute right-0 inset-y-0 w-[2px] bg-gradient-to-b from-accent/40 via-accent/60 to-accent/40" />

          {/* Expand Button */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                "bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              )}
              title={t("project.expandSidebar", "Expand sidebar")}
              aria-label={t("project.expandSidebar", "Expand sidebar")}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          <div className="w-6 h-px bg-accent/20" />

          {/* Global Stats Icon */}
          <button
            onClick={handleGlobalStatsClick}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
              isViewingGlobalStats ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-accent/10 hover:text-accent"
            )}
            aria-label={t("project.globalStats")}
            title={t("project.globalStats")}
          >
            <Database className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-accent/20" />

          {/* Projects Count */}
          <div className="flex flex-col items-center gap-1">
            <Folder className="w-4 h-4 text-muted-foreground" />
            <span className="text-2xs font-mono text-muted-foreground">{filteredProjects.length}</span>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      id={asideId}
      aria-label={t("project.explorer")}
      tabIndex={-1}
      className={cn("flex-shrink-0 bg-sidebar border-r-0 flex h-full", !width && "w-64", isResizing && "select-none")}
      style={sidebarStyle}
    >
      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Right accent border */}
        <div className="absolute right-0 inset-y-0 w-[2px] bg-gradient-to-b from-accent/40 via-accent/60 to-accent/40" />

        {/* Sidebar Header */}
        <div className="px-3 py-3 bg-gradient-to-b from-accent/8 to-transparent border-b border-accent/10 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* Collapse Button */}
              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className={cn(
                    "p-1.5 rounded-md transition-colors flex-shrink-0",
                    "text-muted-foreground hover:text-accent hover:bg-accent/10"
                  )}
                  title={t("project.collapseSidebar", "Collapse sidebar")}
                  aria-label={t("project.collapseSidebar", "Collapse sidebar")}
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="w-2 h-2 rounded-full bg-accent/90 flex-shrink-0" />
              <span className="text-[13px] font-semibold text-accent truncate">
                {t("project.explorer")}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Grouping Mode Tabs */}
              {onGroupingModeChange && (
                <div className="flex items-center bg-muted/30 rounded-lg p-0.5 gap-0.5 border border-border/50">
                  {/* Flat (No Grouping) */}
                  <button
                    onClick={() => onGroupingModeChange("none")}
                    className={cn(
                      "p-1.5 rounded-md transition-all duration-200",
                      groupingMode === "none"
                        ? "bg-accent/18 text-accent shadow-sm"
                        : "text-muted-foreground hover:text-accent hover:bg-accent/10"
                    )}
                    title={t("project.groupingNone", "Flat list")}
                    aria-label={t("project.groupingNone", "Flat list")}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  {/* Directory Grouping */}
                  <button
                    onClick={() => onGroupingModeChange("directory")}
                    className={cn(
                      "p-1.5 rounded-md transition-all duration-200",
                      groupingMode === "directory"
                        ? "bg-blue-500/18 text-blue-500 shadow-sm"
                        : "text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
                    )}
                    title={t("project.groupingDirectory", "Group by directory")}
                    aria-label={t("project.groupingDirectory", "Group by directory")}
                  >
                    <FolderTree className="w-3.5 h-3.5" />
                  </button>
                  {/* Worktree Grouping */}
                  <button
                    onClick={() => onGroupingModeChange("worktree")}
                    className={cn(
                      "p-1.5 rounded-md transition-all duration-200",
                      groupingMode === "worktree"
                        ? "bg-emerald-500/18 text-emerald-500 shadow-sm"
                        : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
                    )}
                    title={t("project.groupingWorktree", "Group by worktree")}
                    aria-label={t("project.groupingWorktree", "Group by worktree")}
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <span className="text-sm font-mono text-accent bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20">
                {filteredProjects.length}
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/55 px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/35 border border-border/40">
                <span className="text-xs text-muted-foreground">
                  {t("aiAssistant.provider.label", "CLI")}
                </span>
                <span className="text-xs font-medium text-foreground">{activeProviderLabel}</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border/40 bg-muted/35 text-muted-foreground hover:text-foreground hover:bg-accent/8 transition-colors"
                    aria-label={t("common.options", { defaultValue: "Options" })}
                    title={t("common.options", { defaultValue: "Options" })}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {providerTabs.map((tab) => {
                    const isActive = tab.id === activeProviderTab;
                    const isDisabled = tab.id !== "all" && !selectableProviderIds.includes(tab.id);

                    return (
                      <DropdownMenuItem
                        key={tab.id}
                        onClick={() => {
                          void handleProviderTabClick(tab.id);
                        }}
                        disabled={isDisabled}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{tab.label}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{tab.count}</span>
                        </div>
                        {isActive && <Check className="w-3.5 h-3.5 text-accent" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Projects List */}
        <OverlayScrollbarsComponent
          className="relative flex-1 py-2"
          options={{
            scrollbars: {
              theme: "os-theme-custom",
              autoHide: "leave",
              autoHideDelay: 400,
            },
            overflow: {
              x: "hidden",
            },
          }}
        >
          {filteredProjects.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center">
                <Folder className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">{t("project.notFound")}</p>
            </div>
          ) : (
            <div
              ref={treeRef}
              role="tree"
              aria-label={t("project.explorer")}
              aria-describedby={keyboardHelpId}
              onKeyDown={handleTreeKeyDown}
              onFocusCapture={(event) => {
                const target = event.target as HTMLElement;
                const treeItem = target.closest<HTMLElement>('[role="treeitem"]');
                if (treeItem) {
                  syncRovingTabIndex(treeItem);
                  announceTree(describeTreeItem(treeItem));
                }
              }}
              className="space-y-0.5 animate-stagger"
            >
              {/* Global Stats Button */}
              <button
                onClick={handleGlobalStatsClick}
                role="treeitem"
                data-tree-node="global"
                aria-level={1}
                aria-selected={isViewingGlobalStats}
                tabIndex={-1}
                className={cn(
                  "sidebar-item w-full flex items-center gap-3 mx-2 group",
                  "text-left transition-all duration-300",
                  isViewingGlobalStats && "active"
                )}
                style={{ width: "calc(100% - 16px)" }}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                    "bg-accent/10 text-accent",
                    "group-hover:bg-accent/20 group-hover:shadow-sm group-hover:shadow-accent/20",
                    isViewingGlobalStats && "bg-accent/20 shadow-glow"
                  )}
                >
                  <span title={t("project.globalStats")}>
                    <Database className="w-4 h-4 transition-transform group-hover:scale-110" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-sidebar-foreground">
                    {t("project.globalStats")}
                  </div>
                  <div className="text-2xs text-muted-foreground">
                    {t("project.globalStatsDescription")}
                  </div>
                </div>
              </button>

              {/* Divider */}
              <div className="my-2 mx-4 h-px bg-sidebar-border" />

              {/* Grouped Project List */}
              <GroupedProjectList
                groupingMode={groupingMode}
                projects={filteredProjects}
                directoryGroups={filteredDirectoryGroups}
                worktreeGroups={filteredWorktreeGroups}
                ungroupedProjects={filteredUngroupedProjects}
                showProviderBadge={showProviderBadge}
                sessions={sessions}
                selectedProject={selectedProject}
                selectedSession={selectedSession}
                isLoading={isLoading}
                expandedProjects={expandedProjects}
                setExpandedProjects={setExpandedProjects}
                isProjectExpanded={isProjectExpanded}
                handleProjectClick={handleProjectClick}
                handleContextMenu={handleContextMenu}
                isProjectFeatured={isProjectFeatured}
                onToggleProjectFeatured={handleToggleProjectFeatured}
                onSessionSelect={onSessionSelect}
                onSessionHover={onSessionHover}
                formatTimeAgo={formatTimeAgo}
              />
            </div>
          )}
        </OverlayScrollbarsComponent>

        <p id={keyboardHelpId} className="sr-only">
          {t(
            "project.a11y.keyboardHelp",
            "Keyboard: use arrow keys to move, Home and End to jump, type letters to search, and star to expand collapsed sibling groups."
          )}
        </p>

        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {treeAnnouncement}
        </div>
      </div>

      {/* Resize Handle - Outside scroll area */}
      {onResizeStart && (
        <div
          className={cn(
            "w-3 cursor-col-resize flex-shrink-0",
            "hover:bg-accent/20 active:bg-accent/30 transition-colors",
            isResizing && "bg-accent/30"
          )}
          onMouseDown={onResizeStart}
        />
      )}

      {/* Context Menu */}
      {contextMenu &&
        onHideProject &&
        onUnhideProject &&
        isProjectHidden &&
        onFeatureProject &&
        onUnfeatureProject &&
        isProjectFeatured && (
        <ProjectContextMenu
          project={contextMenu.project}
          position={contextMenu.position}
          onClose={closeContextMenu}
          onHide={onHideProject}
          onUnhide={onUnhideProject}
          isHidden={isProjectHidden(contextMenu.project.actual_path)}
          onFeature={onFeatureProject}
          onUnfeature={onUnfeatureProject}
          isFeatured={isProjectFeatured(contextMenu.project.actual_path)}
        />
      )}
    </aside>
  );
};
