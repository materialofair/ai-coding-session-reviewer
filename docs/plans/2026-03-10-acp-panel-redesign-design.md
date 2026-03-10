# ACP Chat Panel Glassmorphism Redesign

**Date:** 2026-03-10
**Status:** Approved
**Design Approach:** Progressive Glassmorphism Upgrade (方案 1)

## Design Goals

1. **Modern Visual Style:** Adopt Glassmorphism design language with backdrop blur, semi-transparent backgrounds, and subtle shadows
2. **Functional Preservation:** Keep all existing features intact
3. **Layout Restructuring:** Reorganize component hierarchy for better visual clarity
4. **Visual Consistency:** Maintain complete alignment with MessageViewer's design system

## User Requirements

- **Primary Issue:** Current design lacks modern aesthetics
- **Desired Style:** Glassmorphism (glass-like translucent effects)
- **Functional Scope:** Preserve all features, restructure layout
- **Consistency:** Full alignment with main application's visual language

## Design Principles

### Core Visual Parameters

**Glassmorphism Foundation:**
- Background opacity: 60-90% (varies by component)
- Backdrop blur: `backdrop-blur-sm` to `backdrop-blur-xl`
- Backdrop saturation: 150-180%
- Border opacity: 15-30% of base color
- Shadow: Custom `shadow-glass` from design system

**Animation Standards:**
- Transition duration: 250ms
- Easing function: `ease-out-expo`
- Hover scale: 1.01-1.05 (subtle micro-interactions)

**Spacing Scale:**
- Container padding: 16px (up from 12px)
- Component gaps: 12px (up from 8px)
- Message spacing: 16px (unchanged)

## Component Specifications

### 1. Panel Container

**Current:**
```tsx
className="relative flex min-h-0 flex-shrink-0 flex-col overflow-hidden
  border-l border-border/50 bg-card/95 backdrop-blur-sm"
```

**New:**
```tsx
className="relative flex min-h-0 flex-shrink-0 flex-col overflow-hidden
  border-l border-border/30
  bg-card/60 backdrop-blur-xl backdrop-saturate-150
  shadow-glass"
```

**Changes:**
- Opacity: 95% → 60% (stronger glass effect)
- Blur: `backdrop-blur-sm` → `backdrop-blur-xl` (24px blur)
- Added: `backdrop-saturate-150` (1.5x saturation boost)
- Border: `border/50` → `border/30` (softer edge)
- Shadow: Added `shadow-glass` for depth

**Gradient Overlay:**
```tsx
<div className="absolute inset-0 bg-gradient-subtle opacity-40 pointer-events-none" />
```

### 2. Header Section

**Layout Structure:**
```
┌─────────────────────────────────────┐
│  🤖 AI Assistant    [scope] [≡] [×] │  ← Title row
│  ─────────────────────────────────  │  ← Divider (border-border/15)
│  Provider: Claude ▾   ● Ready       │  ← Meta row
└─────────────────────────────────────┘
```

**Container:**
```tsx
className="relative px-4 py-3 border-b border-border/15 bg-muted/5"
```

**Title Row:**
- Icon container: `w-6 h-6 rounded-md bg-primary/12` (unchanged)
- Title: `text-sm font-semibold tracking-tight text-foreground`
- Scope toggle: Moved to right side, pill button style
- Session menu: Consolidated into `≡` dropdown
- Close button: Remains rightmost

**Meta Row:**
- Provider selector: Inline compact style
- Status indicator: Dynamic dot + text
  - Ready: `w-1.5 h-1.5 rounded-full bg-success animate-pulse`
  - Streaming: `w-1.5 h-1.5 rounded-full bg-primary animate-ping`

**Button Style:**
```tsx
className="w-7 h-7 rounded-lg hover:bg-foreground/8 transition-colors"
```

**Key Improvements:**
- Layout: 3 rows → 2 rows (cleaner hierarchy)
- Padding: `px-3 py-2.5` → `px-4 py-3` (more breathing room)
- Divider: `border/50` → `border/15` (softer separation)
- Status: Static text → Animated indicator

### 3. Message Bubbles

#### User Message (Right-aligned)

