# Gasto Fijo Management Specification

## Purpose

Manage fixed monthly expenses (Gastos Fijos) such as electricity, rent, and cooler maintenance — used for net profit calculation on the dashboard.

## Requirements

### Requirement: GastoFijo Creation

The system SHALL create a GastoFijo with a name, monthly amount, and category. Amounts MUST be stored as Decimal to prevent floating-point errors.

#### Scenario: Create a fixed expense

- GIVEN a valid name, amount > 0, and category
- WHEN creating a GastoFijo
- THEN the GastoFijo is persisted with the specified fields

#### Scenario: Reject negative amount

- GIVEN an amount < 0
- WHEN creating a GastoFijo
- THEN the system MUST reject with a validation error

### Requirement: GastoFijo CRUD

The system SHALL support full CRUD operations on GastosFijos: create, read, update, and delete.

#### Scenario: Update GastoFijo amount

- GIVEN an existing GastoFijo with amount 50000
- WHEN updating the amount to 55000
- THEN the GastoFijo is persisted with the new amount

#### Scenario: Delete GastoFijo

- GIVEN an existing GastoFijo
- WHEN deleting it
- THEN the GastoFijo is removed from the system

### Requirement: Monthly Expense Aggregation

The system SHALL compute the total monthly fixed expenses as the sum of all active GastosFijos amounts. This aggregate feeds the dashboard's net profit calculation.

#### Scenario: Sum all monthly expenses

- GIVEN three GastosFijos with amounts 50000, 30000, and 20000
- WHEN requesting total monthly expenses
- THEN the system returns 100000

#### Scenario: No expenses returns zero

- GIVEN no GastosFijos exist
- WHEN requesting total monthly expenses
- THEN the system returns 0