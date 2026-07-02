# Local Logging Specification

## Purpose

Configure Pino logger in the Infrastructure layer to write critical errors and sale transactions to a physical local file (`logs/app.log`). Since there is no cloud console, all important events must be captured to disk for debugging.

## Requirements

### Requirement: Pino File Logger Configuration

The system SHALL configure Pino to write log output to `logs/app.log` in the project root. The logger MUST be initialized on application startup and create the `logs/` directory if it does not exist.

#### Scenario: Log directory created automatically

- GIVEN the `logs/` directory does not exist
- WHEN the application starts
- THEN the system creates `logs/` and opens `logs/app.log` for writing

#### Scenario: Log directory already exists

- GIVEN the `logs/` directory already exists
- WHEN the application starts
- THEN the system opens `logs/app.log` for appending without error

### Requirement: Critical Error Logging

The system MUST log all unhandled errors, Server Action failures, and infrastructure errors at `error` level to the log file. Each log entry SHALL include timestamp, level, error message, and stack trace.

#### Scenario: Server Action failure logged

- GIVEN a Server Action that throws an unexpected error
- WHEN the error occurs
- THEN an `error`-level entry with message and stack trace is written to `logs/app.log`

#### Scenario: Infrastructure error logged

- GIVEN a Prisma query that fails due to a database constraint violation
- WHEN the error occurs
- THEN an `error`-level entry with details is written to `logs/app.log`

### Requirement: Venta Transaction Logging

The system SHALL log every Venta registration at `info` level with sale details: Venta ID, Lote ID, quantity, client, and total revenue.

#### Scenario: Successful Venta logged

- GIVEN a Venta that registers successfully
- WHEN the transaction completes
- THEN an `info`-level entry with Venta details is written to `logs/app.log`

#### Scenario: Failed Venta logged

- GIVEN a Venta that fails validation or concurrency check
- WHEN the sale is rejected
- THEN a `warn`-level entry with rejection details is written to `logs/app.log`