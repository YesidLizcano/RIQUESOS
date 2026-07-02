# Proposal: Session Timeout

## Intent

Auth.js JWT sessions currently last indefinitely — no `maxAge` configured. For a LAN backoffice, sessions need a sensible workday timeout so unattended browsers don't stay logged in forever.

## Scope

### In Scope
- Add `maxAge: 8 * 60 * 60` (8 hours) to `session` config in `src/infrastructure/auth.ts`
- Show "session expired" message on `/login` when redirected due to timeout

### Out of Scope
- Database session strategy
- Refresh token / rolling session (`updateAge`)
- Idle timeout (separate from maxAge)
- Environment-variable-based timeout config

## Capabilities

### New Capabilities
_None_

### Modified Capabilities
- `auth`: Adding session expiration timeout to existing auth configuration

## Approach

Single config line (`session.maxAge: 8 * 60 * 60`) in `auth.ts`. Optional UX: detect expired-session redirect on login page and display a message. Auth.js v4 JWT strategy handles expiration automatically — no middleware or server-action changes needed.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/infrastructure/auth.ts` | Modified | Add `maxAge` to session config |
| `src/app/login/page.tsx` | Modified | Show session-expired message on redirect |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| All existing sessions invalidated on deploy | High | Acceptable for 1-3 LAN users; they re-login once |
| Users working past 8 hours must re-login | Med | By design — fixed timeout is predictable |

## Rollback Plan

Remove `maxAge` line from session config; sessions revert to indefinite duration.

## Dependencies

_None_

## Success Criteria

- [ ] JWT sessions expire after 8 hours (28800 seconds)
- [ ] Expired sessions redirect to `/login`
- [ ] Login page shows session-expired message when appropriate