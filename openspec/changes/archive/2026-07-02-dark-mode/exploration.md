# Dark Mode — Exploration Document

## 1. Current State Analysis

### What Exists

| Aspect | Status | Details |
|--------|--------|---------|
| `next-themes` | **Installed** (v0.4.6) | Listed in `package.json` dependencies |
| `useTheme` usage | **Partial** | Only used in `src/components/ui/sonner.tsx` |
| CSS dark variables | **Defined** | `.dark { ... }` block in `globals.css` with full oklch palette |
| `@custom-variant dark` | **Configured** | `@custom-variant dark (&:is(.dark *));` in `globals.css` (Tailwind v4) |
| shadcn/ui `dark:` classes | **Present** | Several UI components already have `dark:` variants (button, badge, input, select, dropdown-menu, avatar) |
| ThemeProvider | **Missing** | No `<ThemeProvider>` wraps the app; `next-themes` is installed but not wired up |
| Theme toggle UI | **Missing** | No toggle button/component anywhere |
| `<html>` tag | **No `suppressHydrationWarning`** | `src/app/layout.tsx` has `<html lang="es">` without the attribute `next-themes` requires |

### Key Files

- `src/app/layout.tsx` — Root layout, no ThemeProvider
- `src/app/(dashboard)/layout.tsx` — Dashboard layout with sidebar, no theme toggle
- `src/components/app-sidebar.tsx` — Sidebar navigation, footer has only logout button
- `src/app/globals.css` — Full `.dark` variable set + `@custom-variant dark` already set up
- `src/components/ui/sonner.tsx` — Only consumer of `useTheme` from `next-themes`
- `src/components/ui/chart.tsx` — Has `THEMES = { light: "", dark: ".dark" }` for CSS variable scoping
- `src/components/dashboard-metric-card.tsx` — Hardcoded Tailwind colors (`text-green-600`, `text-amber-600`, `text-red-600`)
- `src/app/(dashboard)/dashboard-client-page.tsx` — Hardcoded hex colors for charts (`#ef4444`, `#22c55e`, etc.)

### What's Missing

1. **ThemeProvider** wrapping the app — required for `next-themes` to function
2. **`suppressHydrationWarning`** on `<html>` tag — prevents React hydration mismatch
3. **Theme toggle component** — no UI to switch between light/dark/system
4. **Placement for toggle** — sidebar footer or header are natural candidates
5. **Chart color adaptation** — hardcoded hex colors in dashboard charts don't adapt to dark mode

---

## 2. Theme System Assessment

### Tailwind v4 Dark Mode Strategy

The project uses **Tailwind v4** (v4.3.2) with the CSS-based configuration approach (no `tailwind.config.ts`). The dark mode variant is already configured:

```css
@custom-variant dark (&:is(.dark *));
```

This is Tailwind v4's equivalent of `darkMode: 'class'` in v3. It means:
- Adding the `dark` class to an ancestor element activates dark mode
- `next-themes` works by toggling the `dark` class on `<html>`
- All `dark:` utility classes in shadcn/ui components will activate automatically

### CSS Variable Structure

Both `:root` and `.dark` define the same 22 CSS custom properties using **oklch** color space:

| Category | Variables |
|----------|-----------|
| Base | `--background`, `--foreground` |
| Card | `--card`, `--card-foreground` |
| Popover | `--popover`, `--popover-foreground` |
| Primary | `--primary`, `--primary-foreground` |
| Secondary | `--secondary`, `--secondary-foreground` |
| Muted | `--muted`, `--muted-foreground` |
| Accent | `--accent`, `--accent-foreground` |
| Destructive | `--destructive` |
| Input/Border | `--input`, `--border`, `--ring` |
| Charts | `--chart-1` through `--chart-5` |
| Sidebar | `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring` |
| Radius | `--radius` (and derived) |

The `@theme inline` block maps these CSS variables to Tailwind color tokens (`--color-background`, `--color-foreground`, etc.), making them available as `bg-background`, `text-foreground`, etc.

### shadcn/ui Component Dark Mode Readiness

Most shadcn/ui components are **already dark-mode ready** because they use semantic CSS variables:

| Component | Dark Ready? | Notes |
|-----------|-------------|-------|
| Card | ✅ | Uses `bg-card`, `text-card-foreground`, `ring-foreground/10` |
| Button | ⚠️ | Has `dark:` variants for outline, ghost, destructive |
| Input | ⚠️ | Has `dark:bg-input/30`, `dark:disabled:bg-input/80` |
| Select | ⚠️ | Has `dark:bg-input/30`, `dark:hover:bg-input/50` |
| Badge | ⚠️ | Has `dark:` for destructive and secondary variants |
| Dialog | ✅ | Uses semantic variables |
| Alert | ✅ | Uses semantic variables |
| Table | ✅ | Uses semantic variables |
| Sidebar | ✅ | Uses `bg-sidebar`, `text-sidebar-foreground`, etc. |
| Sheet | ✅ | Uses semantic variables |
| Tooltip | ✅ | Uses semantic variables |
| Pagination | ✅ | Uses semantic variables |
| Skeleton | ✅ | Uses semantic variables |
| Breadcrumb | ✅ | Uses semantic variables |
| Separator | ✅ | Uses semantic variables |
| Label | ✅ | Uses semantic variables |
| Dropdown Menu | ⚠️ | Has `dark:` for destructive variant |
| Avatar | ⚠️ | Has `dark:after:mix-blend-lighten` |
| Sonner (Toaster) | ✅ | Already uses `useTheme()` |
| Chart | ⚠️ | Supports `.dark` theme prefix, but dashboard colors are hardcoded |

