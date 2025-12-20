# Contributing to Evaluhealth

## Development Commands

This monorepo uses pnpm workspaces (no Turbo). All scripts use `pnpm --filter` to target specific packages.

**Available scripts:**

```bash
pnpm run dev          # Build evaluhealth + UI, then run tsc -w on evaluhealth + vitest on evaluhealth-tests
pnpm run example      # Build, then run evaluhealth watch + UI dev server (parallel)
pnpm run test         # Build, then run tests on evaluhealth + evaluhealth-tests
pnpm run build        # Build evaluhealth, then evaluhealth-ui
pnpm run ci           # Full CI: build, test, lint, check-format
```

**Individual package scripts:**

```bash
pnpm build:evaluhealth     # Build evaluhealth package only
pnpm build:evaluhealth-ui  # Build UI and copy to evaluhealth/dist/ui
```

**Setup:**

1. Create `.env` in `packages/example` with `OPENAI_API_KEY=your-key`
2. Run `pnpm install`
3. For global `evaluhealth` command: `pnpm build && cd packages/evaluhealth && npm link`

## Styling Guidelines

This project uses **Tailwind CSS v4** with a custom design system built on semantic color tokens and OKLCH color space. Follow these guidelines to maintain consistency.

### CSS Structure

### Semantic Color Usage

**DO:** Use semantic tokens with opacity modifiers

```tsx
<div className="text-foreground/60 bg-foreground/10 hover:bg-foreground/20" />
```

**DON'T:** Use hardcoded Tailwind colors

```tsx
// ❌ Avoid
<div className="text-gray-600 bg-gray-100 hover:bg-gray-200" />
```

### Dark Mode Implementation

#### 1. Component Dark Variants

Always provide dark mode variants for interactive states:

```tsx
// Button example
<button className="
  bg-primary text-primary-foreground
  hover:bg-primary/90
  focus-visible:ring-ring/50
  dark:bg-primary/80
  dark:hover:bg-primary/70
" />

// Input example
<input className="
  bg-background border-input
  dark:bg-input/30 dark:border-input
  hover:border-ring
" />
```

#### 2. Typography Dark Mode

Use `prose-invert` for markdown content:

```tsx
<ReactMarkdown className="prose dark:prose-invert prose-sm">
  {content}
</ReactMarkdown>
```

### Testing Dark Mode

1. System light mode → app should be light
2. System dark mode → app should be dark
3. System preference change → app should update immediately
4. No FOUC on page load
5. All interactive states have visible dark variants
6. Focus rings visible in both modes
7. Markdown content readable in both modes