```tsx
<div className="flex justify-end gap-3">
  <div className="max-w-[80%] flex flex-col items-end gap-1.5">
    <div className="
      bg-primary/90 backdrop-blur-sm
      text-primary-foreground
      rounded-2xl rounded-tr-md
      px-4 py-2.5
      text-sm leading-relaxed
      shadow-md
      border border-primary/20
      transition-all duration-250
      hover:shadow-lg hover:scale-[1.01]
    ">
      {message.content}
    </div>
  </div>
  <div className="
    w-8 h-8 rounded-full
    bg-accent/80 backdrop-blur-sm
    border border-accent-foreground/10
    flex items-center justify-center
    flex-shrink-0 mt-0.5
    shadow-sm
  ">
    <User className="w-4 h-4 text-accent-foreground" />
  </div>
</div>
```

#### Assistant Message (Left-aligned)

```tsx
<div className="flex gap-3">
  <div className="
    w-8 h-8 rounded-full
    bg-muted/60 backdrop-blur-sm
    border border-border/20
    flex items-center justify-center
    flex-shrink-0 mt-0.5
    shadow-sm
  ">
    <Bot className="w-4 h-4 text-muted-foreground" />
  </div>
  <div className="flex-1 min-w-0">
    <div className="
      bg-card/70 backdrop-blur-md
      border border-border/20
      rounded-2xl rounded-tl-md
      px-4 py-2.5
      shadow-sm
      transition-all duration-250
      hover:bg-card/80 hover:shadow-md
    ">
      <Markdown className="text-sm [&_.prose]:text-sm">
        {message.content}
      </Markdown>
      {message.isStreaming && (
        <span className="
          inline-block w-1.5 h-4
          bg-primary/70
          ml-1
          animate-pulse
          rounded-sm
        " />
      )}
    </div>
  </div>
</div>
```

**Key Changes:**
- Avatar size: `w-6 h-6` → `w-8 h-8` (more prominent)
- Bubble padding: `px-3 py-2` → `px-4 py-2.5` (more spacious)
- Text size: `text-xs` → `text-sm` (better readability)
- Max width: `85%` → `80%` (better balance)
- Gap: `gap-2` → `gap-3` (more breathing room)
- User bubble: `bg-primary` → `bg-primary/90 backdrop-blur-sm` (glass effect)
- Assistant bubble: `bg-muted/50` → `bg-card/70 backdrop-blur-md` (stronger glass)
- Shadows: Added `shadow-md` / `shadow-sm` for depth
- Borders: Added subtle borders for definition
- Hover: Added `hover:shadow-lg hover:scale-[1.01]` micro-interaction
- Cursor: `w-1.5 h-3.5` → `w-1.5 h-4` + `bg-primary/70` (semi-transparent)

### 4. Chat History Container

**Scroll Container:**
```tsx
<div className="
  flex-1 overflow-y-auto
  px-4 py-4
  space-y-4
  min-h-0
  scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/30
">
```

**Empty State:**
```tsx
<div className="
  flex-1 flex flex-col items-center justify-center
  gap-4 p-8 text-center
">
  <div className="
    w-16 h-16 rounded-2xl
    bg-gradient-to-br from-primary/10 to-accent/10
    backdrop-blur-sm
    border border-border/20
    flex items-center justify-center
    shadow-sm
  ">
    <Bot className="w-8 h-8 text-primary/70" />
  </div>
  <div className="space-y-2 max-w-xs">
    <p className="text-sm font-medium text-foreground/80">
      {t("aiAssistant.analysis.noData")}
    </p>
    <p className="text-xs text-muted-foreground/70 leading-relaxed">
      开始对话,我会帮你分析 Claude Code 的使用记录
    </p>
  </div>
</div>
```

**Key Changes:**
- Padding: `px-3 py-3` → `px-4 py-4` (more spacious)
- Scrollbar: Added custom thin scrollbar styling
- Empty icon: `w-10 h-10 bg-muted` → `w-16 h-16 gradient glass card` (more engaging)
- Empty text: Added descriptive subtitle

### 5. Input Section

**Container:**
```tsx
className="px-4 py-3 border-t border-border/15 bg-muted/5 backdrop-blur-sm flex-shrink-0 space-y-2.5"
```

**Textarea:**
```tsx
<textarea
  className="
    flex-1 resize-none
    rounded-xl
    border border-border/30
    bg-background/60 backdrop-blur-sm
    px-4 py-3
    text-sm
    placeholder:text-muted-foreground/60
    focus:outline-none
    focus:ring-2 focus:ring-primary/30
    focus:border-primary/50
    transition-all duration-250
    shadow-sm
    min-h-[2.5rem] max-h-[7.5rem]
  "
/>
```

