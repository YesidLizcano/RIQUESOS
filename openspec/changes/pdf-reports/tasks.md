# Tasks: PDF Reports

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~580 (6 new files ~490 + 3 modified ~90) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Phase 1-2: infra + templates) → PR 2 (Phase 3-4: actions + UI) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | PDF infrastructure + all 3 report templates | PR 1 | Base: feature/pdf-reports; no UI changes; verify via `npx tsc --noEmit` |
| 2 | Server Actions + UI buttons + hook | PR 2 | Base: PR 1 branch; depends on templates from PR 1 |

## Phase 1: Infrastructure

- [ ] 1.1 Install `pdfmake` — `npm install pdfmake` (and `@types/pdfmake` if available)
- [ ] 1.2 Create `src/infrastructure/pdf/pdfmake-config.ts` — PdfPrinter with Roboto fonts, export `pdfCurrency()` and `pdfDate()` helpers
- [ ] 1.3 Create `src/infrastructure/pdf/templates/shared.ts` — `createHeader()`, `createFooter()`, `createStyles()`, `tableLayout()`
- [ ] 1.4 Verify: `npx tsc --noEmit` passes

## Phase 2: Report Templates

- [ ] 2.1 Create `src/infrastructure/pdf/templates/cuentas-cobrar.ts` — `generateCuentasCobrarPdf(cuentas, inicio, fin)` → Promise<Buffer>; table with Cliente/Fecha/Ingreso/Abono/Saldo; empty data message; footer total row
- [ ] 2.2 Create `src/infrastructure/pdf/templates/resultados.ts` — `generateResultadosPdf(metricas, inicio, fin)` → Promise<Buffer>; Resumen Financiero, Márgenes, Desglose por Producto/Proveedor, Flujo de Dinero sections; N/A handling for zero-revenue
- [ ] 2.3 Create `src/infrastructure/pdf/templates/ventas-periodo.ts` — `generateVentasPdf(ventas, inicio, fin)` → Promise<Buffer>; table with Fecha/Cliente/Método/Kg/Ingreso/Ganancia; totals footer; summary by metodoPago; empty data message
- [ ] 2.4 Verify: `npx tsc --noEmit` passes with all 3 templates

## Phase 3: Server Actions

- [ ] 3.1 Create `src/presentation/actions/reports.ts` — `generatePdfResultados(inicio, fin)`, `generatePdfCuentasCobrar(inicio, fin)`, `generatePdfVentas(inicio, fin)`; each calls existing data action → template → `pdfResponse()` helper; `requireSession()` for auth; dynamic `import('pdfmake')` in each action to avoid SSR bundle
- [ ] 3.2 Verify: `npx tsc --noEmit` passes

## Phase 4: UI Integration

- [ ] 4.1 Create `src/hooks/use-pdf-download.ts` — `usePdfDownload()` hook returning `{ downloadPdf, isGenerating }`; calls Server Action → Blob → `<a>` download; toast.error on failure
- [ ] 4.2 Modify `src/components/data-table-toolbar.tsx` — add optional `pdfButtons` prop (`{ label, onClick, loading }[]`); render each as `<Button variant="outline" size="sm">` with `FileText` icon before Excel button
- [ ] 4.3 Modify `src/app/(dashboard)/ventas/ventas-client-page.tsx` — add `isPdfVentas` state, handler calling `generatePdfVentas`; pass `pdfButtons` to `DataTableToolbar`
- [ ] 4.4 Modify `src/app/(dashboard)/dashboard-client-page.tsx` — add `isPdfResultados` + `isPdfCuentasCobrar` states, handlers calling `generatePdfResultados` and `generatePdfCuentasCobrar`; add 2 PDF `<Button>` elements with `FileText` icons next to existing "Exportar Excel" button
- [ ] 4.5 Verify: `npx tsc --noEmit` passes

## Phase 5: Verification

- [ ] 5.1 Run `npx next build` — must compile cleanly
- [ ] 5.2 Manual test: Dashboard → "Estado de Resultados" PDF button → PDF downloads with correct header, period, sections
- [ ] 5.3 Manual test: Dashboard → "Cuentas por Cobrar" PDF button → PDF downloads with table, totals, empty-data message
- [ ] 5.4 Manual test: Ventas → "Reporte Ventas" PDF button → PDF downloads with table, totals, metodoPago summary
- [ ] 5.5 Manual test: Error state — disconnect network, click PDF button → toast shows "Error al generar el PDF"
- [ ] 5.6 Verify: PDFs use Argentine locale (`$150.000`) and dd/MM/yyyy dates; no client bundle size increase (pdfmake is server-only)