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