**Send Button:**
```tsx
<Button
  size="icon"
  className="
    w-10 h-10 flex-shrink-0
    bg-primary/90 hover:bg-primary
    shadow-md hover:shadow-lg
    transition-all duration-250
    hover:scale-105
    disabled:opacity-50 disabled:scale-100
  "
>
  <SendHorizonal className="w-4 h-4" />
</Button>
```

**Action Buttons (Export/Clear):**
```tsx
<Button
  variant="ghost"
  size="sm"
  className="
    h-8 px-3 text-xs
    text-muted-foreground
    gap-2
    hover:text-foreground
    hover:bg-foreground/5
    transition-colors
  "
>
  <Download className="w-3.5 h-3.5" />
  {t("aiAssistant.export.button")}
</Button>
```

**Key Changes:**
- Container padding: `px-3 py-2.5` → `px-4 py-3`
- Spacing: `space-y-2` → `space-y-2.5`
- Textarea border radius: `rounded-md` → `rounded-xl` (softer)
- Textarea background: `bg-background` → `bg-background/60 backdrop-blur-sm` (glass)
- Focus ring: `ring-1 ring-accent` → `ring-2 ring-primary/30` (more visible)
- Send button: Added `hover:scale-105` micro-interaction
- Action buttons: `h-7 px-2 text-[11px]` → `h-8 px-3 text-xs` (larger hit area)

### 6. Drag Handle

```tsx
<div
  className="
    absolute left-0 top-0 bottom-0
    w-1.5
    cursor-col-resize
    hover:bg-primary/30
    active:bg-primary/50
    transition-colors duration-150
    z-10
  "
  onMouseDown={handleMouseDown}
/>
```

**Changes:**
- Width: `w-1` → `w-1.5` (easier to grab)
- Hover: `hover:bg-primary/20` → `hover:bg-primary/30` (more visible)
- Added: `active:bg-primary/50` (drag feedback)

## Technical Implementation Notes

### CSS Variables Used

From `tailwind.config.js`:
- `--shadow-glass`: Custom glass shadow
- `--gradient-subtle`: Subtle background gradient
- `--ease-out-expo`: Smooth easing function
- All semantic color variables (primary, accent, muted, etc.)

### Responsive Behavior

Maintains existing resizable panel logic:
- Default width: 400px
- Min width: 300px
- Max width: 800px
- Direction: left (resizes from left edge)

### Accessibility Considerations

- All interactive elements maintain ARIA labels
- Focus states enhanced with visible rings
- Color contrast ratios preserved despite transparency
- Keyboard navigation unchanged

### Performance Considerations

- Backdrop blur limited to necessary areas
- Animations use GPU-accelerated properties (transform, opacity)
- Virtual scrolling for message list (existing implementation)
- Memoized message components (existing implementation)

## Design Rationale

### Why Progressive Upgrade?

1. **Low Risk:** Builds on existing layout, minimizes breaking changes
2. **User Familiarity:** Preserves learned interaction patterns
3. **Visual Consistency:** Aligns naturally with MessageViewer's card-based design
4. **Iterative:** Allows for gradual refinement based on user feedback

### Why Glassmorphism?

1. **Modern Aesthetic:** Aligns with current design trends (macOS, iOS)
2. **Depth Perception:** Creates visual hierarchy through layering
3. **Brand Alignment:** Matches the app's existing use of transparency and blur
4. **Functional:** Maintains readability while adding visual interest

### Trade-offs Accepted

- **Performance:** Backdrop blur has minor GPU cost (acceptable for side panel)
- **Complexity:** More CSS classes per component (manageable with Tailwind)
- **Browser Support:** Requires modern browsers (already a requirement)

## Success Criteria

1. ✅ Visual style feels modern and cohesive
2. ✅ All existing features remain functional
3. ✅ Layout is more spacious and readable
4. ✅ Consistent with MessageViewer design language
5. ✅ Smooth animations and micro-interactions
6. ✅ Maintains accessibility standards

## Next Steps

1. Create implementation plan via `writing-plans` skill
2. Update component files with new styles
3. Test across different themes (light/dark)
4. Verify responsive behavior at min/max widths
5. Validate accessibility with screen readers
6. User acceptance testing

## Files to Modify

- `src/components/AIAssistantPanel/index.tsx` (main container + header)
- `src/components/AIAssistantPanel/ChatHistory.tsx` (message bubbles + empty state)
- `src/components/AIAssistantPanel/ChatInput.tsx` (input area)
- No changes to: `ProviderSelector.tsx`, `useAiAssistant.ts`, store logic

## Design Assets

No external assets required. All styling uses:
- Tailwind utility classes
- Existing CSS variables
- Lucide React icons (already in use)
