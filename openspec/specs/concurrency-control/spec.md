# Concurrency Control Specification

## Purpose

Prevent race conditions when concurrent Ventas target the same Lote. Implement sequential transactions with Prisma `$transaction` in the Infrastructure layer to ensure stock never goes negative.

## Requirements

### Requirement: Sequential Venta Transaction

The system SHALL execute Venta registration within a Prisma `$transaction` with sequential isolation. The transaction MUST read Lote stock, verify sufficiency, deduct stock, and persist the Venta as a single atomic unit.

#### Scenario: Single sale processes atomically

- GIVEN a Lote with 50 Kg available
- WHEN registering a Venta for 10 Kg within a transaction
- THEN stock is deducted to 40 Kg and the Venta is persisted — both or neither

#### Scenario: Transaction rollback on any failure

- GIVEN a Venta registration that fails after stock deduction
- WHEN any step after deduction fails
- THEN the entire transaction is rolled back and stock remains unchanged

### Requirement: Optimistic Locking for Stock Deduction

The system MUST use optimistic locking or strict stock verification within the transaction to prevent negative stock. The stock update MUST include a WHERE clause verifying that `Cantidad_Disponible >= sale_quantity` before decrementing.

#### Scenario: Stock verification prevents overselling

- GIVEN a Lote with 10 Kg available
- WHEN two concurrent transactions attempt to deduct 8 Kg each
- THEN one transaction succeeds (stock becomes 2 Kg) and the other is rejected with a concurrency error

#### Scenario: No false rejections when stock is sufficient

- GIVEN a Lote with 100 Kg available
- WHEN two concurrent transactions deduct 5 Kg and 10 Kg respectively
- THEN both transactions succeed (stock becomes 85 Kg)

#### Scenario: Retry on transient conflict

- GIVEN a transaction that fails due to a concurrent write conflict
- WHEN the optimistic lock check fails
- THEN the system SHOULD retry the transaction up to a configurable maximum before surfacing an error