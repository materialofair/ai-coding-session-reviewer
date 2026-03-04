import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "../../store/useAppStore";

interface ChatInputProps {
  onSend: (text: string) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isAiStreaming } = useAppStore((s) => ({ isAiStreaming: s.isAiStreaming }));

  const handleSend = useCallback(() => {
    console.debug("[AI_TRACE] [ChatInput] handleSend", {
      rawLen: value.length,
      trimmedLen: value.trim().length,
      isAiStreaming,
    });
    if (!value.trim() || isAiStreaming) {
      console.debug("[AI_TRACE] [ChatInput] blocked", {
        reason: !value.trim() ? "empty" : "streaming",
      });
      return;
    }
    onSend(value);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isAiStreaming, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  return (
    <div className="flex gap-2 items-end">
      <textarea
        ref={textareaRef}
        className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent min-h-[2rem] max-h-[7.5rem] overflow-y-auto"
        placeholder={t("aiAssistant.chat.placeholder")}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={isAiStreaming}
        rows={1}
        aria-label={t("aiAssistant.chat.placeholder")}
      />
      <Button
        size="icon"
        className="w-8 h-8 flex-shrink-0"
        onClick={handleSend}
        disabled={!value.trim() || isAiStreaming}
        aria-label={t("aiAssistant.chat.send")}
      >
        <SendHorizonal className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
