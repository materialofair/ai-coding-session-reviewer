/**
 * MessageHeader Component
 *
 * Displays message metadata (role, timestamp, model info, usage stats).
 */

import React from "react";
import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { formatTime, formatTimeShort } from "../../../utils/time";
import { getShortModelName } from "../../../utils/model";
import { getToolName } from "../../../utils/toolUtils";
import { hasSystemCommandContent } from "../helpers/messageHelpers";
import type { MessageHeaderProps } from "../types";
import type { ClaudeAssistantMessage } from "../../../types";

export const MessageHeader: React.FC<MessageHeaderProps> = ({ message, compact = false }) => {
  const { t } = useTranslation();
  const isToolResultMessage =
    (message.type === "user" || message.type === "assistant") &&
    !!message.toolUseResult;
  const isSystemContent = hasSystemCommandContent(message);
  const toolName = isToolResultMessage
    ? getToolName(
      (message as ClaudeAssistantMessage).toolUse,
      (message as ClaudeAssistantMessage).toolUseResult
    )
    : null;
  const isLeftAligned =
    message.type !== "user" || isToolResultMessage || isSystemContent;
  const speakerLabel = isToolResultMessage && toolName
    ? toolName
    : isSystemContent
      ? t("messageViewer.system")
      : message.type === "user"
        ? t("messageViewer.user")
        : message.type === "assistant"
          ? (message.provider === "codex"
            ? "Codex"
            : message.provider === "opencode"
              ? "OpenCode"
              : t("messageViewer.claude"))
          : t("messageViewer.system");

  return (
    <div className={cn(
      "flex items-center mb-2 text-[11px] text-muted-foreground/80",
      isLeftAligned ? "justify-between" : "justify-end"
    )}>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 font-medium text-foreground/80">
          {speakerLabel}
        </span>
        <span>·</span>
        <span>{formatTimeShort(message.timestamp)}</span>
        {message.isSidechain && (
          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-warning/15 text-warning-foreground rounded-full border border-warning/30">
            {t("messageViewer.branch")}
          </span>
        )}
      </div>

      {!compact && message.type === "assistant" && message.model && (
        <div className="relative group flex items-center gap-1.5">
          <span className="text-muted-foreground">{getShortModelName(message.model)}</span>
          {message.usage && (
            <>
              <HelpCircle className="w-3 h-3 cursor-help text-muted-foreground" />
              <div className={cn(
                "absolute bottom-full mb-2 right-0 w-52 bg-popover text-popover-foreground",
                "text-xs rounded-md p-2.5",
                "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-10 border border-border"
              )}>
                <p className="mb-1"><strong>{t("assistantMessageDetails.model")}:</strong> {message.model}</p>
                <p className="mb-1"><strong>{t("messageViewer.time")}:</strong> {formatTime(message.timestamp)}</p>
                {message.usage.input_tokens && <p>{t("assistantMessageDetails.input")}: {message.usage.input_tokens.toLocaleString()}</p>}
                {message.usage.output_tokens && <p>{t("assistantMessageDetails.output")}: {message.usage.output_tokens.toLocaleString()}</p>}
                {message.usage.cache_creation_input_tokens ? <p>{t("assistantMessageDetails.cacheCreation")}: {message.usage.cache_creation_input_tokens.toLocaleString()}</p> : null}
                {message.usage.cache_read_input_tokens ? <p>{t("assistantMessageDetails.cacheRead")}: {message.usage.cache_read_input_tokens.toLocaleString()}</p> : null}
                <div className="absolute right-4 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-popover"></div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

MessageHeader.displayName = "MessageHeader";
