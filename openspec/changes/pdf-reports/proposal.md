# Proposal: pdf-reports

## Intent

Add PDF report generation for the 3 most critical business reports — Cuentas por Cobrar, Ventas por Período, and Estado de Resultados — so the cheese distributor can print and share professional financial documents with accountants and stakeholders. Excel export already exists, but PDF is the standard format for formal reporting and archiving.

## Scope

### In Scope

- Install `pdfmake` library for server-side PDF generation in Node.js
- PDF button in toolbar on each report page:
  - Dashboard page: "Estado de Resultados" + "Cuentas por Cobrar" buttons
  - Ventas page: "Reporte Ventas" button
- 3 PDF report templates:
  1. **Estado de Resultados** — P&L: ingresos, costo mercancía, ganancia bruta, gastos fijos, ganancia neta, margins. Data from `getMetricas(inicio, fin)`
  2. **Cuentas por Cobrar** — outstanding credit sales: cliente, fecha, ingreso total, abono, saldo. Data from `getCuentasPorCobrar(inicio, fin)`
  3. **Ventas por Período** — all sales in period: fecha, cliente, items, ingreso total. Data from `getVentasByExactDateRange(inicio, fin)`
- Company name header "Distribuidora de Quesos Riquesos" (text only, no logo image)
- Period date range in each report header
- Page numbers and formatted date footers
- Currency and number formatting using existing `formatCurrency` pattern
- Server Actions to generate PDFs and return as downloadable `Response`

### Out of Scope

- Logo image in header (text-only per user decision)
- PDF for other entities (Clientes, Proveedores, Lotes, Gastos)
- Email delivery or scheduled PDF generation
- Chart/graph embedding in PDFs
- Custom report builder or ad-hoc queries
- PDF preview in browser (direct download only)

## Capabilities

### New Capabilities

- `pdf-reports`: PDF generation infrastructure (pdfmake config, shared templates) and 3 report templates (Estado de Resultados, Cuentas por Cobrar, Ventas por Período)

### Modified Capabilities

- `export-reportes`: Add PDF download buttons alongside existing Excel export buttons on Dashboard and Ventas pages

## Approach

PDF generation is an **Infrastructure** concern — it's an output format adapter, like Prisma is a persistence adapter. Architecture:

```
src/infrastructure/pdf/
├── pdfmake-config.ts          ← Font registration, base styles, currency formatters
└── templates/
    ├── shared.ts              ← Common header/footer, page numbers, company name
    ├── ventas-periodo.ts      ← Ventas report doc definition
    ├── cuentas-cobrar.ts      ← CxC report doc definition
    └── resultados.ts          ← P&L report doc definition
```

**Flow**: UI Button → Server Action → existing Use Case → PDF template (infrastructure) → pdfmake generates `Buffer` → Return as `Response` with download headers.

Prisma `Decimal` values need `Number()` conversion in templates. Date formatting reuses the `formatDisplayDate` / `formatCurrency` patterns already in `src/domain/formatters.ts`. pdfmake runs 100% server-side — no client bundle impact.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/infrastructure/pdf/` | New | pdfmake config + 3 report templates + shared header/footer |
| `src/presentation/actions/` | Modified | New server actions: `generatePdfResultados`, `generatePdfCuentasCobrar`, `generatePdfVentas` |
| Dashboard page components | Modified | Add "Estado de Resultados" + "Cuentas por Cobrar" PDF buttons to toolbar |
| Ventas page components | Modified | Add "Reporte Ventas" PDF button to toolbar |
| `package.json` | Modified | Add `pdfmake` dependency |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| pdfmake bundle size on server | Low | pdfmake runs server-side only — no client bundle impact |
| Decimal-to-Number precision loss | Low | All monetary values are whole pesos (no cents in ARS); `Number()` is safe |
| Spanish character rendering | Low | pdfmake supports UTF-8; configure Roboto font which covers Latin-1 |
| Large dataset memory in PDF generation | Low | Reports are period-scoped (monthly), max ~500 rows — well within pdfmake limits |

## Rollback Plan

1. Remove `pdfmake` from `package.json`
2. Remove `src/infrastructure/pdf/` directory entirely
3. Remove 3 server actions from `src/presentation/actions/`
4. Remove PDF buttons from Dashboard and Ventas page toolbars
5. No database schema changes to undo

## Dependencies

- `pdfmake` npm package (MIT license, pure JS, 100% server-side capable)

## Success Criteria

- [ ] Dashboard toolbar has "Estado de Resultados" and "Cuentas por Cobrar" PDF buttons that download correctly formatted PDFs
- [ ] Ventas toolbar has "Reporte Ventas" PDF button that downloads a correctly formatted PDF
- [ ] Each PDF includes "Distribuidora de Quesos Riquesos" text header, period range, page numbers
- [ ] Monetary values display with `$` and Argentine locale grouping (e.g., `$150.000`)
- [ ] PDFs generate from the same date range currently selected in each page's period picker
- [ ] No client-side bundle size increase (pdfmake is server-only)