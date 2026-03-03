// src/components/ProjectTree/components/ProjectItem.tsx
import React from "react";
import { ChevronDown, ChevronRight, Folder, GitBranch, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ProjectItemProps } from "../types";
import { extractProjectName, getWorktreeLabel } from "../../../utils/worktreeUtils";
import { getProviderId, getProviderLabel } from "../../../utils/providers";

export const ProjectItem: React.FC<ProjectItemProps> = ({
  project,
  isExpanded,
  isSelected,
  isFeatured = false,
  ariaLevel = 1,
  onToggle,
  onClick,
  onToggleFeatured,
  onContextMenu,
  variant = "default",
  showProviderBadge = true,
}) => {
  const { t } = useTranslation();

  const isMain = variant === "main";
  const isWorktree = variant === "worktree";
  const isGrouped = isMain || isWorktree;
  const isExpandable = project.session_count > 0;

  const displayName = isMain
    ? t("project.main", "main")
    : isWorktree
      ? getWorktreeLabel(project.actual_path)
      : extractProjectName(project.actual_path) || project.name;

  const providerId = getProviderId(project.provider);
  const providerLabel = getProviderLabel(
    (key, fallback) => t(key, fallback),
    providerId
  );
  const compactProviderLabel = providerId === "codex"
    ? "Codex"
    : providerId === "claude"
      ? "Claude"
      : "OpenCode";
  const viewTransitionName = `project-${project.path.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  return (
    <button
      type="button"
      role="treeitem"
      data-tree-node="project"
      aria-level={ariaLevel}
      aria-selected={isSelected}
      aria-expanded={isExpandable ? isExpanded : undefined}
      tabIndex={-1}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" && isExpandable && !isExpanded) {
          e.preventDefault();
          onToggle();
        } else if (e.key === "ArrowLeft" && isExpandable && isExpanded) {
          e.preventDefault();
          onToggle();
        }
      }}
      onContextMenu={onContextMenu}
      style={{ viewTransitionName }}
      className={cn(
        "group w-full flex items-center gap-1.5",
        "text-left transition-all duration-200 rounded-lg cursor-pointer border border-transparent",
        isGrouped ? "px-1.5 py-1" : "px-3 py-1.5",
        "focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none",
        isGrouped
          ? "hover:bg-accent/10"
          : "hover:bg-accent/8",
        !isGrouped && isExpanded && !isSelected && "bg-accent/8",
        !isGrouped && isSelected && "bg-accent/12 border-accent/35 shadow-sm",
        isGrouped && isSelected && (isWorktree ? "bg-emerald-500/14 border-emerald-500/30" : "bg-accent/12 border-accent/35"),
        isGrouped && isMain && "hover:bg-accent/10",
        isGrouped && isWorktree && "hover:bg-emerald-500/10",
        isGrouped && isExpanded && (isMain ? "bg-accent/15" : "bg-emerald-500/15")
      )}
    >
      {/* Leading Icon: default folder/branch, hover to expand/collapse control */}
      <span
        title={isWorktree ? "Worktree" : "Project"}
        onClick={(e) => {
          if (!isExpandable) return;
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          "relative inline-flex flex-shrink-0 items-center justify-center rounded transition-all duration-200",
          isGrouped ? "h-3.5 w-3.5" : "h-5 w-5",
          !isGrouped && (isExpanded ? "bg-accent/20" : "bg-muted/50"),
          isExpandable && "cursor-pointer hover:bg-accent/12"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
            isExpandable ? "opacity-100 group-hover:opacity-0" : "opacity-100"
          )}
        >
          {isWorktree ? (
            <GitBranch
              className={cn(
                "w-3 h-3 transition-colors",
                isExpanded ? "text-emerald-500" : "text-emerald-600/60 dark:text-emerald-400/60"
              )}
            />
          ) : (
            <Folder
              className={cn(
                "w-3 h-3 transition-colors",
                isExpanded ? "text-accent" : "text-muted-foreground"
              )}
            />
          )}
        </span>

        {isExpandable && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100",
              isExpanded
                ? isWorktree
                  ? "text-emerald-500"
                  : "text-accent"
                : "text-muted-foreground"
            )}
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        )}
      </span>

      {/* Project Name */}
      <span
          className={cn(
            "min-w-0 truncate flex-1 transition-colors",
            isGrouped ? "text-[11px]" : "text-[13px]",
            !isGrouped && isSelected && "text-foreground font-semibold",
            isExpanded
              ? isWorktree
              ? "text-emerald-600 dark:text-emerald-400 font-medium"
              : isGrouped
                ? "text-accent font-medium"
                : "text-accent font-semibold"
            : isGrouped
              ? "text-muted-foreground"
              : "text-sidebar-foreground/80",
          !isGrouped && "duration-300"
        )}
        title={project.actual_path}
      >
        {displayName}
      </span>

      {/* Provider Badge */}
      {showProviderBadge && (
        <span
          className={cn(
            "px-1 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0 leading-none border",
            providerId === "claude" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
            providerId === "codex" && "bg-green-500/15 text-green-600 dark:text-green-400",
            providerId === "opencode" && "bg-blue-500/15 text-blue-600 dark:text-blue-400",
            providerId === "claude" && "border-amber-500/20",
            providerId === "codex" && "border-green-500/20",
            providerId === "opencode" && "border-blue-500/20"
          )}
          title={providerLabel}
        >
          {compactProviderLabel}
        </span>
      )}

      {/* Session Count */}
      {(!isGrouped && project.session_count > 0) || isGrouped ? (
        <span
          className={cn(
            "text-[10px] font-mono rounded",
            isGrouped
              ? "text-muted-foreground/60"
              : cn(
                "px-1 py-0.5",
                isExpanded ? "text-accent/70 bg-accent/10" : "text-muted-foreground/60"
              )
          )}
        >
          {project.session_count}
        </span>
      ) : null}

      {/* Featured Star */}
      {onToggleFeatured && (
        <span
          role="button"
          tabIndex={0}
          aria-label={isFeatured ? t("project.unfeature", "Remove from featured") : t("project.feature", "Feature project")}
          title={isFeatured ? t("project.unfeature", "Remove from featured") : t("project.feature", "Feature project")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFeatured(project.actual_path);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onToggleFeatured(project.actual_path);
            }
          }}
          className={cn(
            "ml-1 inline-flex items-center justify-center rounded p-0.5 transition-colors",
            "hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
            isFeatured
              ? "text-amber-500"
              : "text-muted-foreground/40 hover:text-amber-500/80"
          )}
        >
          <Star className={cn("h-3 w-3", isFeatured && "fill-current")} />
        </span>
      )}
    </button>
  );
};
