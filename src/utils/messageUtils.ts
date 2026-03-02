import type {
  ClaudeMessage,
  ToolUseContent,
  ClaudeAssistantMessage,
  ClaudeUserMessage,
  ClaudeSystemMessage,
} from "../types";

export type MessageRole = "user" | "assistant" | "system" | string;

/**
 * Type guards for Claude messages
 */
export const isClaudeAssistantMessage = (
  message: ClaudeMessage
): message is ClaudeAssistantMessage => message.type === "assistant";

export const isClaudeUserMessage = (
  message: ClaudeMessage
): message is ClaudeUserMessage => message.type === "user";

export const isClaudeSystemMessage = (
  message: ClaudeMessage
): message is ClaudeSystemMessage => message.type === "system";

/**
 * Gets the role of a message (user, assistant, system, etc.)
 */
export const getMessageRole = (message: ClaudeMessage): MessageRole => {
  if ("role" in message) return message.role;
  return message.type;
};

/**
 * Extracts a tool_use block from a message if it exists
 */
export const getToolUseBlock = (
  message: ClaudeMessage
): ToolUseContent | null => {
  // Check direct toolUse property (processed Assistant messages)
  if (
    message.type === "assistant" &&
    (message as ClaudeAssistantMessage).toolUse
  ) {
    const toolUse = (message as ClaudeAssistantMessage).toolUse;
    if (toolUse && typeof toolUse.name === "string") {
      return {
        type: "tool_use",
        id: (toolUse.id as string) || "",
        name: toolUse.name,
        input: (toolUse.input as Record<string, unknown>) || {},
      };
    }
  }

  // Check content array
  if (Array.isArray(message.content)) {
    const block = message.content.find(
      (b): b is ToolUseContent => b.type === "tool_use"
    );
    return block || null;
  }

  return null;
};

/**
 * Checks if a message represents a tool interaction (use or result)
 */
export const isToolEvent = (message: ClaudeMessage): boolean => {
  if (getToolUseBlock(message)) return true;
  if ("toolUseResult" in message && message.toolUseResult) return true;
  return false;
};

export const extractClaudeMessageContent = (
  message: ClaudeMessage
): string | null => {
  // Direct string content
  if (typeof message.content === "string") {
    return message.content;
  }

  // Array content - extract text from first text block
  if (Array.isArray(message.content)) {
    const textBlock = message.content.find(
      (block): block is { type: "text"; text: string } => block.type === "text"
    );
    return textBlock?.text || null;
  }

  return null;
};

export const formatClaudeErrorOutput = (error: string) => {
  // ESLint 오류 포맷 개선
  if (error.includes("eslint") && error.includes("error")) {
    return error
      .split("\n")
      .map((line) => {
        if (line.match(/^\s*\d+:\d+\s+error/)) {
          return `[!] ${line}`;
        }
        if (line.match(/^✖\s+\d+\s+problems/)) {
          return `\n${line}`;
        }
        return line;
      })
      .join("\n");
  }
  return error;
};

// 이미지 관련 유틸리티 함수들
export const isImageUrl = (url: string): boolean => {
  if (!url || typeof url !== "string") return false;

  // data URL 형태의 이미지
  if (url.startsWith("data:image/")) return true;

  // 파일 확장자로 이미지 판단
  const imageExtensions = /\.(jpg|jpeg|png|gif|svg|webp|bmp|ico)(\?.*)?$/i;
  return imageExtensions.test(url);
};

export const isBase64Image = (data: string): boolean => {
  if (!data || typeof data !== "string") return false;
  return data.startsWith("data:image/");
};

export const extractImageFromContent = (content: unknown): string | null => {
  // 직접 이미지 URL이나 base64인 경우
  if (typeof content === "string") {
    if (isImageUrl(content) || isBase64Image(content)) {
      return content;
    }
  }

  // 배열 형태의 content에서 이미지 추출
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item.type === "image" && item.source) {
        // Claude API 형태의 이미지 객체
        if (item.source.type === "base64") {
          return `data:${item.source.media_type};base64,${item.source.data}`;
        }
      }

      // 텍스트 안에 이미지 URL이 있는 경우
      if (item.type === "text" && item.text) {
        const imageMatch = item.text.match(
          /(data:image\/[^;\s]+;base64,[A-Za-z0-9+/=]+|https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|svg|webp))/i
        );
        if (imageMatch) {
          return imageMatch[1];
        }
      }
    }
  }

  return null;
};

export const hasImageContent = (message: ClaudeMessage): boolean => {
  return extractImageFromContent(message.content) !== null;
};
