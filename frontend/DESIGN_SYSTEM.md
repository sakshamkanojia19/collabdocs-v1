# CollabDocs Design System

The product design language: a clean, light, modern SaaS aesthetic modeled on
Attio, Cake Equity, and Officevibe. Every screen must follow this spec so the
app reads as one product.

## Principles

1. **White surfaces, hairline borders.** Hierarchy comes from `border` +
   `bg-secondary` tints, not heavy shadows. Shadows are reserved:
   `shadow-raised` (resting cards), `shadow-lifted` (hover), `shadow-floating`
   (popovers/modals only).
2. **One accent.** Violet primary (`bg-primary`) is the only saturated color in
   chrome. Semantic colors (success/warning/info/destructive) appear only in
   status pills, badges, and alerts — never as decoration.
3. **Calm type.** Inter, 13–14px body. Use ONLY the named scale: `text-meta`
   (11px), `text-caption` (12px), `text-body` (13px), `text-body-lg` (14px),
   `text-title-sm` (16px), `text-title` (20px), `text-title-lg` (24px),
   `text-display` (32px). Never `text-[10px]`-style arbitrary sizes.
4. **Tokens only.** Never hardcode colors (`#hex`, `slate-200`, `violet-600`)
   in chrome. Use `bg-background`, `bg-card`, `bg-secondary`, `bg-accent`,
   `text-foreground`, `text-muted-foreground`, `border`, `bg-primary`,
   `text-primary`, plus semantic `success|warning|info` (+ `-soft` bg
   variants). Both themes must work — check dark mode by mentally swapping
   tokens.
5. **Real interactivity.** Every clickable element gets a hover state
   (`transition-colors duration-control`) and visible focus
   (`focus-visible` ring comes free from the base layer). Cards that navigate
   use `.interactive-card`; rows use `.interactive-row`.

## Recipes

- **Page container**: `mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8`
  on the workspace canvas (`bg-[hsl(var(--workspace))]` comes from the shell).
  Workspace modules stay near-fluid on large displays (cap 1400–1600px);
  only marketing/auth pages use narrow centered columns (max-w-6xl or less).
- **Page header**: `text-title-lg font-semibold tracking-tight` +
  one-line `text-body text-muted-foreground` description; actions right-aligned
  (primary CTA: `rounded-full h-9 px-4`).
- **Card**: `.surface-card` (= `rounded-xl border bg-card shadow-raised`) with
  `p-4`/`p-5`. Clickable → `.interactive-card`.
- **Settings tile (Officevibe style)**: `.setting-tile` + `.icon-chip` for the
  leading icon, `text-body font-semibold` title, `text-body text-muted-foreground`
  description, `ChevronRight` affordance.
- **Status pill (Cake style)**: `.status-pill .status-pill--success|warning|info|neutral`
  — e.g. Active = success, Pending/Invited = warning, Draft = neutral.
- **Table (Attio style)**: wrapper `overflow-x-auto rounded-xl border bg-card`;
  header row `bg-secondary/50 text-caption font-medium text-muted-foreground`;
  body rows `border-t text-body hover:bg-secondary/40 transition-colors`;
  cell padding `px-4 py-3`.
- **Empty state**: centered in a dashed-border card — `.icon-chip` (size-10),
  `text-body-lg font-semibold` title, `text-body text-muted-foreground` hint,
  primary action button.
- **Section label**: `text-meta font-semibold uppercase tracking-[0.1em]
  text-muted-foreground`.
- **Inputs**: h-9 (h-10 in auth), `rounded-lg`; labels `text-caption
  font-medium text-foreground`.
- **Avatars**: `AvatarFallback` = `bg-primary/10 text-primary font-semibold`.

## Motion

- Micro-interactions: `duration-control` (140ms); panels: `duration-panel`
  (220ms) with `ease-emphasis`. Entrances: `.rise-in` once per section — never
  stagger-animate whole pages. Respect `prefers-reduced-motion` (handled
  globally).

## Hard rules for any refactor

- Presentation only: never change Redux dispatches, thunks, socket wiring,
  handlers, route paths, component export names, or data flow.
- Use the existing `components/ui/*` primitives; no new dependencies.
- Icons: lucide-react, `size-4` default, `strokeWidth={1.8}` in nav/lists.
- Responsive: mobile-first; test at 360px, 768px, 1280px widths. No horizontal
  page scroll — wide tables scroll inside their own container.
