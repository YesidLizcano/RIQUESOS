# Delta for Dashboard Metrics

## MODIFIED Requirements

### Requirement: Monthly Revenue Metric

The system SHALL compute monthly total revenue as the sum of `Ingreso_Total` from all Ventas in the given month.
(Previously: Revenue was a simple sum without liquidity routing)

#### Scenario: Calculate monthly revenue

- GIVEN two Ventas in June with Ingreso_Total of 50000 and 30000
- WHEN requesting June revenue
- THEN the system returns 80000

#### Scenario: No sales in month

- GIVEN no Ventas in July
- WHEN requesting July revenue
- THEN the system returns 0

## ADDED Requirements

### Requirement: FlujoDinero Liquidity Routing for CREDITO Abonos

The `flujoDinero` calculation SHALL route CREDITO ventas' initial abonos to the correct liquidity bucket based on `metodoPagoAbono`. Non-CREDITO ventas SHALL continue grouping their full `ingresoTotal` by `metodoPago`. CREDITO ventas with `abono > 0` SHALL contribute the `abono` amount to Efectivo or Bancos based on `metodoPagoAbono`. CREDITO ventas with no abono contribute nothing to Efectivo/Bancos. `cuentasPorCobrar` SHALL remain `saldo = ingresoTotal - totalAbonado`.

#### Scenario: CREDITO venta with cash abono routes to Efectivo

- GIVEN a CREDITO Venta with ingresoTotal=50000, abono=20000, metodoPagoAbono=EFECTIVO
- WHEN computing flujoDinero
- THEN efectivo increases by 20000, bancos is unchanged, cuentasPorCobrar=30000

#### Scenario: CREDITO venta with Nequi abono routes to Bancos

- GIVEN a CREDITO Venta with ingresoTotal=50000, abono=15000, metodoPagoAbono=NEQUI
- WHEN computing flujoDinero
- THEN bancos increases by 15000, efectivo is unchanged, cuentasPorCobrar=35000

#### Scenario: CREDITO venta with no abono contributes nothing to liquidity

- GIVEN a CREDITO Venta with ingresoTotal=50000, abono=0
- WHEN computing flujoDinero
- THEN efectivo is unchanged, bancos is unchanged, cuentasPorCobrar=50000

#### Scenario: Non-CREDITO venta routes by metodoPago as before

- GIVEN an EFECTIVO Venta with ingresoTotal=30000
- WHEN computing flujoDinero
- THEN efectivo increases by 30000 (unchanged behavior)

### Requirement: AbonoPago Records in FlujoDinero

The `flujoDinero` calculation SHALL include `AbonoPago` records. Each `AbonoPago` amount SHALL be added to Efectivo or Bancos based on the `AbonoPago.metodoPago`. This is in addition to the initial abono routing from CREDITO ventas.

#### Scenario: AbonoPago with EFECTIVO adds to efectivo

- GIVEN an AbonoPago with monto=10000 and metodoPago=EFECTIVO in June
- WHEN computing flujoDinero for June
- THEN efectivo increases by 10000

#### Scenario: AbonoPago with NEQUI adds to bancos

- GIVEN an AbonoPago with monto=5000 and metodoPago=NEQUI in June
- WHEN computing flujoDinero for June
- THEN bancos increases by 5000

#### Scenario: AbonoPago with BRE_B adds to bancos

- GIVEN an AbonoPago with monto=8000 and metodoPago=BRE_B in June
- WHEN computing flujoDinero for June
- THEN bancos increases by 8000

### Requirement: FlujoDinero Backward Compatibility

The `FlujoDinero` response shape (efectivo, bancos, cuentasPorCobrar) SHALL remain unchanged. Only the internal calculation changes. No new fields are added to the DTO.

#### Scenario: Response shape unchanged

- GIVEN any set of Ventas and AbonoPagos
- WHEN flujoDinero is computed
- THEN the response contains exactly efectivo, bancos, and cuentasPorCobrar keys