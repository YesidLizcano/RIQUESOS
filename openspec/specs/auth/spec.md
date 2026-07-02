# Auth Specification

## Purpose

Authenticate users via Auth.js (NextAuth) with a Credentials provider (email + password). Protect Server Actions and routes with Next.js Middleware. Reject any request without an active session. Seed a default admin user in the database.

## Requirements

### Requirement: Credentials Authentication

The system SHALL authenticate users via Auth.js Credentials provider using email and password. The system MUST hash passwords with bcrypt before storage and verify against the hash on login.

#### Scenario: Successful login

- GIVEN a registered user with email admin@riquesos.com and a valid password
- WHEN submitting credentials via the login form
- THEN the system creates an Auth.js session and redirects to the dashboard

#### Scenario: Invalid password

- GIVEN a registered user with email admin@riquesos.com
- WHEN submitting an incorrect password
- THEN the system MUST reject the attempt and return an authentication error

#### Scenario: Unknown email

- GIVEN no user with the submitted email exists
- WHEN submitting credentials
- THEN the system MUST reject the attempt with an authentication error

### Requirement: Session Protection via Middleware

The system MUST protect all application routes and Server Actions using Next.js Middleware. Requests without a valid Auth.js session SHALL be redirected to the login page.

#### Scenario: Authenticated request passes through

- GIVEN a request with a valid Auth.js session cookie
- WHEN the request hits a protected route
- THEN Middleware allows the request to proceed

#### Scenario: Unauthenticated request redirected

- GIVEN a request without a valid session cookie
- WHEN the request hits a protected route
- THEN Middleware redirects to the login page

#### Scenario: Server Action without session rejected

- GIVEN a Server Action invocation without an active session
- WHEN the action is called
- THEN the system MUST reject the call with an unauthorized error

### Requirement: Default Admin User Seed

The system SHALL seed a default admin user on database initialization. The admin user MUST have a known email and a securely hashed default password.

#### Scenario: Admin user available after seed

- GIVEN a freshly seeded database
- WHEN checking the users table
- THEN an admin user with email admin@riquesos.com exists and the password hash is valid

#### Scenario: Seed is idempotent

- GIVEN an admin user already exists in the database
- WHEN running the seed process again
- THEN the system MUST NOT duplicate the admin user