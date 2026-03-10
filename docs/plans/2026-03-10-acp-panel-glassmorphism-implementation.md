# ACP Panel Glassmorphism Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform ACP chat panel with glassmorphism design while preserving all functionality

**Architecture:** Progressive CSS-only upgrade using Tailwind utilities, no structural changes to React components

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React icons

---

## Task 1: Update Panel Container with Glassmorphism

**Files:**
- Modify: `src/components/AIAssistantPanel/index.tsx:85-89`

**Step 1: Update collapsed panel button styling**

Find the collapsed panel (lines 66-81) and update button:

```tsx
<Button
  variant="ghost"
  size="icon"
  className="w-8 h-8 rounded-lg hover:bg-foreground/8 transition-colors"
  onClick={() => setAiPanelOpen(true)}
  aria-label={t("aiAssistant.panel.open")}
  title={t("aiAssistant.panel.open")}
>
  <Bot className="w-4 h-4" />
</Button>
```

**Step 2: Update main panel container**

Replace the `<aside>` element at line 85:

```tsx
<aside
  className="relative flex min-h-0 flex-shrink-0 flex-col overflow-hidden border-l border-border/30 bg-card/60 backdrop-blur-xl backdrop-saturate-150 shadow-glass"
  style={{ width, userSelect: isResizing ? "none" : undefined }}
  aria-label={t("aiAssistant.panel.title")}
>
```

**Step 3: Add gradient overlay**

After the opening `<aside>` tag (line ~86), add:

```tsx
{/* Gradient overlay */}
<div className="absolute inset-0 bg-gradient-subtle opacity-40 pointer-events-none" />
```

**Step 4: Verify visually**

Run: `pnpm dev`
Expected: Panel has glass-like translucent effect with subtle gradient

**Step 5: Commit**

