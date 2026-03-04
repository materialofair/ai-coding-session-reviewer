// src/components/SessionItem.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Pencil,
  X,
  Check,
  RotateCcw,
  Link2,
  Terminal,
  Copy,
  FileText,
  Play,
  Archive,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ClaudeSession } from "../types";
import { cn } from "@/lib/utils";
import {
  useSessionDisplayName,
  useSessionMetadata,
} from "@/hooks/useSessionMetadata";
import { useAppStore } from "@/store/useAppStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NativeRenameDialog } from "@/components/NativeRenameDialog";

interface SessionItemProps {
  session: ClaudeSession;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => Promise<void> | void;
  onHover?: () => void;
  formatTimeAgo: (date: string) => string;
  isDeleting?: boolean;
}

export const SessionItem: React.FC<SessionItemProps> = ({
  session,
  isSelected,
  onSelect,
  onDelete,
  onHover,
  formatTimeAgo,
  isDeleting = false,
}) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [isNativeRenameOpen, setIsNativeRenameOpen] = useState(false);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [isDeleteInFlight, setIsDeleteInFlight] = useState(false);
  // Local state for summary that can be updated after native rename
  const [localSummary, setLocalSummary] = useState(session.summary);
  const inputRef = useRef<HTMLInputElement>(null);
  const ignoreBlurRef = useRef<boolean>(false);
  const deleteConfirmTimerRef = useRef<number | null>(null);
  const providerId = session.provider ?? "claude";
  const supportsNativeRename = providerId === "claude" || providerId === "opencode";
  const isArchivedCodexSession =
    providerId === "codex" &&
    /(?:^|[\\/])archived_sessions(?:[\\/]|$)/.test(session.file_path);

  // Sync localSummary when session.summary prop changes (e.g., session list refresh)
  useEffect(() => {
    setLocalSummary(session.summary);
  }, [session.summary]);

  // Use the hooks for display name and metadata actions
  const displayName = useSessionDisplayName(session.session_id, localSummary);
  const {
    customName,
    setCustomName,
    hasClaudeCodeName: hasClaudeCodeNameMeta,
    setHasClaudeCodeName,
  } = useSessionMetadata(session.session_id);
  const hasCustomName = !!customName;
  // Detect Claude Code native rename: metadata OR regex fallback for existing renames
  // Regex pattern: [Title] followed by space - matches our rename format
  const hasClaudeCodeNamePattern = /^\[.+?\]\s/.test(localSummary ?? "");
  const hasClaudeCodeName =
    providerId === "claude" && (hasClaudeCodeNameMeta || hasClaudeCodeNamePattern);
  const deleting = isDeleting || isDeleteInFlight;

  const clearDeleteConfirmTimer = useCallback(() => {
    if (deleteConfirmTimerRef.current) {
      window.clearTimeout(deleteConfirmTimerRef.current);
      deleteConfirmTimerRef.current = null;
    }
  }, []);

  const cancelDeleteConfirm = useCallback(() => {
    clearDeleteConfirmTimer();
    setIsDeleteConfirming(false);
  }, [clearDeleteConfirmTimer]);

  const startDeleteConfirm = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!onDelete || deleting) return;
      clearDeleteConfirmTimer();
      setIsDeleteConfirming(true);
      deleteConfirmTimerRef.current = window.setTimeout(() => {
        setIsDeleteConfirming(false);
        deleteConfirmTimerRef.current = null;
      }, 3000);
    },
    [clearDeleteConfirmTimer, deleting, onDelete]
  );

  const confirmDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!onDelete || deleting) return;
      clearDeleteConfirmTimer();
      setIsDeleteInFlight(true);
      try {
        await onDelete();
        toast.success(t("session.deleteSuccess", "Session deleted"));
      } catch (error) {
        console.error("Failed to delete session:", error);
        toast.error(t("session.deleteError", "Failed to delete session"));
      } finally {
        setIsDeleteInFlight(false);
        setIsDeleteConfirming(false);
      }
    },
    [clearDeleteConfirmTimer, deleting, onDelete, t]
  );

  // Start editing mode
  const startEditing = useCallback(() => {
    setEditValue(displayName || "");
    setIsEditing(true);
  }, [displayName]);

  // Save the custom name
  const saveCustomName = useCallback(async () => {
    try {
      const trimmedValue = editValue.trim();
      // If empty or same as original summary, clear custom name
      if (!trimmedValue || trimmedValue === localSummary) {
        await setCustomName(undefined);
      } else {
        await setCustomName(trimmedValue);
      }
    } catch (error) {
      console.error('Failed to save custom name:', error);
      toast.error(t('session.saveError', 'Failed to save name'));
    } finally {
      setIsEditing(false);
    }
  }, [editValue, localSummary, setCustomName, t]);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditValue("");
  }, []);

  // Reset custom name to original summary
  const resetCustomName = useCallback(async () => {
    try {
      await setCustomName(undefined);
    } catch (error) {
      console.error('Failed to reset custom name:', error);
      toast.error(t('session.resetError', 'Failed to reset name'));
    } finally {
      setIsContextMenuOpen(false);
    }
  }, [setCustomName, t]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (!deleting) return;
    cancelDeleteConfirm();
  }, [cancelDeleteConfirm, deleting]);

  useEffect(
    () => () => {
      clearDeleteConfirmTimer();
    },
    [clearDeleteConfirmTimer]
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveCustomName();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEditing();
      }
    },
    [saveCustomName, cancelEditing]
  );

  // Handle double-click to edit
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      startEditing();
    },
    [startEditing]
  );

  // Handle click (select session)
  const handleClick = useCallback(() => {
    if (!isEditing && !isSelected && !deleting) {
      onSelect();
    }
  }, [deleting, isEditing, isSelected, onSelect]);

  // Handle context menu rename action
  const handleRenameClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsContextMenuOpen(false);
      startEditing();
    },
    [startEditing]
  );

  const handleCopyToClipboard = useCallback(
    async (e: React.MouseEvent, text: string, successMsg: string) => {
      e.stopPropagation();
      setIsContextMenuOpen(false);
      try {
        await navigator.clipboard.writeText(text);
        toast.success(successMsg);
      } catch {
        toast.error(t('copyButton.error', 'Copy failed'));
      }
    },
    [t]
  );

  const handleCopySessionId = useCallback(
    (e: React.MouseEvent) =>
      handleCopyToClipboard(e, session.actual_session_id, t('session.copiedSessionId', 'Session ID copied')),
    [handleCopyToClipboard, session.actual_session_id, t]
  );

  const handleCopyResumeCommand = useCallback(
    (e: React.MouseEvent) =>
      handleCopyToClipboard(e, `claude --resume ${session.actual_session_id}`, t('session.copiedResumeCommand', 'Resume command copied')),
    [handleCopyToClipboard, session.actual_session_id, t]
  );

  const handleCopyFilePath = useCallback(
    (e: React.MouseEvent) =>
      handleCopyToClipboard(e, session.file_path, t('session.copiedFilePath', 'File path copied')),
    [handleCopyToClipboard, session.file_path, t]
  );

  // Handle native rename action
  const handleNativeRenameClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsContextMenuOpen(false);
      setIsNativeRenameOpen(true);
    },
    []
  );

  // Handle native rename success
  const handleNativeRenameSuccess = useCallback(
    async (newTitle: string) => {
      if (newTitle) {
        setLocalSummary(newTitle);
        // Check if the new title has a Claude Code prefix [Title] format
        const hasPrefix = /^\[.+?\]\s/.test(newTitle);
        try {
          if (providerId === "claude") {
            await setHasClaudeCodeName(hasPrefix);
          }
        } catch (error) {
          console.error('Failed to update Claude Code name metadata:', error);
          toast.error(t('session.syncError', 'Failed to sync metadata'));
        }

        // Update sessions in store so other components see the change immediately
        // Use getState() to avoid subscribing all SessionItem instances to sessions array
        const { sessions: currentSessions, setSessions } = useAppStore.getState();
        const updatedSessions = currentSessions.map(s =>
          s.session_id === session.session_id
            ? { ...s, summary: newTitle }
            : s
        );
        setSessions(updatedSessions);
      }
    },
    [providerId, setHasClaudeCodeName, t, session.session_id]
  );

  return (
    <div
      className={cn(
        "group w-full flex items-center gap-1.5 py-1 px-2.5 rounded-md",
        "text-left transition-all duration-300",
        "hover:bg-accent/8",
        deleting && "opacity-60",
        isSelected
          ? "bg-accent/15 shadow-sm shadow-accent/10 ring-1 ring-accent/20"
          : "bg-transparent"
      )}
      style={{ width: "calc(100% - 8px)" }}
      onClick={handleClick}
      onMouseEnter={() => {
        // Only trigger hover action if we are NOT in editing mode and a hover handler is provided
        if (!isEditing && onHover) {
          onHover();
        }
      }}
    >
      <div className="flex-1 min-w-0 flex items-center gap-1">
        {isEditing ? (
          <div className="flex-1 flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (ignoreBlurRef.current) {
                  ignoreBlurRef.current = false;
                  return;
                }
                saveCustomName();
              }}
              placeholder={t(
                "session.renamePlaceholder",
                "Enter session name..."
              )}
              className={cn(
                "flex-1 text-xs bg-background border border-accent/40 rounded px-2 py-1",
                "focus:outline-none focus:ring-1 focus:ring-accent/60",
                "text-foreground placeholder:text-muted-foreground"
              )}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onMouseDown={() => {
                ignoreBlurRef.current = true;
              }}
              onClick={(e) => {
                e.stopPropagation();
                saveCustomName();
              }}
              className="p-1 rounded hover:bg-accent/20 text-accent"
              title={t("common.save")}
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              type="button"
              onMouseDown={() => {
                ignoreBlurRef.current = true;
              }}
              onClick={(e) => {
                e.stopPropagation();
                cancelEditing();
              }}
              className="p-1 rounded hover:bg-destructive/20 text-destructive"
              title={t("common.cancel")}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <>
            {hasClaudeCodeName && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-help shrink-0"
                    aria-label={t("session.cliSync.title", "Synced with Claude Code CLI")}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link2 className="w-2.5 h-2.5 text-blue-400" aria-hidden="true" />
                    <span className="text-[9px] font-medium text-blue-400 uppercase tracking-wide">
                      CLI
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-medium">{t("session.cliSync.title", "Synced with Claude Code CLI")}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("session.cliSync.description", "This session is synchronized with your terminal")}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}

            <span
              className={cn(
                "text-[12px] leading-4 transition-colors duration-300 flex-1 min-w-0 truncate whitespace-nowrap cursor-pointer",
                isSelected
                  ? "text-accent font-medium"
                  : "text-sidebar-foreground/75"
              )}
              onDoubleClick={handleDoubleClick}
              title={t("session.rename", "Double-click to rename")}
            >
              {displayName || t("session.summaryNotFound", "No summary")}
            </span>

            <span
              className={cn(
                "ml-auto shrink-0 text-[10px] leading-4 font-mono tabular-nums",
                isSelected ? "text-accent/80" : "text-muted-foreground"
              )}
              title={t("session.item.lastModified")}
            >
              {formatTimeAgo(session.last_modified)}
            </span>
            {isArchivedCodexSession && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    aria-label={t("session.item.archived", "Archived session")}
                    title={t("session.item.archived", "Archived session")}
                    className={cn(
                      "inline-flex items-center justify-center",
                      isSelected ? "text-amber-300" : "text-amber-500"
                    )}
                  >
                    <Archive className="w-3 h-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-medium">Archived session</p>
                  <p className="text-[11px] text-primary-foreground/80 mt-1 leading-relaxed">
                    Stored under Codex `archived_sessions`.
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
            {session.has_errors && (
              <span title={t("session.item.containsErrors")}><AlertTriangle className="w-3 h-3 text-destructive" /></span>
            )}

            {isDeleteConfirming ? (
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="p-1 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors disabled:opacity-50"
                  title={t("session.deleteConfirm", "Confirm delete")}
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelDeleteConfirm();
                  }}
                  disabled={deleting}
                  className="p-1 rounded hover:bg-muted/50 text-muted-foreground transition-colors disabled:opacity-50"
                  title={t("session.deleteCancel", "Cancel delete")}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-0.5 shrink-0">
                <DropdownMenu
                  open={isContextMenuOpen}
                  onOpenChange={setIsContextMenuOpen}
                >
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "p-1 rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity",
                        "hover:bg-accent/20 text-muted-foreground hover:text-accent",
                        isContextMenuOpen && "opacity-100"
                      )}
                      title={t("session.rename", "Rename session")}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={handleRenameClick}>
                      <Pencil className="w-3 h-3 mr-2" />
                      {t("session.rename", "Rename")}
                    </DropdownMenuItem>
                    {hasCustomName && (
                      <DropdownMenuItem onClick={resetCustomName}>
                        <RotateCcw className="w-3 h-3 mr-2" />
                        {t("session.resetName", "Reset name")}
                      </DropdownMenuItem>
                    )}
                    {supportsNativeRename && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleNativeRenameClick}>
                          <Terminal className="w-3 h-3 mr-2" />
                          {providerId === "opencode"
                            ? t("session.nativeRename.menuItemOpenCode", "Rename in OpenCode")
                            : t("session.nativeRename.menuItem", "Rename in Claude Code")}
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleCopySessionId}>
                      <Copy className="w-3 h-3 mr-2" />
                      {t("session.copySessionId", "Copy Session ID")}
                    </DropdownMenuItem>
                    {providerId === "claude" && (
                      <DropdownMenuItem onClick={handleCopyResumeCommand}>
                        <Play className="w-3 h-3 mr-2" />
                        {t("session.copyResumeCommand", "Copy Resume Command")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleCopyFilePath}>
                      <FileText className="w-3 h-3 mr-2" />
                      {t("session.copyFilePath", "Copy File Path")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {onDelete && (
                  <button
                    type="button"
                    onClick={startDeleteConfirm}
                    disabled={deleting}
                    className={cn(
                      "p-1 rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity",
                      "hover:bg-destructive/15 text-muted-foreground hover:text-destructive",
                      deleting && "opacity-100"
                    )}
                    title={t("session.delete", "Delete session")}
                    aria-label={t("session.delete", "Delete session")}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Native Rename Dialog */}
      <NativeRenameDialog
        open={isNativeRenameOpen}
        onOpenChange={setIsNativeRenameOpen}
        filePath={session.file_path}
        currentName={localSummary || ""}
        provider={providerId}
        onSuccess={handleNativeRenameSuccess}
      />
    </div>
  );
};
