<div align="center">

# AI Coding Session Reviewer

**Browse, search, and analyze AI coding sessions — all offline.**

Desktop app that reads conversation history from Claude Code, Codex CLI, and OpenCode with analytics, session boards, and real-time monitoring.

[![Version](https://img.shields.io/github/v/release/materialofair/ai-coding-session-reviewer?label=Version&color=blue)](https://github.com/materialofair/ai-coding-session-reviewer/releases)
[![Stars](https://img.shields.io/github/stars/materialofair/ai-coding-session-reviewer?style=flat&color=yellow)](https://github.com/materialofair/ai-coding-session-reviewer/stargazers)
[![License](https://img.shields.io/github/license/materialofair/ai-coding-session-reviewer)](LICENSE)
[![Rust Tests](https://img.shields.io/github/actions/workflow/status/materialofair/ai-coding-session-reviewer/rust-tests.yml?label=Rust%20Tests)](https://github.com/materialofair/ai-coding-session-reviewer/actions/workflows/rust-tests.yml)
[![Last Commit](https://img.shields.io/github/last-commit/materialofair/ai-coding-session-reviewer)](https://github.com/materialofair/ai-coding-session-reviewer/commits/main)

[Website](https://github.com/materialofair/ai-coding-session-reviewer) · [Download](https://github.com/materialofair/ai-coding-session-reviewer/releases) · [Report Bug](https://github.com/materialofair/ai-coding-session-reviewer/issues)

**Languages**: [English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [中文 (简体)](README.zh-CN.md) | [中文 (繁體)](README.zh-TW.md)

</div>

---

## At a Glance

Quick view of the core workflow: project-level review, multi-session navigation, and AI assistant analysis in one screen.

![AI Coding Session Reviewer Overview](assets/screenshots/app-overview-2026-03-04.png)

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Build from Source](#build-from-source)
- [Usage](#usage)
- [Accessibility](#accessibility)
- [Tech Stack](#tech-stack)
- [Data Privacy](#data-privacy)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Acknowledgements](#acknowledgements)
- [License](#license)

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Provider** | Unified viewer for Claude Code, Codex CLI, and OpenCode conversations |
| **AI Assistant** | Built-in assistant to explain sessions, summarize conversations, and answer project-level questions |
| **Conversation Browser** | Navigate conversations by project/session with worktree grouping |
| **Global Search** | Search across all conversations instantly |
| **Analytics Dashboard** | Dual-mode token stats (billing vs conversation), cost breakdown, and provider distribution charts |
| **Session Board** | Multi-session visual analysis with pixel view, attribute brushing, and activity timeline |
| **Settings Manager** | Scope-aware Claude Code settings editor with MCP server management |
| **Message Navigator** | Right-side collapsible TOC for quick conversation navigation |
| **Real-time Monitoring** | Live session file watching for instant updates |
| **Session Context Menu** | Copy session ID, resume command, file path; native rename with search integration |
| **ANSI Color Rendering** | Terminal output displayed with original ANSI colors |
| **Multi-language** | English, Korean, Japanese, Chinese (Simplified & Traditional) |
| **Recent Edits** | View file modification history and restore |
| **Auto-update** | Built-in updater with skip/postpone options |

## Installation

Download the latest release for your platform:

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | [`.dmg`](https://github.com/materialofair/ai-coding-session-reviewer/releases/latest/download/AI%20Coding%20Session%20Reviewer_1.2.1_aarch64.dmg) |

### Homebrew (macOS)

```bash
brew tap jhlee0409/tap
brew install --cask ai-coding-session-reviewer
```

Or install directly with the full cask path:

```bash
brew install --cask materialofair/tap/ai-coding-session-reviewer
```

If you see `No Cask with this name exists`, run the full cask path command above.

To upgrade:

```bash
brew upgrade --cask ai-coding-session-reviewer
```

To uninstall:

```bash
brew uninstall --cask ai-coding-session-reviewer
```

> **Migrating from manual (.dmg) installation?**
> Remove the existing app before installing via Homebrew to avoid conflicts.
> Choose **one** installation method — do not mix manual and Homebrew installs.
> ```bash
> # Remove the manually installed app first
> rm -rf "/Applications/AI Coding Session Reviewer.app"
> # Then install via Homebrew
> brew tap jhlee0409/tap
> brew install --cask ai-coding-session-reviewer
> ```

## Build from Source

```bash
git clone https://github.com/materialofair/ai-coding-session-reviewer.git
cd ai-coding-session-reviewer

# Option 1: Using just (recommended)
brew install just    # or: cargo install just
just setup
just dev             # Development
just tauri-build     # Production build

# Option 2: Using pnpm directly
pnpm install
pnpm tauri:dev       # Development
pnpm tauri:build     # Production build
```

**Requirements**: Node.js 18+, pnpm, Rust toolchain

## Usage

1. Launch the app
2. It automatically scans for conversation data from all supported providers (Claude Code, Codex CLI, OpenCode)
3. Browse projects in the left sidebar — filter by provider using the CLI selector menu
4. Click a session to view messages
5. Use tabs to switch between Messages, Analytics, Token Stats, Recent Edits, and Session Board

## Accessibility

The app includes accessibility features for keyboard-only, low-vision, and screen-reader users.

- Keyboard-first navigation:
  - Skip links for Project Explorer, Main Content, Message Navigator, and Settings
  - Project tree navigation with `ArrowUp/ArrowDown/Home/End`, type-ahead search, and `*` to expand sibling groups
  - Message navigator navigation with `ArrowUp/ArrowDown/Home/End` and `Enter` to open the focused message
- Visual accessibility:
  - Persistent global font size scaling (`90%`, `100%`, `110%`, `120%`, `130%`)
  - High contrast mode toggle in settings
- Screen reader support:
  - Landmark and tree/list semantics (`navigation`, `tree`, `treeitem`, `group`, `listbox`, `option`)
  - Live announcements for status/loading and project tree navigation/selection changes
  - Inline keyboard-help descriptions via `aria-describedby`

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | ![Rust](https://img.shields.io/badge/Rust-000?logo=rust&logoColor=white) ![Tauri](https://img.shields.io/badge/Tauri_v2-24C8D8?logo=tauri&logoColor=white) |
| **Frontend** | ![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white) |
| **State** | ![Zustand](https://img.shields.io/badge/Zustand-433E38?logo=react&logoColor=white) |
| **Build** | ![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white) |
| **i18n** | ![i18next](https://img.shields.io/badge/i18next-26A69A?logo=i18next&logoColor=white) 5 languages |

## Data Privacy

**100% offline.** No conversation data is sent to any server. No analytics, no tracking, no telemetry.

Your data stays on your machine.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No Claude data found" | Make sure `~/.claude` exists with conversation history |
| Performance issues | Large histories may be slow initially — the app uses virtual scrolling |
| Update problems | If auto-updater fails, download manually from [Releases](https://github.com/materialofair/ai-coding-session-reviewer/releases) |

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Run checks before committing:
   ```bash
   pnpm tsc --build .        # TypeScript
   pnpm vitest run            # Tests
   pnpm lint                  # Lint
   ```
4. Commit your changes (`git commit -m 'feat: add my feature'`)
5. Push to the branch (`git push origin feat/my-feature`)
6. Open a Pull Request

See [Development Commands](CLAUDE.md#development-commands) for the full list of available commands.

## Acknowledgements

Special thanks to [claude-code-history-viewer](https://github.com/jhlee0409/claude-code-history-viewer) for the original inspiration and foundation.

## License

[MIT](LICENSE) — free for personal and commercial use.

---

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=materialofair/ai-coding-session-reviewer&type=Date)](https://star-history.com/#materialofair/ai-coding-session-reviewer&Date)

</div>
