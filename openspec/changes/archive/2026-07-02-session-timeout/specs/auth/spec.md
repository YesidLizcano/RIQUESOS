# Delta for Auth

## MODIFIED Requirements

### Requirement: Session Protection via Middleware

The system MUST protect all application routes and Server Actions using Next.js Middleware. Requests without a valid Auth.js session SHALL be redirected to the login page. The system SHALL enforce a maximum session duration of 8 hours (28800 seconds). After 8 hours, the JWT session MUST expire and the user MUST be redirected to the login page with an error parameter indicating session expiry.

(Previously: Middleware protected routes and rejected unauthenticated requests, but sessions had no maximum duration.)

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

#### Scenario: Session expired after 8 hours

- GIVEN an authenticated session that has been active for 8 hours
- WHEN the user makes a request
- THEN the session is expired and the user is redirected to /login with an error parameter

#### Scenario: Session valid within 8-hour window

- GIVEN an authenticated session within the 8-hour window
- WHEN the user makes a request
- THEN the session is valid and the request proceeds normally

## ADDED Requirements

### Requirement: Session Expiry UX Feedback

The login page SHALL display a message when the user is redirected due to session expiry. The message MUST indicate that the session has expired and the user needs to log in again.

#### Scenario: Expired session redirect shows message

- GIVEN a user whose session has expired
- WHEN redirected to /login with an error parameter indicating session expiry
- THEN the login page displays a "Your session has expired" message

#### Scenario: Direct navigation shows no expiry message

- GIVEN a user who navigates directly to /login without an expired session
- WHEN the login page loads
- THEN no expiry message is displayed