<div align="center">

# AI Coding Session Reviewer

**Claude Code 대화 기록을 탐색, 검색, 분석하세요 — 완전한 오프라인.**

Claude Code, Codex CLI, OpenCode의 대화 기록을 분석, 세션 보드, 실시간 모니터링과 함께 탐색하는 데스크톱 앱.

[![Version](https://img.shields.io/github/v/release/materialofair/ai-coding-session-reviewer?label=Version&color=blue)](https://github.com/materialofair/ai-coding-session-reviewer/releases)
[![Stars](https://img.shields.io/github/stars/materialofair/ai-coding-session-reviewer?style=flat&color=yellow)](https://github.com/materialofair/ai-coding-session-reviewer/stargazers)
[![License](https://img.shields.io/github/license/materialofair/ai-coding-session-reviewer)](LICENSE)
[![Rust Tests](https://img.shields.io/github/actions/workflow/status/materialofair/ai-coding-session-reviewer/rust-tests.yml?label=Rust%20Tests)](https://github.com/materialofair/ai-coding-session-reviewer/actions/workflows/rust-tests.yml)
[![Last Commit](https://img.shields.io/github/last-commit/materialofair/ai-coding-session-reviewer)](https://github.com/materialofair/ai-coding-session-reviewer/commits/main)

[웹사이트](https://github.com/materialofair/ai-coding-session-reviewer) · [다운로드](https://github.com/materialofair/ai-coding-session-reviewer/releases) · [버그 제보](https://github.com/materialofair/ai-coding-session-reviewer/issues)

**Languages**: [English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [中文 (简体)](README.zh-CN.md) | [中文 (繁體)](README.zh-TW.md)

</div>


---

## 빠른 미리보기

한 화면으로 핵심 흐름을 확인하세요: 프로젝트 복기, 멀티 세션 탐색, AI 어시스턴트 분석.

![AI Coding Session Reviewer Overview](assets/screenshots/app-overview-2026-03-04.png)

## 목차

- [주요 기능](#주요-기능)
- [설치](#설치)
- [소스에서 빌드](#소스에서-빌드)
- [사용법](#사용법)
- [접근성](#접근성)
- [기술 스택](#기술-스택)
- [데이터 프라이버시](#데이터-프라이버시)
- [문제 해결](#문제-해결)
- [기여하기](#기여하기)
- [감사의 말](#감사의-말)
- [라이선스](#라이선스)

## 주요 기능

| 기능 | 설명 |
|---------|-------------|
| **멀티 프로바이더** | Claude Code, Codex CLI, OpenCode 대화를 통합 뷰어로 탐색 |
| **AI 어시스턴트** | 내장 어시스턴트로 세션 설명, 대화 요약, 프로젝트 수준 질의 응답 지원 |
| **대화 브라우저** | 프로젝트/세션별 대화 탐색 (워크트리 그룹핑 지원) |
| **글로벌 검색** | 모든 대화에서 즉시 검색 |
| **분석 대시보드** | 듀얼 모드 토큰 통계 (빌링 vs 대화), 비용 브레이크다운, 프로바이더 분포 차트 |
| **세션 보드** | 멀티 세션 시각 분석 (픽셀 뷰, 속성 브러싱, 액티비티 타임라인) |
| **설정 관리자** | 스코프 기반 Claude Code 설정 편집기 (MCP 서버 관리 포함) |
| **메시지 네비게이터** | 우측 접이식 TOC로 긴 대화 빠르게 탐색 |
| **실시간 모니터링** | 세션 파일 변경 실시간 감지 및 즉시 업데이트 |
| **세션 컨텍스트 메뉴** | 세션 ID 복사, 재개 명령 복사, 파일 경로 복사; 네이티브 이름 변경 및 검색 연동 |
| **ANSI 색상 렌더링** | 터미널 출력을 원본 ANSI 색상으로 표시 |
| **다국어 지원** | 영어, 한국어, 일본어, 중국어 (간체 및 번체) |
| **최근 편집** | 파일 수정 내역 확인 및 복원 |
| **자동 업데이트** | 내장 업데이터 (건너뛰기/연기 옵션 포함) |

## 설치

플랫폼에 맞는 최신 릴리즈를 다운로드하세요:

| 플랫폼 | 다운로드 |
|----------|----------|
| macOS (Apple Silicon) | [`.dmg`](https://github.com/materialofair/ai-coding-session-reviewer/releases/latest/download/AI%20Coding%20Session%20Reviewer_1.2.1_aarch64.dmg) |

### Homebrew (macOS)

```bash
brew tap jhlee0409/tap
brew install --cask ai-coding-session-reviewer
```

또는 전체 Cask 경로로 바로 설치:

```bash
brew install --cask materialofair/tap/ai-coding-session-reviewer
```

`No Cask with this name exists` 오류가 나오면 위의 전체 경로 명령을 사용하세요.

업그레이드:

```bash
brew upgrade --cask ai-coding-session-reviewer
```

제거:

```bash
brew uninstall --cask ai-coding-session-reviewer
```

> **기존 수동 설치(.dmg)에서 전환하시나요?**
> 충돌을 방지하려면 기존 앱을 먼저 삭제한 후 Homebrew로 설치하세요.
> 설치 방식은 **하나만** 사용하세요 — 수동 설치와 Homebrew를 함께 사용하지 마세요.
> ```bash
> # 수동 설치된 앱을 먼저 삭제
> rm -rf "/Applications/AI Coding Session Reviewer.app"
> # Homebrew로 설치
> brew tap jhlee0409/tap
> brew install --cask ai-coding-session-reviewer
> ```

## 소스에서 빌드

```bash
git clone https://github.com/materialofair/ai-coding-session-reviewer.git
cd ai-coding-session-reviewer

# 방법 1: just 사용 (권장)
brew install just    # 또는: cargo install just
just setup
just dev             # 개발 모드
just tauri-build     # 프로덕션 빌드

# 방법 2: pnpm 직접 사용
pnpm install
pnpm tauri:dev       # 개발 모드
pnpm tauri:build     # 프로덕션 빌드
```

**요구사항**: Node.js 18+, pnpm, Rust toolchain

## 사용법

1. 앱 실행
2. 지원하는 모든 프로바이더 (Claude Code, Codex CLI, OpenCode)에서 대화 데이터 자동 스캔
3. 좌측 사이드바에서 프로젝트 탐색 — 탭 바로 프로바이더별 필터링
4. 세션 클릭하여 메시지 확인
5. 탭으로 메시지, 분석, 토큰 통계, 최근 편집, 세션 보드 전환

## 접근성

앱은 키보드 전용 사용자, 저시력 사용자, 스크린 리더 사용자를 위한 접근성 기능을 제공합니다.

- 키보드 탐색: 프로젝트 트리, 메시지 내비게이터, 스킵 링크 지원
- 시각 보조: 전역 글꼴 크기 조정 및 고대비 모드
- 스크린 리더: 시맨틱 랜드마크, 상태 알림, 보조 설명 제공

## 기술 스택

| 레이어 | 기술 |
|-------|------------|
| **백엔드** | ![Rust](https://img.shields.io/badge/Rust-000?logo=rust&logoColor=white) ![Tauri](https://img.shields.io/badge/Tauri_v2-24C8D8?logo=tauri&logoColor=white) |
| **프론트엔드** | ![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white) |
| **상태 관리** | ![Zustand](https://img.shields.io/badge/Zustand-433E38?logo=react&logoColor=white) |
| **빌드** | ![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white) |
| **다국어** | ![i18next](https://img.shields.io/badge/i18next-26A69A?logo=i18next&logoColor=white) 5개 언어 |

## 데이터 프라이버시

**100% 오프라인.** 대화 데이터는 어떤 서버로도 전송되지 않습니다. 분석도, 추적도, 원격 측정도 없습니다.

모든 데이터는 사용자의 기기에만 저장됩니다.

## 문제 해결

| 문제 | 해결 방법 |
|---------|----------|
| "Claude 데이터를 찾을 수 없음" | `~/.claude` 폴더가 존재하고 대화 기록이 있는지 확인 |
| 성능 문제 | 대용량 대화 기록은 초기 로딩이 느릴 수 있음 — 앱은 가상 스크롤링 사용 |
| 업데이트 오류 | 자동 업데이트 실패 시 [Releases](https://github.com/materialofair/ai-coding-session-reviewer/releases)에서 수동 다운로드 |

## 기여하기

기여를 환영합니다! 시작 방법:

1. 저장소 포크
2. 기능 브랜치 생성 (`git checkout -b feat/my-feature`)
3. 커밋 전 체크 실행:
   ```bash
   pnpm tsc --build .        # TypeScript
   pnpm vitest run            # 테스트
   pnpm lint                  # 린트
   ```
4. 변경 사항 커밋 (`git commit -m 'feat: add my feature'`)
5. 브랜치에 푸시 (`git push origin feat/my-feature`)
6. Pull Request 생성

전체 사용 가능한 명령어 목록은 [개발 명령어](CLAUDE.md#development-commands)를 참조하세요.

## 감사의 말

[claude-code-history-viewer](https://github.com/jhlee0409/claude-code-history-viewer) 프로젝트의 초기 영감과 기반에 감사드립니다.

## 라이선스

[MIT](LICENSE) — 개인 및 상업적 사용 모두 무료.

---

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=materialofair/ai-coding-session-reviewer&type=Date)](https://star-history.com/#materialofair/ai-coding-session-reviewer&Date)

</div>
