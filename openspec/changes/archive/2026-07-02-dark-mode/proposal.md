# Dark Mode — Proposal

## Intent

Add dark mode support to the backoffice with a toggle in the sidebar, leveraging existing `next-themes` (v0.4.6) and CSS variable infrastructure.

## Scope In

- **ThemeProvider client wrapper** — wraps the app with `attribute="class"`, `defaultTheme="light"`, `enableSystem`
- **ThemeToggle component** — button in sidebar footer, cycles light → dark → system, shows Sun/Moon/Monitor icons
- **Root layout wiring** — `<html suppressHydrationWarning>`, children wrapped in ThemeProvider
- **Dashboard metric card color fix** — add `dark:` variants for hardcoded colored text (green, amber, red)
- **Chart dark mode migration** — migrate hardcoded hex colors to `ChartConfig.theme: { light, dark }` pattern
- **Verification** — all shadcn/ui components render correctly in dark mode

## Scope Out

- Custom color themes (only light/dark/system)
- Dark mode for print styles
- FOUC prevention script (acceptable for backoffice)

## Approach

Leverage existing infrastructure: `next-themes` already installed, `.dark {}` CSS variables defined, `@custom-variant dark` configured, shadcn/ui components dark-ready. Minimal new code — 2 new small client components, modifications to ~5 existing files.

## Rollback

Remove ThemeProvider wrapper from layout, remove ThemeToggle from sidebar, revert color fixes. No database or API changes involved.