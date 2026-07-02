# Dashboard Metrics Specification

## Purpose

Provide aggregated business metrics: revenue, costs, profit margins, inventory levels, and top clients — calculated from Ventas and GastosFijos.

## Requirements

### Requirement: Monthly Revenue Metric

The system SHALL compute monthly total revenue as the sum of `Ingreso_Total` from all Ventas in the given month.

#### Scenario: Calculate monthly revenue

- GIVEN two Ventas in June with Ingreso_Total of 50000 and 30000
- WHEN requesting June revenue
- THEN the system returns 80000

#### Scenario: No sales in month

- GIVEN no Ventas in July
- WHEN requesting July revenue
- THEN the system returns 0

### Requirement: Monthly Cost Metric

The system SHALL compute monthly cost of goods sold as the sum of `Costo_Mercancía` from all Ventas in the given month.

#### Scenario: Calculate monthly COGS

- GIVEN two Ventas in June with Costo_Mercancía of 30000 and 18000
- WHEN requesting June COGS
- THEN the system returns 48000

### Requirement: Net Profit Calculation

The system SHALL compute `Ganancia_Neta_Mensual = Sum(Ganancias_Brutas) − Sum(Gastos_Fijos)` for the given month.

#### Scenario: Positive net profit

- GIVEN monthly Ganancias_Brutas = 32000 and total Gastos_Fijos = 100000
- WHEN requesting net profit
- THEN the system returns −68000 (net loss)

#### Scenario: Break-even month

- GIVEN monthly Ganancias_Brutas = 100000 and total Gastos_Fijos = 100000
- WHEN requesting net profit
- THEN the system returns 0

### Requirement: Inventory Levels

The system SHALL report total available stock in Kg per product type, aggregating across all ACTIVO Lotes.

#### Scenario: Aggregate stock by product type

- GIVEN two ACTIVO Lotes of the same product type with 50 Kg and 30 Kg available
- WHEN requesting inventory levels
- THEN the product type shows 80 Kg available

#### Scenario: Exclude AGOTADO Lotes from inventory

- GIVEN one ACTIVO Lote with 20 Kg and one AGOTADO Lote with 0 Kg
- WHEN requesting inventory levels
- THEN the product type shows 20 Kg available

### Requirement: Top Clients

The system SHALL rank clients by total revenue (`Ingreso_Total`) for the given month, returning the top N clients.

#### Scenario: Rank clients by revenue

- GIVEN three clients with June revenues of 100000, 75000, and 50000
- WHEN requesting top 3 clients for June
- THEN clients are returned in descending revenue order

#### Scenario: Fewer clients than requested N

- GIVEN only 2 clients with sales in June
- WHEN requesting top 5 clients for June
- THEN only 2 clients are returned

### Requirement: Enriched MetricCard Descriptions

Each MetricCard on the dashboard SHALL display a `description` string below the value. Descriptions SHALL contain contextual information derived from the same period's data: percentage margins, unit counts, or period references.

- Ingresos: "{ventasCount} ventas este mes"
- Costo Mercancía: "{costoPct}% de ingresos"
- Ganancia Bruta: "Margen bruto: {margenBrutoPct}%"
- Gastos Fijos: no description (context is self-evident)
- Ganancia Neta: "Margen neto: {margenNetoPct}%"

When `ingresoTotal` is zero, margin percentages SHALL display as "N/A" rather than calculating a division-by-zero.

#### Scenario: Descriptions with normal revenue

- GIVEN a period with 15 ventas and ingresoTotal of $100,000
- WHEN rendering MetricCards
- THEN Ingresos shows "15 ventas este mes", Ganancia Bruta shows "Margen bruto: X%", Ganancia Neta shows "Margen neto: Y%"

#### Scenario: Descriptions with zero revenue

- GIVEN a period with ingresoTotal of $0
- WHEN rendering MetricCards
- THEN margin percentages show "N/A" instead of division-by-zero results

### Requirement: Inventory Value Metric

The dashboard SHALL display inventory value as the sum of `costoRealCalculadoKg × cantidadDisponibleKg` across all active lotes. This metric SHALL be calculated server-side in the use case.

#### Scenario: Calculate inventory value from active lotes

- GIVEN an active lote with costoRealCalculadoKg=5000 and cantidadDisponibleKg=100
- WHEN inventory value is calculated
- THEN that lote contributes $500,000 to the total

### Requirement: Sales Count Metric

The dashboard SHALL display the total number of ventas (sales) for the selected period.

#### Scenario: Count sales in period

- GIVEN 15 ventas exist in June 2026
- WHEN the dashboard loads for June 2026
- THEN the sales count displays "15"

### Requirement: Active Clients Metric

The dashboard SHALL display the count of distinct clients who made at least one purchase in the selected period.

#### Scenario: Count distinct clients

- GIVEN 12 distinct clienteIds appear in ventas for June 2026
- WHEN the dashboard loads for June 2026
- THEN active clients displays "12"

### Requirement: Kg Sold Metric

The dashboard SHALL display total kilograms sold in the selected period.

#### Scenario: Sum kg sold

- GIVEN ventas totaling 2,450 kg in June 2026
- WHEN the dashboard loads for June 2026
- THEN kg sold displays "2.450 Kg"

### Requirement: Margin Percentage Metrics

The dashboard SHALL display:
- Gross margin % = (gananciaBruta / ingresoTotal) × 100, rounded to 1 decimal
- Net margin % = (gananciaNeta / ingresoTotal) × 100, rounded to 1 decimal

When ingresoTotal is zero, both percentages SHALL be "N/A".

#### Scenario: Calculate margins with revenue

- GIVEN gananciaBruta=32000 and ingresoTotal=100000
- WHEN calculating gross margin %
- THEN the result is 32.0%

#### Scenario: Zero revenue returns N/A

- GIVEN ingresoTotal=0
- WHEN calculating margin percentages
- THEN both gross and net margin display "N/A"

### Requirement: Period Selector

A period selector SHALL allow the user to choose month and year. Default SHALL be the current month/year. Changing the period SHALL call the Server Action with the new month/year and refresh all dashboard metrics without a full page reload.

#### Scenario: Change period refreshes metrics

- GIVEN the dashboard is showing June 2026 data
- WHEN the user selects May 2026
- THEN all metrics refresh to reflect May 2026 data

### Requirement: N+1 Query Fix

`ObtenerMetricas` topClientes resolution SHALL use a single batched query to resolve client names instead of N individual `findById` calls.

#### Scenario: Batch client name resolution

- GIVEN 5 top clients
- WHEN names are resolved
- THEN exactly 1 query (not 5) is executed against the cliente table

---

## Non-Functional Requirements

### NFR: Server-Side Computation

All aggregate calculations (margins, counts, sums) SHALL be performed in the use case, not client-side.

### NFR: Server Action Re-Fetch

Period changes SHALL trigger a Server Action call (`getMetricas(month, year)`), not a full page reload.

### NFR: No Snapshots

Metrics SHALL be computed from live database data on each request, not from pre-computed snapshots or cached values.

---

## Out of Scope

- Charts, graphs, or visual data representations
- Date range filters beyond single month/year selection
- Real-time updates (WebSocket, SSE)
- Period-over-period comparison (deltas vs. previous month)
- Breakdown by product type or client type