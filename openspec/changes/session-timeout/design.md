# Design: Session Timeout

## Technical Approach

Add `maxAge: 8 * 60 * 60` to the JWT session config in `auth.ts`. Auth.js v4 handles expiration automatically — when the JWT expires, `getToken()` in middleware returns `null`. To distinguish "session expired" from "never logged in", check for the presence of the session cookie. If the cookie exists but `getToken()` is null, redirect with `error=SessionExpired`. The login page reads `searchParams.error` and displays a message.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Session expiration mechanism | `session.maxAge` on JWT strategy | Rolling `updateAge`, env-var config, database session | Simplest; matches proposal scope. Rolling sessions rejected as out of scope. |
| Expired-session detection | Check session cookie existence + `getToken() === null` | Custom JWT decode, separate middleware flag | Cookie present + null token = expired. No token at all = never logged in. Minimal change. |
| URL param for expiry | `error=SessionExpired` on `/login` redirect | Toast notification, localStorage flag | URL param is simplest; survives redirect; consistent with existing `callbackUrl` pattern in middleware. |

## Data Flow

```
Request → Middleware → getToken()
  ├─ token valid → NextResponse.next()
  ├─ token null, cookie exists → redirect /login?error=SessionExpired
  └─ token null, no cookie → redirect /login (existing behavior)

/login → LoginPage → useSearchParams()
  ├─ error=SessionExpired → show "Tu sesión ha expirado" message
  └─ no error → show normal login form
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/infrastructure/auth.ts` | Modify | Add `maxAge: 8 * 60 * 60` to `session` config block |
| `src/app/login/page.tsx` | Modify | Read `error` searchParam; show session-expired message when `error=SessionExpired` |
| `src/middleware.ts` | Modify | Distinguish expired sessions (cookie present + null token) and add `error=SessionExpired` to redirect URL |

> **Note**: 3 files, not 2. Middleware must detect expired sessions to set the URL param. Without it, the login page cannot distinguish expiry from a fresh visit.

## Interfaces / Contracts

```typescript
// auth.ts — session config addition
session: {
  strategy: 'jwt',
  maxAge: 8 * 60 * 60, // 8 hours in seconds
}

// middleware.ts — expired session detection
const hasSessionCookie = request.cookies.get('next-auth.session-token') 
  ?? request.cookies.get('__Secure-next-auth.session-token');
if (!token && hasSessionCookie) {
  loginUrl.searchParams.set('error', 'SessionExpired');
}

// login/page.tsx — searchParams handling
const searchParams = useSearchParams();
const sessionExpired = searchParams.get('error') === 'SessionExpired';
// Display: "Tu sesión ha expirado. Por favor, iniciá sesión nuevamente."
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `maxAge` is set in auth config | Assert `authOptions.session.maxAge === 28800` |
| Unit | Login page renders expired message | Render with `?error=SessionExpired`; assert message visible |
| Unit | Login page hides message without param | Render without param; assert message absent |
| Integration | Middleware adds `error=SessionExpired` on expired cookie | Mock request with expired JWT cookie; assert redirect URL contains `error=SessionExpired` |

## Migration / Rollout

No migration required. Existing sessions will be invalidated on deploy (acceptable for 1-3 LAN users — they re-login once). Rollback: remove `maxAge` line.

## Open Questions

None.