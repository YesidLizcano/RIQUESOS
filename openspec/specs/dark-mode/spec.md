# Dark Mode — Specification

## Functional Requirements

**FR-01: ThemeProvider** — The application SHALL be wrapped in a `next-themes` ThemeProvider with `attribute="class"`, `defaultTheme="light"`, and `enableSystem={true}`. The `<html>` tag SHALL include `suppressHydrationWarning`.

**FR-02: ThemeToggle** — A theme toggle button SHALL be placed in the sidebar footer. It SHALL cycle through themes in order: light → dark → system. The toggle SHALL display a Sun icon in dark mode, a Moon icon in light mode, and a Monitor icon in system mode.

**FR-03: Theme persistence** — The selected theme SHALL persist across page reloads via `next-themes` localStorage mechanism. No custom persistence logic is required.

**FR-04: Dashboard metric card colors** — Dashboard metric cards SHALL use `dark:` variant classes for colored text. `text-green-600` SHALL become `text-green-600 dark:text-green-400`, `text-amber-600` SHALL become `text-amber-600 dark:text-amber-400`, and `text-red-600` SHALL become `text-red-600 dark:text-red-400`.

**FR-05: Chart dark mode** — Chart configurations SHALL use the `ChartConfig.theme` pattern with `light` and `dark` variants instead of single `color` properties. Charts SHALL render with appropriate contrast colors in both light and dark modes.

**FR-06: System theme** — The ThemeProvider SHALL support `system` as a theme option, following the OS color-scheme preference. The toggle SHALL include system as a third option in its cycle.

## Non-Functional Requirements

**NFR-01** — All shadcn/ui components SHALL render correctly in dark mode without manual adjustments (they use semantic CSS variables).

**NFR-02** — Dark mode SHALL NOT affect the login page layout or functionality.

**NFR-03** — Theme changes SHALL be instant (no page reload required).

## Scenarios

### Scenario: User toggles theme from light to dark
- **Given** the app is in light mode
- **When** the user clicks the theme toggle in the sidebar footer
- **Then** the app switches to dark mode, CSS variables update, and the Moon icon changes to a Sun icon

### Scenario: User selects system theme
- **Given** the app is in dark mode
- **When** the user clicks the theme toggle again
- **Then** the app follows the OS preference and displays a Monitor icon

### Scenario: Theme persists across reloads
- **Given** the user has selected dark mode
- **When** the page reloads
- **Then** the app renders in dark mode without a flash of light mode

### Scenario: Metric cards readable in dark mode
- **Given** the app is in dark mode
- **When** the dashboard renders metric cards with colored values
- **Then** success values display in green-400, warning in amber-400, destructive in red-400 — all with sufficient contrast