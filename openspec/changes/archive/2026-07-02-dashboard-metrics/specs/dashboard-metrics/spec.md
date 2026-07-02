# Dashboard Metrics — Delta Spec

## Functional Requirements

### FR-01: Enriched MetricCard Descriptions

Each MetricCard on the dashboard SHALL display a `description` string below the value. Descriptions SHALL contain contextual information derived from the same period's data: percentage margins, unit counts, or period references.

- Ingresos: "{ventasCount} ventas este mes"
- Costo Mercancía: "{costoPct}% de ingresos"
- Ganancia Bruta: "Margen bruto: {margenBrutoPct}%"
- Gastos Fijos: no description (context is self-evident)
- Ganancia Neta: "Margen neto: {margenNetoPct}%"

When `ingresoTotal` is zero, margin percentages SHALL display as "N/A" rather than calculating a division-by-zero.

### FR-02: Inventory Value Metric

The dashboard SHALL display inventory value as the sum of `costoRealCalculadoKg × cantidadDisponibleKg` across all active lotes. This metric SHALL be calculated server-side in the use case.

Given an active lote with costoRealCalculadoKg=5000 and cantidadDisponibleKg=100, when inventory value is calculated, then that lote contributes $500,000 to the total.

### FR-03: Sales Count Metric

The dashboard SHALL display the total number of ventas (sales) for the selected period.

Given 15 ventas exist in June 2026, when the dashboard loads for June 2026, then the sales count displays "15".

### FR-04: Active Clients Metric

The dashboard SHALL display the count of distinct clients who made at least one purchase in the selected period.

Given 12 distinct clienteIds appear in ventas for June 2026, when the dashboard loads for June 2026, then active clients displays "12".

### FR-05: Kg Sold Metric

The dashboard SHALL display total kilograms sold in the selected period.

Given ventas totaling 2,450 kg in June 2026, when the dashboard loads for June 2026, then kg sold displays "2.450 Kg".

### FR-06: Margin Percentage Metrics

The dashboard SHALL display:
- Gross margin % = (gananciaBruta / ingresoTotal) × 100, rounded to 1 decimal
- Net margin % = (gananciaNeta / ingresoTotal) × 100, rounded to 1 decimal

When ingresoTotal is zero, both percentages SHALL be "N/A".

### FR-07: Period Selector

A period selector SHALL allow the user to choose month and year. Default SHALL be the current month/year. Changing the period SHALL call the Server Action with the new month/year and refresh all dashboard metrics without a full page reload.

Given the dashboard is showing June 2026 data, when the user selects May 2026, then all metrics refresh to reflect May 2026 data.

### FR-08: N+1 Query Fix

`ObtenerMetricas` topClientes resolution SHALL use a single batched query to resolve client names instead of N individual `findById` calls.

Given 5 top clients, when names are resolved, then exactly 1 query (not 5) is executed against the cliente table.

---

## Non-Functional Requirements

### NFR-01: Server-Side Computation

All aggregate calculations (margins, counts, sums) SHALL be performed in the use case, not client-side.

### NFR-02: Server Action Re-Fetch

Period changes SHALL trigger a Server Action call (`getMetricas(month, year)`), not a full page reload.

### NFR-03: No Snapshots

Metrics SHALL be computed from live database data on each request, not from pre-computed snapshots or cached values.

---

## Out of Scope

- Charts, graphs, or visual data representations
- Date range filters beyond single month/year selection
- Real-time updates (WebSocket, SSE)
- Period-over-period comparison (deltas vs. previous month)
- Breakdown by product type or client type