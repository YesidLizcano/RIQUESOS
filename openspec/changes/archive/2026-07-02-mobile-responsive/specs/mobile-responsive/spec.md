# Mobile Responsive — Specification

**Change**: mobile-responsive  
**Date**: 2026-07-02  

## Functional Requirements

### FR-01: DataTable Horizontal Scroll

DataTable SHALL be wrapped in an `overflow-x-auto` container so that tables with many columns are scrollable horizontally on small screens. A visual indicator (shadow or border-right) SHALL indicate when content overflows.

**Given** a DataTable with columns exceeding the viewport width,  
**When** the viewport is narrower than the table's natural width,  
**Then** the table SHALL be horizontally scrollable and a visual hint SHALL indicate overflow.

### FR-02: Responsive Page Headers

Page headers with title, PeriodSelector, and action buttons SHALL stack vertically on mobile and display side-by-side on desktop.

**Given** a page header with title and actions,  
**When** the viewport width is below 768px,  
**Then** the header SHALL display as `flex-col` with full-width actions.  
**When** the viewport width is 768px or above,  
**Then** the header SHALL display as `flex-row` with `justify-between`.

### FR-03: Responsive DataTableToolbar

The toolbar (search, filters, toggle, export) SHALL wrap properly on small screens. Filter selects SHALL not overflow horizontally.

**Given** a DataTableToolbar with search, filters, and action buttons,  
**When** the viewport is narrow,  
**Then** filter elements SHALL wrap below the search input without horizontal overflow. Filter `w-[160px]` SHALL become `w-full sm:w-[160px]`.

### FR-04: Responsive Dialog Forms

Dialog forms SHALL not exceed viewport height. Scrollable content SHALL be available inside the dialog.

**Given** a dialog form with many fields on a small viewport,  
**When** the form content exceeds available height,  
**Then** the dialog body SHALL scroll (`max-h-[85vh] overflow-y-auto`) while the header remains visible.

### FR-05: Responsive Charts

Recharts charts SHALL adapt to container width. YAxis labels on vertical BarCharts SHALL have reduced width on small screens.

**Given** a BarChart with horizontal layout and YAxis `width={140}`,  
**When** the viewport is below 640px,  
**Then** YAxis width SHALL be reduced (e.g., `width={60}`) and charts SHALL not overflow their containers.

### FR-06: Minimum Viewport

All pages SHALL be usable at 320px viewport width. No content SHALL be permanently hidden or inaccessible.

**Given** any page at 320px viewport,  
**When** the user interacts with the page,  
**Then** all functionality SHALL be accessible — no permanently hidden controls or unreachable content.

## Non-Functional Requirements

**NFR-01**: No new JavaScript libraries SHALL be added — only Tailwind CSS classes and minor layout changes.  
**NFR-02**: Desktop layout (≥1024px) SHALL remain visually identical — all changes are additive responsive classes.  
**NFR-03**: No JavaScript-based responsive logic — only CSS media queries via Tailwind breakpoints.