# Backup Strategy Specification

## Purpose

Provide a local backup mechanism for the SQLite database by creating timestamped copies of `dev.db` into a `/backups` folder, ensuring data can be restored without cloud infrastructure.

## Requirements

### Requirement: Database Backup Command

The system SHALL provide a Node.js script (or npm script in `package.json`) that copies the current `dev.db` file to `/backups/backup-dev-{YYYY-MM-DD}.db` with the current date as the timestamp.

#### Scenario: Successful backup creation

- GIVEN `dev.db` exists and `/backups/` directory exists or is created
- WHEN running the backup command
- THEN a file named `backup-dev-2026-07-01.db` appears in `/backups/` with identical content to `dev.db`

#### Scenario: Backup directory auto-created

- GIVEN the `/backups/` directory does not exist
- WHEN running the backup command
- THEN the system creates `/backups/` and writes the backup file successfully

### Requirement: Idempotent Daily Backup

If a backup file with today's date already exists, the system SHALL overwrite it with the current database state.

#### Scenario: Overwrite existing same-day backup

- GIVEN `/backups/backup-dev-2026-07-01.db` already exists
- WHEN running the backup command on the same date
- THEN the existing file is replaced with the current `dev.db` snapshot

### Requirement: Backup Must Not Modify Source

The backup script MUST NOT modify, lock, or corrupt the source `dev.db` file. It SHALL use a read-only file copy.

#### Scenario: Source database unchanged after backup

- GIVEN a `dev.db` file with known content
- WHEN running the backup command
- THEN `dev.db` remains byte-identical to its pre-backup state