---

## 3. Implementation Approach Comparison

### Option A: `next-themes` (Recommended)

**How it works:**
- Wraps the app in `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`
- Toggles the `dark` class on `<html>` element
- Persists theme choice in localStorage
- Provides `useTheme()` hook for programmatic access
- Already installed in the project!

**Pros:**
- Already installed (`next-themes@0.4.6`)
- Already used by `sonner.tsx`
- Handles SSR hydration correctly
- System preference detection built-in
- Minimal code changes

**Cons:**
- Requires `suppressHydrationWarning` on `<html>` (minor)
- Requires a client-side ThemeProvider wrapper

**Estimated scope:** ~3 files to create/modify for basic setup

### Option B: Custom Implementation

**How it works:** Custom React context + localStorage + `matchMedia` for system preference

**Pros:**
- No external dependency

**Cons:**
- Reinventing what `next-themes` already does (and it's already installed)
- More code to maintain
- Edge cases (SSR, hydration, system preference changes) handled less robustly

**Verdict:** Not worth it. `next-themes` is already a dependency.

### Option C: Both (next-themes + CSS-only progressive enhancement)

**How it works:** Use `next-themes` as the primary mechanism, but also ensure all CSS variables work correctly without JS for the initial paint (FOUC prevention).

**Pros:**
- Best user experience (no flash of wrong theme)
- Most robust

**Cons:**
- Slightly more complex setup (inline script in `<head>` for initial theme resolution)

**Verdict:** This is ideal but adds marginal complexity. The `next-themes` approach with `defaultTheme="system"` already handles this well enough for a backoffice app.

---

## 4. Component Audit — Manual Adjustments Needed

### Automatic (No Changes Required)

These components use only semantic CSS variables and will automatically adapt:

- Card, CardHeader, CardTitle, CardContent, CardFooter
- All sidebar components (SidebarProvider, Sidebar, SidebarContent, etc.)
- Table, TableHeader, TableBody, TableRow, TableHeader, TableCell
- Dialog, AlertDialog, Sheet
- Input (mostly — has explicit `dark:` tweaks that are fine)
- Select (mostly — has explicit `dark:` tweaks that are fine)
- Label, Separator, Breadcrumb, Tooltip, Skeleton
- DataTable, DataTableToolbar, PeriodSelector (all use shadcn/ui components)
- All form dialogs (use shadcn/ui components)
- Pagination

### Needs Attention — Hardcoded Colors

#### 1. `dashboard-metric-card.tsx` — Semantic Color Variants

**Problem:** Uses hardcoded Tailwind color classes that don't adapt to dark mode:
```tsx
success: 'text-green-600',   // Poor contrast on dark backgrounds
warning: 'text-amber-600',   // Poor contrast on dark backgrounds
destructive: 'text-red-600', // Poor contrast on dark backgrounds
```

**Fix:** Replace with semantic or dark-aware alternatives:
```tsx
success: 'text-green-600 dark:text-green-400',
warning: 'text-amber-600 dark:text-amber-400',
destructive: 'text-red-600 dark:text-red-400',
```

Or better: define CSS custom properties for semantic success/warning/destructive colors.

#### 2. `dashboard-client-page.tsx` — Chart Colors

**Problem:** Hardcoded hex colors in chart configs don't respond to dark mode:
```tsx
const REVENUE_COLORS = {
  costoMercancia: '#ef4444',
  gananciaBruta: '#22c55e',
  gastosFijos: '#f59e0b',
  gananciaNeta: '#3b82f6',
};
```

And in `ChartConfig` objects:
```tsx
total: { label: 'Ventas diarias', color: '#3b82f6' },
```

**Fix:** Use the `theme` property of `ChartConfig` to provide separate light/dark colors:
```tsx
total: { 
  label: 'Ventas diarias', 
  theme: { light: '#3b82f6', dark: '#60a5fa' } 
},
```

The `ChartStyle` component in `chart.tsx` already supports this — it generates CSS like:
```css
[data-chart=chart-xxx] { --color-total: #3b82f6; }
.dark [data-chart=chart-xxx] { --color-total: #60a5fa; }
```

This is the **canonical shadcn/ui way** to handle chart dark mode.

#### 3. `chart.tsx` — Recharts Axis/Grid Colors

**Problem:** The `ChartContainer` already handles recharts grid/axis styling via CSS selectors:
```
[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50
[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground
```

This is already dark-mode-aware because it uses semantic Tailwind classes. ✅ No changes needed.

**But:** Direct `stroke` attributes in chart components (like `<CartesianGrid strokeDasharray="3 3" />`) use SVG defaults. These should be fine since the CSS overrides handle them.

### Needs Attention — Layout

#### 4. Root Layout (`src/app/layout.tsx`)

**Current:** No ThemeProvider, no `suppressHydrationWarning`.

**Changes needed:**
- Add `suppressHydrationWarning` to `<html>` tag
- Wrap children in `<ThemeProvider>` from `next-themes`
- Create a `ThemeProvider` client component wrapper (since the root layout is a Server Component)

#### 5. Dashboard Layout Header (`src/app/(dashboard)/layout.tsx`)

**Current:** Header has `SidebarTrigger`, `Separator`, and `Breadcrumb`.

**Changes needed:** Add a theme toggle button. Best placed after the breadcrumb area, right-aligned in the header.

#### 6. AppSidebar Footer (`src/components/app-sidebar.tsx`)

**Current:** Footer only has a logout form button.

**Consideration:** The sidebar footer is an alternative placement for the theme toggle. However, since the sidebar collapses to icons, the header is a more accessible location. Could also add to both.

---

## 5. Risks and Constraints

### Chart Colors — High Risk

The **biggest risk** is chart colors. Hardcoded hex values (`#3b82f6`, `#ef4444`, etc.) look great on white backgrounds but can have poor contrast on dark backgrounds. Specifically:

- `#3b82f6` (blue) — readable on both light/dark, but lighter variant `#60a5fa` is better for dark
- `#ef4444` (red) — can feel "harsh" on dark; `#f87171` is softer
- `#22c55e` (green) — similar issue; `#4ade80` for dark
- `#f59e0b` (amber) — works on both, but `#fbbf24` for dark is more readable
- `#8b5cf6` (purple) — `#a78bfa` for dark

The `ChartConfig.theme` property solves this cleanly — no hacky workarounds needed.

### Flash of Unstyled Content (FOUC)

With `next-themes`, there can be a brief flash of the default theme before the persisted preference loads. For a backoffice app, this is acceptable. If needed, a `<script>` in `<head>` can prevent it.

### Recharts SVG Rendering

Recharts renders SVG elements with inline styles. The `ChartContainer` in `chart.tsx` already uses CSS selectors to override recharts' default `#ccc` stroke colors with `stroke-border/50` and `fill-muted-foreground`. This will work in dark mode because `border` and `muted-foreground` are semantic variables. ✅

### Third-Party Components

- **Sonner (Toaster):** Already uses `useTheme()` ✅
- **Recharts:** Handles via `ChartContainer` CSS overrides and `ChartConfig.theme` ✅ (once we fix configs)
- **TanStack Table:** Uses shadcn/ui Table components — automatic ✅

### Server Components vs Client Components

- Root layout (`layout.tsx`) is a **Server Component** — cannot use `useTheme()` directly
- Need a client-side wrapper: `src/components/theme-provider.tsx` and `src/components/theme-toggle.tsx`
- Dashboard layout is already `'use client'` — can use `useTheme()` directly

### Tailwind v4 Specifics

Tailwind v4 uses CSS-based configuration. The `@custom-variant dark (&:is(.dark *));` directive is already in place. No `tailwind.config.ts` file exists (which is correct for v4). This means dark mode will work out of the box once the `dark` class is toggled on `<html>`.

---

## 6. Estimated Scope

### Must-Have (Core Implementation)

| Task | Files | Effort |
|------|-------|--------|
| Create `ThemeProvider` wrapper | `src/components/theme-provider.tsx` (new) | S |
| Wire ThemeProvider in root layout | `src/app/layout.tsx` (modify) | S |
| Create `ThemeToggle` component | `src/components/theme-toggle.tsx` (new) | S |
| Add toggle to dashboard header | `src/app/(dashboard)/layout.tsx` (modify) | S |
| Add `suppressHydrationWarning` to `<html>` | `src/app/layout.tsx` (modify) | XS |
| Fix MetricCard hardcoded colors | `src/components/dashboard-metric-card.tsx` (modify) | S |
| Fix chart configs for dark mode | `src/app/(dashboard)/dashboard-client-page.tsx` (modify) | M |

**Total: ~7 files, estimated 2-3 hours**

### Nice-to-Have (Polish)

| Task | Files | Effort |
|------|-------|--------|
| Refine chart dark-mode palette colors | dashboard-client-page.tsx | S |
| Add theme toggle to sidebar footer | app-sidebar.tsx | S |
| Test all forms/dialogs in dark mode | Manual testing | M |
| Consider FOUC prevention script | layout.tsx | S |

### Summary

The project is **very well positioned** for dark mode support. The CSS variables, Tailwind v4 configuration, and shadcn/ui components are all already set up. The main gaps are:

1. **Wiring `next-themes` ThemeProvider** (already installed!)
2. **Creating a toggle UI**
3. **Fixing 2 files with hardcoded colors** (MetricCard + chart configs)

The chart color fix is the most impactful change — using `ChartConfig.theme` with `{ light, dark }` variants is the idiomatic shadcn/ui approach and requires no structural changes to `chart.tsx`.
