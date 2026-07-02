# Mobile Responsive — Proposal

**Change**: mobile-responsive  
**Date**: 2026-07-02  
**Status**: Proposed  

## Intent

Make the Riquesos backoffice fully usable on mobile and tablet viewports (320px–768px) by adding responsive CSS classes to existing components. No new components or JavaScript libraries — only Tailwind responsive utilities and minor layout adjustments.

## Scope In

- Add `overflow-x-auto` wrapper to DataTable for horizontal scrolling on narrow screens
- Make page headers responsive — stack title and actions vertically on mobile (`flex-col` → `md:flex-row`)
- Make DataTableToolbar filters wrap properly on small screens via `flex-wrap` improvements
- Add `max-h-[85vh] overflow-y-auto` to Dialog forms for tall forms on mobile
- Make Recharts charts responsive (reduce YAxis width on small screens, ensure `ResponsiveContainer` usage)
- Ensure all pages are usable at 320px viewport width

## Scope Out

- Redesigning layouts or adding mobile-specific components
- PWA support, service workers, offline mode
- Touch gesture support (swipe, pinch-to-zoom)
- Tablet-specific layouts (768–1024px already works adequately)
- New JavaScript libraries or dependencies

## Approach

Tailwind responsive classes (`sm:`, `md:`, `lg:` breakpoints) and CSS-only fixes. Modify ~8–10 existing component files. No new files. No JavaScript-based responsive logic.

## Rollback

Remove all added responsive classes to revert to fixed desktop layouts. Each change is isolated to a single component, so partial rollback is straightforward.