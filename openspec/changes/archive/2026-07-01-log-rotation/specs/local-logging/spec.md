# Delta for local-logging

## MODIFIED Requirements

### Requirement: Pino File Logger Configuration

The system SHALL configure Pino to write log output to `logs/app.log` in the project root using the `pino-roll` transport target. The logger MUST be initialized on application startup and create the `logs/` directory if it does not exist.

The system SHALL rotate log files based on size (10 MB maximum per file) and retain no more than 10 rotated files. Rotated files SHALL be gzip-compressed and named with an incrementing suffix (e.g., `app.log.1`, `app.log.2`).

(Previously: Configured Pino to write to `logs/app.log` via `pino/file` transport with no rotation.)

#### Scenario: Log directory created automatically

- GIVEN the `logs/` directory does not exist
- WHEN the application starts
- THEN the system creates `logs/` and opens `logs/app.log` for writing via `pino-roll`

#### Scenario: Log directory already exists

- GIVEN the `logs/` directory already exists
- WHEN the application starts
- THEN the system opens `logs/app.log` for appending via `pino-roll` without error

#### Scenario: Log file exceeds size limit

- GIVEN `logs/app.log` exceeds 10 MB
- WHEN a new log entry is written
- THEN the system rotates the current file to `app.log.1`, compresses the rotated file with gzip, and continues writing to a fresh `app.log`

#### Scenario: Maximum rotated files exceeded

- GIVEN 10 rotated log files already exist (`app.log.1` through `app.log.10`)
- WHEN a new rotation occurs
- THEN the system deletes the oldest rotated file before creating the new one

#### Scenario: Rotated file naming

- GIVEN a log rotation occurs
- WHEN the system rotates `app.log`
- THEN the current `app.log` is renamed to `app.log.1`, existing `app.log.1` becomes `app.log.2`, and so on sequentially

## ADDED Requirements

### Requirement: Log Rotation Dependency

The system MUST include `pino-roll` as a production dependency. The `pino-roll` transport target SHALL replace `pino/file` in the Pino transport configuration without altering other transport targets (e.g., `pino-pretty` in development).

#### Scenario: Production dependency added

- GIVEN the project's `package.json` dependencies
- WHEN the change is applied
- THEN `pino-roll` is listed as a production dependency

#### Scenario: Dev console output preserved

- GIVEN the application runs in development mode (`NODE_ENV !== 'production'`)
- WHEN the logger is initialized
- THEN `pino-pretty` remains as a transport target alongside `pino-roll`, and console output is unchanged