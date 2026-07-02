# Dark Mode — Tasks

## Phase 1: ThemeProvider Setup

- [x] 1.1 Create `src/components/theme-provider.tsx` — client component wrapping `next-themes` ThemeProvider with `attribute="class"`, `defaultTheme="light"`, `enableSystem`
- [x] 1.2 Wrap root layout with ThemeProvider and add `suppressHydrationWarning` to `<html>` tag in `src/app/layout.tsx`

## Phase 2: ThemeToggle

- [x] 2.1 Create `src/components/theme-toggle.tsx` — toggle button with Sun/Moon/Monitor icons, three-way cycle (light → dark → system)
- [x] 2.2 Add ThemeToggle to `src/components/app-sidebar.tsx` footer (before logout button)

## Phase 3: Color Fixes

- [x] 3.1 Fix `src/components/dashboard-metric-card.tsx` — add `dark:` variants: `text-green-600 dark:text-green-400`, `text-amber-600 dark:text-amber-400`, `text-red-600 dark:text-red-400`
- [x] 3.2 Migrate chart colors in `src/app/(dashboard)/dashboard-client-page.tsx` — replace `color` with `theme: { light, dark }` in all ChartConfig objects, update fill props to use `var(--color-*)`

## Phase 4: Verification

- [x] 4.1 Manually verify all shadcn/ui components render correctly in dark mode (Dialog, Select, Table, Sidebar, Button, Input, Pagination, AlertDialog)
- [x] 4.2 Manually verify charts render correctly in dark mode (colors, background, tooltips, legend)
- [x] 4.3 Run `npx tsc --noEmit` and confirm no type errors

## Review Workload Forecast

- Estimated changed lines: ~150
- 400-line budget risk: Very Low
- Delivery strategy: single PR