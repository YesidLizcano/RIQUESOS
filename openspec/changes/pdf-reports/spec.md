# Delta Spec: pdf-reports

## ADDED Requirements

### Requirement: PDF Report Infrastructure

The system SHALL provide server-side PDF generation infrastructure using `pdfmake`, configured with Roboto font (built-in), Spanish locale, and a shared header/footer template. All monetary values MUST be formatted using Argentine locale (`$150.000`) and all dates using `dd/MM/yyyy`.

#### Scenario: Shared header renders correctly

- GIVEN any PDF report is generated
- WHEN the document is created
- THEN the header SHALL display "Distribuidora de Quesos Riquesos" as title text
- AND the header SHALL display the period range below the title
- AND the footer SHALL display page numbers as "Página X de Y" and the generation date

#### Scenario: Currency formatting in PDF

- GIVEN a monetary value of 150000 needs to be rendered
- WHEN the PDF template formats the value
- THEN it SHALL display as `$150.000` using Argentine locale grouping

#### Scenario: Date formatting in PDF

- GIVEN a date string "2026-07-15" needs to be rendered
- WHEN the PDF template formats the value
- THEN it SHALL display as `15/07/2026`

### Requirement: Estado de Resultados PDF

The system SHALL generate an "Estado de Resultados" PDF from `getMetricas(inicio, fin)`. The report SHALL contain: Ingresos, CMV, Ganancia Bruta, Gastos Fijos, Ganancia Neta, Margen Bruto %, Margen Neto %, Desglose por Producto, Desglose por Proveedor, and Flujo de Dinero sections.

#### Scenario: Happy path — full P&L report