```bash
git add src/components/AIAssistantPanel/index.tsx
git commit -m "feat(acp): add glassmorphism to panel container

- Update panel background to bg-card/60 with backdrop-blur-xl
- Add backdrop-saturate-150 for enhanced glass effect
- Soften border from border/50 to border/30
- Add shadow-glass for depth
- Add gradient-subtle overlay at 40% opacity

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Redesign Header Layout (2 rows)

**Files:**
- Modify: `src/components/AIAssistantPanel/index.tsx:97-256`

**Step 1: Update header container**

Replace the header `<div>` at line 98:

```tsx
{/* Header */}
<div className="relative px-4 py-3 border-b border-border/15 bg-muted/5 flex-shrink-0">
```

**Step 2: Update title row — left side (icon + title)**

Keep the existing icon + title structure but update button styles. Replace lines 99-119:

```tsx
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-6 h-6 rounded-md bg-primary/12 flex items-center justify-center flex-shrink-0">
        <Bot className="w-3.5 h-3.5 text-primary" />
      </div>
      <span className="text-sm font-semibold tracking-tight text-foreground truncate">
        {t("aiAssistant.panel.title")}
      </span>
    </div>
    <div className="flex items-center gap-1 flex-shrink-0">
      {aiDataSourceProvider === "auto" && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[10px] text-muted-foreground gap-1 hover:text-foreground rounded-full hover:bg-foreground/8 transition-colors"
          onClick={() =>
            setAiAnalysisScope(aiAnalysisScope === "current" ? "all" : "current")
          }
        >
          <ArrowLeftRight className="w-3 h-3" />
          {aiAnalysisScope === "current"
            ? t("aiAssistant.scope.current")
            : t("aiAssistant.scope.all")}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 rounded-lg hover:bg-foreground/8 transition-colors"
            disabled={isAiStreaming || isAiAnalyzing}
            title={t("aiAssistant.session.history")}
          >
            <History className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs flex items-center justify-between">
            {t("aiAssistant.session.history")}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] gap-1 hover:bg-foreground/8"
              onClick={() => createAiChatSession(t("aiAssistant.chat.newSessionDefault"))}
              disabled={isAiStreaming || isAiAnalyzing}
              title={t("aiAssistant.chat.newSession")}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {aiChatSessions.length === 0 ? (
            <div className="px-2 py-4 text-center text-xs text-muted-foreground">
              {t("aiAssistant.session.noHistory")}
            </div>
          ) : (
            aiChatSessions.map((session) => (
              <DropdownMenuItem
                key={session.id}
                onClick={() => switchAiChatSession(session.id)}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex-1 truncate">
                  <div className="font-medium truncate">{session.title}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {session.messages.length} {t("aiAssistant.chat.assistant", "messages")}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {session.id === activeAiChatSessionId && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                  {canDeleteSessions && (
                    <button
                      type="button"
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label={t("aiAssistant.chat.deleteSession", {
                        defaultValue: "删除会话",
                      })}
                      title={t("aiAssistant.chat.deleteSession", {
                        defaultValue: "删除会话",
                      })}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        deleteAiChatSession(session.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="icon"
        className="w-7 h-7 rounded-lg hover:bg-foreground/8 transition-colors"
        onClick={() => setAiPanelOpen(false)}
        aria-label={t("aiAssistant.panel.close")}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  </div>
```

**Step 3: Replace status row + session selector + scope row with compact meta row**

Remove the old 3 rows (status sparkles row, session select + history dropdown + new button row, scope row) and replace with a single meta row:

```tsx
  <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
    <div className="flex items-center gap-2 min-w-0">
      <ProviderSelector />
      <span className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${
          isAiStreaming
            ? "bg-primary animate-ping"
            : isAiAnalyzing
              ? "bg-primary animate-pulse"
              : "bg-emerald-500 animate-pulse"
        }`} />
        {isAiStreaming
          ? t("aiAssistant.status.streaming")
          : isAiAnalyzing
            ? t("aiAssistant.status.analyzing")
            : t("aiAssistant.status.ready")}
      </span>
    </div>
    <select
      className="h-6 max-w-[140px] rounded border border-border/30 bg-background/60 px-2 text-[10px] text-foreground focus:outline-none truncate"
      value={activeAiChatSessionId}
      onChange={(e) => switchAiChatSession(e.target.value)}
      disabled={isAiStreaming}
      aria-label={t("aiAssistant.chat.sessionSelect")}
    >
      {aiChatSessions.map((session) => (
        <option key={session.id} value={session.id}>
          {session.title}
        </option>
      ))}
    </select>
  </div>
</div>
```

**Step 4: Verify visually**

Run: `pnpm dev`
Expected: Header is 2 rows — title row with scope/menu/close buttons, meta row with provider + status + session selector

**Step 5: Commit**

```bash
git add src/components/AIAssistantPanel/index.tsx
git commit -m "feat(acp): redesign header to 2-row layout

- Consolidate 3 header rows into 2 (title + meta)
- Move scope toggle and session menu to title row
- Add animated status dot indicator (pulse/ping)
- Soften border to border/15, add bg-muted/5
- Update button styles with rounded-lg hover:bg-foreground/8

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Upgrade Message Bubbles and Chat History

**Files:**
- Modify: `src/components/AIAssistantPanel/ChatHistory.tsx`

**Step 1: Update scroll container**

Replace the scroll container at line 39:

```tsx
<div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
```

**Step 2: Update empty state**

Replace the empty state (lines 27-35):

```tsx
<div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur-sm border border-border/20 flex items-center justify-center shadow-sm">
    <Bot className="w-8 h-8 text-primary/70" />
  </div>
  <div className="space-y-2 max-w-xs">
    <p className="text-sm font-medium text-foreground/80">
      {t("aiAssistant.analysis.noData")}
    </p>
    <p className="text-xs text-muted-foreground/70 leading-relaxed">
      {t("aiAssistant.chat.placeholder")}
    </p>
  </div>
</div>
```

**Step 3: Update user message bubble**

Replace the user message return (lines 53-64):

```tsx
<div className="flex justify-end gap-3">
  <div className="max-w-[80%] flex flex-col items-end gap-1.5">
    <div className="bg-primary/90 backdrop-blur-sm text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2.5 text-sm leading-relaxed break-words shadow-md border border-primary/20 transition-all duration-250 hover:shadow-lg hover:scale-[1.01]">
      {message.content}
    </div>
  </div>
  <div className="w-8 h-8 rounded-full bg-accent/80 backdrop-blur-sm border border-accent-foreground/10 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
    <User className="w-4 h-4 text-accent-foreground" />
  </div>
</div>
```

**Step 4: Update assistant message bubble**

Replace the assistant message return (lines 67-90):

```tsx
<div className="flex gap-3">
  <div className="w-8 h-8 rounded-full bg-muted/60 backdrop-blur-sm border border-border/20 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
    <Bot className="w-4 h-4 text-muted-foreground" />
  </div>
  <div className="flex-1 min-w-0">
    {message.isStreaming && message.content === "" ? (
      <div className="flex items-center gap-1.5 py-2 text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="text-sm">{t("aiAssistant.chat.thinking")}</span>
      </div>
    ) : (
      <div className="bg-card/70 backdrop-blur-md border border-border/20 rounded-2xl rounded-tl-md px-4 py-2.5 shadow-sm transition-all duration-250 hover:bg-card/80 hover:shadow-md min-w-0 overflow-hidden">
        <Markdown className="text-sm [&_.prose]:text-sm">
          {message.content}
        </Markdown>
        {message.isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-primary/70 ml-1 animate-pulse rounded-sm" />
        )}
      </div>
    )}
  </div>
</div>
```

**Step 5: Verify visually**

Run: `pnpm dev`
Expected: Larger avatars, spacious bubbles with glass effects, hover micro-interactions, enhanced empty state

**Step 6: Commit**

```bash
git add src/components/AIAssistantPanel/ChatHistory.tsx
git commit -m "feat(acp): upgrade message bubbles with glassmorphism

- Enlarge avatars from w-6 to w-8 with glass backgrounds
- Increase text from text-xs to text-sm for readability
- Add backdrop-blur and semi-transparent backgrounds to bubbles
- Add shadow-md/sm and subtle borders for depth
- Add hover:shadow-lg hover:scale-[1.01] micro-interactions
- Upgrade empty state with gradient glass card icon
- Increase container padding to px-4 py-4

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Upgrade Input Section

**Files:**
- Modify: `src/components/AIAssistantPanel/ChatInput.tsx`
- Modify: `src/components/AIAssistantPanel/index.tsx` (input wrapper)

**Step 1: Update input wrapper in index.tsx**

Replace the input area container (line 262):

```tsx
<div className="px-4 py-3 border-t border-border/15 bg-muted/5 backdrop-blur-sm flex-shrink-0 space-y-2.5">
```

**Step 2: Update textarea styling in ChatInput.tsx**

Replace the textarea className (line 58):

```tsx
<textarea
  ref={textareaRef}
  className="flex-1 resize-none rounded-xl border border-border/30 bg-background/60 backdrop-blur-sm px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-250 shadow-sm min-h-[2.5rem] max-h-[7.5rem] overflow-y-auto"
  placeholder={t("aiAssistant.chat.placeholder")}
  value={value}
  onChange={handleChange}
  onKeyDown={handleKeyDown}
  disabled={isAiStreaming}
  rows={1}
  aria-label={t("aiAssistant.chat.placeholder")}
/>
```

**Step 3: Update send button styling**

Replace the send Button (lines 67-75):

```tsx
<Button
  size="icon"
  className="w-10 h-10 flex-shrink-0 bg-primary/90 hover:bg-primary shadow-md hover:shadow-lg transition-all duration-250 hover:scale-105 disabled:opacity-50 disabled:scale-100"
  onClick={handleSend}
  disabled={!value.trim() || isAiStreaming}
  aria-label={t("aiAssistant.chat.send")}
>
  <SendHorizonal className="w-4 h-4" />
</Button>
```

**Step 4: Update action buttons (Export/Clear) in index.tsx**

Replace the export and clear buttons (lines 266-283):

```tsx
{aiMessages.length > 0 && (
  <div className="flex items-center justify-between">
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-3 text-xs text-muted-foreground gap-2 hover:text-foreground hover:bg-foreground/5 transition-colors"
      onClick={exportReport}
    >
      <Download className="w-3.5 h-3.5" />
      {t("aiAssistant.export.button")}
    </Button>
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-3 text-xs text-muted-foreground gap-2 hover:text-destructive hover:bg-destructive/5 transition-colors"
      onClick={clearAiMessages}
    >
      <Trash2 className="w-3.5 h-3.5" />
      {t("aiAssistant.chat.clear")}
    </Button>
  </div>
)}
```

**Step 5: Verify visually**

Run: `pnpm dev`
Expected: Rounded-xl textarea with glass background, larger send button with scale hover, spacious action buttons

**Step 6: Commit**

```bash
git add src/components/AIAssistantPanel/ChatInput.tsx src/components/AIAssistantPanel/index.tsx
git commit -m "feat(acp): upgrade input section with glassmorphism

- Textarea: rounded-md→rounded-xl, glass background, focus:ring-2
- Send button: larger w-10 h-10, hover:scale-105 micro-interaction
- Action buttons: larger hit area h-8 px-3, text-xs
- Input container: softer border/15, bg-muted/5 backdrop-blur-sm
- Increase spacing to space-y-2.5

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Update Drag Handle

**Files:**
- Modify: `src/components/AIAssistantPanel/index.tsx:91-95`

**Step 1: Update drag handle styling**

Replace the drag handle div (lines 91-95):

```tsx
{/* Drag handle */}
<div
  className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors duration-150 z-10"
  onMouseDown={handleMouseDown}
  title={t("aiAssistant.panel.dragHint")}
/>
```

**Step 2: Verify visually**

Run: `pnpm dev`
Expected: Slightly wider drag handle (w-1.5), more visible hover/active states

**Step 3: Commit**

```bash
git add src/components/AIAssistantPanel/index.tsx
git commit -m "feat(acp): improve drag handle visibility

- Widen from w-1 to w-1.5 for easier grabbing
- Increase hover opacity from primary/20 to primary/30
- Add active:bg-primary/50 for drag feedback

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Final Verification

**Step 1: Run TypeScript check**

Run: `pnpm tsc --build .`
Expected: No type errors

**Step 2: Run linter**

Run: `pnpm lint`
Expected: No new lint errors

**Step 3: Run tests**

Run: `pnpm vitest run --reporter=verbose`
Expected: All existing tests pass

**Step 4: Visual verification**

Run: `pnpm dev`
Verify:
- Panel has glass-like translucent effect with gradient overlay
- Header is 2 rows (title + meta), all buttons functional
- Message bubbles have glass backgrounds, shadows, hover effects
- Input area has rounded-xl textarea, scale-hover send button
- Drag handle is wider and more visible
- Dark mode and light mode both look correct
- Panel resizing still works (300px–800px)
- All existing features functional (send, clear, export, sessions, provider switch, scope toggle)

**Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(acp): polish glassmorphism edge cases

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```