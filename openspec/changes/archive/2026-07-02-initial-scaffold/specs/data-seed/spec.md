# Data Seed Specification

## Purpose

Seed the database via `prisma/seed.ts` with essential baseline data so the system starts with an admin user and the two base products, not a blank database.

## Requirements

### Requirement: Database Clear and Seed

The system SHALL provide a seed script at `prisma/seed.ts` that clears existing data and inserts baseline records. The seed script MUST be idempotent — running it multiple times produces the same result.

#### Scenario: Fresh seed populates all baseline data

- GIVEN an empty database
- WHEN running `npx prisma db seed`
- THEN the database contains the default admin user and both base products

#### Scenario: Re-seeding preserves no duplicates

- GIVEN a database already containing baseline data
- WHEN running `npx prisma db seed` again
- THEN each baseline record appears exactly once — no duplicates

### Requirement: Default Admin User Seed

The seed script MUST create one admin user with email `admin@riquesos.com` and a bcrypt-hashed default password. If the user already exists, the script MUST skip creation.

#### Scenario: Admin user created on first seed

- GIVEN an empty database
- WHEN seeding
- THEN admin@riquesos.com exists with a valid bcrypt hash

#### Scenario: Admin user not duplicated on re-seed

- GIVEN admin@riquesos.com already exists
- WHEN seeding
- THEN no second admin user is created

### Requirement: Base Product Seed

The seed script MUST create two product types: "Queso Doble Crema" and "Queso Semisalado" with their standard prices. If a product type already exists, the script MUST skip creation.

#### Scenario: Both products created on first seed

- GIVEN an empty database
- WHEN seeding
- THEN "Queso Doble Crema" and "Queso Semisalado" product types exist with standard prices

#### Scenario: Products not duplicated on re-seed

- GIVEN both product types already exist
- WHEN seeding
- THEN no duplicate product types are created