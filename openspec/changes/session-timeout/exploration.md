# Exploration: session-timeout

## Change Overview

Configure explicit session duration/timeout for Auth.js (NextAuth v4) sessions. Currently the app uses JWT strategy with NO explicit session timeout — it relies on Auth.js defaults, which means sessions effectively last indefinitely (or until the browser cookie expires). For a cheese distributor backoffice running on a local LAN, this needs a sensible workday-length timeout.

## Current State Analysis

### Auth Configuration (`src/infrastructure/auth.ts`)

- **Provider**: Credentials provider (email + password) with bcrypt verification
- **Strategy**: `jwt` (explicit, no database sessions)
- **Session config**: Only `strategy: 'jwt'` — NO `maxAge`, NO `updateAge`
- **JWT config**: No `jwt.maxAge` set
- **Callbacks**: `jwt` callback adds `role` from user; `session` callback propagates `role` from token to session
- **Secret**: Uses `process.env.NEXTAUTH_SECRET`
- **Pages**: Custom sign-in at `/login`

### Middleware (`src/middleware.ts`)

- Uses `getToken()` from `next-auth/jwt` to check authentication
- Protects all routes except `/login` and `/api/auth`
- No session refresh or timeout logic in middleware

### Login Page (`src/app/login/page.tsx`)

- Client component using `signIn('credentials', { redirect: false })`
- No session timeout awareness or auto-logout logic

### Server Actions Auth Helper (`src/presentation/actions/auth.ts`)

- `requireSession()` uses `getServerSession(authOptions)` — respects Auth.js session config
- Redirects to `/login` if no session

### Auth Use Case (`src/application/use-cases/AutenticarUsuario.ts`)

- Domain-level authentication logic — verifies credentials
- No awareness of session duration

### Environment (`.env`)

