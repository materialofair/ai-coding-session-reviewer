/**
 * Tool Icon Utilities Tests
 * Tests for tool variant classification used in SessionBoard visualization
 */

import { describe, it, expect } from "vitest";
import { getToolVariant } from "../utils/toolIconUtils";

describe("getToolVariant", () => {
    describe("canonical TOOL_VARIANTS exact matches", () => {
        it("should return 'code' for code-related tools", () => {
            expect(getToolVariant("Read")).toBe("code");
            expect(getToolVariant("Write")).toBe("code");
            expect(getToolVariant("Edit")).toBe("code");
            expect(getToolVariant("MultiEdit")).toBe("code");
            expect(getToolVariant("NotebookEdit")).toBe("code");
            expect(getToolVariant("LSP")).toBe("code");
        });

        it("should return 'file' for file operation tools", () => {
            expect(getToolVariant("Glob")).toBe("file");
            expect(getToolVariant("LS")).toBe("file");
        });

        it("should return 'search' for search tools", () => {
            expect(getToolVariant("Grep")).toBe("search");
        });

        it("should return 'terminal' for shell tools", () => {
            expect(getToolVariant("Bash")).toBe("terminal");
            expect(getToolVariant("KillShell")).toBe("terminal");
        });

        it("should return 'task' for task/agent tools", () => {
            expect(getToolVariant("Task")).toBe("task");
            expect(getToolVariant("TodoRead")).toBe("task");
            expect(getToolVariant("TodoWrite")).toBe("task");
            expect(getToolVariant("Agent")).toBe("task");
        });

        it("should return 'web' for web tools", () => {
            expect(getToolVariant("WebSearch")).toBe("web");
            expect(getToolVariant("WebFetch")).toBe("web");
        });
    });

    describe("fuzzy matching fallback (unknown/MCP tools)", () => {
        it("should match code-related tools by substring", () => {
            expect(getToolVariant("read_file")).toBe("code");
            expect(getToolVariant("write_to_file")).toBe("code");
            expect(getToolVariant("edit_file")).toBe("code");
            expect(getToolVariant("mcp_notebook_edit")).toBe("code");
        });

        it("should match file tools by substring", () => {
            // Note: "list_files" doesn't contain "ls" as substring, so falls through
            expect(getToolVariant("list_files")).toBe("neutral");
            // Note: "glob_search" matches "search" first → returns "search"
            expect(getToolVariant("glob_search")).toBe("search");
            // Use a tool that only matches "glob"
            expect(getToolVariant("glob_files")).toBe("file");
        });

        it("should match search tools by substring", () => {
            expect(getToolVariant("grep_search")).toBe("search");
            expect(getToolVariant("code_search")).toBe("search");
            expect(getToolVariant("SearchFiles")).toBe("search");
        });

        it("should match terminal tools by substring", () => {
            expect(getToolVariant("run_command")).toBe("terminal");
            expect(getToolVariant("execute_command")).toBe("terminal");
            expect(getToolVariant("bash_execute")).toBe("terminal");
            expect(getToolVariant("shell_command")).toBe("terminal");
            expect(getToolVariant("kill_process")).toBe("terminal");
        });

        it("should match git tools by substring", () => {
            expect(getToolVariant("git_status")).toBe("git");
            expect(getToolVariant("GitCommit")).toBe("git");
        });

        it("should match web tools by substring", () => {
            expect(getToolVariant("web_fetch")).toBe("web");
            expect(getToolVariant("fetch_url")).toBe("web");
            expect(getToolVariant("http_request")).toBe("web");
        });

        it("should match mcp tools by substring", () => {
            expect(getToolVariant("mcp_tool_use")).toBe("mcp");
            expect(getToolVariant("server_tool_call")).toBe("mcp");
        });

        it("should match document tools by substring", () => {
            // Note: "read_document" matches "read" first → returns "code"
            expect(getToolVariant("read_document")).toBe("code");
            expect(getToolVariant("pdf_extract")).toBe("document");
        });

        it("should match task tools by substring", () => {
            // Note: "create_task" matches "create" first → returns "file"
            expect(getToolVariant("create_task")).toBe("file");
            expect(getToolVariant("todo_list")).toBe("task");
            expect(getToolVariant("agent_spawn")).toBe("task");
        });
    });

    describe("neutral fallback", () => {
        it("should return 'neutral' for completely unknown tools", () => {
            expect(getToolVariant("UnknownTool")).toBe("neutral");
            expect(getToolVariant("SomeRandomThing")).toBe("neutral");
            expect(getToolVariant("")).toBe("neutral");
        });
    });

    describe("case sensitivity", () => {
        it("should be case-insensitive for fuzzy matching", () => {
            expect(getToolVariant("BASH")).toBe("terminal");
            expect(getToolVariant("Bash")).toBe("terminal");
            expect(getToolVariant("READ_FILE")).toBe("code");
            // Note: "WEB_SEARCH" matches "search" first → returns "search"
            expect(getToolVariant("WEB_SEARCH")).toBe("search");
        });

        it("should require exact case for canonical matches", () => {
            // Canonical map uses exact names
            expect(getToolVariant("Bash")).toBe("terminal");
            expect(getToolVariant("bash")).toBe("terminal"); // Falls through to fuzzy match
            expect(getToolVariant("BASH")).toBe("terminal"); // Falls through to fuzzy match
        });
    });

    describe("priority (canonical vs fuzzy)", () => {
        it("should prefer canonical match over fuzzy match", () => {
            // "Bash" is in canonical map as "terminal"
            // fuzzy would also match it
            expect(getToolVariant("Bash")).toBe("terminal");

            // "Read" is in canonical map as "code"
            expect(getToolVariant("Read")).toBe("code");
        });
    });

    describe("real-world MCP tool names", () => {
        it("should handle common MCP server tools", () => {
            // Filesystem MCP
            expect(getToolVariant("filesystem_read")).toBe("code");
            expect(getToolVariant("filesystem_write")).toBe("code");

            // GitHub MCP
            expect(getToolVariant("github_search_repositories")).toBe("search");
            // Note: "github_create_issue" matches "create" → returns "file"
            expect(getToolVariant("github_create_issue")).toBe("file");

            // Slack MCP
            expect(getToolVariant("slack_send_message")).toBe("neutral");

            // Database MCP
            expect(getToolVariant("sql_query")).toBe("neutral");
        });
    });
});
