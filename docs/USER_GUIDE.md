# User Guide: Session Board

The **Session Board** is a powerful visualization tool for exploring your Claude conversation history. It provides a "God's Eye View" of parallel sessions, allowing you to compare workflows, spot errors, and review code generation.

## Navigation & Views

### Zoom Levels
The board offers three levels of detail, controlled by the toolbar or by scrolling the main header area:

1.  **Pixel View (Heatmap)**: 
    -   High-level density view.
    -   Messages are shrunk to single lines varying by token count.
    -   **Merged Tooltips**: Sequential messages of the same type are merged into "color bands". Hovering shows the total message count (e.g., x15) and combined token usage for that interaction block.
    -   Best for: Spotting long conversations, heavy tool usage patterns, or error clusters.
2.  **Skim View (Kanban)**:
    -   Shows truncated message previews.
    -   Shows truncated message previews.
    -   Displays **Natural Language Summaries** for tool actions (e.g., "Run: git status" instead of raw JSON).
    -   **Agent Headers**: Clearly identifies the active agent (e.g., "GENERAL PURPOSE", "BROWSER") at the top of each card.
    -   **Action Badges**: Headers summarize tool usage (e.g., "bash (5)", "search (2)") for merged turns.
    -   Best for: Quickly scanning the flow of conversation.
3.  **Read View (Detail)**:
    -   Shows larger cards with more text.
    -   Displayed timestamps and token usage stats.
    -   Best for: Reading the actual content of the interactions.

### Panning & Scrolling
-   **Horizontal Scroll**: Scroll down/up normally to move through time (within a lane).
-   **Board Panning**: Hold `Meta` (Command) or `Control` and drag anywhere to pan the entire board in any direction.
-   **Synced Scrolling**: Scrolling one lane automatically keeps other lanes in sync to help compare parallel timelines.

## Interaction & Inspection

### Expanding Cards
Click on any card in the **Skim** or **Read** views to open an **Expanded Popover**.
-   This overlay shows the full, un-truncated content of the message or tool input.
-   It floats next to the original card (sticky) so you can read long code snippets comfortably.
-   **Markdown Toggle**: Use the toggle in the toolbar (File Code icon vs Align Left icon) to switch between **Pretty Markdown** rendering and **Raw Text** view.

### Sticky Highlighting
Use the **Legend** in the top toolbar to filter and highlight specific types of interactions.
-   **Click to Toggle**: Click items like `User`, `Assistant`, `Tools`, `Docs`, or `Errors`.
-   **Sticky Mode**: Once clicked, the selection "sticks". Only matching cards remain fully opaque; others fade out.
-   **No Hover Noise**: Brushing is **explicit**. Hovering over cards will NOT change the highlight mode, ensuring a stable view while you analyze data.

## Understand Your Timeline

### High-Level Indicators
In every zoom level, including **Pixel View**, the column headers feature high-level indicators to help you scan for session types:
-   **Terminal (Sky Blue)**: Shell command execution count.
-   **FilePlus (Emerald)**: Count of new files created.
-   **Pencil/Book (Amber)**: Indicates documentation edits (.md files).
-   **FileText**: Code edits.
-   **Indigo Badge**: Real git commits verified in the repository.

### Interactive File Edits
The board automatically detects file modifications and documentation updates:
-   **Docs Badge**: Highlighted in **Amber**, these badges appear on cards where documentation was updated.
-   **Deep Linking**: Click on any documentation file pill (e.g., `CLAUDE.md`) in a card or the **Expanded Popover** to switch directly to the **Recent Edits** view with that file pre-filtered. This allows you to inspect the exact diffs instantly.
-   **Robust Detection**: The system uses both tool-usage tracking (supporting `multi_replace_file_content`) and text heuristics to ensure documentation updates are caught even when mentioned in assistant responses.

## Understanding Data

-   **Virtual Edits**: The board highlights file modifications (e.g., `write_to_file`) based on the conversation history. These represent the AI's *actions*, which may usually correspond to file changes on disk.
-   **Errors**: Red indicators highlight tool failures (stderr output) or API errors.
-   **Tokens Activity**: The Pixel View uses vertical bar height to represent token density, allowing you to visually identify the "weight" of different parts of the conversation.