- `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are set
- No `NEXTAUTH_SESSION_MAX_AGE` or similar env var

### Package Version

- `next-auth`: `^4.24.14` (Auth.js v4, NOT v5)
- This matters: v4 and v5 have different config APIs

### Tests

- Auth tests (`src/__tests__/auth.test.ts`) cover credential validation only — no session timeout tests
- E2E verification tests check structural presence of middleware and auth config, but not session timeout behavior

## Auth.js v4 Session Timeout Options

### JWT Strategy Session Lifecycle

With `strategy: 'jwt'`, Auth.js v4 manages sessions entirely via a signed JWT stored in a cookie (`next-auth.session-token`). There is NO server-side session store. The token's validity period is controlled by:

1. **`session.maxAge`** — How long a session lasts before it expires. Default: **not set** when using JWT strategy, which means the JWT has no expiration claim (`exp`) unless explicitly configured. In practice, this means sessions last until the cookie is cleared or `NEXTAUTH_SECRET` changes.

2. **`session.updateAge`** — How often the session is updated (i.e., the JWT is re-signed). Default: `0` for JWT strategy (never re-signed unless data changes). Only relevant if you want "rolling" sessions that extend on activity.

3. **`jwt.maxAge`** — Explicit max age for the JWT token. If set, this adds an `exp` claim. Takes precedence over `session.maxAge` for JWT strategy.

### Configuration Hierarchy

For JWT strategy in Auth.js v4:

```
jwt.maxAge > session.maxAge > default (no expiration)
```

If neither `jwt.maxAge` nor `session.maxAge` is set, the JWT has NO expiration — the session cookie persists until the browser clears it.

### What Happens on Expiration

When the JWT's `exp` claim is reached:
1. The middleware's `getToken()` returns `null` (expired token = invalid)
2. The user is redirected to `/login`
3. `getServerSession()` returns `null`
4. Server Actions with `requireSession()` redirect to `/login`

No server-side action is needed — the JWT validation handles it automatically.

### Recommended Configuration for LAN Backoffice

```typescript
session: {
  strategy: 'jwt',
  maxAge: 8 * 60 * 60,  // 8 hours = full workday (28800 seconds)
},
```

**Rationale**:
- **8 hours** covers a full workday without re-login annoyance
- LAN backoffice means physical network security — longer timeout is acceptable
- Not infinite — if someone walks away from an open browser, it auto-locks after the workday
- `session.maxAge` is cleaner than `jwt.maxAge` for JWT strategy in v4 (they do the same thing, but `session.maxAge` is the canonical config key)

### `updateAge` Consideration

Setting `session.updateAge` enables "rolling sessions" — the JWT gets re-signed (with a new `iat` and recalculated `exp`) on every request within the update window.

**Recommendation**: Do NOT set `updateAge` for this use case. Reasons:
- A cheese distributor backoffice doesn't need indefinite sessions that extend on activity
- Fixed 8-hour timeout is predictable and easier to reason about
- Rolling sessions create ambiguity about "when does this session actually expire?"
- If the user works past 8 hours, they re-login — that's acceptable and actually desirable for security

## Impact Analysis

### Files to Modify

1. **`src/infrastructure/auth.ts`** — Add `maxAge` to the `session` config block
   - Current: `session: { strategy: 'jwt' }`
   - Target: `session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }`

2. **Optional: `src/app/login/page.tsx`** — Could add session-expired messaging
   - If user is redirected to login due to session expiry, show a "Your session has expired" message
   - Requires parsing `callbackUrl` query param or adding `error=SessionExpired` to redirect

3. **Optional: `src/middleware.ts`** — Could add expired-session detection for UX
   - Currently `getToken()` returns `null` for expired tokens — no way to distinguish "no session" from "expired session" without decoding the JWT manually
   - Could check if the token exists but is expired and pass that info via query param

### No Impact

- **Database schema** — No changes needed (JWT strategy, no session table)
- **`AutenticarUsuario` use case** — No changes (credential validation only)
- **`requireSession()`** — No changes (uses `getServerSession` which respects `maxAge` automatically)
- **Existing tests** — No tests need modification (no current session timeout tests exist)

### Migration Concerns

**IMPORTANT**: After deploying this change, ALL existing sessions will be immediately invalidated on their next request. This is because:
1. Existing JWTs were created WITHOUT an `exp` claim
2. Adding `maxAge` causes Auth.js to start validating the `exp` claim
3. Old tokens without `exp` will be treated as expired

This is a one-time disruption. For a small LAN backoffice with 1-3 users, this is acceptable. If needed, users just re-login.

## Security Considerations

1. **Fixed timeout**: 8 hours is a reasonable balance for a LAN backoffice
2. **No rolling sessions**: Predictable expiration, no "forever" sessions
3. **JWT stored in cookie**: `next-auth.session-token` — HttpOnly by default in Auth.js v4
4. **CSRF**: Auth.js v4 handles CSRF protection by default
5. **NEXTAUTH_SECRET**: Already in use — changing it would invalidate all sessions (good to know as an emergency option)
6. **No idle timeout**: The JWT doesn't track last-activity time unless `updateAge` is set. For a fixed timeout, this is fine.

## Open Questions

1. **Should we make the timeout configurable via environment variable?** (e.g., `SESSION_MAX_AGE_HOURS=8`) — Pros: ops can adjust without code changes. Cons: over-engineering for a small LAN app. **Recommendation**: Start with hardcoded 8 hours; add env var only if requested.

2. **Should we add a "session expired" message on the login page?** — When a user is redirected because of an expired session, showing a message like "Tu sesión ha expirado. Por favor, inicia sesión de nuevo." improves UX. **Recommendation**: Yes, add this — it's a small improvement with clear UX value.

## Summary

| Aspect | Current | Proposed |
|--------|---------|----------|
| Session duration | Indefinite (no `maxAge`) | 8 hours (28800 seconds) |
| `session.maxAge` | Not set | `8 * 60 * 60` |
| `session.updateAge` | Not set | Not set (fixed timeout, no rolling) |
| `jwt.maxAge` | Not set | Not set (use `session.maxAge` instead) |
| Session expiry redirect | Generic `/login` | `/login` with optional expiry message |
| Existing sessions on deploy | N/A | All invalidated (acceptable for small LAN) |

The change is minimal — one config line in `auth.ts` — with an optional UX improvement on the login page for expired session messaging.
