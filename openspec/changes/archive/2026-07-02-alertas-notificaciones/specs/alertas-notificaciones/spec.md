# Spec: Alertas y Notificaciones

## FR-01: Dashboard alert section

The dashboard SHALL display an alert section between the page header and MetricCards. The section SHALL render one shadcn Alert banner per active alert type (STOCK_BAJO, STOCK_CRITICO, ANTIGUO, MUY_ANTIGUO), each showing the count of affected lotes and a summary description.

**Given** the dashboard page is loaded, **When** there are one or more active alert conditions, **Then** the alert section SHALL appear between the page header and MetricCards, displaying one banner per alert type.

**Given** the dashboard page is loaded, **When** there are zero active alert conditions, **Then** the alert section SHALL NOT be rendered.

## FR-02: Low stock alerts

The system SHALL generate a warning alert when any active Lote has `stockDisponibleKg` below 50 Kg, and a critical alert when `stockDisponibleKg` is below 20 Kg OR below 20% of `cantidadCompradaKg`.

**Given** an active Lote with `stockDisponibleKg < 50` Kg and `>= 20` Kg and `>= 20%` of `cantidadCompradaKg`, **When** alerts are computed, **Then** the lote SHALL appear under a STOCK_BAJO alert with severity "warning".

**Given** an active Lote with `stockDisponibleKg < 20` Kg, **When** alerts are computed, **Then** the lote SHALL appear under a STOCK_CRITICO alert with severity "critical" (regardless of percentage).

**Given** an active Lote with `stockDisponibleKg >= 20` Kg but `stockDisponibleKg / cantidadCompradaKg < 0.20`, **When** alerts are computed, **Then** the lote SHALL appear under a STOCK_CRITICO alert with severity "critical".

**Given** a lote that qualifies for both STOCK_BAJO and STOCK_CRITICO, **When** alerts are computed, **Then** only STOCK_CRITICO SHALL be emitted for that lote (higher severity wins).

## FR-03: Old inventory alerts

The system SHALL generate a warning alert when any active Lote has been in inventory for more than 30 days since `fechaIngreso`, and a critical alert for more than 60 days.

**Given** an active Lote where `daysSince(fechaIngreso) > 30` and `<= 60`, **When** alerts are computed, **Then** the lote SHALL appear under an ANTIGUO alert with severity "warning".

**Given** an active Lote where `daysSince(fechaIngreso) > 60`, **When** alerts are computed, **Then** the lote SHALL appear under a MUY_ANTIGUO alert with severity "critical".

**Given** a lote that qualifies for both ANTIGUO and MUY_ANTIGUO, **When** alerts are computed, **Then** only MUY_ANTIGUO SHALL be emitted for that lote (higher severity wins).

## FR-04: Alert severity and ordering

Alerts SHALL have two severity levels: "warning" (amber/yellow styling) and "critical" (red/destructive styling). Critical alerts SHALL appear before warning alerts in the section.

**Given** alerts of both severity levels exist, **When** the alert section is rendered, **Then** all critical alerts SHALL be displayed before all warning alerts.

**Given** alerts of the same severity, **When** the alert section is rendered, **Then** alerts SHALL be ordered by type priority: STOCK_CRITICO > MUY_ANTIGUO > STOCK_BAJO > ANTIGUO.

## FR-05: Lotes table badges

The Lotes DataTable SHALL display inline badges on the `stockDisponibleKg` column and a new `diasEnInventario` column indicating alert status.

**Given** a Lote row where stock triggers a warning condition, **When** the table is rendered, **Then** the stock cell SHALL display an amber badge alongside the value.

**Given** a Lote row where stock triggers a critical condition, **When** the table is rendered, **Then** the stock cell SHALL display a red/destructive badge alongside the value.

**Given** a Lote row where age triggers a warning condition, **When** the table is rendered, **Then** the `diasEnInventario` cell SHALL display an amber badge alongside the value.

**Given** a Lote row where age triggers a critical condition, **When** the table is rendered, **Then** the `diasEnInventario` cell SHALL display a red/destructive badge alongside the value.

## FR-06: ObtenerAlertas use case

A use case SHALL compute alerts from active Lote data. It SHALL return an `AlertasResult` containing an array of `AlertaLote` objects and a summary count per type.

**Given** a set of active lotes, **When** `ObtenerAlertas.execute()` is called, **Then** it SHALL return `AlertasResult` with:
- `alertas`: `AlertaLote[]` — each with `loteId`, `tipoProducto`, `proveedorNombre`, `stockDisponibleKg`, `cantidadCompradaKg`, `porcentajeRestante`, `diasEnInventario`, `alertType` (STOCK_BAJO | STOCK_CRITICO | ANTIGUO | MUY_ANTIGUO), `severity` (warning | critical), and `mensaje`
- `resumen`: counts per alert type and total

**Given** a Lote with `estado !== ACTIVO`, **When** alerts are computed, **Then** it SHALL be excluded (no alerts for AGOTADO or soft-deleted lotes).

## NFR-01: Server-side computation

Alert computation SHALL be server-side. The use case processes Lote data and returns alert objects. The client component receives pre-computed alerts via server action — no client-side threshold logic.

## NFR-02: Hardcoded thresholds (Phase 1)

Thresholds SHALL be hardcoded constants: `STOCK_BAJO_KG=50`, `STOCK_CRITICO_KG=20`, `STOCK_CRITICO_PCT=0.20`, `DIAS_ANTIGUO=30`, `DIAS_MUY_ANTIGUO=60`. These constants SHALL be defined at the top of `ObtenerAlertas.ts` for easy future extraction.

## NFR-03: Active lotes only

Alerts SHALL only be generated for lotes with `estado === ACTIVO` and `deletedAt === null`. AGOTADO and soft-deleted lotes SHALL NOT trigger alerts.