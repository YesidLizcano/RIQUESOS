# Charts & Graphs — Delta Specification

## Functional Requirements

### FR-01: Revenue Composition Chart

GIVEN the user is on the Dashboard page
WHEN the page loads with metrics data for the selected period
THEN a stacked bar chart SHALL display the revenue decomposition showing:
- **Ingresos** (total revenue) as the full bar
- **Costo Mercancía** (COGS) as the first stacked segment
- **Ganancia Bruta** (gross profit) as the second segment
- **Gastos Fijos** (fixed expenses) as the third segment
- **Ganancia Neta** (net profit) as the final segment

The chart SHALL use shadcn/ui Chart components built on recharts.

### FR-02: Daily Sales Trend Chart

GIVEN the user is on the Dashboard page
WHEN the page loads with metrics data for the selected period
THEN a line/area chart SHALL display daily sales revenue (ingresos by day) for that period.
- The X-axis SHALL show dates (formatted as "DD" or "DD/MM")
- The Y-axis SHALL show revenue in AR$
- Days with zero sales SHALL be shown as zero-value points, NOT omitted
- The chart SHALL display at least one data point per day in the period

### FR-03: Top Clients Bar Chart

GIVEN the user is on the Dashboard page
WHHEN the page loads with top client data
THEN a horizontal bar chart SHALL display the top 5 clients by revenue for the selected period.
- Each bar SHALL show the client name on the Y-axis
- Each bar SHALL show total revenue on the X-axis
- Bars SHALL be sorted by revenue descending

### FR-04: Inventory Donut Chart

GIVEN the user is on the Dashboard page
WHEN the page loads with inventory data
THEN a donut chart SHALL display inventory value by product type (DOBLE_CREMA vs SEMISALADO).
- Each segment SHALL show the product type label and total stock value
- The center of the donut SHALL display the total inventory value

### FR-05: Client Type Donut Chart

GIVEN the user is on the Dashboard page
WHEN the page loads with client type revenue data
THEN a donut chart SHALL display revenue share by client type (MAYORISTA vs MINORISTA).
- Each segment SHALL show the type label and total revenue
- The center SHALL display the total revenue

### FR-06: Chart Period Integration

GIVEN the user changes the PeriodSelector month or year
WHEN the new period data is fetched
THEN all charts SHALL refresh with data for the new period alongside KPI cards.

### FR-07: Empty State Handling

GIVEN the selected period has no sales data
WHEN any chart renders
THEN the chart SHALL display "Sin datos para este período" as a centered message within the chart card.
Charts SHALL NOT break, show errors, or render empty axes on empty data.

### FR-08: Use Case Extension

GIVEN the `ObtenerMetricas` use case is called with a date range
WHEN it computes dashboard metrics
THEN the response SHALL include:
- `ventasDiarias`: an array of `{ fecha: string, total: string }` grouped by day within the period, including days with zero sales
- `ingresosPorTipoCliente`: an array of `{ tipo: string, total: string }` grouped by `TipoCliente` (MAYORISTA, MINORISTA)

## Non-Functional Requirements

### NFR-01: Chart Library
All charts SHALL use recharts via shadcn/ui Chart components. No custom chart rendering or alternative chart libraries.

### NFR-02: Responsiveness
Charts SHALL be responsive and SHALL NOT overflow their container on desktop viewports. Charts SHALL use `ResponsiveContainer` from recharts.

### NFR-03: Spanish Labels
All chart axes, legends, tooltips, and labels SHALL be in Spanish. Currency values SHALL be formatted as AR$ using `toLocaleString('es-AR')`.