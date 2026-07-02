# UI Framework Specification

## Purpose

Establish a working Tailwind CSS pipeline, configure shadcn/ui as the component library, provide a shared authenticated layout, and define base component primitives for the backoffice interface.

## Requirements

### Requirement: Tailwind CSS Pipeline

The system SHALL process Tailwind utility classes at build time.

The system MUST include `globals.css` with `@tailwind` directives, `tailwind.config` with content paths matching `src/`, and `postcss.config` with Tailwind and Autoprefixer.

#### Scenario: Utility classes render in production build

- GIVEN the Tailwind CSS pipeline is configured
- WHEN a component uses Tailwind utility classes (e.g., `flex`, `p-4`, `bg-blue-500`)
- THEN those classes are processed and included in the production CSS output

#### Scenario: Missing config prevents build

- GIVEN `tailwind.config` or `postcss.config` is absent
- WHEN the Next.js dev server or build runs
- THEN CSS utility classes SHALL NOT render and the build MUST log a configuration error

### Requirement: shadcn/ui Setup

The system SHALL configure shadcn/ui via `components.json` with a CSS-variable-based theme.

The system MUST support Server Components (data-fetching) and Client Components (interactive tables, forms).

#### Scenario: shadcn component renders in a Server Component

- GIVEN shadcn/ui is configured with `components.json`
- WHEN a Server Component imports and renders a shadcn primitive (e.g., `<Card>`)
- THEN the component renders with correct styling from CSS variables

#### Scenario: shadcn component renders in a Client Component

- GIVEN shadcn/ui is configured
- WHEN a Client Component (with `"use client"`) imports and renders a shadcn primitive
- THEN the component renders identically to its Server Component equivalent

### Requirement: Shared Layout

The system SHALL provide a shared layout with sidebar navigation and header for authenticated pages.

Authenticated pages MUST use this layout. Unauthenticated pages (e.g., login) SHALL NOT include the sidebar.

#### Scenario: Authenticated page uses shared layout

- GIVEN a user is authenticated
- WHEN they navigate to any dashboard page (Lotes, Ventas, Clientes, Gastos, Dashboard)
- THEN the page renders inside the shared layout with sidebar navigation and header

#### Scenario: Unauthenticated page excludes sidebar

- GIVEN a user is not authenticated
- WHEN they access the login page
- THEN the page renders WITHOUT the sidebar or header layout

### Requirement: Data Display Components

The system SHALL use shadcn/ui Table, Card, and Badge for displaying domain entities (Lotes, Ventas, Clientes, Gastos) and Dashboard metrics.

Data tables MUST support column sorting via TanStack React Table. Status indicators MUST use Badge variants (e.g., `default`, `secondary`, `destructive`, `outline`).

#### Scenario: Dashboard metric card displays data

- GIVEN the Dashboard page fetches summary metrics
- WHEN a metric card renders
- THEN it uses shadcn `<Card>` with title, value, and optional description

#### Scenario: Entity table with sorting

- GIVEN a page lists Lotes, Ventas, Clientes, or Gastos
- WHEN the user clicks a sortable column header
- THEN the table rows reorder by that column ascending/descending

#### Scenario: Status badge rendering

- GIVEN an entity has a status field (e.g., "active", "pending", "closed")
- WHEN the status is rendered
- THEN it displays as a shadcn Badge with a variant matching the status semantics

### Requirement: Navigation and Auth UX

The Login page SHALL use shadcn/ui form components (Input, Button, Label). Navigation SHALL indicate the active page. Session expiry SHALL redirect to login with visual feedback.

#### Scenario: Login form uses shadcn components

- GIVEN the Login page is rendered
- WHEN the user views the sign-in form
- THEN all form controls use shadcn Input, Button, and Label components

#### Scenario: Active navigation indicator

- GIVEN a user is on the Ventas page
- WHEN the sidebar navigation renders
- THEN the Ventas link displays an active/selected visual state

#### Scenario: Session expiry redirects to login

- GIVEN a user session has expired
- WHEN the user attempts an authenticated action
- THEN the system redirects to Login AND displays a shadcn Alert indicating the session expired