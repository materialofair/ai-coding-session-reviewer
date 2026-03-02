# Semantics & Data Abstraction Layer

This document describes how `claude-code-history-viewer` interprets raw data from Claude memory sessions and abstracts them into semantic concepts like "Edits", "Sessions", and "Commits".

## 1. Sessions

A **Session** corresponds to a single conversation history file (e.g., `*.json`, `*.jsonl`) found in the user's Claude configuration directory.

- **Source**: `~/.claude/projects/<project_id>/<session_uuid>.jsonl`
- **Session Timing**: The application uses the timestamp of the **first and last messages** in the conversation to determine its chronological position, rather than the filesystem's "Last Modified" time. This ensures that manually moving or restoring old session files doesn't break their position in your timeline.
- **Relevance Score**: The app calculates a heuristic "Relevance" score for each session to surface interesting ones (e.g., those with errors, heavy tool use, or documentation work).

## 2. Interaction Nodes

Each message in a session is treated as an **Interaction Node**.

- **User Messages**: Prompts or inputs.
- **Assistant Messages**: Responses, thoughts, or tool calls.
- **Tool Use**: Explicit calls to external tools (e.g., `edit_file`, `run_command`).
- **Tool Result**: The output of a tool (stdout/stderr).

## 3. "Commits" vs. "File Edits"

The application **does not yet fully abstract Git Commits** from the underlying repository. Instead, it reconstructs a **Virtual Edit History** based on the conversation log.

### Virtual File Edits
The app identifies "Edits" by parsing `tool_use` events in the conversation history. Specifically, it looks for tools named:
- `write_to_file`
- `replace_file_content`
- `create_file`
- `edit_file`

When these tools are found, they are "hoisted" into a `SessionFileEdit` object, effectively treating the tool execution as a "commit" to that specific file at that timestamp.

### Git Integration (Planned/Partial)
The `ClaudeProject` type contains a `git_info` field, which detects if the project is a Git repository or worktree. However, the Board View currently visualizes the **intent** of the AI (via tool use) rather than the **actual git reflog**. 

**Note**: This means if the user modified files externally or reverted changes without telling Claude, the "Virtual Edit History" might diverge from the actual filesystem state.

## 4. Error Semantics

Errors are semantically tagged if:
1. `stop_reason` is `max_tokens` or `stop_sequence` (sometimes).
2. `stop_reason` explicitly mentions errors.
3. `tool_result` contains `is_error: true`.
4. `tool_result` stderr is non-empty.

These are visualized as red "Error" nodes or highlights in the Session Board.
