<div align="center">

# AI Coding Session Reviewer

**Claude Codeの会話履歴を閲覧・検索・分析 — 完全オフライン。**

Claude Code、Codex CLI、OpenCodeの会話履歴を分析ダッシュボード、セッションボード、リアルタイム監視で閲覧するデスクトップアプリ。

[![Version](https://img.shields.io/github/v/release/materialofair/ai-coding-session-reviewer?label=Version&color=blue)](https://github.com/materialofair/ai-coding-session-reviewer/releases)
[![Stars](https://img.shields.io/github/stars/materialofair/ai-coding-session-reviewer?style=flat&color=yellow)](https://github.com/materialofair/ai-coding-session-reviewer/stargazers)
[![License](https://img.shields.io/github/license/materialofair/ai-coding-session-reviewer)](LICENSE)
[![Rust Tests](https://img.shields.io/github/actions/workflow/status/materialofair/ai-coding-session-reviewer/rust-tests.yml?label=Rust%20Tests)](https://github.com/materialofair/ai-coding-session-reviewer/actions/workflows/rust-tests.yml)
[![Last Commit](https://img.shields.io/github/last-commit/materialofair/ai-coding-session-reviewer)](https://github.com/materialofair/ai-coding-session-reviewer/commits/main)

[ウェブサイト](https://github.com/materialofair/ai-coding-session-reviewer) · [ダウンロード](https://github.com/materialofair/ai-coding-session-reviewer/releases) · [バグ報告](https://github.com/materialofair/ai-coding-session-reviewer/issues)

**Languages**: [English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [中文 (简体)](README.zh-CN.md) | [中文 (繁體)](README.zh-TW.md)

</div>


---

## クイックプレビュー

1画面で分かる主要フロー: プロジェクト振り返り、マルチセッション操作、AIアシスタント分析。

![AI Coding Session Reviewer Overview](assets/screenshots/app-overview-2026-03-04.png)

## 目次

- [主な機能](#主な機能)
- [インストール](#インストール)
- [ソースからビルド](#ソースからビルド)
- [使い方](#使い方)
- [アクセシビリティ](#アクセシビリティ)
- [技術スタック](#技術スタック)
- [データプライバシー](#データプライバシー)
- [トラブルシューティング](#トラブルシューティング)
- [コントリビュート](#コントリビュート)
- [謝辞](#謝辞)
- [ライセンス](#ライセンス)

## 主な機能

| 機能 | 説明 |
|---------|-------------|
| **マルチプロバイダー** | Claude Code、Codex CLI、OpenCodeの会話を統合ビューアで閲覧 |
| **AIアシスタント** | 内蔵アシスタントでセッション説明、会話要約、プロジェクトレベルの質問対応 |
| **会話ブラウザ** | プロジェクト/セッション別に会話を閲覧（ワークツリーグループ化対応） |
| **グローバル検索** | 全ての会話を瞬時に検索 |
| **分析ダッシュボード** | デュアルモードトークン統計（課金 vs 会話）、コスト内訳、プロバイダー分布チャート |
| **セッションボード** | マルチセッション視覚分析（ピクセルビュー、属性ブラッシング、アクティビティタイムライン） |
| **設定マネージャー** | スコープ対応のClaude Code設定エディタ（MCPサーバー管理付き） |
| **メッセージナビゲーター** | 右側折りたたみ式TOCで会話を素早くナビゲーション |
| **リアルタイム監視** | セッションファイルのライブ監視で即座に更新 |
| **セッションコンテキストメニュー** | セッションID・再開コマンド・ファイルパスのコピー、ネイティブ名変更と検索連携 |
| **ANSIカラーレンダリング** | ターミナル出力を元のANSIカラーで表示 |
| **多言語対応** | 英語、韓国語、日本語、中国語（簡体字・繁体字） |
| **最近の編集** | ファイル変更履歴の確認と復元 |
| **自動更新** | スキップ/延期オプション付きビルトイン更新機能 |

## インストール

プラットフォームに合った最新リリースをダウンロード:

| プラットフォーム | ダウンロード |
|----------|----------|
| macOS (Apple Silicon) | [`.dmg`](https://github.com/materialofair/ai-coding-session-reviewer/releases/latest/download/AI%20Coding%20Session%20Reviewer_1.2.1_aarch64.dmg) |

### Homebrew (macOS)

```bash
brew tap jhlee0409/tap
brew install --cask ai-coding-session-reviewer
```

または、完全なCaskパスで直接インストール:

```bash
brew install --cask materialofair/tap/ai-coding-session-reviewer
```

`No Cask with this name exists` と表示される場合は、上記の完全パスコマンドを使用してください。

アップグレード:

```bash
brew upgrade --cask ai-coding-session-reviewer
```

アンインストール:

```bash
brew uninstall --cask ai-coding-session-reviewer
```

> **手動インストール(.dmg)から移行しますか？**
> 競合を防ぐため、Homebrewでインストールする前に既存のアプリを削除してください。
> インストール方法は**1つだけ**使用してください — 手動とHomebrewを混在させないでください。
> ```bash
> # 手動インストールしたアプリを先に削除
> rm -rf "/Applications/AI Coding Session Reviewer.app"
> # Homebrewでインストール
> brew tap jhlee0409/tap
> brew install --cask ai-coding-session-reviewer
> ```

## ソースからビルド

```bash
git clone https://github.com/materialofair/ai-coding-session-reviewer.git
cd ai-coding-session-reviewer

# オプション1: justを使用（推奨）
brew install just    # または: cargo install just
just setup
just dev             # 開発モード
just tauri-build     # プロダクションビルド

# オプション2: pnpmを直接使用
pnpm install
pnpm tauri:dev       # 開発モード
pnpm tauri:build     # プロダクションビルド
```

**要件**: Node.js 18+、pnpm、Rustツールチェーン

## 使い方

1. アプリを起動
2. 対応する全プロバイダー（Claude Code、Codex CLI、OpenCode）から会話データを自動スキャン
3. 左サイドバーでプロジェクトを閲覧 — タブバーでプロバイダー別フィルタリング
4. セッションをクリックしてメッセージを確認
5. タブでメッセージ、分析、トークン統計、最近の編集、セッションボードを切り替え

## アクセシビリティ

このアプリはキーボード操作、ロービジョン、スクリーンリーダー利用を想定した機能を備えています。

- キーボード操作: プロジェクトツリー、メッセージナビゲーター、スキップリンクをサポート
- 視認性: グローバル文字サイズ調整とハイコントラストモード
- スクリーンリーダー: セマンティック構造、状態アナウンス、補助説明に対応

## 技術スタック

| レイヤー | 技術 |
|-------|------------|
| **バックエンド** | ![Rust](https://img.shields.io/badge/Rust-000?logo=rust&logoColor=white) ![Tauri](https://img.shields.io/badge/Tauri_v2-24C8D8?logo=tauri&logoColor=white) |
| **フロントエンド** | ![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white) |
| **状態管理** | ![Zustand](https://img.shields.io/badge/Zustand-433E38?logo=react&logoColor=white) |
| **ビルド** | ![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white) |
| **国際化** | ![i18next](https://img.shields.io/badge/i18next-26A69A?logo=i18next&logoColor=white) 5言語対応 |

## データプライバシー

**100%オフライン。** 会話データはどのサーバーにも送信されません。分析、トラッキング、テレメトリーは一切ありません。

データはあなたのマシンに留まります。

## トラブルシューティング

| 問題 | 解決策 |
|---------|----------|
| 「Claudeデータが見つかりません」 | `~/.claude`に会話履歴があることを確認 |
| パフォーマンスの問題 | 大量の履歴は初期読み込みが遅い場合あり — 仮想スクロールを使用 |
| 更新の問題 | 自動更新が失敗した場合、[Releases](https://github.com/materialofair/ai-coding-session-reviewer/releases)から手動ダウンロード |

## コントリビュート

コントリビュート歓迎！始め方:

1. リポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feat/my-feature`)
3. コミット前にチェックを実行:
   ```bash
   pnpm tsc --build .        # TypeScript
   pnpm vitest run            # テスト
   pnpm lint                  # Lint
   ```
4. 変更をコミット (`git commit -m 'feat: add my feature'`)
5. ブランチにプッシュ (`git push origin feat/my-feature`)
6. プルリクエストを開く

利用可能なコマンドの完全なリストは[開発コマンド](CLAUDE.md#development-commands)を参照。

## 謝辞

初期の着想と土台を提供してくれた [claude-code-history-viewer](https://github.com/jhlee0409/claude-code-history-viewer) に感謝します。

## ライセンス

[MIT](LICENSE) — 個人・商用利用無料。

---

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=materialofair/ai-coding-session-reviewer&type=Date)](https://star-history.com/#materialofair/ai-coding-session-reviewer&Date)

</div>