- GIVEN the user is on the Dashboard page with a date range selected
- WHEN the user clicks the "Estado de Resultados" PDF button
- THEN a server action `generatePdfResultados` SHALL be called with `inicio` and `fin`
- AND the server action SHALL call `getMetricas(inicio, fin)` to fetch data
- AND the response SHALL be a `Response` with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="Estado_Resultados_{date}.pdf"`
- AND the PDF SHALL contain sections for Ingresos, CMV, Ganancia Bruta, Gastos Fijos, Ganancia Neta, Márgenes, Desglose por Producto, Desglose por Proveedor, and Flujo de Dinero
- AND each monetary value SHALL use Argentine locale formatting

#### Scenario: Zero revenue period

- GIVEN the selected period has zero revenue (ingresoTotal = 0)
- WHEN the Estado de Resultados PDF is generated
- THEN the report SHALL still render all sections with `$0` values
- AND margin percentages SHALL display as "N/A" (matching the use case behavior)

#### Scenario: Loading state during generation

- GIVEN the user clicks the "Estado de Resultados" PDF button
- WHEN the server action is in progress
- THEN the button SHALL be disabled and show a spinner
- AND the button SHALL re-enable after the download completes or an error occurs

### Requirement: Cuentas por Cobrar PDF

The system SHALL generate a "Cuentas por Cobrar" PDF from `getCuentasPorCobrar(inicio, fin)`. The report SHALL contain a table with columns: Cliente, Fecha, Ingreso Total, Abonado, Saldo Pendiente, and a footer row with the total saldo pendiente.

#### Scenario: Happy path — outstanding credit sales

- GIVEN the user is on the Dashboard page with a date range selected
- WHEN the user clicks the "Cuentas por Cobrar" PDF button
- THEN a server action `generatePdfCuentasCobrar` SHALL be called with `inicio` and `fin`
- AND the server action SHALL call `getCuentasPorCobrar(inicio, fin)` to fetch data
- AND the response SHALL be a PDF with `Content-Disposition: attachment; filename="Cuentas_Cobrar_{date}.pdf"`
- AND the PDF SHALL contain a table with columns: Cliente, Fecha, Ingreso Total, Abonado, Saldo Pendiente
- AND a footer row SHALL show the sum of all saldo pendiente values

#### Scenario: Empty data — no credit sales

- GIVEN the selected period has no credit sales with outstanding balances
- WHEN the Cuentas por Cobrar PDF is generated
- THEN the report SHALL display a "No hay cuentas por cobrar en este período" message
- AND the footer total SHALL show `$0`

### Requirement: Ventas por Período PDF

The system SHALL generate a "Ventas por Período" PDF from `getVentasByExactDateRange(inicio, fin)`. The report SHALL contain a table with columns: Fecha, Cliente, Método de Pago, Cantidad (kg), Ingreso Total, Ganancia Bruta. A footer SHALL show totals for kg, ingreso, and ganancia. A summary section SHALL group totals by payment method.

#### Scenario: Happy path — sales report with grouping

- GIVEN the user is on the Ventas page with a date range selected
- WHEN the user clicks the "Reporte Ventas" PDF button
- THEN a server action `generatePdfVentas` SHALL be called with `inicio` and `fin`
- AND the server action SHALL call `getVentasByExactDateRange(inicio, fin)` to fetch data
- AND the response SHALL be a PDF with `Content-Disposition: attachment; filename="Ventas_{date}.pdf"`
- AND the PDF SHALL contain a table with columns: Fecha, Cliente, Método de Pago, Cantidad (kg), Ingreso Total, Ganancia Bruta
- AND the footer SHALL show total kg, total ingreso, and total ganancia bruta
- AND a summary section SHALL show totals grouped by payment method (Efectivo, Nequi, Bre-B, Crédito)

#### Scenario: Single sale in period

- GIVEN the selected period has exactly one sale
- WHEN the Ventas PDF is generated
- THEN the report SHALL render the single row correctly
- AND the footer totals SHALL match that single row
- AND the payment method summary SHALL show one entry

#### Scenario: Empty period

- GIVEN the selected period has no sales
- WHEN the Ventas PDF is generated
- THEN the report SHALL display a "No hay ventas en este período" message
- AND all footer totals SHALL be `$0`

### Requirement: PDF Download UI Buttons

The Dashboard page SHALL have 2 PDF buttons ("Estado de Resultados" and "Cuentas por Cobrar") and the Ventas page SHALL have 1 PDF button ("Reporte Ventas"). All buttons SHALL use the `FileText` icon from lucide-react and appear next to the existing Excel export button.

#### Scenario: Dashboard PDF buttons visible

- GIVEN the user is on the Dashboard page
- THEN two PDF buttons SHALL be visible: "Estado de Resultados" and "Cuentas por Cobrar"
- AND each button SHALL use the `FileText` icon
- AND buttons SHALL be positioned next to the existing "Exportar Excel" button

#### Scenario: Ventas PDF button visible

- GIVEN the user is on the Ventas page
- THEN one PDF button labeled "Reporte Ventas" SHALL be visible in the toolbar
- AND the button SHALL use the `FileText` icon

#### Scenario: Date range propagated to PDF

- GIVEN the user has selected a date range on the page (e.g., "01/07/2026 — 31/07/2026")
- WHEN the user clicks any PDF button
- THEN the current `inicio` and `fin` state values SHALL be passed to the server action
- AND the PDF SHALL contain that period range in its header

#### Scenario: Error handling

- GIVEN a PDF server action fails (e.g., network error)
- WHEN the response returns an error
- THEN the button SHALL re-enable (stop loading)
- AND a toast or alert SHALL display "Error al generar el PDF"

## MODIFIED Requirements

### Requirement: FR-01: List Page Export

Each entity list page (Clientes, Proveedores, Lotes, Ventas, Gastos) SHALL have an "Exportar Excel" button in the `DataTableToolbar`. Clicking the button SHALL download an `.xlsx` file containing the currently visible (filtered) data. The export SHALL use `table.getFilteredRowModel().rows` as the data source, ensuring that search, column select filters, and showDeleted toggle are respected. Additionally, pages that support PDF export (Dashboard and Ventas) SHALL also display PDF download buttons alongside the Excel button.

(Previously: Only Excel export buttons existed on list pages)

#### Scenario: Filtered export

- GIVEN the user has applied a "Tipo: MAYORISTA" filter on the Clientes page
- WHEN the user clicks "Exportar Excel"
- THEN the downloaded file SHALL contain only MAYORISTA clients with Spanish headers

#### Scenario: PDF buttons coexist with Excel on Dashboard

- GIVEN the user is on the Dashboard page
- THEN "Estado de Resultados" and "Cuentas por Cobrar" PDF buttons SHALL appear alongside the "Exportar Excel" button

#### Scenario: PDF button coexists with Excel on Ventas

- GIVEN the user is on the Ventas page
- THEN the "Reporte Ventas" PDF button SHALL appear alongside the "Exportar Excel" button in the toolbar

### Requirement: FR-02: Dashboard Export

The Dashboard page SHALL have an "Exportar Excel" button next to the PeriodSelector. The exported file SHALL contain four sheets: Resumen, Ventas Diarias, Top Clientes, and Inventario. Additionally, the Dashboard SHALL have two PDF buttons: "Estado de Resultados" (generating a P&L PDF) and "Cuentas por Cobrar" (generating an outstanding credit PDF).

(Previously: Dashboard only had Excel export)

#### Scenario: Dashboard multi-sheet

- GIVEN the user is viewing the Dashboard for "Junio 2026"
- WHEN the user clicks "Exportar Excel"
- THEN the file SHALL contain 4 sheets with June 2026 data

#### Scenario: Dashboard PDF generation

- GIVEN the user is viewing the Dashboard for a date range
- WHEN the user clicks "Estado de Resultados" or "Cuentas por Cobrar"
- THEN the corresponding PDF SHALL be generated with the current date range