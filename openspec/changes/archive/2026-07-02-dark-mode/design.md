# Dark Mode — Design

## Architecture Decisions

**AD-01: Use `next-themes` ThemeProvider** — Already installed (v0.4.6), de facto standard for Next.js, used by sonner.tsx. No new dependency.

**AD-02: ThemeProvider wraps app in root layout** — `attribute="class"` matches the existing `.dark {}` CSS variables and `@custom-variant dark (&:is(.dark *))`. Wrapping at root ensures all pages inherit theme context.

**AD-03: ThemeToggle in sidebar footer** — Consistent with backoffice patterns. Sidebar is always visible, footer groups toggle with the logout button. When collapsed, icons still show.

**AD-04: Three-way toggle** — light → dark → system, cycling on click. Sun icon (dark mode), Moon icon (light mode), Monitor icon (system mode). Uses `useTheme()` from `next-themes`.

**AD-05: Hardcoded color fix** — dashboard-metric-card.tsx uses `dark:` Tailwind variants. No CSS custom properties needed — Tailwind v4 handles this via the `dark` variant.

**AD-06: Chart colors** — Migrate from `color: '#hex'` to `theme: { light: '#hex', dark: '#hex-lighter' }` in `ChartConfig`. The existing `ChartStyle` component in chart.tsx already generates CSS variables for both themes. Lighter variants: blue `#3b82f6`→`#60a5fa`, red `#ef4444`→`#f87171`, green `#22c55e`→`#4ade80`, amber `#f59e0b`→`#fbbf24`, purple `#8b5cf6`→`#a78bfa`.

**AD-07: No changes to shadcn/ui components** — They already use semantic CSS variables and adapt automatically to dark mode.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/theme-provider.tsx` | CREATE | Client component wrapping `next-themes` ThemeProvider |
| `src/components/theme-toggle.tsx` | CREATE | Toggle button with Sun/Moon/Monitor icons, three-way cycle |
| `src/app/layout.tsx` | MODIFY | Add `suppressHydrationWarning` to `<html>`, wrap children in ThemeProvider |
| `src/components/app-sidebar.tsx` | MODIFY | Add ThemeToggle to SidebarFooter |
| `src/components/dashboard-metric-card.tsx` | MODIFY | Add `dark:` variants for colored text classes |
| `src/app/(dashboard)/dashboard-client-page.tsx` | MODIFY | Migrate chart configs to `theme: { light, dark }` pattern |

## Component Details

### ThemeProvider
```tsx
// Client component, ~10 lines
'use client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
export function ThemeProvider({ children, ...props }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

### ThemeToggle
```tsx
// Client component, uses useTheme() hook
// Renders: Button with icon (Sun/Moon/Monitor) + label
// onClick: cycles theme (light→dark→system)
```

### Root Layout Change
```tsx
<html lang="es" suppressHydrationWarning>
  <body>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>...<Toaster /></TooltipProvider>
    </ThemeProvider>
  </body>
</html>
```

## Risk Assessment

- **FOUC**: Minimal risk — `next-themes` handles SSR with `suppressHydrationWarning`. Acceptable for backoffice.
- **Chart colors**: Medium risk — `theme` property replaces `color` property in ChartConfig. Must remove `color` keys when adding `theme`. Existing `REVENUE_COLORS` constant used in `fill` props needs updating to use CSS variables.
- **Login page**: Low risk — uses semantic CSS variables, should adapt automatically.