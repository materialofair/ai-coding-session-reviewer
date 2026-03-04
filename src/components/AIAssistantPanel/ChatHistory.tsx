import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Bot, User, Loader2 } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { Markdown } from "../common/Markdown";
import type { AiChatMessage } from "../../store/slices/aiAssistantSlice";

export function ChatHistory() {
  const { t } = useTranslation();
  const { aiMessages } = useAppStore((s) => ({ aiMessages: s.aiMessages }));
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const last = aiMessages[aiMessages.length - 1];
    console.debug("[AI_TRACE] [ChatHistory] messagesChanged", {
      count: aiMessages.length,
      lastId: last?.id ?? null,
      lastRole: last?.role ?? null,
      lastStreaming: last?.isStreaming ?? null,
      lastLen: last?.content?.length ?? 0,
    });
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  if (aiMessages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <Bot className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-48">
          {t("aiAssistant.analysis.noData")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0">
      {aiMessages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: AiChatMessage }) {
  const { t } = useTranslation();
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end gap-2">
        <div className="max-w-[85%] flex flex-col items-end gap-1">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 text-xs leading-relaxed break-words">
            {message.content}
          </div>
        </div>
        <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-accent-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        {message.isStreaming && message.content === "" ? (
          <div className="flex items-center gap-1.5 py-2 text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-xs">{t("aiAssistant.chat.thinking")}</span>
          </div>
        ) : (
          <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-3 py-2 min-w-0 overflow-hidden">
            <Markdown className="text-xs [&_.prose]:text-xs">
              {message.content}
            </Markdown>
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-3.5 bg-foreground/60 ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
